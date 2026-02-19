// packages/backend/src/lib/ai.ts
import { checkWinner, Cell } from './gameLogic';

type Player = 'x' | 'o';

function opponent(p: Player): Player {
  return p === 'x' ? 'o' : 'x';
}

function minimax(
  board: Cell[],
  player: Player,
  isMaximizing: boolean,
  aiPlayer: Player,
  depth: number
): number {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === aiPlayer) return 10 - depth;
    if (result.winner === 'draw') return 0;
    return depth - 10;
  }

  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '_') continue;
    board[i] = player;
    scores.push(minimax(board, opponent(player), !isMaximizing, aiPlayer, depth + 1));
    board[i] = '_';
  }

  return isMaximizing ? Math.max(...scores) : Math.min(...scores);
}

// Prefer center, then corners, then edges as tiebreakers
const MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];

export function getBestMove(board: Cell[], aiPlayer: Player): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (const i of MOVE_ORDER) {
    if (board[i] !== '_') continue;
    board[i] = aiPlayer;
    const score = minimax(board, opponent(aiPlayer), false, aiPlayer, 0);
    board[i] = '_';
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}
