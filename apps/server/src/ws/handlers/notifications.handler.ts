import type { FastifyInstance } from 'fastify';
import { connectionManager } from '../connection-manager.js';

export const handleNotifications = {
  async list(fastify: FastifyInstance, connId: string, _id: string, _payload: Record<string, unknown>) {
    const userId = connectionManager.getUserId(connId)!;
    return fastify.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markRead(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const userId = connectionManager.getUserId(connId)!;
    const notificationId = payload['notificationId'] as string;

    await fastify.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    return { success: true };
  },

  async markAllRead(fastify: FastifyInstance, connId: string, _id: string, _payload: Record<string, unknown>) {
    const userId = connectionManager.getUserId(connId)!;

    await fastify.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
  },
};
