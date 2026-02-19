// packages/backend/src/__tests__/ai.test.ts
import { getBestMove } from '../lib/ai';
import { Cell } from '../lib/gameLogic';

describe('getBestMove', () => {
  it('blocks opponent win', () => {
    // x at 0,1 — o must block at 2
    const board = ['x','x','_','o','_','_','_','_','_'] as Cell[];
    expect(getBestMove(board, 'o')).toBe(2);
  });

  it('takes the winning move', () => {
    // o at 3,4 — o should win at 5
    const board = ['x','x','o','o','o','_','x','_','_'] as Cell[];
    expect(getBestMove(board, 'o')).toBe(5);
  });

  it('plays center on empty board', () => {
    const board = Array(9).fill('_') as Cell[];
    expect(getBestMove(board, 'x')).toBe(4);
  });
});
