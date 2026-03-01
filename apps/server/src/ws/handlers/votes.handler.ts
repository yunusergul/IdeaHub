import type { FastifyInstance } from 'fastify';
import { CastVoteSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../../services/notification.service.js';

export const handleVotes = {
  async cast(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const data = CastVoteSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;

    const idea = await fastify.prisma.idea.findUnique({ where: { id: data.ideaId } });
    if (!idea) throw new AppError('NOT_FOUND', 'Idea not found');

    // Upsert vote (change type if already voted)
    const existing = await fastify.prisma.vote.findUnique({
      where: { ideaId_userId: { ideaId: data.ideaId, userId } },
    });

    return await fastify.prisma.$transaction(async (tx) => {
      if (existing) {
        // Already voted — toggle off
        await tx.vote.delete({ where: { id: existing.id } });
        await tx.idea.update({
          where: { id: data.ideaId },
          data: { upvotes: { increment: -1 } },
        });
        return { removed: true, id: data.ideaId, ideaId: data.ideaId };
      }

      // New vote
      await tx.vote.create({ data: { ideaId: data.ideaId, userId, type: 'up' } });
      await tx.idea.update({
        where: { id: data.ideaId },
        data: { upvotes: { increment: 1 } },
      });

      const updated = await tx.idea.findUnique({
        where: { id: data.ideaId },
        select: { id: true, upvotes: true, downvotes: true },
      });

      // Notify idea author about the new vote
      if (idea.authorId !== userId) {
        const voter = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        createNotification(fastify, idea.authorId, {
          type: 'upvote',
          messageKey: 'newVote',
          messageParams: { name: voter?.name ?? 'Someone', title: idea.title },
          relatedId: idea.id,
          emailContext: {
            voterName: voter?.name ?? 'Someone',
            ideaTitle: idea.title,
          },
        }).catch((err) => fastify.log.error(err, 'Failed to create vote notification'));
      }

      return updated;
    });
  },

  async remove(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const ideaId = payload['ideaId'] as string;
    const userId = connectionManager.getUserId(connId)!;

    const existing = await fastify.prisma.vote.findUnique({
      where: { ideaId_userId: { ideaId, userId } },
    });

    if (!existing) throw new AppError('NOT_FOUND', 'Vote not found');

    return await fastify.prisma.$transaction(async (tx) => {
      await tx.vote.delete({ where: { id: existing.id } });
      await tx.idea.update({
        where: { id: ideaId },
        data: { upvotes: { increment: -1 } },
      });
      return { removed: true, id: ideaId, ideaId };
    });
  },
};
