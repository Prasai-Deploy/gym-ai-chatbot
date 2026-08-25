import React, { useState } from 'react';
import { Search, X } from '../icons';
import { cn } from '../tokens';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  shortcutHint?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search workouts, exercises, diet...',
  onClear,
  shortcutHint = 'Ctrl + K',
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center w-full rounded-2xl bg-slate-900/90 border px-3.5 py-2.5 transition-all duration-200',
        isFocused ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10' : 'border-white/10 hover:border-white/20',
        className
      )}
    >
      <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : shortcutHint ? (
        <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-white/10 text-slate-400 select-none">
          {shortcutHint}
        </span>
      ) : null}
    </div>
  );
};
