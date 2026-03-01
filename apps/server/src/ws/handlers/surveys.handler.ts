import type { FastifyInstance } from 'fastify';
import { CreateSurveySchema, CastSurveyVoteSchema, CastSurveyRatingSchema } from '@ideahub/shared';
import { connectionManager } from '../connection-manager.js';
import { AppError } from '../../lib/errors.js';
import { notifyUsers } from '../../services/notification.service.js';

const surveyInclude = {
  options: {
    include: {
      votes: { select: { userId: true } },
      idea: { select: { id: true, title: true, summary: true } },
    },
  },
  ratings: { select: { userId: true, rating: true } },
  createdBy: { select: { id: true, name: true, initials: true } },
  targetStatus: { select: { id: true, label: true, color: true } },
  targetSprint: { select: { id: true, label: true } },
};

export async function processExpiredDevelopmentSurveys(fastify: FastifyInstance): Promise<void> {
  const now = new Date();

  const expiredSurveys = await fastify.prisma.survey.findMany({
    where: {
      type: 'development',
      isActive: true,
      transitionedAt: null,
      dueDate: { lt: now },
    },
    include: {
      options: {
        include: {
          votes: true,
          idea: true,
        },
      },
    },
  });

  for (const survey of expiredSurveys) {
    // Find the option with the most votes
    let winningOption = survey.options[0];
    let maxVotes = 0;
    for (const opt of survey.options) {
      if (opt.votes.length > maxVotes) {
        maxVotes = opt.votes.length;
        winningOption = opt;
      }
    }

    const updateData: Record<string, unknown> = {
      isActive: false,
      transitionedAt: now,
    };

    await fastify.prisma.survey.update({
      where: { id: survey.id },
      data: updateData,
    });

    // Auto-transition the winning idea if enabled
    if (survey.autoTransition && winningOption?.ideaId && winningOption.idea) {
      const ideaUpdate: Record<string, unknown> = {};

      if (survey.targetStatusId) {
        ideaUpdate.statusId = survey.targetStatusId;
      }

      // Use targetSprintId if set, otherwise find active sprint
      if (survey.targetSprintId) {
        ideaUpdate.sprintId = survey.targetSprintId;
      } else {
        const activeSprint = await fastify.prisma.sprint.findFirst({
          where: { isCurrent: true },
        });
        if (activeSprint) {
          ideaUpdate.sprintId = activeSprint.id;
        }
      }

      if (Object.keys(ideaUpdate).length > 0) {
        await fastify.prisma.idea.update({
          where: { id: winningOption.ideaId },
          data: ideaUpdate,
        });

        // Broadcast idea updated
        connectionManager.broadcastAll({
          type: 'event',
          event: 'idea:updated',
          data: { id: winningOption.ideaId },
        });
      }
    }

    // Broadcast survey transitioned
    connectionManager.broadcastAll({
      type: 'event',
      event: 'survey:transitioned',
      data: { id: survey.id, winningOptionId: winningOption?.id },
    });

    fastify.log.info({ surveyId: survey.id, winningOptionId: winningOption?.id }, 'Development survey transitioned');
  }
}

export const handleSurveys = {
  async list(fastify: FastifyInstance, _connId: string, _id: string, payload: Record<string, unknown>) {
    const limit = Math.min(Number(payload['limit']) || 20, 100);
    const offset = Math.max(Number(payload['offset']) || 0, 0);

    const where: Record<string, unknown> = {};
    if (payload['search'] && typeof payload['search'] === 'string' && payload['search'].trim()) {
      const search = payload['search'].trim();
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { question: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      fastify.prisma.survey.findMany({
        where,
        include: surveyInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      fastify.prisma.survey.count({ where }),
    ]);

    return { items, total, offset, limit };
  },

  async create(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const data = CreateSurveySchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;
    const role = connectionManager.getRole(connId);

    if (role !== 'admin' && role !== 'product_manager') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to create surveys');
    }

    let optionsCreate: { label: string; ideaId?: string }[] | undefined;

    if (data.options) {
      optionsCreate = data.options.map((opt) => {
        if (typeof opt === 'string') {
          return { label: opt };
        }
        return { label: opt.label, ideaId: opt.ideaId };
      });
    }

    const survey = await fastify.prisma.survey.create({
      data: {
        title: data.title,
        question: data.question,
        type: data.type,
        ideaId: data.ideaId,
        createdById: userId,
        targetDepartments: data.targetDepartments,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        autoTransition: data.autoTransition ?? false,
        targetStatusId: data.targetStatusId ?? undefined,
        targetSprintId: data.targetSprintId ?? undefined,
        options: optionsCreate ? {
          create: optionsCreate,
        } : undefined,
      },
      include: surveyInclude,
    });

    // Notify all users about the new survey
    const creator = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const allUsers = await fastify.prisma.user.findMany({ select: { id: true } });
    notifyUsers(
      fastify,
      allUsers.map((u) => u.id),
      userId,
      {
        type: 'survey',
        messageKey: 'newSurvey',
        messageParams: { title: data.title },
        relatedId: survey.id,
        emailContext: {
          surveyTitle: data.title,
          creatorName: creator?.name ?? 'Someone',
        },
      },
    ).catch((err) => fastify.log.error(err, 'Failed to create survey notifications'));

    return survey;
  },

  async vote(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const data = CastSurveyVoteSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;

    const option = await fastify.prisma.surveyOption.findUnique({
      where: { id: data.optionId },
      include: { survey: true },
    });
    if (!option) throw new AppError('NOT_FOUND', 'Survey option not found');

    if (!option.survey.isActive) {
      throw new AppError('FORBIDDEN', 'This survey is no longer active');
    }
    if (option.survey.dueDate && option.survey.dueDate < new Date()) {
      throw new AppError('FORBIDDEN', 'This survey has expired');
    }

    const vote = await fastify.prisma.$transaction(async (tx) => {
      // Check if already voted on this survey (any option)
      const existingVote = await tx.surveyVote.findFirst({
        where: { userId, option: { surveyId: data.surveyId } },
      });

      if (existingVote) {
        // Switch vote
        await tx.surveyVote.delete({ where: { id: existingVote.id } });
      }

      return tx.surveyVote.create({
        data: { optionId: data.optionId, userId },
      });
    });

    return vote;
  },

  async delete(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const surveyId = payload['surveyId'] as string;
    const role = connectionManager.getRole(connId);

    if (role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions to delete surveys');
    }

    const existing = await fastify.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!existing) throw new AppError('NOT_FOUND', 'Survey not found');

    await fastify.prisma.survey.delete({ where: { id: surveyId } });
    return { deleted: true, id: surveyId };
  },

  async rate(fastify: FastifyInstance, connId: string, _id: string, payload: Record<string, unknown>) {
    const data = CastSurveyRatingSchema.parse(payload);
    const userId = connectionManager.getUserId(connId)!;

    const survey = await fastify.prisma.survey.findUnique({ where: { id: data.surveyId } });
    if (!survey) throw new AppError('NOT_FOUND', 'Survey not found');
    if (survey.type !== 'rating') throw new AppError('VALIDATION', 'This survey is not a rating type');
    if (!survey.isActive) throw new AppError('FORBIDDEN', 'This survey is no longer active');
    if (survey.dueDate && survey.dueDate < new Date()) throw new AppError('FORBIDDEN', 'This survey has expired');

    const rating = await fastify.prisma.surveyRating.upsert({
      where: { surveyId_userId: { surveyId: data.surveyId, userId } },
      create: { surveyId: data.surveyId, userId, rating: data.rating },
      update: { rating: data.rating },
    });

    return rating;
  },
};
