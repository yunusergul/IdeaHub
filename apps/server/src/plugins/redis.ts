import Redis from 'ioredis';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisSub: Redis;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  const redisSub = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redisSub.connect();
    fastify.log.info('Redis connected (command + subscriber)');

    fastify.decorate('redis', redis);
    fastify.decorate('redisSub', redisSub);

    fastify.addHook('onClose', async () => {
      await redisSub.quit();
      await redis.quit();
      fastify.log.info('Redis disconnected');
    });
  } catch (err) {
    fastify.log.warn({ err }, 'Redis unavailable — running in single-instance mode');
    try { redis.disconnect(); } catch {}
    try { redisSub.disconnect(); } catch {}
    // Do not decorate — pg-notify.ts's `if (fastify.redis)` guard will handle this
  }
});
