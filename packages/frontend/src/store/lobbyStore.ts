import { create } from 'zustand';
import { ActiveGameSummary } from '@ttt/shared';

interface LobbyState {
  onlineCount: number;
  activeGames: ActiveGameSummary[];
  waitingCount: number;
  setLobby: (data: { onlineCount: number; activeGames: ActiveGameSummary[]; waitingCount: number }) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  onlineCount: 0,
  activeGames: [],
  waitingCount: 0,
  setLobby: (data) => set(data),
}));
