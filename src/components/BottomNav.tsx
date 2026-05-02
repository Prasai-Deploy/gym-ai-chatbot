/**
 * src/components/BottomNav.tsx
 * Mobile-specific fixed bottom navigation bar for screens <= 768px.
 */
import React from 'react';
import { MessageSquare, TrendingUp, Medal, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'badges', label: 'Badges', icon: Medal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--surface-card)] backdrop-blur-lg md:hidden"
      style={{ 
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '0.5px solid var(--glass-border)'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center justify-center gap-1 w-full h-full transition-colors active:scale-95"
            style={{ 
              color: isActive ? '#c084fc' : 'var(--text-muted)',
              minWidth: '48px',
              minHeight: '48px'
            }}
          >
            <Icon size={20} className={isActive ? 'animate-in zoom-in-95 duration-200' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {item.label}
            </span>
            {isActive && (
              <div 
                className="absolute top-0 w-8 h-0.5 rounded-full" 
                style={{ background: 'var(--gradient-primary)' }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
