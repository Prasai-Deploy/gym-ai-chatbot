import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pageVariants } from '../theme/animations';
import { useAIChat } from '../../features/coach/hooks/useAIChat';
import { CoachMessage } from '../../features/coach/components/CoachMessage';
import { CoachComposer } from '../../features/coach/components/CoachComposer';
import { CoachTyping } from '../../features/coach/components/CoachTyping';
import { Sparkles, Bot, Mic } from 'lucide-react';

export const V3CoachPage: React.FC = () => {
  const { messages, sendMessage, coachState, isTyping } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, coachState]);

  return (
    <div className="min-h-screen bg-[#090B10] text-white font-sans pt-20 pb-32 px-4 sm:px-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-20px)]">
      <TopNav />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex-1 flex flex-col h-full space-y-4"
      >
        {/* AI Centerpiece Header */}
        <div className="flex items-center justify-between p-4 bg-[#131722] border border-white/10 rounded-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6366F1] text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white font-display">STRIVA AI Intelligence</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  GPT-4o
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Real-Time Coach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="p-2.5 rounded-xl bg-[#1A2030] border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Voice Input (Coming Soon)"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Transcript Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#131722]/60 border border-white/10 rounded-3xl">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 v3-glow-indigo">
                <Bot className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-extrabold text-white font-display">What can I optimize for you today?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  I can design periodized training routines, analyze daily macros, compute recovery scores, or modify active workout plans.
                </p>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="w-full max-w-md space-y-2.5 pt-2">
                <button
                  onClick={() => sendMessage("Generate a 4-day hypertrophy workout routine")}
                  className="w-full p-3 bg-[#1A2030] hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-semibold rounded-2xl text-left transition-all hover:border-indigo-500/40 flex items-center justify-between group"
                >
                  <span>💪 "Generate a 4-day hypertrophy workout routine"</span>
                  <span className="text-[10px] text-indigo-400 group-hover:underline">Auto-Build</span>
                </button>
                <button
                  onClick={() => sendMessage("Calculate my daily protein and macro targets for fat loss")}
                  className="w-full p-3 bg-[#1A2030] hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-semibold rounded-2xl text-left transition-all hover:border-indigo-500/40 flex items-center justify-between group"
                >
                  <span>🥗 "Calculate my daily protein and macro targets"</span>
                  <span className="text-[10px] text-indigo-400 group-hover:underline">Nutrition</span>
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

        {/* Input Composer */}
        <div className="p-3 bg-[#131722] border border-white/10 rounded-2xl shrink-0">
          <CoachComposer onSend={sendMessage} disabled={isTyping} />
        </div>
      </motion.div>

      <MobileDock />
    </div>
  );
};
