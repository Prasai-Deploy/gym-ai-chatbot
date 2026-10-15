import React from 'react';
import { Card } from '../components/Card';
import { Calendar, ChevronRight } from '../icons';
import { cn } from '../tokens';

export interface TodayPlanSummaryProps {
  latestPlan?: any;
  activeSession?: any;
  onNavigateWorkout: () => void;
  className?: string;
}

export const TodayPlanSummary: React.FC<TodayPlanSummaryProps> = React.memo(({
  latestPlan,
  activeSession,
  onNavigateWorkout,
  className,
}) => {
  const planName = activeSession?.title || latestPlan?.title || latestPlan?.name;
  const description = activeSession?.notes || latestPlan?.description;

  return (
    <Card
      variant="default"
      onClick={onNavigateWorkout}
      className={cn(
        'w-full p-5 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-white/20 transition-all duration-200 cursor-pointer group flex items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="p-2.5 rounded-xl bg-[#84CC16]/10 border border-[#84CC16]/20 text-[#84CC16] shrink-0">
          <Calendar className="w-4 h-4" />
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
            TODAY’S PLAN
          </span>
          <h4 className="text-sm font-bold text-white tracking-tight truncate font-sans">
            {planName || 'No specific plan assigned for today'}
          </h4>
          {description && (
            <p className="text-xs text-slate-400 line-clamp-1 font-sans">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-[#84CC16] group-hover:text-lime-300 shrink-0">
        <span>View Details</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Card>
  );
});

TodayPlanSummary.displayName = 'TodayPlanSummary';
