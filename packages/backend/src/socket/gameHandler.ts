import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { matchmakingQueue } from '../matchmaking';
import { checkWinner, boardFromString, boardToString, Cell } from '../lib/gameLogic';
import { getBestMove } from '../lib/ai';
import { socketAuthMiddleware } from './authMiddleware';
import {
  GAME_EVENTS,
  LOBBY_EVENTS,
  GameState,
  MovePayload,
  PostGameAction,
  PlayPayload,
  JoinGamePayload,
  Turn,
  GameStatus,
  Winner,
} from '@ttt/shared';

// Track game start times in memory for elapsed seconds calculation
const gameStartTimes = new Map<string, Date>();

async function buildGameState(gameId: string): Promise<GameState> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      playerX: { select: { screenName: true, wins: true, losses: true } },
      playerO: { select: { screenName: true, wins: true, losses: true } },
    },
  });

  const startTime = gameStartTimes.get(gameId);
  const elapsedSeconds =
    game.status === 'active' && startTime
      ? Math.floor((Date.now() - startTime.getTime()) / 1000)
      : 0;

  const board = boardFromString(game.boardState);

  return {
    gameId: game.id,
    board: board.map((c) => (c === '_' ? null : (c as 'x' | 'o'))),
    currentTurn: game.currentTurn as Turn,
    status: game.status as GameStatus,
    playerX: game.playerX,
    playerO: game.playerO ?? null,
    winner: (game.winner as Winner) ?? null,
    winningCells: null, // Recalculated from board if needed
    elapsedSeconds,
  };
}

async function sendCountdown(io: Server, gameId: string) {
  const ticks: Array<3 | 2 | 1 | 'TIC-TAC-GO!'> = [3, 2, 1, 'TIC-TAC-GO!'];
  for (const value of ticks) {
    io.of('/game').to(gameId).emit(GAME_EVENTS.COUNTDOWN, { value });
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export function registerGameNamespace(io: Server) {
  const gameNs = io.of('/game');
  gameNs.use(socketAuthMiddleware);

  // Handle play event from lobby namespace
  io.of('/lobby').on('connection', (socket: Socket) => {
    socket.on(LOBBY_EVENTS.PLAY, async (payload: PlayPayload = {}) => {
      const userId = socket.data.userId as string;

      if (payload.vsAI) {
        const game = await prisma.game.create({
          data: { playerXId: userId, status: 'active', startedAt: new Date() },
        });
        gameStartTimes.set(game.id, new Date());
        socket.emit('navigate_to_game', { gameId: game.id });
        return;
      }

      const waiting = matchmakingQueue.enqueue(userId, socket.id);

      if (!waiting) {
        // This player is waiting — create a placeholder game
        const game = await prisma.game.create({ data: { playerXId: userId } });
        socket.data.waitingGameId = game.id;
        socket.emit('navigate_to_game', { gameId: game.id });
        return;
      }

      // Found a match — waiting player is X, current player is O
      // Get the waiting player's game ID from their socket data
      const lobbySockets = await io.of('/lobby').fetchSockets();
      const waitingSocket = lobbySockets.find((s) => s.data.userId === waiting.userId);
      const waitingGameId = waitingSocket?.data.waitingGameId as string | undefined;

      if (!waitingGameId) {
        // Edge case: stale match, re-enqueue current player
        matchmakingQueue.enqueue(userId, socket.id);
        const game = await prisma.game.create({ data: { playerXId: userId } });
        socket.data.waitingGameId = game.id;
        socket.emit('navigate_to_game', { gameId: game.id });
        return;
      }

      // Update the existing waiting game to add player O
      const game = await prisma.game.update({
        where: { id: waitingGameId },
        data: { playerOId: userId, status: 'countdown' },
      });

      socket.emit('navigate_to_game', { gameId: game.id });

      // Start countdown then mark active
      await sendCountdown(io, game.id);
      await prisma.game.update({
        where: { id: game.id },
        data: { status: 'active', startedAt: new Date() },
      });
      gameStartTimes.set(game.id, new Date());

      const state = await buildGameState(game.id);
      io.of('/game').to(game.id).emit(GAME_EVENTS.GAME_STATE, state);
    });
  });

  gameNs.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;

    socket.on(GAME_EVENTS.JOIN_GAME, async ({ gameId }: JoinGamePayload) => {
      await socket.join(gameId);
      const state = await buildGameState(gameId);
      socket.emit(GAME_EVENTS.GAME_STATE, state);
    });

    socket.on(GAME_EVENTS.PREVIEW_MOVE, ({ cell }: MovePayload) => {
      socket.emit('preview_ack', { cell });
    });

    socket.on(GAME_EVENTS.COMMIT_MOVE, async ({ cell }: MovePayload) => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const gameId = rooms[0];
      if (!gameId) return;

      const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'active') return;

      const board = boardFromString(game.boardState);
      if (board[cell] !== '_') return;

      const turn = game.currentTurn as 'x' | 'o';
      const isX = game.playerXId === userId;
      const isO = game.playerOId === userId;
      if ((turn === 'x' && !isX) || (turn === 'o' && !isO)) return;

      board[cell] = turn;
      const nextTurn: Turn = turn === 'x' ? 'o' : 'x';
      const winResult = checkWinner(board);

      if (winResult) {
        const winner = winResult.winner as Winner;
        await prisma.game.update({
          where: { id: gameId },
          data: {
            boardState: boardToString(board),
            status: 'finished',
            winner: winner ?? undefined,
            finishedAt: new Date(),
          },
        });

        if (winner === 'x' || winner === 'o') {
          const winnerId = winner === 'x' ? game.playerXId : game.playerOId;
          const loserId = winner === 'x' ? game.playerOId : game.playerXId;
          if (winnerId) await prisma.user.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
          if (loserId) await prisma.user.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
        }

        const state = await buildGameState(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, state);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_OVER, {
          winner: winResult.winner,
          winningCells: winResult.cells,
        });
      } else {
        await prisma.game.update({
          where: { id: gameId },
          data: { boardState: boardToString(board), currentTurn: nextTurn },
        });

        const state = await buildGameState(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, state);

        // AI move if next turn is O and no playerO in DB
        if (nextTurn === 'o' && !game.playerOId) {
          setTimeout(async () => {
            const freshGame = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
            if (freshGame.status !== 'active') return; // game ended

            const freshBoard = boardFromString(freshGame.boardState);
            const aiMove = getBestMove(freshBoard, 'o');
            if (aiMove === -1) return; // board full (shouldn't happen)

            freshBoard[aiMove] = 'o';
            const aiWin = checkWinner(freshBoard);

            if (aiWin) {
              await prisma.game.update({
                where: { id: gameId },
                data: {
                  boardState: boardToString(freshBoard),
                  status: 'finished',
                  winner: aiWin.winner ?? undefined,
                  finishedAt: new Date(),
                },
              });
              if (aiWin.winner === 'o') {
                await prisma.user.update({ where: { id: game.playerXId }, data: { losses: { increment: 1 } } });
              } else if (aiWin.winner === 'x') {
                await prisma.user.update({ where: { id: game.playerXId }, data: { wins: { increment: 1 } } });
              }
              const s = await buildGameState(gameId);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, s);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_OVER, { winner: aiWin.winner, winningCells: aiWin.cells });
            } else {
              await prisma.game.update({
                where: { id: gameId },
                data: { boardState: boardToString(freshBoard), currentTurn: 'x' },
              });
              const s = await buildGameState(gameId);
              gameNs.to(gameId).emit(GAME_EVENTS.GAME_STATE, s);
            }
          }, 500);
        }
      }
    });

    socket.on(GAME_EVENTS.POST_GAME_ACTION, async ({ action }: PostGameAction) => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const gameId = rooms[0];
      if (!gameId) return;

      const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'finished') return;

      if (action === 'quit') {
        socket.leave(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
        return;
      }

      if (action === 'new_opponent') {
        socket.leave(gameId);
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
        return;
      }

      if (action === 'rematch') {
        const key = `rematch:${gameId}`;
        socket.data[key] = true;

        const sockets = await gameNs.in(gameId).fetchSockets();
        const bothReady = sockets.length === 2 && sockets.every((s) => s.data[key]);

        if (bothReady) {
          const prevWinner = game.winner;
          const newXId =
            prevWinner === 'x'
              ? game.playerXId
              : prevWinner === 'o'
              ? game.playerOId!
              : game.playerXId;
          const newOId = newXId === game.playerXId ? game.playerOId : game.playerXId;

          const newGame = await prisma.game.create({
            data: { playerXId: newXId, playerOId: newOId, status: 'countdown' },
          });

          for (const s of sockets) {
            s.emit('navigate_to_game', { gameId: newGame.id });
          }

          await sendCountdown(io, newGame.id);
          await prisma.game.update({
            where: { id: newGame.id },
            data: { status: 'active', startedAt: new Date() },
          });
          gameStartTimes.set(newGame.id, new Date());

          const state = await buildGameState(newGame.id);
          gameNs.to(newGame.id).emit(GAME_EVENTS.GAME_STATE, state);
        }
      }
    });

    socket.on('disconnect', () => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const gameId of rooms) {
        gameNs.to(gameId).emit(GAME_EVENTS.OPPONENT_LEFT);
      }
      matchmakingQueue.remove(userId);
    });
  });
}
