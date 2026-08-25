import React from 'react';
import { IconButton } from '../components/IconButton';
import { ProfileMenu, ProfileMenuProps } from './ProfileMenu';
import { ConnectionStatus } from './ConnectionStatus';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useTheme } from '../ThemeProvider';
import { Bell, Sun, Moon, Search, Bot, Sparkles } from '../icons';

export interface TopNavigationProps extends ProfileMenuProps {
  onOpenNotifications: () => void;
  onOpenCommandPalette: () => void;
  unreadCount?: number;
  currentPageTitle?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = React.memo(({
  onOpenNotifications,
  onOpenCommandPalette,
  onNavigate,
  onLogout,
  unreadCount = 2,
  user,
  currentPageTitle,
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b border-white/[0.07] bg-[#090B10]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand Identity / Page Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 font-sans hidden sm:inline">
            STRIVA
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-xs font-bold text-white font-sans tracking-tight">
            {currentPageTitle || 'SYSTEM OPERATING SYSTEM'}
          </span>
        </div>
      </div>

      {/* Center: Minimal Command Palette Trigger */}
      <div className="flex-1 max-w-sm mx-auto hidden md:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#11141D] border border-white/[0.08] hover:border-white/[0.16] text-slate-400 hover:text-white transition-all text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 transition-colors" />
            <span className="text-[11px] font-medium text-slate-400">Search commands & telemetry...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 bg-white/[0.05] border border-white/[0.08] rounded-md uppercase tracking-wider font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Status Telemetry & Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Button */}
        <div className="md:hidden">
          <IconButton
            icon={<Search className="w-4 h-4" />}
            aria-label="Open Search"
            size="sm"
            onClick={onOpenCommandPalette}
          />
        </div>

        {/* Telemetry Status Layer */}
        <div className="hidden lg:flex items-center gap-2.5 pr-2 border-r border-white/[0.07]">
          <ConnectionStatus />
          <SyncStatusIndicator />
        </div>

        {/* Trinity AI Status Pill Control */}
        <button
          type="button"
          onClick={() => onNavigate?.('/v3/coach')}
          aria-label="Trinity AI Coach Control"
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-indigo-500/[0.08] hover:bg-indigo-500/[0.14] border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-300 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group shadow-sm select-none"
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-105 transition-transform" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">TRINITY</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
        </button>

        {/* Theme Toggle */}
        <IconButton
          icon={resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          aria-label="Toggle theme"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        />

        {/* Notifications Bell with Pulse Dot */}
        <div className="relative">
          <IconButton
            icon={<Bell className="w-4 h-4" />}
            aria-label="Open notifications"
            size="sm"
            onClick={onOpenNotifications}
          />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-[#090B10] animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
          )}
        </div>

        {/* Profile Menu */}
        <ProfileMenu user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
});

TopNavigation.displayName = 'TopNavigation';
