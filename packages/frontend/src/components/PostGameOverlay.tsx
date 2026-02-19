import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Winner } from '@ttt/shared';

interface Props {
  winner: Winner;
  mySymbol: 'x' | 'o' | null;
  onRematch: () => void;
  onNewOpponent: () => void;
  onQuit: () => void;
}

function SnowParticle({ symbol, delay, x }: { symbol: string; delay: number; x: number }) {
  return (
    <motion.span
      className="fixed text-2xl font-bold pointer-events-none select-none"
      style={{ left: `${x}vw`, top: -40, color: symbol === 'X' ? '#60a5fa' : '#f87171' }}
      animate={{ top: '100vh' }}
      transition={{ duration: 3 + Math.random() * 2, delay, ease: 'linear' }}
    >
      {symbol}
    </motion.span>
  );
}

export function PostGameOverlay({ winner, mySymbol, onRematch, onNewOpponent, onQuit }: Props) {
  const winSymbol = winner === 'x' ? 'X' : winner === 'o' ? 'O' : null;

  const particles = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({ i, x: Math.random() * 100 })),
    [winner]
  );

  const resultText =
    winner === 'draw'
      ? "It's a Draw!"
      : mySymbol && winner === mySymbol
      ? 'You Win!'
      : 'You Lose!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Snow particles */}
      {winSymbol && particles.map(({ i, x }) => (
        <SnowParticle key={i} symbol={winSymbol} delay={i * 0.15} x={x} />
      ))}

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-gray-800 border border-gray-600 rounded-2xl p-8 text-center space-y-6 shadow-2xl"
      >
        <h2 className="text-3xl font-black text-white">{resultText}</h2>
        <div className="flex flex-col gap-3">
          <button onClick={onRematch} className="py-2 px-6 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold">
            Rematch
          </button>
          <button onClick={onNewOpponent} className="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold">
            New Opponent
          </button>
          <button onClick={onQuit} className="py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold">
            Quit
          </button>
        </div>
      </motion.div>
    </div>
  );
}
