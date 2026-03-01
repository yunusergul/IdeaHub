import type { FastifyInstance } from 'fastify';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';

export const handleCategories = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, _payload: Record<string, unknown>) {
    return fastify.prisma.category.findMany({ orderBy: { label: 'asc' } });
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Only admins and product managers can create categories');
    }

    const label = payload['label'] as string;
    const icon = (payload['icon'] as string) || 'LayoutGrid';
    const color = (payload['color'] as string) || '#6366f1';

    if (!label?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Category label is required');
    }

    const category = await fastify.prisma.category.create({
      data: {
        id: `cat-${Date.now()}`,
        label: label.trim(),
        icon,
        color,
      },
    });

    return category;
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const role = connectionManager.getRole(connId);
    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Only admins and product managers can delete categories');
    }

    const categoryId = payload['categoryId'] as string;
    if (!categoryId) {
      throw new AppError('VALIDATION_ERROR', 'Category ID is required');
    }

    // Check if any ideas use this category
    const ideaCount = await fastify.prisma.idea.count({ where: { categoryId } });
    if (ideaCount > 0) {
      throw new AppError('CONFLICT', `Cannot delete category: ${ideaCount} ideas are using it`);
    }

    await fastify.prisma.category.delete({ where: { id: categoryId } });
    return { deleted: true, id: categoryId };
  },
};
