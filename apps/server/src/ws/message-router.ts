import type { FastifyInstance } from 'fastify';
import { WsClientMessage, WS_ACTIONS } from '@ideahub/shared';
import { connectionManager } from './connection-manager.js';
import { handleAuth, handleAuthRefresh } from './handlers/auth.handler.js';
import { handleIdeas } from './handlers/ideas.handler.js';
import { handleVotes } from './handlers/votes.handler.js';
import { handleComments } from './handlers/comments.handler.js';
import { handleSurveys } from './handlers/surveys.handler.js';
import { handleSprints } from './handlers/sprints.handler.js';
import { handleStatuses } from './handlers/statuses.handler.js';
import { handleCategories } from './handlers/categories.handler.js';
import { handleNotifications } from './handlers/notifications.handler.js';
import { handleUsers } from './handlers/users.handler.js';
import { handleVotingRules } from './handlers/voting-rules.handler.js';
import { handleSettings } from './handlers/settings.handler.js';
import { handlePreferences } from './handlers/preferences.handler.js';

type ActionHandler = (
  fastify: FastifyInstance,
  connId: string,
  id: string,
  payload: Record<string, unknown>,
) => Promise<unknown>;

const actionHandlers: Record<string, ActionHandler> = {
  [WS_ACTIONS.IDEAS_LIST]: handleIdeas.list,
  [WS_ACTIONS.IDEAS_GET]: handleIdeas.get,
  [WS_ACTIONS.IDEAS_CREATE]: handleIdeas.create,
  [WS_ACTIONS.IDEAS_UPDATE]: handleIdeas.update,
  [WS_ACTIONS.IDEAS_DELETE]: handleIdeas.delete,

  [WS_ACTIONS.VOTES_CAST]: handleVotes.cast,
  [WS_ACTIONS.VOTES_REMOVE]: handleVotes.remove,

  [WS_ACTIONS.COMMENTS_LIST]: handleComments.list,
  [WS_ACTIONS.COMMENTS_CREATE]: handleComments.create,
  [WS_ACTIONS.COMMENTS_DELETE]: handleComments.delete,
  [WS_ACTIONS.COMMENTS_LIKE]: handleComments.like,
  [WS_ACTIONS.COMMENTS_UNLIKE]: handleComments.unlike,
  [WS_ACTIONS.COMMENTS_LIST_REPLIES]: handleComments.listReplies,

  [WS_ACTIONS.SURVEYS_LIST]: handleSurveys.list,
  [WS_ACTIONS.SURVEYS_CREATE]: handleSurveys.create,
  [WS_ACTIONS.SURVEYS_VOTE]: handleSurveys.vote,
  [WS_ACTIONS.SURVEYS_RATE]: handleSurveys.rate,
  [WS_ACTIONS.SURVEYS_DELETE]: handleSurveys.delete,

  [WS_ACTIONS.SPRINTS_LIST]: handleSprints.list,
  [WS_ACTIONS.SPRINTS_CREATE]: handleSprints.create,
  [WS_ACTIONS.SPRINTS_UPDATE]: handleSprints.update,
  [WS_ACTIONS.SPRINTS_DELETE]: handleSprints.delete,

  [WS_ACTIONS.STATUSES_LIST]: handleStatuses.list,
  [WS_ACTIONS.STATUSES_CREATE]: handleStatuses.create,
  [WS_ACTIONS.STATUSES_UPDATE]: handleStatuses.update,
  [WS_ACTIONS.STATUSES_DELETE]: handleStatuses.delete,
  [WS_ACTIONS.STATUSES_REORDER]: handleStatuses.reorder,

  [WS_ACTIONS.CATEGORIES_LIST]: handleCategories.list,
  [WS_ACTIONS.CATEGORIES_CREATE]: handleCategories.create,
  [WS_ACTIONS.CATEGORIES_DELETE]: handleCategories.delete,

  [WS_ACTIONS.NOTIFICATIONS_LIST]: handleNotifications.list,
  [WS_ACTIONS.NOTIFICATIONS_MARK_READ]: handleNotifications.markRead,
  [WS_ACTIONS.NOTIFICATIONS_MARK_ALL_READ]: handleNotifications.markAllRead,

  [WS_ACTIONS.USERS_LIST]: handleUsers.list,
  [WS_ACTIONS.USERS_UPDATE]: handleUsers.update,

  [WS_ACTIONS.VOTING_RULES_LIST]: handleVotingRules.list,
  [WS_ACTIONS.VOTING_RULES_CREATE]: handleVotingRules.create,
  [WS_ACTIONS.VOTING_RULES_UPDATE]: handleVotingRules.update,
  [WS_ACTIONS.VOTING_RULES_DELETE]: handleVotingRules.delete,

  [WS_ACTIONS.SETTINGS_GET]: handleSettings.get,
  [WS_ACTIONS.SETTINGS_UPDATE]: handleSettings.update,

  [WS_ACTIONS.PREFERENCES_GET]: handlePreferences.get,
  [WS_ACTIONS.PREFERENCES_UPDATE]: handlePreferences.update,

  [WS_ACTIONS.SUBSCRIBE]: async (_fastify, connId, _id, payload) => {
    const channels = payload['channels'] as string[] | undefined;
    if (Array.isArray(channels)) {
      for (const ch of channels) {
        if (typeof ch === 'string') connectionManager.subscribe(connId, ch);
      }
    }
    return { subscribed: channels ?? [] };
  },
  [WS_ACTIONS.UNSUBSCRIBE]: async (_fastify, connId, _id, payload) => {
    const channels = payload['channels'] as string[] | undefined;
    if (Array.isArray(channels)) {
      for (const ch of channels) {
        if (typeof ch === 'string') connectionManager.unsubscribe(connId, ch);
      }
    }
    return { unsubscribed: channels ?? [] };
  },
};

export async function handleMessage(
  fastify: FastifyInstance,
  connId: string,
  raw: unknown,
): Promise<void> {
  const parsed = WsClientMessage.safeParse(raw);
  if (!parsed.success) {
    connectionManager.send(connId, {
      type: 'error',
      error: { code: 'INVALID_MESSAGE', message: 'Invalid message format' },
    });
    return;
  }

  const msg = parsed.data;

  // Handle auth messages
  if (msg.type === 'auth') {
    await handleAuth(fastify, connId, msg.token);
    return;
  }

  if (msg.type === 'auth:refresh') {
    await handleAuthRefresh(fastify, connId, msg.refreshToken);
    return;
  }

  // All action messages require authentication
  if (!connectionManager.isAuthenticated(connId)) {
    connectionManager.send(connId, {
      type: 'error',
      id: msg.id,
      error: { code: 'WS_AUTH_REQUIRED', message: 'Authentication required' },
    });
    return;
  }

  const handler = actionHandlers[msg.action];
  if (!handler) {
    connectionManager.send(connId, {
      type: 'error',
      id: msg.id,
      error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${msg.action}` },
    });
    return;
  }

  try {
    const result = await handler(fastify, connId, msg.id, msg.payload ?? {});
    connectionManager.send(connId, {
      type: 'result',
      id: msg.id,
      action: msg.action,
      data: result,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    const code = 'code' in error ? (error as { code: string }).code : 'INTERNAL_ERROR';
    connectionManager.send(connId, {
      type: 'error',
      id: msg.id,
      error: { code, message: error.message },
    });
    fastify.log.error({ err, action: msg.action, connId }, 'Handler error');
  }
}
