import { create } from 'zustand';
import { loginRequest, refreshTokenRequest } from '../lib/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  initials: string;
  avatar?: string | null;
  locale?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  readonly isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithTokens: (data: AuthTokens) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  accessToken: 'ideahub-access-token',
  refreshToken: 'ideahub-refresh-token',
  user: 'ideahub-user',
};

export const useAuthStore = create<AuthState>((set, get) => {
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const saveTokens = (tokens: AuthTokens) => {
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
    });
    localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(tokens.user));
  };

  const clearTokens = () => {
    set({ accessToken: null, refreshToken: null, user: null, error: null });
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  };

  const scheduleRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    // Refresh at 13 minutes (access token expires at 15 min)
    refreshTimer = setInterval(async () => {
      try {
        const currentRt = localStorage.getItem(STORAGE_KEYS.refreshToken);
        if (!currentRt) return;
        const data = await refreshTokenRequest(currentRt);
        saveTokens(data);
      } catch {
        clearTokens();
      }
    }, 13 * 60 * 1000);
  };

  // Try refresh on store creation if we have a stored refresh token
  const storedRefresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (storedRefresh) {
    refreshTokenRequest(storedRefresh)
      .then((data) => {
        saveTokens(data);
        scheduleRefresh();
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        set({ isLoading: false });
      });
  }

  const storedUser = localStorage.getItem(STORAGE_KEYS.user);

  return {
    user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
    accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
    refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
    isLoading: !!storedRefresh,
    error: null,

    get isAuthenticated() {
      const state = get();
      return !!state.accessToken && !!state.user;
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const data = await loginRequest(email, password);
        saveTokens(data);
        scheduleRefresh();
        set({ isLoading: false });
        return data.user;
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
        throw err;
      }
    },

    loginWithTokens: (data) => {
      saveTokens(data);
      scheduleRefresh();
      set({ isLoading: false });
    },

    logout: () => {
      clearTokens();
    },
  };
});
