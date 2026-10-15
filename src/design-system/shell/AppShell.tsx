import React, { useState, useCallback, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { MobileBottomNav } from './MobileBottomNav';
import { RightSidebar } from './RightSidebar';
import { NotificationCenter } from './NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { ToastProvider } from '../components/Toast';
import { ThemeProvider } from '../ThemeProvider';
import { cn } from '../tokens';
import { TrialCountdownBanner } from '../billing/TrialCountdownBanner';

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
  showRightSidebar = true,
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

  const currentPageTitle = useMemo(() => {
    if (currentPath.includes('/v3/coach')) return 'TRINETRA COACH';
    if (currentPath.includes('/v3/workout')) return 'WORKOUT';
    if (currentPath.includes('/v3/nutrition')) return 'NUTRITION';
    if (currentPath.includes('/v3/progress')) return 'PROGRESS';
    if (currentPath.includes('/v3/billing')) return 'MEMBERSHIP';
    if (currentPath.includes('/v3/profile')) return 'PROFILE';
    if (currentPath.includes('/v3/members')) return 'MEMBERS';
    if (currentPath.includes('/v3/trainers')) return 'TRAINERS';
    if (currentPath.includes('/v3/attendance')) return 'ATTENDANCE';
    if (currentPath.includes('/admin')) return 'ADMIN CONSOLE';
    return 'HOME';
  }, [currentPath]);

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans antialiased overflow-x-hidden relative selection:bg-orange-500/30 selection:text-white">
          {/* Extremely Subtle Ambient Atmospheric Radial Lights */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
            <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-orange-500/[0.04] rounded-full blur-[140px]" />
            <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[140px]" />
          </div>

          <div className="flex-1 flex w-full relative z-10">
            {/* Desktop / Tablet Sidebar Control Rail */}
            <Sidebar
              currentPath={currentPath}
              collapsed={collapsed}
              onToggleCollapse={toggleSidebarCollapse}
              onNavigate={onNavigate}
              userRole={user?.role}
            />

            {/* Main Content Area */}
            <div className={cn("flex-1 flex flex-col min-w-0 bg-[#090B10]", currentPath.includes('/v3/coach') ? "h-screen overflow-hidden pb-20 md:pb-0" : "pb-20 md:pb-0")}>
              {/* Sticky Top Header System Status Layer */}
              <TopNavigation
                user={user}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onOpenNotifications={() => setIsNotificationsOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                currentPageTitle={currentPageTitle}
              />

              {/* Sub-Header Trial & Billing Status Notification Layer */}
              <TrialCountdownBanner />

              {/* Page Content & Right Context Panel */}
              <div className={cn("flex-1 flex min-w-0", currentPath.includes('/v3/coach') && "h-full overflow-hidden")}>
                <main className={cn("flex-1 min-w-0", currentPath.includes('/v3/coach') && "h-full flex flex-col overflow-hidden")}>{children}</main>

                {/* Right Contextual Intelligence Panel */}
                {showRightSidebar && (
                  <RightSidebar onOpenCoach={() => onNavigate('/v3/coach')} />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Dock Navigation */}
          <MobileBottomNav currentPath={currentPath} onNavigate={onNavigate} />

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
    </ThemeProvider>
  );
};
