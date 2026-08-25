import React, { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { MobileBottomNav } from './MobileBottomNav';
import { FloatingActionButton } from './FloatingActionButton';
import { RightSidebar } from './RightSidebar';
import { NotificationCenter } from './NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { ToastProvider } from '../components/Toast';

export interface AppShellProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  showRightSidebar?: boolean;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
  };
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPath = '/v3/dashboard',
  onNavigate = (path) => console.log('Navigate to:', path),
  onLogout = () => console.log('Logout triggered'),
  showRightSidebar = false,
  user,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const toggleSidebarCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleQuickAction = useCallback((type: 'workout' | 'coach') => {
    if (type === 'workout') onNavigate('/v3/workout');
    else if (type === 'coach') onNavigate('/v3/coach');
  }, [onNavigate]);

  return (
    <ToastProvider>
      <div className="striva-shell min-h-screen bg-slate-950 text-white flex flex-col font-sans antialiased overflow-x-hidden relative isolate">
        <div className="app-ambient" aria-hidden="true" />
        <div className="relative z-10 flex-1 flex w-full">
            {/* Desktop / Tablet Sidebar */}
            <Sidebar
              currentPath={currentPath}
              collapsed={collapsed}
              onToggleCollapse={toggleSidebarCollapse}
              onNavigate={onNavigate}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
              {/* Sticky Top Header */}
              <TopNavigation
                user={user}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              />

              {/* Page Content & Right Panel */}
              <div className="flex-1 flex min-w-0">
                <main className="flex-1 min-w-0">{children}</main>

                {/* Right Contextual Sidebar */}
                {showRightSidebar && (
                  <RightSidebar onOpenCoach={() => onNavigate('/v3/coach')} />
                )}
              </div>
            </div>
        </div>

          {/* Mobile Navigation */}
          <MobileBottomNav currentPath={currentPath} onNavigate={onNavigate} />

          {/* Mobile Floating Action Button */}
          <FloatingActionButton onQuickAction={handleQuickAction} />

          {/* Modals & Overlays */}
          <NotificationCenter
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onNavigate={onNavigate}
          />
      </div>
    </ToastProvider>
  );
};
