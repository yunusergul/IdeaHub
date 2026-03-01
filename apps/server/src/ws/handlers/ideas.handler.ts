import type { FastifyInstance } from 'fastify';
import { CreateIdeaSchema, UpdateIdeaSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../../services/notification.service.js';

const ideaInclude = {
  author: { select: { id: true, name: true, email: true, department: true, role: true, initials: true } },
  category: true,
  status: true,
  sprint: true,
  attachments: true,
  votes: { select: { userId: true, type: true } },
};

export const handleIdeas = {
  async list(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const where: Record<string, unknown> = {};
    if (payload['categoryId'] && payload['categoryId'] !== 'all') where['categoryId'] = payload['categoryId'];
    if (payload['statusId']) where['statusId'] = payload['statusId'];
    if (payload['sprintId'] && payload['sprintId'] !== 'all') where['sprintId'] = payload['sprintId'];
    if (payload['authorId']) where['authorId'] = payload['authorId'];

    // Search support
    if (payload['search'] && typeof payload['search'] === 'string' && payload['search'].trim()) {
      const search = payload['search'].trim();
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(Number(payload['limit']) || 20, 100);
    const offset = Math.max(Number(payload['offset']) || 0, 0);

    const [items, total] = await Promise.all([
      fastify.prisma.idea.findMany({
        where,
        include: ideaInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      fastify.prisma.idea.count({ where }),
    ]);

    return { items, total, offset, limit };
  },

  async get(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const idea = await fastify.prisma.idea.findUnique({
      where: { id: payload['ideaId'] as string },
      include: ideaInclude,
    });

    if (!idea) throw new AppError('NOT_FOUND', 'Idea not found');
    return idea;
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const { attachmentIds, ...data } = CreateIdeaSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;

    // Get default status (pending)
    const defaultStatus = await fastify.prisma.status.findFirst({ where: { order: 1 } });
    if (!defaultStatus) throw new AppError('INTERNAL_ERROR', 'Default status not found');

    const idea = await fastify.prisma.idea.create({
      data: {
        ...data,
        authorId: userId,
        statusId: defaultStatus.id,
      },
      include: ideaInclude,
    });

    // Link uploaded attachments to this idea (only if uploaded by current user)
    if (attachmentIds && attachmentIds.length > 0) {
      await fastify.prisma.attachment.updateMany({
        where: { id: { in: attachmentIds }, ideaId: null, uploadedById: userId },
        data: { ideaId: idea.id },
      });

      // Re-fetch to include attachments
      const updated = await fastify.prisma.idea.findUnique({
        where: { id: idea.id },
        include: ideaInclude,
      });
      return updated;
    }

    return idea;
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const ideaId = payload['ideaId'] as string;
    const updates = UpdateIdeaSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;
    const role = connectionManager.getRole(connId);

    const existing = await fastify.prisma.idea.findUnique({ where: { id: ideaId } });
    if (!existing) throw new AppError('NOT_FOUND', 'Idea not found');

    // Only author, admin, or product_manager can update
    if (existing.authorId !== userId && role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to update this idea');
    }

    const idea = await fastify.prisma.idea.update({
      where: { id: ideaId },
      data: updates,
      include: ideaInclude,
    });

    // Notify idea author if status changed
    if (updates.statusId && updates.statusId !== existing.statusId && existing.authorId !== userId) {
      const newStatus = await fastify.prisma.status.findUnique({
        where: { id: updates.statusId as string },
        select: { label: true },
      });
      createNotification(fastify, existing.authorId, {
        type: 'status',
        messageKey: 'statusChanged',
        messageParams: { status: newStatus?.label ?? '' },
        relatedId: ideaId,
        emailContext: {
          ideaTitle: existing.title,
          newStatusLabel: newStatus?.label ?? '',
        },
      }).catch((err) => fastify.log.error(err, 'Failed to create status notification'));
    }

    return idea;
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const ideaId = payload['ideaId'] as string;
    const userId = connectionManager.getUserId(connId)!;
    const role = connectionManager.getRole(connId);

    const existing = await fastify.prisma.idea.findUnique({ where: { id: ideaId } });
    if (!existing) throw new AppError('NOT_FOUND', 'Idea not found');

    if (existing.authorId !== userId && role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to delete this idea');
    }

    await fastify.prisma.idea.delete({ where: { id: ideaId } });
    return { deleted: true, id: ideaId };
  },
};
