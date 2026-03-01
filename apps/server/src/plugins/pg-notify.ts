import fp from 'fastify-plugin';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import { broadcast } from '../ws/broadcast.js';
import { env } from '../env.js';

const MAX_RECONNECT_ATTEMPTS = 15;
const MAX_RECONNECT_DELAY_MS = 60_000;

export default fp(async (fastify: FastifyInstance) => {
  let client: pg.Client;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  async function connect(): Promise<void> {
    client = new pg.Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    await client.query('LISTEN db_change');
    reconnectAttempts = 0;
    fastify.log.info('PG LISTEN/NOTIFY client connected');

    client.on('error', (err) => {
      fastify.log.error({ err }, 'PG NOTIFY client error');
      scheduleReconnect();
    });

    client.on('notification', (msg) => {
      if (msg.channel === 'db_change' && msg.payload) {
        try {
          const payload = JSON.parse(msg.payload);
          broadcast(fastify, payload);
        } catch (err) {
          fastify.log.error({ err }, 'Failed to parse PG notification');
        }
      }
    });
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      fastify.log.error('PG NOTIFY: max reconnect attempts reached, giving up');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at MAX_RECONNECT_DELAY_MS
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
    reconnectAttempts++;
    fastify.log.info({ attempt: reconnectAttempts, delayMs: delay }, 'PG NOTIFY: scheduling reconnect');

    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        // Try to clean up old client
        try { await client.end(); } catch {}
        await connect();
      } catch (err) {
        fastify.log.error({ err }, 'PG NOTIFY reconnect failed');
        scheduleReconnect();
      }
    }, delay);
  }

  await connect();

  fastify.addHook('onClose', async () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try { await client.end(); } catch {}
    fastify.log.info('PG LISTEN/NOTIFY client disconnected');
  });
});
