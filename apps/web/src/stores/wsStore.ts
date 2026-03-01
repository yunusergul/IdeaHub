import { create } from 'zustand';
import type { StoreApi } from 'zustand';
import i18n from '../i18n';
import { wsClient } from '../lib/wsClient';
import { useAuthStore } from './authStore';
import type { WsConnectionState, EnrichedIdea, EnrichedSurvey, NotificationItem, CategoryItem, SprintItem } from '../types';

interface WsState {
  connectionState: WsConnectionState;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  send: (action: string, payload?: Record<string, unknown>) => Promise<unknown>;
  updateToken: (token: string) => void;
}

export const useWsStore = create<WsState>((set) => {
  // Sync wsClient state changes into the store
  wsClient.onStateChange((newState) => {
    set({ connectionState: newState });
  });

  // Provide wsClient with a way to get the freshest token on reconnect
  wsClient.setTokenGetter(() => useAuthStore.getState().accessToken);
  wsClient.setTokenRefresher(async () => {
    const rt = localStorage.getItem('ideahub-refresh-token');
    if (!rt) return null;
    try {
      const { refreshTokenRequest } = await import('../lib/api');
      const data = await refreshTokenRequest(rt);
      useAuthStore.getState().loginWithTokens(data);
      return data.accessToken;
    } catch {
      return null;
    }
  });

  return {
    connectionState: wsClient.state,

    connect: async (token) => {
      try {
        await wsClient.connect(token);
      } catch (err) {
        console.error('WS auth failed:', err);
        if ((err as Error).message?.includes('token')) {
          useAuthStore.getState().logout();
        }
      }
    },

    disconnect: () => {
      wsClient.disconnect();
    },

    send: (action, payload) => {
      return wsClient.send(action, payload || {});
    },

    updateToken: (token) => {
      wsClient.updateToken(token);
    },
  };
});

// AppStore type for event routing (avoids circular import)
interface AppStoreForRouting {
  getState: () => {
    _prependIdea: (idea: EnrichedIdea) => void;
    _updateIdea: (idea: EnrichedIdea) => void;
    _removeIdea: (id: string) => void;
    _prependNotification: (data: NotificationItem) => void;
    resetAndRefetchSurveys: () => Promise<void>;
    setSurveysList: (data: EnrichedSurvey[]) => void;
    setSprintsList: (data: SprintItem[]) => void;
    setStatusList: (data: Array<{ id: string; label: string; color: string; bg: string; order: number; description?: string; isSystem?: boolean }>) => void;
    setAppSettings: (data: Record<string, unknown>) => void;
    kanbanIdeas: EnrichedIdea[];
    surveysList: EnrichedSurvey[];
  };
  setState: (partial: Record<string, unknown>) => void;
}

// Setup event routing from wsClient to appStore
// Called once from App.tsx after all stores are imported
export function setupEventRouting(appStore: AppStoreForRouting): void {
  // Sync user locale on auth:ok and subscribe to default channels
  wsClient.on('auth:ok', (user) => {
    const u = user as { locale?: string } | undefined;
    if (u?.locale && i18n.language !== u.locale) {
      i18n.changeLanguage(u.locale);
    }
    // Subscribe to core channels for real-time updates
    wsClient.subscribe(['ideas', 'surveys', 'sprints', 'statuses']).catch(() => {});
  });

  wsClient.on('idea:created', (data) => {
    const d = data as { entity?: EnrichedIdea };
    const idea = d.entity;
    if (!idea) return;
    appStore.getState()._prependIdea(idea);
    // Also update kanban ideas
    const state = appStore.getState();
    if (state.kanbanIdeas.length > 0) {
      appStore.setState({ kanbanIdeas: [idea, ...state.kanbanIdeas.filter(i => i.id !== idea.id)] });
    }
  });

  wsClient.on('idea:updated', (data) => {
    const d = data as { entity?: EnrichedIdea };
    const idea = d.entity;
    if (!idea) return;
    appStore.getState()._updateIdea(idea);
    const state = appStore.getState();
    if (state.kanbanIdeas.length > 0) {
      appStore.setState({ kanbanIdeas: state.kanbanIdeas.map(i => i.id === idea.id ? idea : i) });
    }
  });

  wsClient.on('idea:deleted', (data) => {
    const d = data as { id: string };
    appStore.getState()._removeIdea(d.id);
    const state = appStore.getState();
    if (state.kanbanIdeas.length > 0) {
      appStore.setState({ kanbanIdeas: state.kanbanIdeas.filter(i => i.id !== d.id) });
    }
  });

  wsClient.on('vote:changed', (data) => {
    const d = data as { entity?: EnrichedIdea };
    const idea = d.entity;
    if (!idea) return;
    appStore.getState()._updateIdea(idea);
    const state = appStore.getState();
    if (state.kanbanIdeas.length > 0) {
      appStore.setState({ kanbanIdeas: state.kanbanIdeas.map(i => i.id === idea.id ? idea : i) });
    }
  });

  wsClient.on('comment:created', () => {
    // Comment count is updated via idea:updated event from PG trigger
  });

  wsClient.on('notification:new', (data) => {
    appStore.getState()._prependNotification(data as NotificationItem);
  });

  wsClient.on('survey:created', () => {
    appStore.getState().resetAndRefetchSurveys();
  });

  wsClient.on('survey:voted', () => {
    // Optimistic updates handle local state; no full re-fetch needed
  });

  wsClient.on('survey:deleted', (data) => {
    const d = data as { id: string };
    const state = appStore.getState();
    state.setSurveysList(state.surveysList.filter(s => s.id !== d.id));
  });

  wsClient.on('survey:transitioned', () => {
    appStore.getState().resetAndRefetchSurveys();
  });

  wsClient.on('sprint:updated', () => {
    wsClient.send('sprints:list', {}).then(data => {
      appStore.getState().setSprintsList([{ id: 'all', label: i18n.t('kanban:allSprints') }, ...(data as SprintItem[])]);
    }).catch(() => {});
  });

  wsClient.on('status:updated', () => {
    wsClient.send('statuses:list', {}).then(data => {
      appStore.getState().setStatusList(data as Array<{ id: string; label: string; color: string; bg: string; order: number; description?: string; isSystem?: boolean }>);
    }).catch(() => {});
  });

  wsClient.on('category:updated', () => {
    wsClient.send('categories:list', {}).then(data => {
      appStore.setState({
        categories: [
          { id: 'all', label: i18n.t('common:all'), icon: 'LayoutGrid', color: 'var(--text-tertiary)' },
          ...(data as CategoryItem[]),
        ],
      });
    }).catch(() => {});
  });

  wsClient.on('settings:updated', (data) => {
    appStore.getState().setAppSettings(data as Record<string, unknown>);
  });
}
