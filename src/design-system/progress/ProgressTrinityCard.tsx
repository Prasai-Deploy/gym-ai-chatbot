import React from 'react';
import { Bot, Sparkles, ArrowRight } from '../icons';
import { cn } from '../tokens';

export interface ProgressTrinityCardProps {
  insightText?: string;
  onAskTrinity?: () => void;
  className?: string;
}

export const ProgressTrinityCard: React.FC<ProgressTrinityCardProps> = React.memo(({
  insightText = "Your strength is increasing consistently. Keep your current training frequency for the next 3 weeks.",
  onAskTrinity,
  className,
}) => {
  return (
    <div
      onClick={onAskTrinity}
      className={cn(
        'w-full rounded-2xl bg-[#11141D] border border-white/[0.07] hover:border-indigo-500/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 cursor-pointer group shadow-sm select-none',
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-indigo-500/[0.08] text-indigo-400 border border-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
          <Bot className="w-4 h-4" />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300 font-sans">
              TRINITY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed font-sans">
            "{insightText}"
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 shrink-0 transition-colors self-end sm:self-center">
        <span>Ask Trinity</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
});

ProgressTrinityCard.displayName = 'ProgressTrinityCard';
