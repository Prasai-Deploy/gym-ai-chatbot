import {
  Home,
  Dumbbell,
  Plus,
  Utensils,
  MessageSquare,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogPress: () => void;
}

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'log', label: 'Log', icon: Plus }, // Center FAB
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
];

export function BottomNav({ activeTab, onTabChange, onLogPress }: BottomNavProps) {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      <div className="flex items-end justify-around max-w-lg mx-auto">
        {TABS.map((tab) => {
          if (tab.id === 'log') {
            // Center FAB button
            return (
              <div key={tab.id} className="flex flex-col items-center flex-1">
                <button
                  className="bottom-nav-fab"
                  onClick={onLogPress}
                  aria-label="Log Activity"
                >
                  <Plus size={24} strokeWidth={2.5} />
                </button>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider mt-1 pb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {tab.label}
                </span>
              </div>
            );
          }

          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{tab.label}</span>
              {isActive && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
