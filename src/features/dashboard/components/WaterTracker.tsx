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
    <section className="glass-card p-6 flex flex-col transition-all duration-300 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Droplets size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white font-display">Daily Hydration Log</h3>
            <p className="text-[10px] uppercase tracking-widest font-black text-cyan-400 mt-0.5">Smart Hydration Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className={`p-2 rounded-xl transition-colors ${showLogs ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
          >
            <History size={18} />
          </button>
          {isEditingGoal ? (
            <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 px-2 border border-cyan-500/30">
              <input 
                type="number" 
                value={tempGoal} 
                onChange={e => setTempGoal(e.target.value)} 
                className="w-16 px-1 py-1 text-xs bg-transparent text-white outline-none font-bold" 
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
              />
              <button onClick={handleSaveGoal} className="text-[10px] font-black text-cyan-400 uppercase">Set</button>
            </div>
          ) : (
            <button
              onClick={() => { setTempGoal((waterGoal || 2000).toString()); setIsEditingGoal(true); }}
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-all"
            >
              Goal
            </button>
          )}
        </div>
      </div>

      {showLogs ? (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Intake</span>
             <button onClick={() => setShowLogs(false)} className="text-[10px] font-bold text-cyan-400">Back</button>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Droplets size={14} className="text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{log.intake_amount}ml</div>
                    <div className="text-[9px] text-slate-500 uppercase">{format(new Date(log.created_at), 'hh:mm a')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{log.source}</div>
                  <button 
                    onClick={() => onRemoveWater?.(log.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-xs text-slate-500 italic">No logs recorded today.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Total Intake Overview */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-left">
              <div className="text-4xl font-black tabular-nums tracking-tight text-white font-display">
                {(currentWater / 1000).toFixed(2)}
                <span className="text-xl font-bold ml-1 text-slate-400">L</span>
              </div>
              <div className="text-xs font-bold mt-1 text-slate-300">
                {currentWater} / {waterGoal || 2000} ml · <span className="text-cyan-400">{pct}%</span>
              </div>
              <div className="text-xs font-bold mt-2 text-cyan-400 uppercase tracking-wider">{status}</div>
            </div>
            
            {/* Animated SVG Water Ring */}
            <div className="relative w-20 h-20">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#1E293B" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="44" fill="none" stroke="#06B6D4" strokeWidth="8" 
                    strokeDasharray="276" strokeDashoffset={276 - (276 * pct) / 100}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out"
                  />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  <Droplets size={22} className={pct >= 100 ? "text-cyan-400" : "text-slate-500"} />
               </div>
            </div>
          </div>

          {/* Quick Water Increment Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[250, 500, 750, 1000].map(amount => (
              <button
                key={amount}
                onClick={() => onAddWater(amount)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all group"
              >
                <span className="text-xs font-black text-white group-hover:text-cyan-400">{amount >= 1000 ? '1L' : amount}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{amount >= 1000 ? '' : 'ml'}</span>
              </button>
            ))}
          </div>

          {/* Custom Intake Input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="Log custom intake"
                className="w-full rounded-2xl px-4 py-3 text-xs font-bold outline-none border border-slate-800 focus:border-cyan-500/50 bg-slate-900 text-white placeholder-slate-500"
                onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">ml</span>
            </div>
            <button
              onClick={handleCustomAdd}
              className="w-11 h-11 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-colors font-bold"
            >
              <Plus size={18} />
            </button>
          </div>
        </>
      )}
    </section>
  );
};
