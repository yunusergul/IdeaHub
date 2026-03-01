import { z } from 'zod';

// --- Client → Server Messages ---

export const WsActionMessage = z.object({
  type: z.literal('action'),
  id: z.string(),
  action: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const WsAuthMessage = z.object({
  type: z.literal('auth'),
  token: z.string(),
});

export const WsAuthRefreshMessage = z.object({
  type: z.literal('auth:refresh'),
  refreshToken: z.string(),
});

export const WsClientMessage = z.discriminatedUnion('type', [
  WsActionMessage,
  WsAuthMessage,
  WsAuthRefreshMessage,
]);

export type WsClientMessage = z.infer<typeof WsClientMessage>;

// --- Server → Client Messages ---

export const WsResultMessage = z.object({
  type: z.literal('result'),
  id: z.string(),
  action: z.string(),
  data: z.unknown(),
});

export const WsEventMessage = z.object({
  type: z.literal('event'),
  event: z.string(),
  data: z.unknown(),
});

export const WsAuthOkMessage = z.object({
  type: z.literal('auth:ok'),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    department: z.string(),
    initials: z.string(),
    locale: z.string().optional(),
  }),
  accessToken: z.string().optional(),
});

export const WsErrorMessage = z.object({
  type: z.literal('error'),
  id: z.string().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type WsResultMessage = z.infer<typeof WsResultMessage>;
export type WsEventMessage = z.infer<typeof WsEventMessage>;
export type WsAuthOkMessage = z.infer<typeof WsAuthOkMessage>;
export type WsErrorMessage = z.infer<typeof WsErrorMessage>;

export type WsServerMessage = WsResultMessage | WsEventMessage | WsAuthOkMessage | WsErrorMessage;

// --- Action Names ---

export const WS_ACTIONS = {
  // Ideas
  IDEAS_LIST: 'ideas:list',
  IDEAS_GET: 'ideas:get',
  IDEAS_CREATE: 'ideas:create',
  IDEAS_UPDATE: 'ideas:update',
  IDEAS_DELETE: 'ideas:delete',

  // Votes
  VOTES_CAST: 'votes:cast',
  VOTES_REMOVE: 'votes:remove',

  // Comments
  COMMENTS_LIST: 'comments:list',
  COMMENTS_CREATE: 'comments:create',
  COMMENTS_DELETE: 'comments:delete',
  COMMENTS_LIKE: 'comments:like',
  COMMENTS_UNLIKE: 'comments:unlike',

  // Surveys
  SURVEYS_LIST: 'surveys:list',
  SURVEYS_CREATE: 'surveys:create',
  SURVEYS_VOTE: 'surveys:vote',
  SURVEYS_RATE: 'surveys:rate',
  SURVEYS_DELETE: 'surveys:delete',

  // Sprints
  SPRINTS_LIST: 'sprints:list',
  SPRINTS_CREATE: 'sprints:create',
  SPRINTS_UPDATE: 'sprints:update',
  SPRINTS_DELETE: 'sprints:delete',

  // Statuses
  STATUSES_LIST: 'statuses:list',
  STATUSES_CREATE: 'statuses:create',
  STATUSES_UPDATE: 'statuses:update',
  STATUSES_DELETE: 'statuses:delete',
  STATUSES_REORDER: 'statuses:reorder',

  // Categories
  CATEGORIES_LIST: 'categories:list',

  // Notifications
  NOTIFICATIONS_LIST: 'notifications:list',
  NOTIFICATIONS_MARK_READ: 'notifications:markRead',
  NOTIFICATIONS_MARK_ALL_READ: 'notifications:markAllRead',

  // Users
  USERS_LIST: 'users:list',
  USERS_UPDATE: 'users:update',

  // Voting Rules
  VOTING_RULES_LIST: 'votingRules:list',
  VOTING_RULES_CREATE: 'votingRules:create',
  VOTING_RULES_UPDATE: 'votingRules:update',
  VOTING_RULES_DELETE: 'votingRules:delete',

  // App Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Preferences
  PREFERENCES_GET: 'preferences:get',
  PREFERENCES_UPDATE: 'preferences:update',
} as const;

// --- Event Names ---

export const WS_EVENTS = {
  IDEA_CREATED: 'idea:created',
  IDEA_UPDATED: 'idea:updated',
  IDEA_DELETED: 'idea:deleted',
  VOTE_CHANGED: 'vote:changed',
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',
  COMMENT_LIKED: 'comment:liked',
  SURVEY_CREATED: 'survey:created',
  SURVEY_VOTED: 'survey:voted',
  SURVEY_TRANSITIONED: 'survey:transitioned',
  SURVEY_DELETED: 'survey:deleted',
  SPRINT_UPDATED: 'sprint:updated',
  STATUS_UPDATED: 'status:updated',
  NOTIFICATION_NEW: 'notification:new',
  USER_UPDATED: 'user:updated',
  SETTINGS_UPDATED: 'settings:updated',
} as const;
