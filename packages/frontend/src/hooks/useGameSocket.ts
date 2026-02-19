import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GAME_EVENTS, GameState, GameOverPayload } from '@ttt/shared';
import { useGameStore } from '../store/gameStore';

export function useGameSocket(
  gameId: string,
  onGameOver: (payload: GameOverPayload) => void,
  onOpponentLeft: () => void,
  onNavigateToGame: (gameId: string) => void,
) {
  const setGameState = useGameStore((s) => s.setGameState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/game', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit(GAME_EVENTS.JOIN_GAME, { gameId }));
    socket.on(GAME_EVENTS.GAME_STATE, (state: GameState) => setGameState(state));
    socket.on(GAME_EVENTS.GAME_OVER, (payload: GameOverPayload) => onGameOver(payload));
    socket.on(GAME_EVENTS.OPPONENT_LEFT, () => onOpponentLeft());
    socket.on('navigate_to_game', ({ gameId: newId }: { gameId: string }) => onNavigateToGame(newId));

    return () => { socket.disconnect(); };
  }, [gameId]);

  return socketRef;
}
