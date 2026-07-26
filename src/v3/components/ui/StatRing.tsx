import React from 'react';

interface StatRingProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  icon?: React.ReactNode;
}

export const StatRing: React.FC<StatRingProps> = ({
  value,
  max,
  label,
  unit = '',
  color = '#F97316',
  size = 140,
  strokeWidth = 10,
  icon
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - progress * circumference;
  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1A2030"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {icon && <div className="mb-1">{icon}</div>}
          <span className="text-xl sm:text-2xl font-extrabold text-white font-display tabular-nums">
            {value.toLocaleString()}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            {label}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}% Goal</span>
        {unit && <span className="text-[10px] text-slate-400 ml-1">({max} {unit})</span>}
      </div>
    </div>
  );
};
