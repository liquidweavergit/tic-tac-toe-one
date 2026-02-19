import { PlayerInfo, GameStatus, Winner } from '@ttt/shared';

interface PlayerPanelProps {
  player: PlayerInfo | null;
  side: 'x' | 'o';
  isActive: boolean;
  status: GameStatus;
  winner: Winner;
}

export function PlayerPanel({ player, side, isActive, status, winner }: PlayerPanelProps) {
  const isWinner = winner === side;
  const isLoser = winner !== null && winner !== 'draw' && winner !== side;

  const borderClass = isWinner
    ? 'border-green-500'
    : isLoser
    ? 'border-red-500'
    : isActive && status === 'active'
    ? 'border-blue-400'
    : 'border-transparent';

  const opacityClass = !isActive && status === 'active' ? 'opacity-40' : 'opacity-100';

  return (
    <div className={`border-2 rounded-xl p-4 w-36 transition-all ${borderClass} ${opacityClass}`}>
      {player ? (
        <>
          <p className="font-bold text-white truncate">{player.screenName}</p>
          <p className="text-gray-400 text-xs mt-1">{player.wins}W – {player.losses}L</p>
          {isActive && status === 'active' && (
            <p className="text-blue-300 text-xs mt-2">Your move</p>
          )}
          {isWinner && <p className="text-green-400 text-xs mt-2 font-bold">Winner!</p>}
          {isLoser && <p className="text-red-400 text-xs mt-2">Lost</p>}
        </>
      ) : (
        <p className="text-gray-500 text-sm">Waiting for opponent…</p>
      )}
    </div>
  );
}
