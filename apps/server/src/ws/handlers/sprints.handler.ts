import type { FastifyInstance } from 'fastify';
import { CreateSprintSchema, UpdateSprintSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleSprints = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    return fastify.prisma.sprint.findMany({ orderBy: { startDate: 'asc' } });
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to create sprints');
    }

    const data = CreateSprintSchema.parse(payload);

    // If this sprint is marked current, unset others
    if (data.isCurrent) {
      await fastify.prisma.sprint.updateMany({ data: { isCurrent: false } });
    }

    return fastify.prisma.sprint.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to update sprints');
    }

    const sprintId = payload['sprintId'] as string;
    const data = UpdateSprintSchema.parse(payload);

    if (data.isCurrent) {
      await fastify.prisma.sprint.updateMany({ data: { isCurrent: false } });
    }

    return fastify.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to delete sprints');
    }

    const sprintId = payload['sprintId'] as string;
    const existing = await fastify.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!existing) throw new AppError('NOT_FOUND', 'Sprint not found');

    // Unlink ideas from this sprint before deleting
    await fastify.prisma.idea.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });

    await fastify.prisma.sprint.delete({ where: { id: sprintId } });
    return { deleted: true, id: sprintId };
  },
};
