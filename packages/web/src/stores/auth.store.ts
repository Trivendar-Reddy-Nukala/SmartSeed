import { create } from 'zustand';

interface User {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  tenant_name?: string;
  tenant_slug?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('smartseed_token'),
  isAuthenticated: !!localStorage.getItem('smartseed_token'),
  isLoading: true,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('smartseed_token', token);
    localStorage.setItem('smartseed_refresh_token', refreshToken);
    if (user.tenantId) localStorage.setItem('smartseed_tenant_id', user.tenantId);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => set({ user, isLoading: false }),

  logout: () => {
    localStorage.removeItem('smartseed_token');
    localStorage.removeItem('smartseed_refresh_token');
    localStorage.removeItem('smartseed_tenant_id');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));

