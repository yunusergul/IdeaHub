import type { FastifyInstance } from 'fastify';
import { CreateVotingRuleSchema, UpdateVotingRuleSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleVotingRules = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    return fastify.prisma.votingRule.findMany({
      include: { category: true },
      orderBy: { multiplier: 'desc' },
    });
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to create voting rules');

    const data = CreateVotingRuleSchema.parse(payload);
    return fastify.prisma.votingRule.create({ data });
  },

  async update(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to update voting rules');

    const ruleId = payload['ruleId'] as string;
    const data = UpdateVotingRuleSchema.parse(payload);
    return fastify.prisma.votingRule.update({ where: { id: ruleId }, data });
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin') throw new AppError('FORBIDDEN', 'Insufficient permissions to delete voting rules');

    const ruleId = payload['ruleId'] as string;
    await fastify.prisma.votingRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  },
};
