import React from 'react';
import { Dumbbell } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#121212] z-50">
      <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-[0.5px] border-[#333333] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.1)] relative">
        <Dumbbell size={28} className="text-[#22c55e] absolute z-10" />
        <div className="absolute inset-0 border-t-2 border-[#22c55e] rounded-full animate-spin"></div>
      </div>
      <h2 className="text-white font-bold text-lg tracking-wide mb-1">STRIVA</h2>
      <p className="text-[#888888] text-xs font-semibold uppercase tracking-widest">Loading...</p>
    </div>
  );
};
