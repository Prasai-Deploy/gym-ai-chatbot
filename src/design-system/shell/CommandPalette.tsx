import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { SearchBar } from '../components/SearchBar';
import { Dumbbell, Bot, Flame, PieChart, CreditCard, User, Sparkles, ArrowRight } from '../icons';

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
    { id: '1', category: 'Navigation', title: 'Dashboard', subtitle: 'View workout metrics & health overview', icon: <Dumbbell className="w-4 h-4 text-brand-400" />, path: '/v3/dashboard' },
    { id: '2', category: 'Navigation', title: 'Workouts & Exercises', subtitle: 'Log routines, sets, and reps', icon: <Flame className="w-4 h-4 text-amber-400" />, path: '/v3/workout' },
    { id: '3', category: 'AI Coach', title: 'Trinity AI Fitness Coach', subtitle: 'Get personalized workout plan & advice', icon: <Bot className="w-4 h-4 text-indigo-400" />, path: '/v3/coach' },
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
        else {
          // Open triggered by parent state
        }
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
          placeholder="Type a command or search (e.g. Workouts, AI Coach)..."
          shortcutHint="Esc to close"
        />

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No matching commands found.</div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  onNavigate(cmd.path);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-brand-500/40 hover:bg-brand-500/10 transition-all text-left group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                    {cmd.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors">
                      {cmd.title}
                    </span>
                    {cmd.subtitle && <span className="text-[10px] text-slate-400">{cmd.subtitle}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
});

CommandPalette.displayName = 'CommandPalette';
