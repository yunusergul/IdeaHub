import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import { connectionManager } from '../ws/connection-manager.js';
import { handleMessage } from '../ws/message-router.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024; // 1MB

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(websocket, {
    options: {
      maxPayload: MAX_PAYLOAD_BYTES,
      perMessageDeflate: {
        zlibDeflateOptions: { level: 6 },
        threshold: 1024, // Only compress messages larger than 1KB
      },
    },
  });

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    const connId = connectionManager.add(socket);
    if (!connId) {
      fastify.log.warn('Max total connections reached, rejecting new WebSocket');
      socket.close(4002, 'Too many connections');
      return;
    }

    fastify.log.info({ connId }, 'WebSocket client connected');

    // Auto-disconnect if not authenticated within 5 seconds
    const authTimeout = setTimeout(() => {
      if (!connectionManager.isAuthenticated(connId)) {
        fastify.log.warn({ connId }, 'WebSocket client did not authenticate in time');
        socket.close(4001, 'Authentication timeout');
      }
    }, 5_000);

    // Heartbeat ping/pong
    let alive = true;
    const heartbeat = setInterval(() => {
      if (!alive) {
        fastify.log.warn({ connId }, 'WebSocket client heartbeat failed, closing');
        socket.terminate();
        return;
      }
      alive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL_MS);

    socket.on('pong', () => {
      alive = true;
    });

    socket.on('message', async (raw: Buffer) => {
      // Rate limit check
      if (!connectionManager.checkRateLimit(connId)) {
        socket.send(JSON.stringify({
          type: 'error',
          error: { code: 'RATE_LIMITED', message: 'Çok fazla mesaj gönderiyorsunuz. Lütfen bekleyin.' },
        }));
        return;
      }

      try {
        const data = JSON.parse(raw.toString());
        await handleMessage(fastify, connId, data);
      } catch (err) {
        fastify.log.error({ err, connId }, 'Failed to handle WS message');
        socket.send(JSON.stringify({
          type: 'error',
          error: { code: 'PARSE_ERROR', message: 'Geçersiz mesaj formatı' },
        }));
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      clearInterval(heartbeat);
      connectionManager.remove(connId);
      fastify.log.info({ connId }, 'WebSocket client disconnected');
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ err, connId }, 'WebSocket error');
    });
  });
});
