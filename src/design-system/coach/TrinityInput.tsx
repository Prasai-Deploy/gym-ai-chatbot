import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles } from '../icons';
import { cn } from '../tokens';

export interface TrinityInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const TrinityInput: React.FC<TrinityInputProps> = React.memo(({
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask Trinity anything about your training, diet or recovery...',
  className,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'w-full sticky bottom-0 bg-[#090B10]/95 backdrop-blur-xl pt-2 pb-4 select-none',
        className
      )}
    >
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#11141D] border border-white/[0.09] focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all shadow-lg">
        <div className="pl-2.5 text-indigo-400 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-[120px] py-1.5 leading-relaxed font-sans"
        />

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            text.trim() && !isLoading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
});

TrinityInput.displayName = 'TrinityInput';
