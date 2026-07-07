import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip } from 'lucide-react';
import { CoachQuickActions } from './CoachQuickActions';

export const CoachComposer: React.FC<{ 
  onSend: (text: string) => void; 
  disabled?: boolean;
}> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <CoachQuickActions onActionSelect={(action) => onSend(action)} />
      
      <div className="relative flex items-end gap-2 bg-white border border-gray-300 rounded-2xl p-2 shadow-sm focus-within:border-[#1D9E75] focus-within:ring-1 focus-within:ring-[#1D9E75] transition-all">
        <button className="p-2 text-gray-400 hover:text-[#1D9E75] rounded-full transition-colors self-end mb-0.5">
          <Paperclip size={18} />
        </button>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask your coach anything..."
          className="flex-1 max-h-[120px] bg-transparent resize-none outline-none text-sm text-gray-900 placeholder:text-gray-400 py-2.5 self-center"
          rows={1}
        />
        
        {input.trim() ? (
          <button 
            onClick={handleSend}
            disabled={disabled}
            className="p-2 bg-[#1D9E75] text-white hover:bg-[#158260] rounded-full transition-colors self-end mb-0.5 disabled:opacity-50"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        ) : (
          <button className="p-2 text-gray-400 hover:text-[#1D9E75] rounded-full transition-colors self-end mb-0.5">
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
