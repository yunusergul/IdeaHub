import type { FastifyInstance } from 'fastify';
import { CreateStatusSchema, UpdateStatusSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleStatuses = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    return fastify.prisma.status.findMany({ orderBy: { order: 'asc' } });
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to create statuses');

    const data = CreateStatusSchema.parse(payload);
    return fastify.prisma.status.create({ data });
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to update statuses');

    const statusId = payload['statusId'] as string;
    const data = UpdateStatusSchema.parse(payload);
    return fastify.prisma.status.update({ where: { id: statusId }, data });
  },

  async reorder(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to reorder statuses');

    const orderedIds = payload['orderedIds'];
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new AppError('VALIDATION', 'orderedIds is required');
    }

    await fastify.prisma.$transaction(
      orderedIds.map((id: string, idx: number) =>
        fastify.prisma.status.update({ where: { id }, data: { order: idx + 1 } })
      )
    );

    return fastify.prisma.status.findMany({ orderBy: { order: 'asc' } });
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to delete statuses');

    const statusId = payload['statusId'] as string;
    const status = await fastify.prisma.status.findUnique({ where: { id: statusId } });
    if (!status) throw new AppError('NOT_FOUND', 'Status not found');
    if (status.isSystem) throw new AppError('FORBIDDEN', 'System statuses cannot be deleted');

    // Check if any ideas use this status
    const count = await fastify.prisma.idea.count({ where: { statusId } });
    if (count > 0) throw new AppError('VALIDATION', 'This status is in use, move ideas to another status first');

    await fastify.prisma.status.delete({ where: { id: statusId } });
    return { deleted: true };
  },
};
