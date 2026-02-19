import { create } from 'zustand';

interface AuthState {
  screenName: string | null;
  wins: number;
  losses: number;
  setUser: (screenName: string, wins: number, losses: number) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  screenName: null,
  wins: 0,
  losses: 0,
  setUser: (screenName, wins, losses) => set({ screenName, wins, losses }),
  clearUser: () => set({ screenName: null, wins: 0, losses: 0 }),
}));
