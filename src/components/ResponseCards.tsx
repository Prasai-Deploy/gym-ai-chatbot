import React from 'react';
import { Dumbbell, Utensils, Clock, Flame, ChevronRight } from 'lucide-react';

interface CardProps {
  content: string;
}

export function WorkoutCard({ content }: CardProps) {
  if (!content) return null;
  
  // Basic parsing for display
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border" style={{ borderColor: 'var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--gradient-primary)', borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-2 text-white">
          <Dumbbell size={18} />
          <span className="font-bold text-sm tracking-widest uppercase">Workout Protocol</span>
        </div>
        <div className="text-white/80 text-xs font-semibold flex items-center gap-1">
          <Clock size={14} /> ~45 Min
        </div>
      </div>
      <div className="p-4 space-y-3">
        {lines.map((line, i) => {
          if (line.toLowerCase().includes('warmup') || line.toLowerCase().includes('warm-up')) {
            return <div key={i} className="text-xs font-bold text-orange-400 uppercase tracking-widest mt-2">{line.replace(/[^a-zA-Z ]/g, '')}</div>;
          }
          if (line.includes(':') || line.includes('-')) {
             return (
               <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                 <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">{i}</div>
                 <div className="text-sm text-zinc-200">{line.replace(/^[-*]\s*/, '')}</div>
               </div>
             )
          }
          return <div key={i} className="text-sm text-zinc-300 font-medium">{line}</div>;
        })}
      </div>
      <button className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-white hover:bg-white/5 transition-colors border-t" style={{ borderColor: 'var(--glass-border)' }}>
        Add to Tracker <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function NutritionCard({ content }: CardProps) {
  if (!content) return null;
  
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border" style={{ borderColor: 'var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--surface-elevated)', borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-widest uppercase text-emerald-400">Nutrition Plan</span>
        </div>
        <div className="text-zinc-400 text-xs font-semibold flex items-center gap-1">
          <Flame size={14} className="text-orange-400"/> Macros Target
        </div>
      </div>
      <div className="p-4 space-y-3">
        {lines.map((line, i) => {
          const isMealTitle = line.toLowerCase().includes('breakfast') || line.toLowerCase().includes('lunch') || line.toLowerCase().includes('dinner') || line.toLowerCase().includes('snack');
          if (isMealTitle) {
            return <div key={i} className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-3 pt-3 border-t border-white/10 first:border-0 first:pt-0 first:mt-0">{line.replace(/[^a-zA-Z ]/g, '')}</div>;
          }
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="text-sm text-zinc-200">{line.replace(/^[-*]\s*/, '')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
