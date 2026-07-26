import React, { useRef, useEffect } from 'react';
import { X, Minimize2, Sparkles, Bot } from 'lucide-react';
import { useAIChat } from '../hooks/useAIChat';
import { CoachMessage } from './CoachMessage';
import { CoachComposer } from './CoachComposer';
import { CoachTyping } from './CoachTyping';

export const CoachPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}> = ({ isOpen, onClose, isMobile }) => {
  const { messages, sendMessage, coachState, isTyping } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, coachState]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-slate-800/90 shadow-2xl shadow-indigo-500/10 transition-all duration-300 ease-out font-sans
        ${isMobile 
          ? 'inset-0 w-full h-full rounded-none' 
          : 'bottom-24 right-6 w-[420px] h-[640px] rounded-3xl overflow-hidden'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white font-display">STRIVA AI Coach</h3>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                GPT-4o
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {!isMobile && (
            <button className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-colors" onClick={onClose}>
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-colors" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-base">Your Personal AI Intelligence</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask me anything about your workout program, nutrition targets, recovery scores, or workout plan generation.
              </p>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="w-full space-y-2 pt-2">
              <button 
                onClick={() => sendMessage("Generate a 4-day hypertrophy workout plan")}
                className="w-full p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl text-left transition-all hover:border-indigo-500/40 flex items-center justify-between"
              >
                <span>💪 "Generate a 4-day hypertrophy plan"</span>
                <span className="text-[10px] text-indigo-400">Auto-Generate</span>
              </button>
              <button 
                onClick={() => sendMessage("What are my macro targets for weight loss?")}
                className="w-full p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl text-left transition-all hover:border-indigo-500/40 flex items-center justify-between"
              >
                <span>🥗 "Analyze my daily macro targets"</span>
                <span className="text-[10px] text-indigo-400">Nutrition</span>
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <CoachMessage key={msg.id} message={msg} />
        ))}
        
        {isTyping && <CoachTyping state={coachState} />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 shrink-0">
        <CoachComposer onSend={sendMessage} disabled={isTyping} />
      </div>
    </div>
  );
};
