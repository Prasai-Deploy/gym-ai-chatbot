import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Dumbbell, Bot, Flame, PieChart, CreditCard, User, Sparkles, ArrowRight } from '../icons';
import { cn } from '../tokens';

export interface CommandItem {
  id: string;
  category: 'Navigation' | 'AI Coach' | 'Quick Actions';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = React.memo(({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const commands: CommandItem[] = [
    { id: '1', category: 'Navigation', title: 'Dashboard', subtitle: 'View workout metrics & health overview', icon: <Dumbbell className="w-4 h-4 text-orange-400" />, path: '/v3/dashboard' },
    { id: '2', category: 'AI Coach', title: 'Trinity AI Fitness Coach', subtitle: 'Get personalized workout plan & advice', icon: <Bot className="w-4 h-4 text-indigo-400" />, path: '/v3/coach' },
    { id: '3', category: 'Navigation', title: 'Workouts & Exercises', subtitle: 'Log routines, sets, and reps', icon: <Flame className="w-4 h-4 text-amber-400" />, path: '/v3/workout' },
    { id: '4', category: 'Navigation', title: 'Nutrition & Macros', subtitle: 'Track calories, protein, and meal plans', icon: <PieChart className="w-4 h-4 text-emerald-400" />, path: '/v3/nutrition' },
    { id: '5', category: 'Navigation', title: 'Progress & Analytics', subtitle: 'Strength progression graphs and trends', icon: <Sparkles className="w-4 h-4 text-cyan-400" />, path: '/v3/progress' },
    { id: '6', category: 'Navigation', title: 'Membership & Billing', subtitle: 'Manage plan, payment methods, receipts', icon: <CreditCard className="w-4 h-4 text-purple-400" />, path: '/v3/billing' },
    { id: '7', category: 'Navigation', title: 'User Profile Settings', subtitle: 'Update stats, weight, target goals', icon: <User className="w-4 h-4 text-slate-400" />, path: '/v3/profile' },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Type a command or jump to feature (e.g. AI Coach, Workouts)..."
          shortcutHint="Esc"
        />

        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">No matching commands or telemetry found.</div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  onNavigate(cmd.path);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-[#11141D] border border-white/[0.05] hover:border-orange-500/30 hover:bg-[#181C28] transition-all text-left group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white/[0.04] group-hover:scale-105 transition-transform shrink-0">
                    {cmd.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                        {cmd.title}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1.5 py-0.2 bg-white/[0.03] rounded">
                        {cmd.category}
                      </span>
                    </div>
                    {cmd.subtitle && <span className="text-[10px] text-slate-400 truncate">{cmd.subtitle}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
});

CommandPalette.displayName = 'CommandPalette';
