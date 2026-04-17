import React from 'react';
import { 
  LayoutDashboard, MessageCircle, User, Award, Settings, LogOut, 
  Dumbbell, TrendingUp, ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'chat' | 'profile' | 'achievements';
  setActiveTab: (tab: any) => void;
  user: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'chat', icon: MessageCircle, label: 'AI Coach' },
    { id: 'achievements', icon: Award, label: 'Badges' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-20 lg:w-64 bg-zinc-950 border-r border-zinc-900 z-50 flex flex-col p-4">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="text-white" size={20} />
        </div>
        <span className="font-black text-xl tracking-tighter hidden lg:block uppercase italic">Sweat Fix</span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <item.icon size={22} />
            <span className="font-semibold hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {user.role === 'admin' && (
        <div className="mb-4">
          <button className="w-full flex items-center gap-3 p-3 text-emerald-500 hover:bg-emerald-500/10 rounded-2xl transition-all">
            <ShieldCheck size={22} />
            <span className="font-semibold hidden lg:block">Admin Panel</span>
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-zinc-900 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <img src={user.avatar} className="w-10 h-10 rounded-full border border-zinc-800" alt="" />
          <div className="hidden lg:block min-w-0">
            <p className="font-bold text-sm truncate">{user.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none">{user.role} Member</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <LogOut size={22} />
          <span className="font-semibold hidden lg:block">Logout</span>
        </button>
      </div>
    </div>
  );
};
