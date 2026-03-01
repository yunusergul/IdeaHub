import type { FastifyInstance } from 'fastify';
import { WS_EVENTS, type WsEventMessage } from '@ideahub/shared';
import { connectionManager } from './connection-manager.js';
import { ideaInclude } from './handlers/ideas.handler.js';

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

/**
 * Map a table + event to broadcast channels.
 * Returns channels that subscribers should be on to receive this event.
 * Multiple channels may be returned (e.g., both "ideas" and "idea:<id>").
 */
function getChannels(table: string, id: string, data?: Record<string, unknown>): string[] {
  switch (table) {
    case 'ideas':
      return ['ideas', `idea:${id}`];
    case 'votes':
      return ['ideas']; // vote changes update the parent idea
    case 'comments':
      return data?.['idea_id'] ? [`idea:${data['idea_id']}`] : ['ideas'];
    case 'surveys':
    case 'survey_votes':
    case 'survey_ratings':
      return ['surveys'];
    case 'sprints':
      return ['sprints'];
    case 'statuses':
      return ['statuses'];
    default:
      return [];
  }
}

async function fetchEntity(
  fastify: FastifyInstance,
  table: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  try {
    switch (table) {
      case 'ideas':
        return await fastify.prisma.idea.findUnique({
          where: { id },
          include: ideaInclude,
        }) as Record<string, unknown> | null;
      case 'votes': {
        // For vote changes, fetch the parent idea
        const vote = await fastify.prisma.vote.findUnique({
          where: { id },
          select: { ideaId: true },
        });
        if (!vote) return null;
        return await fastify.prisma.idea.findUnique({
          where: { id: vote.ideaId },
          include: ideaInclude,
        }) as Record<string, unknown> | null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function broadcastMessage(message: WsEventMessage, channels: string[]): void {
  // Try channel-based broadcast first; falls back to broadcastAll if no subscribers
  if (channels.length > 0) {
    for (const channel of channels) {
      connectionManager.broadcastToChannel(channel, message);
    }
  } else {
    connectionManager.broadcastAll(message);
  }
}

export function broadcast(fastify: FastifyInstance, payload: DbChangePayload): void {
  const tableEvents = TABLE_EVENT_MAP[payload.table];
  if (!tableEvents) return;

  const eventName = tableEvents[payload.operation];
  if (!eventName) return;

  // For notifications, only send to the target user
  const notifUserId = payload.data?.['user_id'] ?? payload.data?.['userId'];
  if (payload.table === 'notifications' && notifUserId) {
    const message: WsEventMessage = {
      type: 'event',
      event: eventName,
      data: { id: payload.id, ...payload.data },
    };
    connectionManager.broadcastToUser(notifUserId as string, message);
    return;
  }

  const channels = getChannels(payload.table, payload.id, payload.data);

  // For ideas and votes, fetch full entity to eliminate client re-fetching
  if (payload.table === 'ideas' || payload.table === 'votes') {
    fetchEntity(fastify, payload.table, payload.id).then((entity) => {
      const data: Record<string, unknown> = { id: payload.id, ...payload.data };
      if (entity) {
        data.entity = entity;
        if (payload.table === 'votes' && entity['id']) {
          data.id = entity['id'] as string;
        }
      }
      const message: WsEventMessage = {
        type: 'event',
        event: eventName,
        data,
      };
      broadcastMessage(message, channels);
      fastify.log.debug({ event: eventName, id: data.id, channels }, 'Broadcast WS event');
    }).catch(() => {
      const message: WsEventMessage = {
        type: 'event',
        event: eventName,
        data: { id: payload.id, ...payload.data },
      };
      broadcastMessage(message, channels);
    });
    return;
  }

  const message: WsEventMessage = {
    type: 'event',
    event: eventName,
    data: { id: payload.id, ...payload.data },
  };
  broadcastMessage(message, channels);
  fastify.log.debug({ event: eventName, id: payload.id, channels }, 'Broadcast WS event');
}
