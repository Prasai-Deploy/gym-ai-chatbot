import React from 'react';
import { Bot, Sparkles, Dumbbell, TrendingUp, PieChart, Activity } from '../icons';
import { cn } from '../tokens';

export interface TrinetraEmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
  className?: string;
}

const SUGGESTED_PROMPTS = [
  {
    id: 'workout',
    title: "Plan today's workout",
    description: "Get a tailored workout recommendation based on your schedule and history.",
    icon: Dumbbell,
    prompt: "Plan today's workout for me.",
    badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: 'progress',
    title: "Help me understand my progress",
    description: "Analyze recent workout consistency, personal records, and training trends.",
    icon: TrendingUp,
    prompt: "Help me understand my progress and consistency.",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: 'nutrition',
    title: "What should I eat today?",
    description: "Review today's logged macros and get balanced nutritional recommendations.",
    icon: PieChart,
    prompt: "What should I eat today based on my goals?",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: 'recovery',
    title: "How should I recover?",
    description: "Assess recovery metrics, fatigue levels, and optimal rest day activities.",
    icon: Activity,
    prompt: "How should I recover today?",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
];

export const TrinetraEmptyState: React.FC<TrinetraEmptyStateProps> = React.memo(({
  onSelectPrompt,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 px-4 max-w-3xl mx-auto w-full select-none text-center', className)}>
      {/* TRINETRA Hero Badge */}
      <div className="relative mb-6">
        <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/5">
          <Sparkles className="w-10 h-10 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
          <Bot className="w-4 h-4" />
        </div>
      </div>

      {/* Hero Headings */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          TRINETRA COACH
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 font-sans">
        Your Personal Fitness Coach
      </h1>
      <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-8 font-medium leading-relaxed font-sans">
        Ask TRINETRA anything about your workout plans, meals, hydration, recovery, or fitness goals.
      </p>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
        {SUGGESTED_PROMPTS.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-4 rounded-2xl bg-[#090B10] border border-white/[0.07] hover:border-indigo-500/40 hover:bg-indigo-500/[0.04] transition-all group flex flex-col gap-2.5 cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn("p-2 rounded-xl border shrink-0", item.badgeColor)}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">
                  Tap to ask →
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-200 transition-colors font-sans mb-1">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-normal leading-snug line-clamp-2 font-sans">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

TrinetraEmptyState.displayName = 'TrinetraEmptyState';
