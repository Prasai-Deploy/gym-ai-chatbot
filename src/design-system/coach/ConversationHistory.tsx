import React from 'react';
import { Bot, Trash2 } from '../icons';
import { cn } from '../tokens';

export interface SessionItem {
  id: string;
  title: string;
  category?: string;
  time: string;
  active?: boolean;
}

export interface ConversationHistoryProps {
  sessions: SessionItem[];
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  className?: string;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = React.memo(({
  sessions,
  onSelectSession,
  onDeleteSession,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-2 select-none', className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Past Coaching Sessions</span>
      <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
        {sessions.map((sess) => (
          <div
            key={sess.id}
            onClick={() => onSelectSession(sess.id)}
            className={cn(
              'p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer group',
              sess.active
                ? 'bg-indigo-500/15 border-indigo-500/40 text-white shadow-sm'
                : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Bot className={cn('w-4 h-4 shrink-0', sess.active ? 'text-indigo-400' : 'text-slate-500')} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{sess.title}</span>
                <span className="text-[10px] text-slate-500 font-semibold">{sess.time}</span>
              </div>
            </div>

            {onDeleteSession && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(sess.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ConversationHistory.displayName = 'ConversationHistory';
