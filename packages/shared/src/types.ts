export type CellValue = 'x' | 'o' | null;
export type Turn = 'x' | 'o';
export type GameStatus = 'waiting' | 'countdown' | 'active' | 'finished';
export type Winner = 'x' | 'o' | 'draw' | null;

export interface PlayerInfo {
  screenName: string;
  wins: number;
  losses: number;
}

export interface GameState {
  gameId: string;
  board: CellValue[];        // length 9
  currentTurn: Turn;
  status: GameStatus;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  winner: Winner;
  winningCells: number[] | null;
  elapsedSeconds: number;
}

export interface ActiveGameSummary {
  id: string;
  playerX: string;
  playerO: string | null;
}

export interface LobbyUpdate {
  onlineCount: number;
  activeGames: ActiveGameSummary[];
  waitingCount: number;
}

export interface CountdownValue {
  value: 3 | 2 | 1 | 'TIC-TAC-GO!';
}

export interface MovePayload {
  cell: number; // 0-8
}

export interface PostGameAction {
  action: 'rematch' | 'new_opponent' | 'quit';
}

export interface GameOverPayload {
  winner: Winner;
  winningCells: number[] | null;
}

export interface WatchPayload {
  gameId: string;
}

export interface PlayPayload {
  vsAI?: boolean;
}

export interface JoinGamePayload {
  gameId: string;
}
