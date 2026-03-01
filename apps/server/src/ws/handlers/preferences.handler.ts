import type { FastifyInstance } from 'fastify';
import { UpdatePreferencesSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';

export const handlePreferences = {
  async get(fastify: FastifyInstance, connId: string, _id: string, _payload: Record<string, unknown>) {
    const userId = connectionManager.getUserId(connId)!;

    const prefs = await fastify.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return prefs;
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const userId = connectionManager.getUserId(connId)!;
    const data = UpdatePreferencesSchema.parse(payload);

    const prefs = await fastify.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return prefs;
  },
};
