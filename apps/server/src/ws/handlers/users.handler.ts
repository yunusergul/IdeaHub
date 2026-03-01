import type { FastifyInstance } from 'fastify';
import { UpdateUserSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleUsers = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, payload: Record<string, unknown>) {
    const limit = Math.min(Number(payload['limit']) || 200, 500);
    const offset = Math.max(Number(payload['offset']) || 0, 0);

    return fastify.prisma.user.findMany({
      select: { id: true, name: true, email: true, department: true, role: true, initials: true, avatar: true },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    });
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const currentUserId = connectionManager.getUserId(connId)!;
    const role = connectionManager.getRole(connId);
    const targetUserId = (payload['userId'] as string) ?? currentUserId;

    // Only admin can update other users, anyone can update themselves
    if (targetUserId !== currentUserId && role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to update other users');
    }

    // Validate input with Zod schema
    const validated = UpdateUserSchema.parse(payload);

    const allowedFields: Record<string, unknown> = {};
    if (validated.name) allowedFields['name'] = validated.name;
    if (validated.department) allowedFields['department'] = validated.department;
    if (validated.avatar !== undefined) allowedFields['avatar'] = validated.avatar;
    if (validated.locale) allowedFields['locale'] = validated.locale;

    // Only admin can change roles
    if (validated.role && role === 'admin') {
      allowedFields['role'] = validated.role;
    }

    return fastify.prisma.user.update({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, department: true, role: true, initials: true, avatar: true, locale: true },
      data: allowedFields,
    });
  },
};
