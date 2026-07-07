import React from 'react';
import { motion } from 'motion/react';
import { Activity, Brain, Dumbbell, Zap } from 'lucide-react';

export const CoachTyping: React.FC<{ state: string }> = ({ state }) => {
  const getStatusText = () => {
    switch(state) {
      case 'thinking': return 'Analyzing your data...';
      case 'generating': return 'Generating recommendation...';
      case 'calling_tools': return 'Checking your progress...';
      default: return 'Coach is typing...';
    }
  };

  const getStatusIcon = () => {
    switch(state) {
      case 'thinking': return <Brain size={14} className="text-[#1D9E75]" />;
      case 'generating': return <Zap size={14} className="text-[#534AB7]" />;
      case 'calling_tools': return <Activity size={14} className="text-[#D85A30]" />;
      default: return <Dumbbell size={14} className="text-gray-400" />;
    }
  }

  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="bg-white border-[0.5px] border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 border border-gray-100">
          {getStatusIcon()}
        </div>
        <span className="text-xs font-semibold text-gray-500">{getStatusText()}</span>
        <div className="flex items-center gap-1 ml-1">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1.5 h-1.5 bg-[#1D9E75]/40 rounded-full" />
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.15 }} className="w-1.5 h-1.5 bg-[#1D9E75]/70 rounded-full" />
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }} className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full" />
        </div>
      </div>
    </div>
  );
};
