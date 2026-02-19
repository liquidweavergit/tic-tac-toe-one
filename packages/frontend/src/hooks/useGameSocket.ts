import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GAME_EVENTS, GameState, GameOverPayload, CountdownValue } from '@ttt/shared';
import { useGameStore } from '../store/gameStore';

export function useGameSocket(
  gameId: string,
  onGameOver: (payload: GameOverPayload) => void,
  onOpponentLeft: () => void,
  onNavigateToGame: (gameId: string) => void,
  onCountdown: (value: CountdownValue['value']) => void,
) {
  const setGameState = useGameStore((s) => s.setGameState);
  const socketRef = useRef<Socket | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const onOpponentLeftRef = useRef(onOpponentLeft);
  const onNavigateRef = useRef(onNavigateToGame);
  const onCountdownRef = useRef(onCountdown);

  // Always keep refs up to date
  onGameOverRef.current = onGameOver;
  onOpponentLeftRef.current = onOpponentLeft;
  onNavigateRef.current = onNavigateToGame;
  onCountdownRef.current = onCountdown;

  useEffect(() => {
    const socket = io('/game', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit(GAME_EVENTS.JOIN_GAME, { gameId }));
    socket.on(GAME_EVENTS.GAME_STATE, (state: GameState) => setGameState(state));
    socket.on(GAME_EVENTS.GAME_OVER, (payload: GameOverPayload) => onGameOverRef.current(payload));
    socket.on(GAME_EVENTS.OPPONENT_LEFT, () => onOpponentLeftRef.current());
    socket.on('navigate_to_game', ({ gameId: newId }: { gameId: string }) => onNavigateRef.current(newId));
    socket.on(GAME_EVENTS.COUNTDOWN, ({ value }: CountdownValue) => onCountdownRef.current(value));

    return () => { socket.disconnect(); };
  }, [gameId]);

  return socketRef;
}
