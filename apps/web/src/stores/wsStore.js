import { create } from 'zustand';
import i18n from '../i18n';
import { wsClient } from '../lib/wsClient';
import { useAuthStore } from './authStore';

export const useWsStore = create((set) => {
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
        if (err.message?.includes('token')) {
          useAuthStore.getState().logout();
        }
      }
    },

    disconnect: () => {
      wsClient.disconnect();
    },

    send: (action, payload) => {
      return wsClient.send(action, payload);
    },

    updateToken: (token) => {
      wsClient.updateToken(token);
    },
  };
});

// Setup event routing from wsClient to appStore
// Called once from App.jsx after all stores are imported
export function setupEventRouting(appStore) {
  // Sync user locale on auth:ok
  wsClient.on('auth:ok', (user) => {
    if (user?.locale && i18n.language !== user.locale) {
      i18n.changeLanguage(user.locale);
    }
  });

  wsClient.on('idea:created', (data) => {
    wsClient.send('ideas:get', { ideaId: data.id }).then(idea => {
      appStore.getState()._prependIdea(idea);
      // Also update kanban ideas
      const state = appStore.getState();
      if (state.kanbanIdeas.length > 0) {
        appStore.setState({ kanbanIdeas: [idea, ...state.kanbanIdeas.filter(i => i.id !== idea.id)] });
      }
    }).catch(() => {});
  });

  wsClient.on('idea:updated', (data) => {
    wsClient.send('ideas:get', { ideaId: data.id }).then(idea => {
      appStore.getState()._updateIdea(idea);
      // Also update kanban ideas
      const state = appStore.getState();
      if (state.kanbanIdeas.length > 0) {
        appStore.setState({ kanbanIdeas: state.kanbanIdeas.map(i => i.id === idea.id ? idea : i) });
      }
    }).catch(() => {});
  });

  wsClient.on('idea:deleted', (data) => {
    appStore.getState()._removeIdea(data.id);
    // Also update kanban ideas
    const state = appStore.getState();
    if (state.kanbanIdeas.length > 0) {
      appStore.setState({ kanbanIdeas: state.kanbanIdeas.filter(i => i.id !== data.id) });
    }
  });

  wsClient.on('vote:changed', (data) => {
    wsClient.send('ideas:get', { ideaId: data.id }).then(idea => {
      appStore.getState()._updateIdea(idea);
      // Also update kanban ideas
      const state = appStore.getState();
      if (state.kanbanIdeas.length > 0) {
        appStore.setState({ kanbanIdeas: state.kanbanIdeas.map(i => i.id === idea.id ? idea : i) });
      }
    }).catch(() => {});
  });

  wsClient.on('comment:created', (data) => {
    if (data.ideaId) {
      wsClient.send('ideas:get', { ideaId: data.ideaId }).then(idea => {
        appStore.getState()._updateIdea(idea);
      }).catch(() => {});
    }
  });

  wsClient.on('notification:new', (data) => {
    appStore.getState()._prependNotification(data);
  });

  wsClient.on('survey:created', () => {
    appStore.getState().resetAndRefetchSurveys();
  });

  wsClient.on('survey:voted', () => {
    // Optimistic updates handle local state; no full re-fetch needed
  });

  wsClient.on('survey:deleted', (data) => {
    const state = appStore.getState();
    state.setSurveysList(state.surveysList.filter(s => s.id !== data.id));
  });

  wsClient.on('survey:transitioned', () => {
    appStore.getState().resetAndRefetchSurveys();
  });

  wsClient.on('sprint:updated', () => {
    wsClient.send('sprints:list', {}).then(data => {
      appStore.getState().setSprintsList([{ id: 'all', label: i18n.t('kanban:allSprints') }, ...data]);
    }).catch(() => {});
  });

  wsClient.on('status:updated', () => {
    wsClient.send('statuses:list', {}).then(data => {
      appStore.getState().setStatusList(data);
    }).catch(() => {});
  });

  wsClient.on('settings:updated', (data) => {
    appStore.getState().setAppSettings(data);
  });
}
