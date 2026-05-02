import React from 'react';
import { MessageSquare, LayoutDashboard, TrendingUp, Settings, ChevronLeft, Menu, X, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobile: boolean;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, isMobile }: SidebarProps) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'my_plan', label: 'My Plan', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'badges', label: 'Achievements', icon: Medal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];


  const mockHistory = [
    { group: 'Today', items: ['Morning Workout', 'Nutrition advice'] },
    { group: 'Yesterday', items: ['Leg day alternatives', 'Calorie check'] },
    { group: 'This Week', items: ['Weekly plan setup', 'Macros adjusted'] },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-primary)', borderRight: '1px solid var(--glass-border)' }}>
      {/* Logo Area */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'var(--gradient-primary)' }}>
            <TrendingUp size={24} className="text-white" />
          </div>
          {(isOpen || isMobile) && (
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
              Sweatfix AI
            </h1>
          )}
        </div>
        {!isMobile && (
          <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={20} className={`transform transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
        {isMobile && (
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-8">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (isMobile) setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-zinc-800/50 shadow-sm' 
                  : 'hover:bg-zinc-800/30 text-zinc-400 hover:text-zinc-200'
              }`}
              style={{ color: activeTab === item.id ? 'var(--text-primary)' : '' }}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-purple-400' : ''} />
              {(isOpen || isMobile) && <span className="font-semibold">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Chat History (Only visible if expanded) */}
        {(isOpen || isMobile) && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest px-3" style={{ color: 'var(--text-muted)' }}>
              Recent Chats
            </h3>
            {mockHistory.map((group, i) => (
              <div key={i} className="space-y-1">
                <h4 className="text-[10px] font-semibold uppercase px-3 pt-2" style={{ color: 'var(--text-muted)' }}>{group.group}</h4>
                {group.items.map((chat, j) => (
                  <button key={j} className="w-full text-left px-3 py-2 text-sm truncate rounded-lg hover:bg-zinc-800/30 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    {chat}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Area (e.g. User mini profile) */}
      <div className="p-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/30 transition-colors">
           <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
             <span className="text-xs font-bold text-white">U</span>
           </div>
           {(isOpen || isMobile) && (
             <div className="text-left flex-1 truncate">
               <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>User</div>
               <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Pro Plan</div>
             </div>
           )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Hamburger Button (visible when sidebar is closed on mobile) */}
      {isMobile && !isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-xl glass-panel text-white"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? (isOpen ? '280px' : '0px') : (isOpen ? '280px' : '80px'),
          x: isMobile && !isOpen ? -280 : 0
        }}
        className={`fixed md:sticky top-0 left-0 h-screen z-[70] overflow-hidden flex-shrink-0`}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
