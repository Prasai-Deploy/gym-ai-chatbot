import React from 'react';
import { IconButton } from '../components/IconButton';
import { SearchBar } from '../components/SearchBar';
import { ProfileMenu, ProfileMenuProps } from './ProfileMenu';
import { useTheme } from '../ThemeProvider';
import { Bell, Sun, Moon, Search } from '../icons';
import { BrandMark } from '../brand/BrandMark';

export interface TopNavigationProps extends ProfileMenuProps {
  onOpenNotifications: () => void;
  onOpenCommandPalette: () => void;
  unreadCount?: number;
}

export const TopNavigation: React.FC<TopNavigationProps> = React.memo(({
  onOpenNotifications,
  onOpenCommandPalette,
  onNavigate,
  onLogout,
  unreadCount = 2,
  user,
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="glass-nav sticky top-3 z-40 h-16 mx-3 mt-3 rounded-[24px] px-3 sm:px-4 flex items-center justify-between gap-3 select-none">
      {/* Quick Search Bar Trigger */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div onClick={onOpenCommandPalette} className="cursor-pointer">
          <SearchBar
            value=""
            onChange={() => {}}
            placeholder="Search workouts, exercises, AI Coach..."
            shortcutHint="Ctrl + K"
          />
        </div>
      </div>

      <div className="sm:hidden flex items-center gap-2">
        <BrandMark size="sm" showWordmark={false} />
        <IconButton
          icon={<Search className="w-4 h-4" />}
          aria-label="Open Search"
          onClick={onOpenCommandPalette}
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <IconButton
          icon={resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        />

        {/* Notifications Bell */}
        <div className="relative">
          <IconButton
            icon={<Bell className="w-4 h-4" />}
            aria-label="Open notifications"
            onClick={onOpenNotifications}
          />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-slate-950" />
          )}
        </div>

        {/* User Profile Dropdown */}
        <ProfileMenu user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
});

TopNavigation.displayName = 'TopNavigation';
