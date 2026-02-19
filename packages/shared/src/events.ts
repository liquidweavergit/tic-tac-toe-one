// Lobby events
export const LOBBY_EVENTS = {
  // Client → server
  JOIN_LOBBY: 'join_lobby',
  PLAY: 'play',
  WATCH: 'watch',
  // Server → client
  LOBBY_UPDATE: 'lobby_update',
} as const;

// Game events
export const GAME_EVENTS = {
  // Client → server
  JOIN_GAME: 'join_game',
  PREVIEW_MOVE: 'preview_move',
  COMMIT_MOVE: 'commit_move',
  POST_GAME_ACTION: 'post_game_action',
  // Server → client
  GAME_STATE: 'game_state',
  COUNTDOWN: 'countdown',
  GAME_OVER: 'game_over',
  OPPONENT_LEFT: 'opponent_left',
} as const;
