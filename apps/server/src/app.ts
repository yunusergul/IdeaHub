import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { loggerConfig } from './lib/logger.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import emailPlugin from './plugins/email.js';
import storagePlugin from './plugins/storage.js';
import websocketPlugin from './plugins/websocket.js';
import redisPlugin from './plugins/redis.js';
import pgNotifyPlugin from './plugins/pg-notify.js';
import redisSubscriberPlugin from './plugins/redis-subscriber.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { uploadRoutes } from './routes/upload.js';
import { settingsRoutes } from './routes/settings.js';
import { AppError } from './lib/errors.js';
import { ZodError } from 'zod';
import { env } from './env.js';
import { processExpiredDevelopmentSurveys } from './ws/handlers/surveys.handler.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: loggerConfig,
  });

  // CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  });

  // Rate limiting for REST endpoints
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // Static file serving for uploads (only when using local storage)
  if (env.STORAGE_PROVIDER === 'local') {
    await fastify.register(fastifyStatic, {
      root: join(process.cwd(), 'uploads'),
      prefix: '/uploads/',
    });
  }

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);
  await fastify.register(emailPlugin);
  await fastify.register(storagePlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(pgNotifyPlugin);
  await fastify.register(redisSubscriberPlugin);

  // REST Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(uploadRoutes);
  await fastify.register(settingsRoutes);

  // Process expired development surveys on startup and periodically
  // Only the leader instance runs this in multi-instance mode
  fastify.addHook('onReady', async () => {
    const runIfLeader = async () => {
      if (!fastify.isLeader()) return;
      try {
        await processExpiredDevelopmentSurveys(fastify);
      } catch (err) {
        fastify.log.error(err, 'Failed to process expired development surveys');
      }
    };

    await runIfLeader();
    fastify.log.info('Survey processor initialized (runs on leader only)');

    // Run periodically every 5 minutes
    const interval = setInterval(runIfLeader, 300_000);

    fastify.addHook('onClose', async () => {
      clearInterval(interval);
    });
  });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION',
          message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      });
    }

    fastify.log.error(error);
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Sunucu hatası' },
    });
  });

  return fastify;
}
