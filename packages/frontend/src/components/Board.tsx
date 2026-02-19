import { motion } from 'framer-motion';
import { CellValue, Turn } from '@ttt/shared';

interface BoardProps {
  board: CellValue[];
  activePlayer: Turn;
  myTurn: boolean;
  previewCell: number | null;
  onCellClick: (cell: number) => void;
  winningCells: number[] | null;
}

export function Board({ board, activePlayer, myTurn, previewCell, onCellClick, winningCells }: BoardProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-72 h-72">
      {board.map((cell, i) => {
        const isWinning = winningCells?.includes(i) ?? false;
        const isPreview = previewCell === i && !cell;
        const displayValue = cell ?? (isPreview ? activePlayer : null);

        return (
          <button
            key={i}
            role="button"
            onClick={() => myTurn && !cell && onCellClick(i)}
            className={[
              'flex items-center justify-center text-4xl font-bold rounded-lg transition-all',
              'bg-gray-700 hover:bg-gray-600',
              isWinning ? 'bg-yellow-600' : '',
              !myTurn || cell ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
          >
            {displayValue && (
              <motion.span
                initial={isPreview ? { opacity: 0.5 } : { scale: 0.5, opacity: 0 }}
                animate={isPreview ? { opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 1 }}
                transition={isPreview ? { repeat: Infinity, duration: 1 } : { type: 'spring', stiffness: 300 }}
                className={displayValue === 'x' ? 'text-blue-400' : 'text-red-400'}
              >
                {displayValue.toUpperCase()}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
