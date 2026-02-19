// packages/backend/src/lib/gameLogic.ts
type Cell = 'x' | 'o' | '_';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function checkWinner(
  board: string[]
): { winner: 'x' | 'o' | 'draw'; cells: number[] | null } | null {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '_' && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a] as 'x' | 'o', cells: [a, b, c] };
    }
  }
  if (board.every((c) => c !== '_')) return { winner: 'draw', cells: null };
  return null;
}

export function boardFromString(s: string): string[] {
  return s.split('');
}

export function boardToString(board: string[]): string {
  return board.join('');
}
