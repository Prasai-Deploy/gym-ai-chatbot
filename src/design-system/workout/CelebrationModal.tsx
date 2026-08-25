import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Award, Flame, Sparkles, ArrowRight } from '../icons';

export interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSummary: () => void;
  totalVolumeKg?: number;
  caloriesBurned?: number;
  durationMin?: number;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = React.memo(({
  isOpen,
  onClose,
  onViewSummary,
  totalVolumeKg = 12450,
  caloriesBurned = 520,
  durationMin = 48,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col items-center text-center gap-5 p-2 select-none">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-r from-brand-500 to-amber-500 p-0.5 shadow-2xl shadow-brand-500/40"
        >
          <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-amber-400">
            <Award className="w-10 h-10" />
          </div>
        </motion.div>

        <div className="flex flex-col gap-1">
          <Badge variant="primary" size="sm" icon={<Flame className="w-3.5 h-3.5" />}>
            WORKOUT COMPLETED!
          </Badge>
          <h2 className="text-2xl font-black text-white tracking-tight font-display mt-1">
            Phenomenal Performance! 🔥
          </h2>
          <p className="text-xs text-slate-300">
            You crushed your Hypertrophy Chest & Triceps routine. Trinity AI has logged your progress.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold">Volume</span>
            <span className="font-extrabold text-brand-400">{totalVolumeKg.toLocaleString()} kg</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold">Calories</span>
            <span className="font-extrabold text-emerald-400">{caloriesBurned} kcal</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold">Duration</span>
            <span className="font-extrabold text-indigo-400">{durationMin} mins</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={onViewSummary}
          className="w-full"
        >
          View Detailed Summary Report
        </Button>
      </div>
    </Modal>
  );
});

CelebrationModal.displayName = 'CelebrationModal';
