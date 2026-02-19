import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  value: 3 | 2 | 1 | 'TIC-TAC-GO!' | null;
}

export function CountdownOverlay({ value }: Props) {
  return (
    <AnimatePresence>
      {value !== null && (
        <motion.div
          key={String(value)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        >
          <span className="text-white text-8xl font-black">{value}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
