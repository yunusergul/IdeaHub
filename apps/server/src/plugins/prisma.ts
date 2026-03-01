import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const databaseUrl = new URL(process.env['DATABASE_URL'] ?? '');
  databaseUrl.searchParams.set('connection_limit', '20');
  databaseUrl.searchParams.set('pool_timeout', '10');

  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl.toString(),
    log: fastify.log.level === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  await prisma.$connect();
  fastify.log.info('Prisma connected to database');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Prisma disconnected');
  });
});
