import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GAME_EVENTS, GameOverPayload, CountdownValue } from '@ttt/shared';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { Board } from '../components/Board';
import { PlayerPanel } from '../components/PlayerPanel';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { PostGameOverlay } from '../components/PostGameOverlay';

export function GamePage() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { screenName } = useAuthStore();
  const { gameState, previewCell, setPreviewCell } = useGameStore();
  const [countdownValue, setCountdownValue] = useState<CountdownValue['value'] | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);

  const socketRef = useGameSocket(
    gameId!,
    (payload) => setGameOver(payload),
    () => navigate('/'),
    (newGameId) => navigate(`/game/${newGameId}`),
    (value) => {
      setCountdownValue(value);
      if (value === 'TIC-TAC-GO!') {
        setTimeout(() => setCountdownValue(null), 1000);
      }
    },
  );

  if (!gameState) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading…</div>;
  }

  const mySymbol = gameState.playerX.screenName === screenName ? 'x' : gameState.playerO?.screenName === screenName ? 'o' : null;
  const myTurn = gameState.currentTurn === mySymbol && gameState.status === 'active';

  function handleCellClick(cell: number) {
    setPreviewCell(cell);
  }

  function handleCommit() {
    if (previewCell === null) return;
    socketRef.current?.emit(GAME_EVENTS.COMMIT_MOVE, { cell: previewCell });
    setPreviewCell(null);
  }

  function handlePostGame(action: 'rematch' | 'new_opponent' | 'quit') {
    socketRef.current?.emit(GAME_EVENTS.POST_GAME_ACTION, { action });
    if (action === 'quit' || action === 'new_opponent') navigate('/');
  }

  const elapsed = gameState.elapsedSeconds;
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      {/* Countdown */}
      {gameState.status === 'countdown' && <CountdownOverlay value={countdownValue} />}

      {/* Post-game */}
      {gameState.status === 'finished' && gameOver && (
        <PostGameOverlay
          winner={gameOver.winner}
          mySymbol={mySymbol}
          onRematch={() => handlePostGame('rematch')}
          onNewOpponent={() => handlePostGame('new_opponent')}
          onQuit={() => handlePostGame('quit')}
        />
      )}

      {/* Game layout */}
      <div className="flex items-center gap-8">
        <PlayerPanel
          player={gameState.playerX}
          side="x"
          isActive={gameState.currentTurn === 'x'}
          isMe={mySymbol === 'x'}
          status={gameState.status}
          winner={gameState.winner}
        />

        <div className="flex flex-col items-center gap-4">
          {/* Timer */}
          <p className="text-2xl font-mono text-gray-300">{minutes}:{seconds}</p>

          <Board
            board={gameState.board}
            activePlayer={gameState.currentTurn}
            myTurn={myTurn}
            previewCell={previewCell}
            onCellClick={handleCellClick}
            winningCells={gameState.winningCells}
          />

          {myTurn && previewCell !== null && (
            <button
              onClick={handleCommit}
              className="mt-2 px-8 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
            >
              Done
            </button>
          )}
        </div>

        <PlayerPanel
          player={gameState.playerO}
          side="o"
          isActive={gameState.currentTurn === 'o'}
          isMe={mySymbol === 'o'}
          status={gameState.status}
          winner={gameState.winner}
        />
      </div>
    </div>
  );
}
