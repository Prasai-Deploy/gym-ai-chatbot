import React, { useState, useRef } from 'react';
import { IconButton } from '../components/IconButton';
import { CoachActionBar } from './CoachActionBar';
import { ArrowUpRight, RefreshCw, X } from '../icons';
import { cn } from '../tokens';

export interface CoachInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  onClearChat?: () => void;
  className?: string;
}

export const CoachInput: React.FC<CoachInputProps> = React.memo(({
  onSendMessage,
  isLoading = false,
  onClearChat,
  className,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex flex-col gap-2.5 w-full bg-slate-900/90 border border-white/10 p-3 rounded-3xl backdrop-blur-xl shadow-2xl select-none', className)}>
      <CoachActionBar onTriggerTool={(tool) => setText(`Can you please ${tool.toLowerCase()} for me today?`)} />

      <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Trinity AI Coach (e.g. Adjust my bench press sets, audit my macros)..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none p-2 resize-none max-h-32"
        />

        <div className="flex items-center gap-1 shrink-0 pb-1">
          {onClearChat && (
            <IconButton
              icon={<X className="w-4 h-4" />}
              aria-label="Clear chat"
              size="sm"
              variant="ghost"
              onClick={onClearChat}
            />
          )}

          <IconButton
            icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            aria-label="Send message"
            size="md"
            variant="primary"
            disabled={!text.trim() || isLoading}
            onClick={() => handleSubmit()}
          />
        </div>
      </form>
    </div>
  );
});

CoachInput.displayName = 'CoachInput';
