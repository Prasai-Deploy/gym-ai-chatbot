import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare, X, Plus } from '../icons';
import { cn } from '../tokens';

export interface TrinetraCoachLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  composer: React.ReactNode;
  activeTitle?: string | null;
  onStartNewConversation?: () => void;
  className?: string;
}

export const TrinetraCoachLayout: React.FC<TrinetraCoachLayoutProps> = ({
  sidebar,
  children,
  composer,
  activeTitle,
  onStartNewConversation,
  className,
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className={cn('w-full h-full flex flex-col md:flex-row bg-[#07090E] overflow-hidden relative', className)}>
      {/* DESKTOP SIDEBAR PANEL */}
      <aside className="hidden md:flex w-72 lg:w-80 shrink-0 border-r border-white/[0.08] bg-[#0A0D14] flex-col h-full select-none">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/10">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-white font-sans uppercase">TRINETRA</span>
              <span className="text-[10px] text-indigo-400 font-bold font-sans">AI Coach Intelligence</span>
            </div>
          </div>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            v2.0
          </span>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebar}
        </div>
      </aside>

      {/* MOBILE DRAWER MODAL */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-start animate-fade-in">
          <div className="w-4/5 max-w-xs h-full bg-[#0A0D14] border-r border-white/10 flex flex-col p-2 relative shadow-2xl">
            <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white font-sans">TRINETRA History</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close conversation history drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden" onClick={() => setIsMobileDrawerOpen(false)}>
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CHAT WORKSPACE CANVAS */}
      <main className="flex-1 flex flex-col h-full bg-[#07090E] relative overflow-hidden min-w-0">
        {/* HEADER BAR */}
        <header className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/[0.08] bg-[#0A0D14]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
              aria-label="Open conversation history"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>History</span>
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white font-sans truncate max-w-[160px] sm:max-w-md">
                  {activeTitle || 'TRINETRA Coach'}
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium font-sans truncate">
                Real-time AI Fitness Guidance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onStartNewConversation && (
              <button
                type="button"
                onClick={onStartNewConversation}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Start a new conversation"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">New Session</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 font-semibold font-sans">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>TRINETRA 70B</span>
            </div>
          </div>
        </header>

        {/* MESSAGES / CONTENT CANVAS */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          {children}
        </div>

        {/* FOOTER COMPOSER */}
        <footer className="p-3 sm:p-4 bg-[#07090E]/95 border-t border-white/[0.06] backdrop-blur-md shrink-0 z-10">
          {composer}
        </footer>
      </main>
    </div>
  );
};
