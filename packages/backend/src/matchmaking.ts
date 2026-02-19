// packages/backend/src/matchmaking.ts
interface QueueEntry {
  userId: string;
  socketId: string;
}

export class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  enqueue(userId: string, socketId: string): QueueEntry | null {
    if (this.queue.length === 0) {
      this.queue.push({ userId, socketId });
      return null;
    }
    return this.queue.shift()!;
  }

  remove(userId: string): void {
    this.queue = this.queue.filter((e) => e.userId !== userId);
  }

  size(): number {
    return this.queue.length;
  }
}

export const matchmakingQueue = new MatchmakingQueue();
