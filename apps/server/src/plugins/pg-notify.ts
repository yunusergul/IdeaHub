import fp from 'fastify-plugin';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import { broadcast } from '../ws/broadcast.js';
import { env } from '../env.js';
import { INSTANCE_ID } from '../ws/connection-manager.js';
import { startLeaderElection, stopLeaderElection, getIsLeader } from '../lib/leader-election.js';

const REDIS_BROADCAST_CHANNEL = 'ideahub:broadcast';
const MAX_RECONNECT_ATTEMPTS = 15;
const MAX_RECONNECT_DELAY_MS = 60_000;

declare module 'fastify' {
  interface FastifyInstance {
    isLeader: () => boolean;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  let client: pg.Client | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  async function connectPgNotify(): Promise<void> {
    if (closed) return;
    client = new pg.Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    await client.query('LISTEN db_change');
    reconnectAttempts = 0;
    fastify.log.info({ instanceId: INSTANCE_ID }, 'PG LISTEN/NOTIFY client connected (leader)');

    client.on('error', (err) => {
      fastify.log.error({ err }, 'PG NOTIFY client error');
      scheduleReconnect();
    });

    client.on('notification', (msg) => {
      if (msg.channel === 'db_change' && msg.payload) {
        try {
          const payload = JSON.parse(msg.payload);

          // If Redis is available, publish to Redis for cross-instance broadcast
          // AND broadcast locally (subscriber skips own messages to avoid double-broadcast)
          if (fastify.redis) {
            const redisPayload = JSON.stringify({
              sourceInstance: INSTANCE_ID,
              dbPayload: payload,
            });
            broadcast(fastify, payload); // local clients
            fastify.redis.publish(REDIS_BROADCAST_CHANNEL, redisPayload).catch((err) => {
              fastify.log.error({ err }, 'Failed to publish to Redis (local broadcast already done)');
            });
          } else {
            // Fallback: direct local broadcast (single-instance mode)
            broadcast(fastify, payload);
          }
        } catch (err) {
          fastify.log.error({ err }, 'Failed to parse PG notification');
        }
      }
    });
  }

  async function disconnectPgNotify(): Promise<void> {
    if (client) {
      try { await client.end(); } catch {}
      client = null;
      fastify.log.info('PG LISTEN/NOTIFY client disconnected (lost leadership)');
    }
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      fastify.log.error('PG NOTIFY: max reconnect attempts reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
    reconnectAttempts++;
    fastify.log.info({ attempt: reconnectAttempts, delayMs: delay }, 'PG NOTIFY: scheduling reconnect');

    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        await disconnectPgNotify();
        await connectPgNotify();
      } catch (err) {
        fastify.log.error({ err }, 'PG NOTIFY reconnect failed');
        scheduleReconnect();
      }
    }, delay);
  }

  // If Redis is available, use leader election so only 1 instance runs PG NOTIFY
  if (fastify.redis) {
    fastify.decorate('isLeader', getIsLeader);

    await startLeaderElection(
      fastify.redis,
      () => {
        fastify.log.info({ instanceId: INSTANCE_ID }, 'Became leader — starting PG NOTIFY listener');
        connectPgNotify().catch((err) => {
          fastify.log.error({ err }, 'Failed to connect PG NOTIFY as leader');
        });
      },
      () => {
        fastify.log.info({ instanceId: INSTANCE_ID }, 'Lost leadership — stopping PG NOTIFY listener');
        disconnectPgNotify().catch((err) => {
          fastify.log.error({ err }, 'Failed to disconnect PG NOTIFY after losing leadership');
        });
      },
    );
  } else {
    // Single-instance mode: always connect, always leader
    fastify.decorate('isLeader', () => true);
    await connectPgNotify();
  }

  fastify.addHook('onClose', async () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (fastify.redis) {
      await stopLeaderElection(fastify.redis);
    }
    await disconnectPgNotify();
  });
});
