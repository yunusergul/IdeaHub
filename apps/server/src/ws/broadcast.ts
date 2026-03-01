import type { FastifyInstance } from 'fastify';
import { WS_EVENTS, type WsEventMessage } from '@ideahub/shared';
import { connectionManager } from './connection-manager.js';

interface DbChangePayload {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  data?: Record<string, unknown>;
}

const TABLE_EVENT_MAP: Record<string, Record<string, string>> = {
  ideas: {
    INSERT: WS_EVENTS.IDEA_CREATED,
    UPDATE: WS_EVENTS.IDEA_UPDATED,
    DELETE: WS_EVENTS.IDEA_DELETED,
  },
  votes: {
    INSERT: WS_EVENTS.VOTE_CHANGED,
    UPDATE: WS_EVENTS.VOTE_CHANGED,
    DELETE: WS_EVENTS.VOTE_CHANGED,
  },
  comments: {
    INSERT: WS_EVENTS.COMMENT_CREATED,
    DELETE: WS_EVENTS.COMMENT_DELETED,
  },
  surveys: {
    INSERT: WS_EVENTS.SURVEY_CREATED,
  },
  survey_votes: {
    INSERT: WS_EVENTS.SURVEY_VOTED,
  },
  survey_ratings: {
    INSERT: WS_EVENTS.SURVEY_VOTED,
  },
  sprints: {
    UPDATE: WS_EVENTS.SPRINT_UPDATED,
  },
  statuses: {
    INSERT: WS_EVENTS.STATUS_UPDATED,
    UPDATE: WS_EVENTS.STATUS_UPDATED,
    DELETE: WS_EVENTS.STATUS_UPDATED,
  },
  notifications: {
    INSERT: WS_EVENTS.NOTIFICATION_NEW,
  },
};

export function broadcast(fastify: FastifyInstance, payload: DbChangePayload): void {
  const tableEvents = TABLE_EVENT_MAP[payload.table];
  if (!tableEvents) return;

  const eventName = tableEvents[payload.operation];
  if (!eventName) return;

  const message: WsEventMessage = {
    type: 'event',
    event: eventName,
    data: { id: payload.id, ...payload.data },
  };

  // For notifications, only send to the target user
  const notifUserId = payload.data?.['user_id'] ?? payload.data?.['userId'];
  if (payload.table === 'notifications' && notifUserId) {
    connectionManager.broadcastToUser(notifUserId as string, message);
    return;
  }

  connectionManager.broadcastAll(message);
  fastify.log.debug({ event: eventName, id: payload.id }, 'Broadcast WS event');
}
