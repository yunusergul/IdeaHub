import type { FastifyInstance } from 'fastify';

export const handleCategories = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    return fastify.prisma.category.findMany({ orderBy: { label: 'asc' } });
  },
};
