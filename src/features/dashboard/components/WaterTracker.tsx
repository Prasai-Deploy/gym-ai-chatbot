import React, { useState } from 'react';
import { Droplets, History, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface WaterTrackerProps {
  currentWater: number;
  waterGoal: number;
  onAddWater: (amount: number) => void;
  onUpdateGoal: (newGoal: number) => void;
  onRemoveWater?: (id: number) => void;
  logs?: any[];
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ currentWater, waterGoal, onAddWater, onUpdateGoal, onRemoveWater, logs = [] }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState((waterGoal || 2000).toString());
  const [customAmount, setCustomAmount] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const pct = Math.min(Math.round((currentWater / (waterGoal || 2000)) * 100), 100);

  const status =
    currentWater === 0 ? 'Start hydrating! 💧' :
    pct < 30   ? 'Keep it up! 🌊'     :
    pct < 60   ? 'Great progress! 💪'  :
    pct < 100   ? 'Almost there! 🏆'   :
                  'Goal reached! 🎉';

  const handleSaveGoal = () => {
    const goal = parseInt(tempGoal, 10);
    if (!isNaN(goal) && goal > 0) {
      onUpdateGoal(goal);
    }
    setIsEditingGoal(false);
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount, 10);
    if (!isNaN(amount) && amount > 0) {
      onAddWater(amount);
      setCustomAmount('');
    }
  };

  return (
    <section className="card p-6 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Droplets size={22} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight text-white">Daily Water Log</h3>
            <p className="text-[10px] uppercase tracking-widest font-black text-blue-500/80 mt-0.5">Smart Hydration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className={`p-2 rounded-xl transition-colors ${showLogs ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <History size={18} />
          </button>
          {isEditingGoal ? (
            <div className="flex items-center gap-2 bg-zinc-900 rounded-xl p-1 px-2 border border-blue-500/30">
              <input 
                type="number" 
                value={tempGoal} 
                onChange={e => setTempGoal(e.target.value)} 
                className="w-16 px-1 py-1 text-xs bg-transparent text-white outline-none font-bold" 
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
              />
              <button onClick={handleSaveGoal} className="text-[10px] font-black text-blue-400 uppercase">Set</button>
            </div>
          ) : (
            <button
              onClick={() => { setTempGoal((waterGoal || 2000).toString()); setIsEditingGoal(true); }}
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-all"
            >
              Goal
            </button>
          )}
        </div>
      </div>

      {showLogs ? (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Today's Intake</span>
             <button onClick={() => setShowLogs(false)} className="text-[10px] font-bold text-blue-400">Back</button>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Droplets size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{log.intake_amount}ml</div>
                    <div className="text-[9px] text-zinc-500 uppercase">{format(new Date(log.created_at), 'hh:mm a')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{log.source}</div>
                  <button 
                    onClick={() => onRemoveWater?.(log.id)}
                    className="p-1 hover:text-red-500 transition-colors"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-xs text-zinc-600 italic">No logs for today.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Total + Progress Circle */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-left">
              <div className="text-4xl font-black tabular-nums tracking-tight text-white">
                {(currentWater / 1000).toFixed(2)}
                <span className="text-xl font-bold ml-1 text-zinc-500">L</span>
              </div>
              <div className="text-xs font-bold mt-1 text-zinc-400">
                {currentWater} / {waterGoal || 2000} ml · <span className="text-blue-400">{pct}%</span>
              </div>
              <div className="text-xs font-bold mt-2 text-blue-500 uppercase tracking-wider">{status}</div>
            </div>
            
            {/* Simple Animated Ring */}
            <div className="relative w-20 h-20">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" 
                    strokeDasharray="283" strokeDashoffset={283 - (283 * pct) / 100}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out"
                  />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  <Droplets size={20} className={pct >= 100 ? "text-blue-400" : "text-zinc-700"} />
               </div>
            </div>
          </div>

          {/* Quick Add Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[250, 500, 750, 1000].map(amount => (
              <button
                key={amount}
                onClick={() => onAddWater(amount)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
              >
                <span className="text-xs font-black text-white group-hover:text-blue-400">{amount >= 1000 ? '1L' : amount}</span>
                <span className="text-[8px] font-bold text-zinc-600 uppercase mt-0.5 group-hover:text-blue-500/50">{amount >= 1000 ? '' : 'ml'}</span>
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="Custom log"
                className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-none border border-white/5 focus:border-blue-500/50 placeholder-zinc-700 bg-zinc-900/80 text-white"
                onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase">ml</span>
            </div>
            <button
              onClick={handleCustomAdd}
              className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </>
      )}
    </section>
  );
};
