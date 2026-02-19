import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOBBY_EVENTS } from '@ttt/shared';
import { useAuthStore } from '../store/authStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useLobbySocket } from '../hooks/useLobbySocket';

export function HomePage() {
  const navigate = useNavigate();
  const { screenName, wins, losses, clearUser } = useAuthStore();
  const { onlineCount, activeGames, waitingCount } = useLobbyStore();
  const [vsAI, setVsAI] = useState(false);

  const socketRef = useLobbySocket((gameId) => navigate(`/game/${gameId}`));

  function handleLogout() {
    clearUser();
    navigate('/login');
  }

  function handlePlay() {
    socketRef.current?.emit(LOBBY_EVENTS.PLAY, vsAI ? { vsAI: true } : {});
  }

  function handleWatch(gameId: string) {
    socketRef.current?.emit(LOBBY_EVENTS.WATCH, { gameId });
    navigate(`/game/${gameId}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
        <span className="font-bold text-lg">{screenName}</span>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">
          Logout
        </button>
      </div>

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6">
          <h1 className="text-3xl font-bold text-center">Play Tic-Tac-Toe</h1>

          {/* Win/loss */}
          <p className="text-center text-gray-400">
            {wins}W – {losses}L
          </p>

          {/* Live stats */}
          <div className="text-sm text-gray-400 space-y-1">
            <p>Players online: <span className="text-white">{onlineCount}</span></p>
            <p>Active games: <span className="text-white">{activeGames.length}</span></p>
            <p>Waiting for opponent: <span className="text-white">{waitingCount}</span></p>
          </div>

          {/* Active games */}
          {activeGames.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {activeGames.map((g) => (
                <div key={g.id} className="flex justify-between items-center bg-gray-700 rounded px-3 py-2 text-sm">
                  <span>{g.playerX} vs {g.playerO ?? '…'}</span>
                  <button
                    onClick={() => handleWatch(g.id)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Play AI toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={vsAI}
              onChange={(e) => setVsAI(e.target.checked)}
              className="accent-blue-500"
            />
            Play AI
          </label>

          <button
            onClick={handlePlay}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg"
          >
            Play Tic-Tac-Toe
          </button>
        </div>
      </div>
    </div>
  );
}
