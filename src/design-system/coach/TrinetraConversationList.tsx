import React, { useState } from 'react';
import { ConversationItem } from '../../features/coach/hooks/useTrinetraCoach';
import { Bot, Plus, Trash2, Edit3, Check, X, MessageSquare } from '../icons';
import { cn } from '../tokens';

export interface TrinetraConversationListProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onRequestDeleteConversation: (id: string, title: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const TrinetraConversationList: React.FC<TrinetraConversationListProps> = React.memo(({
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartNewConversation,
  onRenameConversation,
  onRequestDeleteConversation,
  isLoading = false,
  className,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'Conversation');
  };

  const handleSaveRename = (id: string, e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className={cn('flex flex-col gap-4 w-full h-full select-none p-3', className)}>
      {/* New Conversation Button */}
      <button
        type="button"
        onClick={onStartNewConversation}
        className="w-full p-3 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/25 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white shadow-sm cursor-pointer group"
      >
        <Plus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
        <span>New Conversation</span>
      </button>

      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-sans">
          RECENT CONVERSATIONS
        </span>
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          {conversations.length}
        </span>
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-8 px-3 rounded-2xl bg-slate-900/40 border border-white/5 text-center flex flex-col items-center gap-2">
            <MessageSquare className="w-6 h-6 text-slate-600" />
            <span className="text-xs text-slate-400 font-medium">No past conversations</span>
            <span className="text-[11px] text-slate-500">Ask TRINETRA a question to start history</span>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => !isEditing && onSelectConversation(conv.id)}
                className={cn(
                  'p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer group relative',
                  isActive
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Bot className={cn('w-4 h-4 shrink-0', isActive ? 'text-indigo-400' : 'text-slate-500')} />

                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveRename(conv.id, e)} className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        className="w-full bg-black/40 text-xs text-white border border-indigo-500/50 rounded-lg px-2 py-1 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveRename(conv.id, e)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate font-sans">{conv.title || 'New Conversation'}</span>
                      {conv.updated_at && (
                        <span className="text-[10px] text-slate-500 font-semibold font-sans">
                          {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions (Rename & Delete) */}
                {!isEditing && (
                  <div className="opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Rename conversation"
                      aria-label="Rename conversation"
                      onClick={(e) => handleStartRename(conv, e)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeleteConversation(conv.id, conv.title || 'Conversation');
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

TrinetraConversationList.displayName = 'TrinetraConversationList';
