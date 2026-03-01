import type { FastifyInstance } from 'fastify';
import type { NotificationType } from '@prisma/client';
import { env } from '../env.js';
import { getT } from '../i18n/index.js';
import {
  commentEmailTemplate,
  voteEmailTemplate,
  statusEmailTemplate,
  surveyEmailTemplate,
} from '../lib/email-templates.js';

interface NotificationOptions {
  type: NotificationType;
  /** i18n key from notifications namespace (e.g. 'newComment') */
  messageKey: string;
  /** Interpolation params for the i18n key */
  messageParams?: Record<string, string>;
  relatedId?: string;
  // Email context fields
  emailContext?: {
    commenterName?: string;
    voterName?: string;
    ideaTitle?: string;
    commentContent?: string;
    newStatusLabel?: string;
    surveyTitle?: string;
    creatorName?: string;
  };
}

// Map NotificationType to preference field suffix
const TYPE_TO_PREF: Record<string, string> = {
  comment: 'Comment',
  upvote: 'Vote',
  status: 'Status',
  survey: 'Survey',
};

async function getOrCreatePreferences(fastify: FastifyInstance, userId: string) {
  return fastify.prisma.userPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function createNotification(
  fastify: FastifyInstance,
  userId: string,
  options: NotificationOptions,
): Promise<void> {
  const prefs = await getOrCreatePreferences(fastify, userId);
  const prefSuffix = TYPE_TO_PREF[options.type];

  // Get user locale for translations
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, locale: true },
  });
  const locale = user?.locale ?? 'tr';
  const t = getT(locale);

  // In-app notification
  if (prefSuffix) {
    const appKey = `notifyApp${prefSuffix}` as keyof typeof prefs;
    if (prefs[appKey]) {
      const message = t(`notifications:${options.messageKey}`, options.messageParams ?? {});
      await fastify.prisma.notification.create({
        data: {
          userId,
          type: options.type,
          message,
          relatedId: options.relatedId,
        },
      });
      // PG NOTIFY trigger will auto-broadcast
    }
  }

  // Email notification
  if (prefSuffix) {
    const emailKey = `notifyEmail${prefSuffix}` as keyof typeof prefs;
    if (prefs[emailKey] && options.emailContext && user) {
      sendEmailNotification(fastify, user.email, options, locale).catch((err) => {
        fastify.log.error({ err, userId, type: options.type }, 'Failed to send email notification');
      });
    }
  }
}

export async function notifyUsers(
  fastify: FastifyInstance,
  userIds: string[],
  excludeUserId: string | undefined,
  options: NotificationOptions,
): Promise<void> {
  const targets = excludeUserId
    ? userIds.filter((id) => id !== excludeUserId)
    : userIds;

  await Promise.allSettled(
    targets.map((userId) => createNotification(fastify, userId, options)),
  );
}

function sendEmailNotification(
  fastify: FastifyInstance,
  toEmail: string,
  options: NotificationOptions,
  locale: string,
): Promise<void> {
  const ctx = options.emailContext;
  if (!ctx) return Promise.resolve();

  let template: { subject: string; html: string } | undefined;

  switch (options.type) {
    case 'comment':
      if (ctx.commenterName && ctx.ideaTitle && ctx.commentContent) {
        template = commentEmailTemplate(ctx.commenterName, ctx.ideaTitle, ctx.commentContent, locale);
      }
      break;
    case 'upvote':
      if (ctx.voterName && ctx.ideaTitle) {
        template = voteEmailTemplate(ctx.voterName, ctx.ideaTitle, locale);
      }
      break;
    case 'status':
      if (ctx.ideaTitle && ctx.newStatusLabel) {
        template = statusEmailTemplate(ctx.ideaTitle, ctx.newStatusLabel, locale);
      }
      break;
    case 'survey':
      if (ctx.surveyTitle && ctx.creatorName) {
        template = surveyEmailTemplate(ctx.surveyTitle, ctx.creatorName, locale);
      }
      break;
  }

  if (!template) return Promise.resolve();

  return fastify.mailer.sendMail({
    from: env.SMTP_FROM,
    to: toEmail,
    subject: template.subject,
    html: template.html,
  });
}
