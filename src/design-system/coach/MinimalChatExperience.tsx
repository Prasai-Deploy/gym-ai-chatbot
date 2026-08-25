import React, { useRef, useEffect } from 'react';
import { Sparkles, Bot, User } from '../icons';
import { ChatMessage } from './MessageBubble';
import { cn } from '../tokens';

export interface MinimalChatExperienceProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onActionClick?: (action: string) => void;
  className?: string;
}

export const MinimalChatExperience: React.FC<MinimalChatExperienceProps> = React.memo(({
  messages,
  isLoading = false,
  onActionClick,
  className,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn('w-full flex flex-col gap-4 select-none', className)}>
      <div className="flex items-center justify-between px-1 border-t border-white/[0.06] pt-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          Conversation
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[88%] sm:max-w-[80%]',
                isUser ? 'self-end items-end' : 'self-start items-start'
              )}
            >
              {/* Sender Tag for Assistant */}
              {!isUser && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-sans">
                    TRINITY
                  </span>
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={cn(
                  'p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap',
                  isUser
                    ? 'bg-[#181C28] text-white border border-white/[0.08] rounded-br-sm'
                    : 'bg-[#11141D] text-slate-200 border border-white/[0.06] rounded-bl-sm'
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="self-start flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-sans">
                TRINITY
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#11141D] border border-white/[0.06] flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-200" />
              <span className="ml-1 text-[11px] font-medium text-slate-400">Analyzing...</span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
});

MinimalChatExperience.displayName = 'MinimalChatExperience';
