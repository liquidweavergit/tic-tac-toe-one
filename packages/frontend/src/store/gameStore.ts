import { create } from 'zustand';
import { GameState } from '@ttt/shared';

interface GameStoreState {
  gameState: GameState | null;
  previewCell: number | null;
  setGameState: (state: GameState) => void;
  setPreviewCell: (cell: number | null) => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  gameState: null,
  previewCell: null,
  setGameState: (gameState) => set({ gameState }),
  setPreviewCell: (previewCell) => set({ previewCell }),
}));
