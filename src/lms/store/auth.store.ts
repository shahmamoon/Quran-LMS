import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setInitializing: (v: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true, isInitializing: false }),

      setAccessToken: (token) => set({ accessToken: token }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false }),

      setInitializing: (v) => set({ isInitializing: v }),

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'lms-auth',
      // accessToken intentionally excluded — kept in memory only to prevent XSS exfiltration.
      // On page reload, LMSLayout's AuthInitializer re-issues a token via the httpOnly refresh cookie.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
