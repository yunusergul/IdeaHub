import { create } from 'zustand';
import i18n from '../i18n';
import { useWsStore } from './wsStore';
import { useAuthStore } from './authStore';
import { toast } from './toastStore';
import { applyPalette, DEFAULT_PALETTE } from '../lib/palettes';
import type {
  EnrichedIdea, EnrichedSurvey, CategoryItem, SprintItem,
  NotificationItem, VotingRuleItem, AppSettings, Integrations,
  ThemeMode, ViewMode,
} from '../types';

const _send = (action: string, payload: Record<string, unknown> = {}): Promise<unknown> =>
  useWsStore.getState().send(action, payload);

let _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyResolvedTheme(mode: ThemeMode): 'dark' | 'light' {
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}

const initTheme = (): ThemeMode => {
  const saved = (localStorage.getItem('ideahub-theme') || 'system') as ThemeMode;
  applyResolvedTheme(saved);
  return saved;
};

interface StatusItem {
  id: string;
  label: string;
  color: string;
  bg: string;
  order: number;
  description?: string;
  isSystem?: boolean;
}

interface KanbanColumnState {
  [statusId: string]: number | boolean;
}

interface AppState {
  // Domain state
  ideas: EnrichedIdea[];
  categories: CategoryItem[];
  statusList: StatusItem[];
  notifications: NotificationItem[];
  surveysList: EnrichedSurvey[];
  votingRulesList: VotingRuleItem[];
  sprintsList: SprintItem[];
  appSettings: AppSettings;
  integrations: Integrations;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Pagination state - Ideas
  ideasTotal: number;
  ideasHasMore: boolean;
  ideasLoadingMore: boolean;

  // Pagination state - Surveys
  surveysTotal: number;
  surveysHasMore: boolean;
  surveysLoadingMore: boolean;

  // Kanban state
  kanbanIdeas: EnrichedIdea[];
  kanbanColumnOffsets: Record<string, number>;
  kanbanColumnHasMore: Record<string, boolean>;
  kanbanColumnLoading: Record<string, boolean>;

  // UI state
  selectedCategory: string;
  selectedStatus: string;
  searchQuery: string;
  viewMode: ViewMode;
  theme: ThemeMode;

  // Internal mutators
  _prependIdea: (idea: EnrichedIdea) => void;
  _updateIdea: (idea: EnrichedIdea) => void;
  _removeIdea: (id: string) => void;
  _prependNotification: (data: NotificationItem) => void;

  // Settings
  setAppSettings: (data: Record<string, unknown>) => void;
  setIntegration: (id: string, config: Record<string, unknown>) => Promise<void>;
  removeIntegration: (id: string) => Promise<void>;
  setSurveysList: (data: EnrichedSurvey[]) => void;
  setSprintsList: (data: SprintItem[]) => void;
  setStatusList: (data: StatusItem[]) => void;
  setVotingRulesList: (dataOrUpdater: VotingRuleItem[] | ((prev: VotingRuleItem[]) => VotingRuleItem[])) => void;

  // Data fetching
  fetchInitialData: () => Promise<void>;
  resetInitialized: () => void;
  loadMoreIdeas: () => Promise<void>;
  resetAndRefetchIdeas: () => Promise<void>;
  loadMoreSurveys: () => Promise<void>;
  resetAndRefetchSurveys: () => Promise<void>;
  fetchKanbanIdeas: () => Promise<void>;
  fetchKanbanIdeasForStatus: (statusId: string, reset?: boolean) => Promise<void>;

  // Mutations
  vote: (ideaId: string, type: string) => Promise<void>;
  deleteIdea: (ideaId: string) => Promise<void>;
  addIdea: (newIdea: { title: string; summary?: string; content?: string; category: string; attachmentIds?: string[] }) => Promise<EnrichedIdea>;
  updateIdeaStatus: (ideaId: string, statusId: string) => Promise<void>;
  assignToSprint: (ideaId: string, sprintId: string, statusId?: string) => Promise<void>;
  voteSurvey: (surveyId: string, optionId: string) => Promise<void>;
  deleteSurvey: (surveyId: string) => Promise<void>;
  rateSurvey: (surveyId: string, rating: number) => Promise<void>;
  addStatus: (newStatus: { label: string; color: string; bg: string; description?: string }, afterOrder?: number) => Promise<void>;
  removeStatus: (statusId: string) => Promise<void>;
  reorderStatuses: (orderedIds: string[]) => Promise<void>;
  addSprint: (sprint: Record<string, unknown>) => Promise<void>;
  updateSprint: (sprintId: string, updates: Record<string, unknown>) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  setActiveSprint: (sprintId: string | null) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateSettings: (key: string, value: unknown) => Promise<void>;
  addCategory: (category: { label: string; icon: string; color: string }) => Promise<CategoryItem>;
  removeCategory: (categoryId: string) => Promise<void>;

  // UI actions
  setSelectedCategory: (cat: string) => void;
  setSelectedStatus: (statusId: string) => void;
  setSearchQuery: (q: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (mode: ThemeMode) => void;

  // Passthrough
  send: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Domain state
  ideas: [],
  categories: [],
  statusList: [],
  notifications: [],
  surveysList: [],
  votingRulesList: [],
  sprintsList: [],
  appSettings: {},
  integrations: {},
  loading: true,
  error: null,
  initialized: false,

  // Pagination state - Ideas
  ideasTotal: 0,
  ideasHasMore: true,
  ideasLoadingMore: false,

  // Pagination state - Surveys
  surveysTotal: 0,
  surveysHasMore: true,
  surveysLoadingMore: false,

  // Kanban state (loads all ideas)
  kanbanIdeas: [],

  // UI state (some persisted)
  selectedCategory: 'all',
  selectedStatus: 'all',
  searchQuery: '',
  viewMode: 'feed',
  theme: initTheme(),

  // --- Internal mutators (used by event routing) ---

  _prependIdea: (idea) => set(s => ({
    ideas: [idea, ...s.ideas.filter(i => i.id !== idea.id)],
  })),

  _updateIdea: (idea) => set(s => ({
    ideas: s.ideas.map(i => i.id === idea.id ? idea : i),
  })),

  _removeIdea: (id) => set(s => ({
    ideas: s.ideas.filter(i => i.id !== id),
  })),

  _prependNotification: (data) => set(s => ({
    notifications: [{
      ...data,
      // Normalize snake_case fields from PG trigger payload
      relatedId: data.relatedId ?? data.related_id,
      userId: data.userId ?? data.user_id,
      createdAt: data.createdAt ?? data.created_at ?? '',
    }, ...s.notifications],
  })),

  setAppSettings: (data) => {
    const d = data as AppSettings;
    if (d?.palette) applyPalette(d.palette, get().theme);
    const updates: Record<string, unknown> = { appSettings: { ...get().appSettings, ...d } };
    if (d?.integrations) {
      try { updates.integrations = JSON.parse(d.integrations); } catch { /* ignore */ }
    }
    set(updates as Partial<AppState>);
  },
  setIntegration: async (id, config) => {
    const next = { ...get().integrations, [id]: config };
    set({ integrations: next });
    try {
      await _send('settings:update', { key: 'integrations', value: JSON.stringify(next) });
    } catch {
      toast.error(i18n.t('errors:integrationSaveFailed'));
    }
  },
  removeIntegration: async (id) => {
    const next = { ...get().integrations };
    delete next[id];
    set({ integrations: next });
    try {
      await _send('settings:update', { key: 'integrations', value: JSON.stringify(next) });
    } catch {
      toast.error(i18n.t('errors:integrationRemoveFailed'));
    }
  },
  setSurveysList: (data) => set({ surveysList: data }),
  setSprintsList: (data) => set({ sprintsList: data }),
  setStatusList: (data) => set({ statusList: data }),
  setVotingRulesList: (dataOrUpdater) => set(s => ({
    votingRulesList: typeof dataOrUpdater === 'function'
      ? dataOrUpdater(s.votingRulesList)
      : dataOrUpdater,
  })),

  // --- Data fetching ---

  fetchInitialData: async () => {
    const { initialized, selectedCategory, selectedStatus, searchQuery } = get();
    if (initialized) return;
    set({ loading: true, error: null, initialized: true });

    try {
      const ideasPayload: Record<string, unknown> = { offset: 0, limit: 20 };
      if (selectedCategory !== 'all') ideasPayload.categoryId = selectedCategory;
      if (selectedStatus !== 'all') ideasPayload.statusId = selectedStatus;
      if (searchQuery) ideasPayload.search = searchQuery;

      const [ideasData, categoriesData, statusesData, notifData, surveysData, rulesData, sprintsData, settingsData] = await Promise.all([
        _send('ideas:list', ideasPayload),
        _send('categories:list', {}),
        _send('statuses:list', {}),
        _send('notifications:list', {}),
        _send('surveys:list', { offset: 0, limit: 20 }),
        _send('votingRules:list', {}),
        _send('sprints:list', {}),
        _send('settings:get', {}),
      ]) as [unknown, CategoryItem[], StatusItem[], NotificationItem[], unknown, VotingRuleItem[], SprintItem[], AppSettings];

      // Apply palette from server settings (theme-aware)
      const palette = settingsData?.palette || DEFAULT_PALETTE;
      const themeMode = get().theme;
      const resolved = themeMode === 'system' ? getSystemTheme() : themeMode;
      applyPalette(palette, resolved);

      // Parse integrations from settings
      let integrations: Integrations = {};
      try {
        if (settingsData?.integrations) {
          integrations = JSON.parse(settingsData.integrations) as Integrations;
        }
      } catch { /* ignore */ }

      const ideasResult = ideasData as { items?: EnrichedIdea[]; total?: number } | EnrichedIdea[];
      const ideas = Array.isArray(ideasResult) ? ideasResult : (ideasResult.items ?? []);
      const ideasTotal = Array.isArray(ideasResult) ? ideasResult.length : (ideasResult.total ?? 0);

      const surveysResult = surveysData as { items?: EnrichedSurvey[]; total?: number } | EnrichedSurvey[];
      const surveys = Array.isArray(surveysResult) ? surveysResult : (surveysResult.items ?? []);
      const surveysTotal = Array.isArray(surveysResult) ? surveysResult.length : (surveysResult.total ?? 0);

      set({
        ideas: Array.isArray(ideas) ? ideas : [],
        ideasTotal,
        ideasHasMore: Array.isArray(ideas) && ideas.length < ideasTotal,
        categories: [
          { id: 'all', label: i18n.t('common:all'), icon: 'LayoutGrid', color: 'var(--text-tertiary)' },
          ...categoriesData,
        ],
        statusList: statusesData,
        notifications: notifData,
        surveysList: Array.isArray(surveys) ? surveys : [],
        surveysTotal,
        surveysHasMore: Array.isArray(surveys) && surveys.length < surveysTotal,
        votingRulesList: rulesData,
        sprintsList: [
          { id: 'all', label: i18n.t('kanban:allSprints') },
          ...sprintsData,
        ],
        appSettings: settingsData || {},
        integrations,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load initial data:', err);
      set({ error: (err as Error).message, loading: false });
    }
  },

  resetInitialized: () => set({ initialized: false }),

  // --- Categories ---

  addCategory: async ({ label, icon, color }) => {
    const category = await _send('categories:create', { label, icon, color }) as CategoryItem;
    set(s => ({
      categories: [
        ...s.categories.filter(c => c.id !== 'all'),
        category,
      ].sort((a, b) => a.label.localeCompare(b.label))
        .reduce<CategoryItem[]>((acc, c) => {
          if (acc.length === 0) acc.push({ id: 'all', label: i18n.t('common:all'), icon: 'LayoutGrid', color: 'var(--text-tertiary)' });
          acc.push(c);
          return acc;
        }, []),
    }));
    return category;
  },

  removeCategory: async (categoryId) => {
    await _send('categories:delete', { categoryId });
    set(s => ({
      categories: s.categories.filter(c => c.id !== categoryId),
    }));
  },

  // --- Pagination ---

  loadMoreIdeas: async () => {
    const { ideas, ideasHasMore, ideasLoadingMore, selectedCategory, selectedStatus, searchQuery } = get();
    if (!ideasHasMore || ideasLoadingMore) return;
    set({ ideasLoadingMore: true });
    try {
      const payload: Record<string, unknown> = { offset: ideas.length, limit: 20 };
      if (selectedCategory !== 'all') payload.categoryId = selectedCategory;
      if (selectedStatus !== 'all') payload.statusId = selectedStatus;
      if (searchQuery) payload.search = searchQuery;
      const data = await _send('ideas:list', payload) as { items?: EnrichedIdea[]; total?: number };
      const items = data?.items ?? (data as unknown as EnrichedIdea[]);
      const total = data?.total ?? 0;
      if (Array.isArray(items)) {
        set(s => ({
          ideas: [...s.ideas, ...items],
          ideasTotal: total,
          ideasHasMore: s.ideas.length + items.length < total,
          ideasLoadingMore: false,
        }));
      }
    } catch (err) {
      console.error('Failed to load more ideas:', err);
      set({ ideasLoadingMore: false });
    }
  },

  resetAndRefetchIdeas: async () => {
    const { selectedCategory, selectedStatus, searchQuery } = get();
    set({ ideasLoadingMore: true });
    try {
      const payload: Record<string, unknown> = { offset: 0, limit: 20 };
      if (selectedCategory !== 'all') payload.categoryId = selectedCategory;
      if (selectedStatus !== 'all') payload.statusId = selectedStatus;
      if (searchQuery) payload.search = searchQuery;
      const data = await _send('ideas:list', payload) as { items?: EnrichedIdea[]; total?: number };
      const items = data?.items ?? (data as unknown as EnrichedIdea[]);
      const total = data?.total ?? 0;
      set({
        ideas: Array.isArray(items) ? items : [],
        ideasTotal: total,
        ideasHasMore: Array.isArray(items) && items.length < total,
        ideasLoadingMore: false,
      });
    } catch (err) {
      console.error('Failed to refetch ideas:', err);
      set({ ideasLoadingMore: false });
    }
  },

  loadMoreSurveys: async () => {
    const { surveysList, surveysHasMore, surveysLoadingMore, searchQuery } = get();
    if (!surveysHasMore || surveysLoadingMore) return;
    set({ surveysLoadingMore: true });
    try {
      const payload: Record<string, unknown> = { offset: surveysList.length, limit: 20 };
      if (searchQuery) payload.search = searchQuery;
      const data = await _send('surveys:list', payload) as { items?: EnrichedSurvey[]; total?: number };
      const items = data?.items ?? (data as unknown as EnrichedSurvey[]);
      const total = data?.total ?? 0;
      if (Array.isArray(items)) {
        set(s => ({
          surveysList: [...s.surveysList, ...items],
          surveysTotal: total,
          surveysHasMore: s.surveysList.length + items.length < total,
          surveysLoadingMore: false,
        }));
      }
    } catch (err) {
      console.error('Failed to load more surveys:', err);
      set({ surveysLoadingMore: false });
    }
  },

  resetAndRefetchSurveys: async () => {
    const { searchQuery } = get();
    set({ surveysLoadingMore: true });
    try {
      const payload: Record<string, unknown> = { offset: 0, limit: 20 };
      if (searchQuery) payload.search = searchQuery;
      const data = await _send('surveys:list', payload) as { items?: EnrichedSurvey[]; total?: number };
      const items = data?.items ?? (data as unknown as EnrichedSurvey[]);
      const total = data?.total ?? 0;
      set({
        surveysList: Array.isArray(items) ? items : [],
        surveysTotal: total,
        surveysHasMore: Array.isArray(items) && items.length < total,
        surveysLoadingMore: false,
      });
    } catch (err) {
      console.error('Failed to refetch surveys:', err);
      set({ surveysLoadingMore: false });
    }
  },

  fetchKanbanIdeas: async () => {
    try {
      const data = await _send('ideas:list', { offset: 0, limit: 1000 }) as { items?: EnrichedIdea[] };
      const items = data?.items ?? (data as unknown as EnrichedIdea[]);
      set({ kanbanIdeas: Array.isArray(items) ? items : [] });
    } catch (err) {
      console.error('Failed to fetch kanban ideas:', err);
    }
  },

  // Paginated kanban loading per status column (50 ideas per load)
  kanbanColumnOffsets: {},
  kanbanColumnHasMore: {},
  kanbanColumnLoading: {},

  fetchKanbanIdeasForStatus: async (statusId, reset = false) => {
    const { kanbanColumnOffsets, kanbanColumnHasMore, kanbanColumnLoading } = get();
    if (kanbanColumnLoading[statusId]) return;
    if (!reset && kanbanColumnHasMore[statusId] === false) return;

    const offset = reset ? 0 : (kanbanColumnOffsets[statusId] || 0);
    const limit = 50;

    set({ kanbanColumnLoading: { ...get().kanbanColumnLoading, [statusId]: true } });

    try {
      const data = await _send('ideas:list', { statusId, offset, limit }) as { items?: EnrichedIdea[]; total?: number };
      const items = data?.items ?? (data as unknown as EnrichedIdea[]);
      const total = data?.total ?? 0;

      if (!Array.isArray(items)) return;

      set(s => {
        const existingIds = new Set(
          reset ? [] : s.kanbanIdeas.filter(i => (i.status?.id || i.statusId) === statusId).map(i => i.id)
        );
        const newItems = items.filter(i => !existingIds.has(i.id));
        const kanbanIdeas = reset
          ? [...s.kanbanIdeas.filter(i => (i.status?.id || i.statusId) !== statusId), ...items]
          : [...s.kanbanIdeas, ...newItems];

        return {
          kanbanIdeas,
          kanbanColumnOffsets: { ...s.kanbanColumnOffsets, [statusId]: offset + items.length },
          kanbanColumnHasMore: { ...s.kanbanColumnHasMore, [statusId]: offset + items.length < total },
          kanbanColumnLoading: { ...s.kanbanColumnLoading, [statusId]: false },
        };
      });
    } catch (err) {
      console.error(`Failed to fetch kanban ideas for status ${statusId}:`, err);
      set({ kanbanColumnLoading: { ...get().kanbanColumnLoading, [statusId]: false } });
    }
  },

  // --- Mutations ---

  vote: async (ideaId, type) => {
    try {
      await _send('votes:cast', { ideaId, type });
    } catch {
      toast.error(i18n.t('errors:voteFailed'));
    }
  },

  deleteIdea: async (ideaId) => {
    try {
      await _send('ideas:delete', { ideaId });
      set(s => ({ ideas: s.ideas.filter(i => i.id !== ideaId) }));
    } catch (err) {
      toast.error(i18n.t('errors:ideaDeleteFailed'));
      throw err;
    }
  },

  addIdea: async (newIdea) => {
    try {
      const idea = await _send('ideas:create', {
        title: newIdea.title,
        summary: newIdea.summary || newIdea.content?.slice(0, 150) || '',
        content: newIdea.content || '',
        categoryId: newIdea.category,
        attachmentIds: newIdea.attachmentIds || [],
      }) as EnrichedIdea;
      set(s => ({ ideas: [idea, ...s.ideas.filter(i => i.id !== idea.id)] }));
      return idea;
    } catch (err) {
      toast.error(i18n.t('errors:ideaCreateFailed'));
      throw err;
    }
  },

  updateIdeaStatus: async (ideaId, statusId) => {
    try {
      const updated = await _send('ideas:update', { ideaId, statusId }) as EnrichedIdea;
      set(s => ({ ideas: s.ideas.map(i => i.id === ideaId ? updated : i) }));
    } catch {
      toast.error(i18n.t('errors:statusUpdateFailed'));
    }
  },

  assignToSprint: async (ideaId, sprintId, statusId) => {
    try {
      const payload: Record<string, unknown> = { ideaId, sprintId };
      if (statusId) payload.statusId = statusId;
      const updated = await _send('ideas:update', payload) as EnrichedIdea;
      set(s => ({ ideas: s.ideas.map(i => i.id === ideaId ? updated : i) }));
    } catch {
      toast.error(i18n.t('errors:sprintAssignFailed'));
    }
  },

  voteSurvey: async (surveyId, optionId) => {
    const currentUser = useAuthStore.getState().user;
    // Optimistic update
    set(s => ({
      surveysList: s.surveysList.map(sv => {
        if (sv.id !== surveyId) return sv;
        return {
          ...sv,
          options: sv.options.map(opt => {
            // Remove user's vote from all options
            const filteredVotes = Array.isArray(opt.votes)
              ? opt.votes.filter(v => v.userId !== currentUser?.id)
              : opt.votes;
            // Add vote to selected option
            if (opt.id === optionId && currentUser) {
              return { ...opt, votes: [...(Array.isArray(filteredVotes) ? filteredVotes : []), { userId: currentUser.id }] };
            }
            return { ...opt, votes: filteredVotes };
          }),
        };
      }),
    }));
    try {
      await _send('surveys:vote', { surveyId, optionId });
    } catch {
      toast.error(i18n.t('errors:surveyVoteFailed'));
      await get().resetAndRefetchSurveys();
    }
  },

  deleteSurvey: async (surveyId) => {
    try {
      await _send('surveys:delete', { surveyId });
      set(s => ({ surveysList: s.surveysList.filter(sv => sv.id !== surveyId) }));
    } catch (err) {
      toast.error(i18n.t('errors:surveyDeleteFailed'));
      throw err;
    }
  },

  rateSurvey: async (surveyId, rating) => {
    const currentUser = useAuthStore.getState().user;
    // Optimistic update
    set(s => ({
      surveysList: s.surveysList.map(sv => {
        if (sv.id !== surveyId) return sv;
        const ratings = Array.isArray(sv.ratings) ? sv.ratings : [];
        const existing = ratings.findIndex(r => r.userId === currentUser?.id);
        const newRatings = existing >= 0
          ? ratings.map((r, i) => i === existing ? { ...r, rating } : r)
          : [...ratings, { userId: currentUser?.id ?? '', rating }];
        return { ...sv, ratings: newRatings };
      }),
    }));
    try {
      await _send('surveys:rate', { surveyId, rating });
    } catch {
      toast.error(i18n.t('errors:surveyRateFailed'));
      await get().resetAndRefetchSurveys();
    }
  },

  addStatus: async (newStatus, afterOrder) => {
    try {
      await _send('statuses:create', {
        label: newStatus.label,
        color: newStatus.color,
        bg: newStatus.bg,
        description: newStatus.description || '',
        order: (afterOrder || 0) + 1,
      });
      const statuses = await _send('statuses:list', {}) as StatusItem[];
      set({ statusList: statuses });
    } catch {
      toast.error(i18n.t('errors:statusCreateFailed'));
    }
  },

  removeStatus: async (statusId) => {
    try {
      await _send('statuses:delete', { statusId });
      const statuses = await _send('statuses:list', {}) as StatusItem[];
      set({ statusList: statuses });
    } catch {
      toast.error(i18n.t('errors:statusDeleteFailed'));
    }
  },

  reorderStatuses: async (orderedIds) => {
    try {
      await _send('statuses:reorder', { orderedIds });
      const statuses = await _send('statuses:list', {}) as StatusItem[];
      set({ statusList: statuses });
    } catch {
      toast.error(i18n.t('errors:reorderFailed'));
    }
  },

  addSprint: async (sprint) => {
    try {
      await _send('sprints:create', sprint);
      const data = await _send('sprints:list', {}) as SprintItem[];
      set({ sprintsList: [{ id: 'all', label: i18n.t('kanban:allSprints') }, ...data] });
    } catch {
      toast.error(i18n.t('errors:sprintCreateFailed'));
    }
  },

  updateSprint: async (sprintId, updates) => {
    try {
      await _send('sprints:update', { sprintId, ...updates });
      const data = await _send('sprints:list', {}) as SprintItem[];
      set({ sprintsList: [{ id: 'all', label: i18n.t('kanban:allSprints') }, ...data] });
    } catch {
      toast.error(i18n.t('errors:sprintUpdateFailed'));
    }
  },

  deleteSprint: async (sprintId) => {
    try {
      await _send('sprints:delete', { sprintId });
      set(s => ({ sprintsList: s.sprintsList.filter(sp => sp.id !== sprintId) }));
    } catch {
      toast.error(i18n.t('errors:sprintDeleteFailed'));
    }
  },

  setActiveSprint: async (sprintId) => {
    try {
      await _send('sprints:update', { sprintId, isCurrent: true });
    } catch {
      toast.error(i18n.t('errors:sprintActivateFailed'));
    }
  },

  markNotificationRead: async (id) => {
    try {
      await _send('notifications:markRead', { notificationId: id });
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      }));
    } catch {
      toast.error(i18n.t('errors:notificationReadFailed'));
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await _send('notifications:markAllRead', {});
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
      }));
    } catch {
      toast.error(i18n.t('errors:notificationsReadFailed'));
    }
  },

  updateSettings: async (key, value) => {
    try {
      const result = await _send('settings:update', { key, value }) as AppSettings;
      set(s => ({ appSettings: { ...s.appSettings, ...result } }));
      if (key === 'palette') applyPalette(value as string, get().theme);
    } catch (err) {
      toast.error(i18n.t('errors:settingsUpdateFailed'));
      throw err;
    }
  },

  // --- UI actions ---

  setSelectedCategory: (cat) => {
    set({ selectedCategory: cat });
    get().resetAndRefetchIdeas();
  },
  setSelectedStatus: (statusId) => {
    set({ selectedStatus: statusId });
    get().resetAndRefetchIdeas();
  },
  setSearchQuery: (q) => {
    set({ searchQuery: q });
    if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => {
      _searchDebounceTimer = null;
      get().resetAndRefetchIdeas();
      get().resetAndRefetchSurveys();
    }, 300);
  },
  setViewMode: (mode) => set({ viewMode: mode }),

  setTheme: (mode) => set(s => {
    const resolved = applyResolvedTheme(mode);
    localStorage.setItem('ideahub-theme', mode);
    applyPalette(s.appSettings?.palette || DEFAULT_PALETTE, resolved);
    return { theme: mode };
  }),

  // --- send passthrough for ad-hoc WS calls ---
  send: (action, payload) => _send(action, payload || {}),
}));

// Listen for OS theme changes when theme is 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const { theme, appSettings } = useAppStore.getState();
  if (theme === 'system') {
    const resolved = getSystemTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    applyPalette(appSettings?.palette || DEFAULT_PALETTE, resolved);
  }
});
