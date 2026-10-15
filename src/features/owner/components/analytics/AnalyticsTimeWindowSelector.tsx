import React from 'react';
import { Calendar } from 'lucide-react';
import { TimeWindow } from '../../../../api/analyticsApi';

interface Props {
  selectedWindow: TimeWindow;
  onChange: (window: TimeWindow) => void;
  periodText?: string;
  disabled?: boolean;
}

const WINDOW_OPTIONS: { id: TimeWindow; label: string; description: string }[] = [
  { id: '7d', label: '7 Days', description: 'Last 7 days vs previous 7 days' },
  { id: '30d', label: '30 Days', description: 'Last 30 days vs previous 30 days' },
  { id: '90d', label: '90 Days', description: 'Last 90 days vs previous 90 days' },
];

export const AnalyticsTimeWindowSelector: React.FC<Props> = ({
  selectedWindow,
  onChange,
  periodText,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0d14] p-3 rounded-2xl border border-white/[0.06]">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
        <span className="font-semibold text-slate-300">Analytical Window:</span>
        {periodText && (
          <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
            {periodText}
          </span>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Select Analytics Time Window"
        className="flex items-center gap-1.5 bg-[#050608] p-1 rounded-xl border border-white/[0.05]"
      >
        {WINDOW_OPTIONS.map((opt) => {
          const isSelected = selectedWindow === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={opt.description}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
