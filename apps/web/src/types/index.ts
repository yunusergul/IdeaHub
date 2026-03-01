import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Re-export domain types from shared
export type {
  User, UserRole,
  Idea, Attachment,
  Vote, VoteType,
  Comment,
  Survey, SurveyType,
  Sprint,
  Status,
  VotingRule,
  UserPreferences,
  AuthResponse,
} from '@ideahub/shared';
export { WS_ACTIONS, WS_EVENTS } from '@ideahub/shared';

// Enriched frontend types (backend returns nested objects)
export interface EnrichedIdea {
  id: string;
  title: string;
  summary: string;
  content: string;
  categoryId: string;
  statusId: string;
  authorId: string;
  sprintId?: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
  // Enriched nested objects from backend
  author: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    initials: string;
    avatar?: string | null;
  };
  status?: {
    id: string;
    label: string;
    color: string;
    bg: string;
    order: number;
    description: string;
    isSystem: boolean;
  };
  category?: {
    id: string;
    label: string;
    icon: string;
    color: string;
  };
  sprint?: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  } | null;
  votes?: Array<{ userId: string; type: string }>;
  voters?: string[];
  attachments?: Array<{
    id: string;
    filename?: string;
    name?: string;
    url: string;
    mimeType?: string;
    type?: string;
    size?: number;
  }>;
}

export interface EnrichedComment {
  id: string;
  ideaId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  user?: { id: string; name: string; initials: string; department?: string };
  author?: { id: string; name: string; initials: string; department?: string };
  replies?: EnrichedComment[];
  likes?: Array<{ userId: string }>;
  likeCount?: number;
}

export interface EnrichedSurvey {
  id: string;
  title: string;
  question: string;
  type: string;
  ideaId?: string | null;
  createdById: string;
  isActive: boolean;
  targetDepartments: string[];
  createdAt: string;
  dueDate?: string;
  autoTransition?: boolean;
  targetStatusId?: string | null;
  targetSprintId?: string | null;
  targetStatus?: { id: string; label: string };
  targetSprint?: { id: string; label: string };
  transitionedAt?: string;
  createdBy?: { id: string; name: string } | string;
  votedBy?: string[];
  options: Array<{
    id: string;
    label?: string;
    text?: string;
    votes: Array<{ userId: string }> | number;
    idea?: { id: string; title: string };
  }>;
  ratings?: Array<{ userId: string; rating: number }>;
  avgRating?: number;
  ratingCount?: number;
}

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface SprintItem {
  id: string;
  label: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  relatedId?: string;
  related_id?: string;
  userId?: string;
  user_id?: string;
  read: boolean;
  createdAt: string;
  created_at?: string;
}

export interface VotingRuleItem {
  id: string;
  categoryId: string;
  department: string;
  multiplier: number;
  isActive: boolean;
}

export interface AppSettings {
  palette?: string;
  integrations?: string;
  kanban_user_readonly?: string;
  [key: string]: unknown;
}

export interface IntegrationConfig {
  [key: string]: unknown;
}

export interface Integrations {
  [integrationId: string]: IntegrationConfig;
}

export interface IntegrationField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
}

export interface IntegrationDef {
  id: string;
  name: string;
  sso?: boolean;
  description: string;
  icon: ReactNode;
  fields: IntegrationField[];
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'warning';
}

export type WsConnectionState = 'disconnected' | 'connected' | 'reconnecting' | 'failed';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ViewMode = 'feed' | 'grid';
