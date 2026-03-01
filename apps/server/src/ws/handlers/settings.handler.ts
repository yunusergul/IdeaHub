import type { FastifyInstance } from 'fastify';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleSettings = {
  async get(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    const rows = await fastify.prisma.appSettings.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to update settings');

    const key = payload['key'] as string;
    const value = payload['value'] as string;
    if (!key || typeof value !== 'string') {
      throw new AppError('VALIDATION', 'Invalid setting parameters');
    }

    const setting = await fastify.prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return { [setting.key]: setting.value };
  },
};
