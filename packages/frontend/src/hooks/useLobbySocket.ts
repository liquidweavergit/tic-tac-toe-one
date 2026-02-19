import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LOBBY_EVENTS, LobbyUpdate } from '@ttt/shared';
import { useLobbyStore } from '../store/lobbyStore';

export function useLobbySocket(onNavigateToGame: (gameId: string) => void) {
  const setLobby = useLobbyStore((s) => s.setLobby);
  const socketRef = useRef<Socket | null>(null);
  const onNavigateRef = useRef(onNavigateToGame);
  onNavigateRef.current = onNavigateToGame;

  useEffect(() => {
    const socket = io('/lobby', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit(LOBBY_EVENTS.JOIN_LOBBY));
    socket.on(LOBBY_EVENTS.LOBBY_UPDATE, (data: LobbyUpdate) => setLobby(data));
    socket.on('navigate_to_game', ({ gameId }: { gameId: string }) => onNavigateRef.current(gameId));

    return () => { socket.disconnect(); };
  }, []);

  return socketRef;
}
