import React from 'react';
import { Home, Dumbbell, Plus, Utensils, MessageSquare } from 'lucide-react';
import { BottomNavigation as SharedBottomNavigation } from '../../../shared';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogPress: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, onLogPress }) => {
  const TABS = [
    { id: 'home', label: 'Home', icon: <Home size={20} strokeWidth={activeTab === 'home' ? 2.2 : 1.8} /> },
    { id: 'workouts', label: 'Workouts', icon: <Dumbbell size={20} strokeWidth={activeTab === 'workouts' ? 2.2 : 1.8} /> },
    { id: 'log', label: 'Log', icon: <Plus size={24} strokeWidth={2.5} />, isFab: true, onClick: onLogPress },
    { id: 'nutrition', label: 'Nutrition', icon: <Utensils size={20} strokeWidth={activeTab === 'nutrition' ? 2.2 : 1.8} /> },
    { id: 'coach', label: 'Coach', icon: <MessageSquare size={20} strokeWidth={activeTab === 'coach' ? 2.2 : 1.8} /> },
  ];

  return (
    <SharedBottomNavigation
      items={TABS}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  );
};
