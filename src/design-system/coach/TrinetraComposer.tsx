import React, { useState, useRef } from 'react';
import { IconButton } from '../components/IconButton';
import { ArrowUpRight, Loader2, Sparkles } from '../icons';
import { cn } from '../tokens';

export interface TrinetraComposerProps {
  onSendMessage: (text: string) => void;
  isGenerating?: boolean;
  disabled?: boolean;
  className?: string;
}

const MAX_CHAR_LIMIT = 1000;

export const TrinetraComposer: React.FC<TrinetraComposerProps> = React.memo(({
  onSendMessage,
  isGenerating = false,
  disabled = false,
  className,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && !isGenerating && !disabled) {
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

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHAR_LIMIT;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full max-w-3xl sm:max-w-4xl mx-auto select-none', className)}>
      <div className="w-full bg-[#0A0D16]/95 border border-white/10 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
          <div className="flex-1 flex flex-col min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= MAX_CHAR_LIMIT) {
                  setText(val);
                }
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask TRINETRA AI Coach (e.g., Plan my workout, review my progress, log 250 ml water)..."
              rows={1}
              disabled={isGenerating || disabled}
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none p-1.5 sm:p-2 resize-none max-h-32 font-sans leading-normal disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            {/* Character counter */}
            <span className={cn("text-[10px] font-semibold font-mono", isOverLimit ? "text-red-400" : "text-slate-500")}>
              {charCount}/{MAX_CHAR_LIMIT}
            </span>

            <IconButton
              icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <ArrowUpRight className="w-4 h-4 text-white" />}
              aria-label="Send message"
              size="md"
              variant="primary"
              disabled={!text.trim() || isGenerating || disabled || isOverLimit}
              onClick={() => handleSubmit()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-md shadow-indigo-500/25 min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl sm:rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-indigo-600"
            />
          </div>
        </form>
      </div>
      <p className="text-[10px] text-slate-500 text-center font-medium select-none truncate">
        TRINETRA AI provides fitness guidance. Verify with a physician before starting new regimens.
      </p>
    </div>
  );
});

TrinetraComposer.displayName = 'TrinetraComposer';
