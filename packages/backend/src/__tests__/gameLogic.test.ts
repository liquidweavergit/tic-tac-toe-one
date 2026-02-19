// packages/backend/src/__tests__/gameLogic.test.ts
import { checkWinner, boardFromString, boardToString, Cell } from '../lib/gameLogic';

describe('checkWinner', () => {
  it('detects a row win for x', () => {
    const board = ['x','x','x','o','o','_','_','_','_'] as Cell[];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'x', cells: [0, 1, 2] });
  });

  it('detects a column win for o', () => {
    const board = ['o','x','x','o','x','_','o','_','_'] as Cell[];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'o', cells: [0, 3, 6] });
  });

  it('detects a diagonal win', () => {
    const board = ['x','o','o','o','x','o','_','_','x'] as Cell[];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'x', cells: [0, 4, 8] });
  });

  it('detects a draw', () => {
    const board = ['x','o','x','x','o','x','o','x','o'] as Cell[];
    const result = checkWinner(board);
    expect(result).toEqual({ winner: 'draw', cells: null });
  });

  it('returns null when game is ongoing', () => {
    const board = ['x','o','_','_','_','_','_','_','_'] as Cell[];
    expect(checkWinner(board)).toBeNull();
  });
});

describe('boardFromString / boardToString', () => {
  it('round-trips correctly', () => {
    const original = 'xo_x__o__';
    expect(boardToString(boardFromString(original))).toBe(original);
  });
});
