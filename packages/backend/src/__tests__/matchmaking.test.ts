// packages/backend/src/__tests__/matchmaking.test.ts
import { MatchmakingQueue } from '../matchmaking';

describe('MatchmakingQueue', () => {
  let queue: MatchmakingQueue;

  beforeEach(() => { queue = new MatchmakingQueue(); });

  it('adds a player when queue is empty and returns null', () => {
    expect(queue.enqueue('user1', 'socket1')).toBeNull();
    expect(queue.size()).toBe(1);
  });

  it('matches two players and clears the queue', () => {
    queue.enqueue('user1', 'socket1');
    const match = queue.enqueue('user2', 'socket2');
    expect(match).toEqual({ userId: 'user1', socketId: 'socket1' });
    expect(queue.size()).toBe(0);
  });

  it('removes a player from the queue', () => {
    queue.enqueue('user1', 'socket1');
    queue.remove('user1');
    expect(queue.size()).toBe(0);
  });
});
