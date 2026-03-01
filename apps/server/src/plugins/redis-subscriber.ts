import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { broadcast } from '../ws/broadcast.js';
import { INSTANCE_ID } from '../ws/connection-manager.js';

const REDIS_BROADCAST_CHANNEL = 'ideahub:broadcast';

export default fp(async (fastify: FastifyInstance) => {
  if (!fastify.redisSub) {
    fastify.log.warn('Redis subscriber not available, skipping cross-instance broadcast setup');
    return;
  }

  await fastify.redisSub.subscribe(REDIS_BROADCAST_CHANNEL);
  fastify.log.info({ channel: REDIS_BROADCAST_CHANNEL }, 'Redis subscriber listening');

  fastify.redisSub.on('message', (channel: string, message: string) => {
    if (channel !== REDIS_BROADCAST_CHANNEL) return;

    try {
      const { sourceInstance, dbPayload } = JSON.parse(message);
      // Skip messages that originated from this instance —
      // the leader already processes its own PG NOTIFY via the Redis publish path
      if (sourceInstance === INSTANCE_ID) return;
      broadcast(fastify, dbPayload);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to process Redis broadcast message');
    }
  });
});
