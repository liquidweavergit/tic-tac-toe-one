# Tic-Tac-Toe Multiplayer App — Design Document

**Date:** 2026-02-18

---

## Tech Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, Framer Motion, Zustand, socket.io-client
- **Backend:** Node.js + Express, socket.io, Prisma ORM
- **Database:** PostgreSQL 15
- **Transport:** REST (HTTP) + socket.io WebSockets
- **Infrastructure:** Docker Compose (frontend, backend, postgres)
- **Monorepo:** pnpm workspaces

---

## Project Structure

```
tic-tac-toe-one/
├── packages/
│   ├── shared/          # Shared TypeScript types and socket event constants
│   │   └── src/
│   │       ├── types.ts         # GameState, User, board types
│   │       └── events.ts        # Socket event name constants
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts         # Express + socket.io setup
│   │   │   ├── routes/          # REST endpoints (auth, availability)
│   │   │   ├── socket/          # Socket event handlers (lobby, game)
│   │   │   ├── matchmaking.ts   # In-memory queue logic
│   │   │   ├── ai.ts            # Minimax AI opponent
│   │   │   └── middleware/      # JWT auth middleware
│   │   └── prisma/
│   │       └── schema.prisma
│   └── frontend/
│       ├── src/
│       │   ├── pages/           # Login, Signup, Home, Game
│       │   ├── components/      # Board, PlayerPanel, Overlays
│       │   ├── hooks/           # useSocket, useAuth, useGame
│       │   └── store/           # Zustand stores (auth, game, lobby)
│       └── vite.config.ts       # Proxy /api and /socket.io to backend:4000
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## Database Schema (Prisma)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  screenName   String   @unique
  passwordHash String
  wins         Int      @default(0)
  losses       Int      @default(0)
  createdAt    DateTime @default(now())
  gamesAsX     Game[]   @relation("PlayerX")
  gamesAsO     Game[]   @relation("PlayerO")
}

model Game {
  id          String    @id @default(uuid())
  playerX     User      @relation("PlayerX", fields: [playerXId], references: [id])
  playerXId   String
  playerO     User?     @relation("PlayerO", fields: [playerOId], references: [id])
  playerOId   String?
  boardState  String    @default("_________") // 9 chars: x, o, or _
  currentTurn String    @default("x")          // 'x' | 'o'
  status      String    @default("waiting")    // waiting|countdown|active|finished
  winner      String?                          // 'x' | 'o' | 'draw'
  startedAt   DateTime?
  finishedAt  DateTime?
}
```

---

## REST API (`/api/v1/`)

All protected endpoints require a valid JWT in an httpOnly cookie.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signIn` | Open | Accept `username` + `password`, verify bcrypt hash, return `screenName` + set JWT cookie |
| POST | `/signUp` | Open | Accept `username`, `password`, `screenName`; validate uniqueness; hash password (bcrypt); create user; return `screenName` + set JWT cookie |
| GET | `/usernameAvailable?username=` | Open | Return `{ available: bool }` |
| GET | `/screenNameAvailable?screenName=` | Open | Return `{ available: bool }` |
| GET | `/me` | Protected | Return current user's `screenName`, `wins`, `losses` |

---

## WebSocket Events (socket.io)

### Lobby Namespace (`/lobby`)

Server broadcasts to all connected clients on any game state change:
- `lobby_update` → `{ onlineCount, activeGames: [{ id, playerX, playerO }], waitingCount }`

Client emits:
- `join_lobby` — subscribe to lobby updates
- `play` — enter matchmaking queue (optionally `{ vsAI: true }`)
- `watch` `{ gameId }` — navigate to game screen as spectator

### Game Namespace (`/game`)

Client emits:
- `join_game` `{ gameId }` — connect to a game room; server responds with full `game_state`
- `preview_move` `{ cell: 0–8 }` — active player previews a cell (echoed back to sender only)
- `commit_move` `{ cell: 0–8 }` — active player locks in move, advances game state
- `post_game_action` `{ action: 'rematch'|'new_opponent'|'quit' }`

Server emits to game room:
- `game_state` — full game snapshot sent on join and after every state change
- `countdown` `{ value: 3|2|1|'TIC-TAC-GO!' }` — fired when both players have joined
- `game_over` `{ winner: 'x'|'o'|'draw', winningCells: number[]|null }`
- `opponent_left` — opponent disconnected or quit

**Game snapshot shape:**
```ts
{
  gameId: string;
  board: (null | 'x' | 'o')[];   // length 9
  currentTurn: 'x' | 'o';
  status: 'waiting' | 'countdown' | 'active' | 'finished';
  playerX: { screenName: string; wins: number; losses: number };
  playerO: { screenName: string; wins: number; losses: number } | null;
  winner: 'x' | 'o' | 'draw' | null;
  winningCells: number[] | null;
  elapsedSeconds: number;
}
```

---

## Frontend — Pages & Components

### Auth Flow
- No valid auth cookie → redirect to `/login`
- `/login` — username + password, "Sign In" button, link to `/signup`
- `/signup` — username (debounced 2s availability check), screen name (debounced 2s), password field; inline green/red feedback; "Create User" button

### Home Screen (`/`)
- **Top bar:** Screen name (top-left) | Logout button (top-right)
- **Center card:** Title, win/loss record, live stats (players online, active games, waiting), scrollable active games list each with "Watch" button, "Play AI" checkbox, "Play Tic-Tac-Toe" button
- Stats update in real-time via `lobby_update`

### Game Screen (`/game/:id`)
- **Left panel (Player X):** Screen name, win/loss record; active/inactive/win/lose visual states
- **Right panel (Player O):** Same; shows "Waiting for opponent…" until opponent joins
- **Center board:** 3×3 `#` grid; game timer top-center (counts up while active, freezes on game over); cells clickable only on active player's turn; clicked cell shows pulsating X/O preview; "Done" button below board commits previewed move; winning line drawn through winning cells on game over
- **Countdown overlay:** Full-screen animated 3→2→1→TIC-TAC-GO! (Framer Motion)
- **Post-game overlay:** Winning character rains down screen (Framer Motion); center modal with result + Rematch / New Opponent / Quit buttons

### Zustand Stores
- `authStore` — current user (screenName, wins, losses)
- `lobbyStore` — onlineCount, activeGames, waitingCount
- `gameStore` — full GameState snapshot, previewCell (local only)

### Socket Hooks
- `useSocket(namespace)` — manages connection lifecycle; reconnects using JWT cookie
- `useGameSocket(gameId)` — emits `join_game` on connect; rehydrates from `game_state` response
- `useLobbySocket()` — emits `join_lobby` on connect; feeds `lobbyStore`

---

## Matchmaking Logic (Backend)

- In-memory `Map<userId, socketId>` queue
- On `play`: if queue empty → add player, emit `waiting` game_state; if player waiting → dequeue, create DB record, emit countdown ticks (1s apart), emit `active` game_state to both
- On `play { vsAI: true }`: immediately create game with sentinel AI playerO; AI responds with minimax after each human `commit_move`; AI plays as O, human always X

---

## Game State Machine

```
waiting → countdown → active → finished
```

- **waiting:** Game created, playerX connected, playerO slot empty
- **countdown:** PlayerO joins; server emits countdown (3→2→1→TIC-TAC-GO!) 1s between ticks
- **active:** Game live, moves accepted, client timer counts up
- **finished:** Win/draw detected; DB updated (winner, finishedAt, wins/losses incremented); post-game overlay shown

### Post-Game Action Matrix

| P1 Action | P2 Action | Result |
|---|---|---|
| Rematch | Rematch | New game, same players, winner plays X |
| Rematch | New Opponent | P1 → home with "opponent declined" toast; P2 → matchmaking |
| Either | Quit | That player → home; other sees `opponent_left` |

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:15
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment: [POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]

  backend:
    build: ./packages/backend
    depends_on:
      postgres: { condition: service_healthy }
    ports: ["4000:4000"]
    environment: [DATABASE_URL, JWT_SECRET]
    command: >
      sh -c "npx prisma migrate deploy && node dist/index.js"

  frontend:
    build: ./packages/frontend
    ports: ["3000:3000"]
    # Proxies /api/* and /socket.io/* to backend:4000
```

---

## Additional Requirements

- All screen transitions use Framer Motion animations
- Passwords hashed with **bcrypt** (cost factor 12)
- JWTs stored in **httpOnly cookies** (SameSite=Strict)
- socket.io authenticated via JWT cookie parsed on handshake
- Board, timers, and live stats rehydrate from server on reconnect — no client-side persistence required
- Win/loss records updated in DB atomically at game end
- `.env` file for secrets — not committed to git
