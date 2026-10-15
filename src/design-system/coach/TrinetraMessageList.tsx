import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessageItem } from '../../features/coach/hooks/useTrinetraCoach';
import { Bot, Sparkles, Loader2, CheckCircle2 } from '../icons';
import { cn } from '../tokens';

export interface TrinetraMessageListProps {
  messages: ChatMessageItem[];
  isGenerating?: boolean;
  activeToolActivity?: string | null;
  className?: string;
}

export const TrinetraMessageList: React.FC<TrinetraMessageListProps> = React.memo(({
  messages,
  isGenerating = false,
  activeToolActivity = null,
  className,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, activeToolActivity]);

  return (
    <div className={cn('flex-1 overflow-y-auto py-4 px-3 sm:px-6 w-full flex flex-col', className)}>
      <div className="max-w-3xl sm:max-w-4xl mx-auto w-full flex flex-col gap-4 sm:gap-5">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLastAssistant = !isUser && index === messages.length - 1;

          return (
            <div
              key={msg.id}
              className={cn(
                'flex w-full gap-2.5 sm:gap-3',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              {/* TRINETRA Avatar Icon */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-sm shadow-indigo-500/10">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble Box */}
              <div
                className={cn(
                  'flex flex-col rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-lg font-sans',
                  isUser
                    ? 'max-w-[88%] sm:max-w-[78%] bg-[#161E30] border border-white/10 text-slate-100 rounded-tr-xs'
                    : 'max-w-[95%] sm:max-w-[85%] bg-[#0C101A] border border-indigo-500/20 text-slate-200 rounded-tl-xs'
                )}
              >
                {/* Header Badge / Role */}
                <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] font-bold text-slate-400">
                  <span className={cn('uppercase tracking-wider font-extrabold', isUser ? 'text-slate-300' : 'text-indigo-400')}>
                    {isUser ? 'You' : 'TRINETRA AI'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Content */}
                {isUser ? (
                  <p className="whitespace-pre-wrap m-0 text-slate-100 font-medium">
                    {msg.content}
                  </p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-200 prose-p:my-1.5 prose-headings:my-2 prose-headings:text-white prose-ul:my-1 prose-li:my-0.5 prose-strong:text-indigo-300 prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    {msg.content ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        Analyzing and formulating plan...
                      </span>
                    )}
                  </div>
                )}

                {/* Tool Activity Badge on Assistant Message */}
                {!isUser && isLastAssistant && (msg.toolActivity || activeToolActivity) && (
                  <div className="mt-3 pt-2 border-t border-indigo-500/10 flex items-center gap-2 text-[11px] text-indigo-300 font-medium bg-indigo-500/[0.06] p-2.5 rounded-xl border border-indigo-500/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                    <span>{msg.toolActivity || activeToolActivity}</span>
                  </div>
                )}

                {/* Completed tool status checkmark */}
                {!isUser && msg.status === 'completed' && msg.content && isLastAssistant && !isGenerating && (
                  <div className="mt-2 text-[10px] text-emerald-400/80 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified response</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming indicator when response is initializing */}
        {isGenerating && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-3 w-full max-w-3xl sm:max-w-4xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#0C101A] border border-indigo-500/20 px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-slate-300 font-medium shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>TRINETRA is formulating your response...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
});

TrinetraMessageList.displayName = 'TrinetraMessageList';
