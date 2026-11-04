import { create } from 'zustand';
import api, { setAuthToken, getAuthToken, clearAuthToken } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Authenticate with email & password. */
  login: (email: string, password: string) => Promise<void>;
  /** Clear credentials and sign out. */
  logout: () => Promise<void>;
  /** Hydrate state from SecureStore on app launch. */
  loadStoredAuth: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post<{ user: User; token: string }>(
        '/auth/login',
        { email, password },
      );
      const { user, token } = response.data;
      await setAuthToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await clearAuthToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getAuthToken();
      if (token) {
        // Validate the stored token against the server.
        const response = await api.get<{ user: User }>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({
          user: response.data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Token is invalid or network error — start fresh.
      await clearAuthToken();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
