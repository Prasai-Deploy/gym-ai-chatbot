import React, { useRef, useEffect } from 'react';
import { X, Minimize2, MoreHorizontal } from 'lucide-react';
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
      className={`fixed z-50 flex flex-col bg-gray-50 border-gray-200 shadow-2xl transition-all duration-300 ease-out
        ${isMobile 
          ? 'inset-0 w-full h-full rounded-none' 
          : 'bottom-24 right-6 w-[400px] h-[600px] rounded-2xl border-[0.5px] overflow-hidden'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b-[0.5px] border-gray-200 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#0F6E56] flex items-center justify-center text-white font-bold text-sm shadow-inner">
            AI
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 leading-tight">STRIVA Coach</h3>
            <p className="text-[10px] text-[#1D9E75] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]"></span> Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"><MoreHorizontal size={18} /></button>
          {!isMobile && <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" onClick={onClose}><Minimize2 size={18} /></button>}
          {isMobile && <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" onClick={onClose}><X size={20} /></button>}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
            <div className="w-16 h-16 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h4 className="font-bold text-gray-900 mb-2">Welcome to STRIVA Coach</h4>
            <p className="text-xs text-gray-500">I'm your personal AI fitness and nutrition coach. I can analyze your progress, build plans, or answer questions.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <CoachMessage key={msg.id} message={msg} />
        ))}
        
        {isTyping && <CoachTyping state={coachState} />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 bg-white border-t-[0.5px] border-gray-200 shrink-0">
        <CoachComposer onSend={sendMessage} disabled={isTyping} />
      </div>
    </div>
  );
};
