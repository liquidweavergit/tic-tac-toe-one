import { Namespace, Socket, Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { matchmakingQueue } from '../matchmaking';
import { LOBBY_EVENTS, LobbyUpdate } from '@ttt/shared';
import { socketAuthMiddleware } from './authMiddleware';

export function registerLobbyNamespace(io: Server) {
  const lobby: Namespace = io.of('/lobby');
  lobby.use(socketAuthMiddleware);

  async function broadcastLobbyUpdate() {
    const [activeSockets, activeGames] = await Promise.all([
      lobby.fetchSockets(),
      prisma.game.findMany({
        where: { status: { in: ['waiting', 'countdown', 'active'] } },
        include: {
          playerX: { select: { screenName: true } },
          playerO: { select: { screenName: true } },
        },
      }),
    ]);

    const update: LobbyUpdate = {
      onlineCount: activeSockets.length,
      activeGames: activeGames.map((g) => ({
        id: g.id,
        playerX: g.playerX.screenName,
        playerO: g.playerO?.screenName ?? null,
      })),
      waitingCount: matchmakingQueue.size(),
    };

    lobby.emit(LOBBY_EVENTS.LOBBY_UPDATE, update);
  }

  lobby.on('connection', (socket: Socket) => {
    socket.on(LOBBY_EVENTS.JOIN_LOBBY, () => broadcastLobbyUpdate());

    socket.on(LOBBY_EVENTS.WATCH, ({ gameId }: { gameId: string }) => {
      socket.emit('navigate_to_game', { gameId });
    });

    socket.on('disconnect', () => broadcastLobbyUpdate());
  });

  return { broadcastLobbyUpdate };
}
