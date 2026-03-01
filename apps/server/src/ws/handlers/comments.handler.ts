import type { FastifyInstance } from 'fastify';
import { CreateCommentSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../../services/notification.service.js';

const commentInclude = {
  user: { select: { id: true, name: true, initials: true, department: true } },
  likes: { select: { userId: true } },
  replies: {
    include: {
      user: { select: { id: true, name: true, initials: true, department: true } },
      likes: { select: { userId: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, initials: true, department: true } },
          likes: { select: { userId: true } },
        },
      },
    },
  },
};

export const handleComments = {
  async list(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const ideaId = payload['ideaId'] as string;

    const comments = await fastify.prisma.comment.findMany({
      where: { ideaId, parentId: null },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const data = CreateCommentSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;

    const idea = await fastify.prisma.idea.findUnique({ where: { id: data.ideaId } });
    if (!idea) throw new AppError('NOT_FOUND', 'Idea not found');

    const comment = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          ideaId: data.ideaId,
          userId,
          content: data.content,
          parentId: data.parentId ?? null,
        },
        include: commentInclude,
      });

      await tx.idea.update({
        where: { id: data.ideaId },
        data: { commentCount: { increment: 1 } },
      });

      return created;
    });

    // Notify idea author about the new comment
    if (idea.authorId !== userId) {
      const commenter = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      createNotification(fastify, idea.authorId, {
        type: 'comment',
        messageKey: 'newComment',
        messageParams: { name: commenter?.name ?? 'Someone', title: idea.title },
        relatedId: idea.id,
        emailContext: {
          commenterName: commenter?.name ?? 'Someone',
          ideaTitle: idea.title,
          commentContent: data.content,
        },
      }).catch((err) => fastify.log.error(err, 'Failed to create comment notification'));
    }

    return comment;
  },

  async like(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const commentId = payload['commentId'] as string;
    const userId = connectionManager.getUserId(connId)!;

    const comment = await fastify.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError('NOT_FOUND', 'Comment not found');

    await fastify.prisma.$transaction(async (tx) => {
      await tx.commentLike.create({ data: { commentId, userId } });
      await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
      });
    });

    const updated = await fastify.prisma.comment.findUnique({
      where: { id: commentId },
      include: commentInclude,
    });

    return updated;
  },

  async unlike(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const commentId = payload['commentId'] as string;
    const userId = connectionManager.getUserId(connId)!;

    const existing = await fastify.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) throw new AppError('NOT_FOUND', 'Like not found');

    await fastify.prisma.$transaction(async (tx) => {
      await tx.commentLike.delete({ where: { id: existing.id } });
      await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
      });
    });

    const updated = await fastify.prisma.comment.findUnique({
      where: { id: commentId },
      include: commentInclude,
    });

    return updated;
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const commentId = payload['commentId'] as string;
    const userId = connectionManager.getUserId(connId)!;
    const role = connectionManager.getRole(connId);

    const existing = await fastify.prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new AppError('NOT_FOUND', 'Comment not found');

    if (existing.userId !== userId && role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to delete this comment');
    }

    await fastify.prisma.$transaction(async (tx) => {
      // Recursively collect all descendant comment IDs
      const collectDescendants = async (parentIds: string[]): Promise<string[]> => {
        if (parentIds.length === 0) return [];
        const children = await tx.comment.findMany({
          where: { parentId: { in: parentIds } },
          select: { id: true },
        });
        const childIds = children.map(c => c.id);
        const deeper = await collectDescendants(childIds);
        return [...childIds, ...deeper];
      };

      const descendantIds = await collectDescendants([commentId]);
      const allIds = [commentId, ...descendantIds];

      // Delete likes on all comments being removed
      await tx.commentLike.deleteMany({ where: { commentId: { in: allIds } } });
      // Delete deepest first (children before parents) by reversing
      await tx.comment.deleteMany({ where: { id: { in: descendantIds } } });
      await tx.comment.delete({ where: { id: commentId } });
      await tx.idea.update({
        where: { id: existing.ideaId },
        data: { commentCount: { increment: -allIds.length } },
      });
    });

    return { deleted: true, id: commentId, ideaId: existing.ideaId };
  },
};
