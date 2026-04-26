import { useState, useEffect } from 'react';
import { Activity, Flame, Heart, Footprints, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardInsightsProps {
  userName: string;
  caloriesBurned: number;
  caloriesGoal?: number;
}

export function DashboardInsights({ userName, caloriesBurned, caloriesGoal }: DashboardInsightsProps) {
  // Simulate live heart rate
  const [heartRate, setHeartRate] = useState(72);
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartRate(prev => {
        const variance = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let next = prev + variance;
        if (next < 60) next = 60;
        if (next > 100) next = 100;
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulate steps (or pull from real data if we had it)
  const [steps, setSteps] = useState(8432);
  const stepGoal = 10000;
  
  // Calculate readiness score (simulated based on calories burned vs goal, or just a baseline)
  // If they burned a lot, readiness might be lower (need recovery), or if they haven't worked out, it's higher.
  const baselineReadiness = 85;
  const readinessScore = Math.min(100, Math.max(0, baselineReadiness + (Math.random() * 5 - 2.5)));
  
  const stepProgress = Math.min((steps / stepGoal) * 100, 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      {/* Hero Card - Daily Readiness */}
      <section className="lg:col-span-8 glass-panel p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={160} />
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            HELLO, <span style={{ color: 'var(--accent-lime)' }}>{userName.split(' ')[0].toUpperCase()}</span>
          </h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>
            AI Coach Analysis: <span className="text-white font-bold">Peak Performance Window</span>
          </p>
        </div>

        <div className="mt-8 flex items-end gap-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background track */}
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              {/* Progress arc */}
              <motion.circle
                cx="50" cy="50" r="40" fill="none" stroke="var(--accent-lime)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 40) * (1 - readinessScore / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(204, 255, 0, 0.4))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: 'var(--accent-lime)' }}>{readinessScore.toFixed(0)}</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Score</span>
            </div>
          </div>
          <div className="pb-4">
            <h3 className="text-2xl font-bold text-white mb-1">Daily Readiness</h3>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Your nervous system is fully recovered. Prime time for heavy lifts.</p>
          </div>
        </div>
      </section>

      {/* Right Column - Smaller Tiles */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Heart Rate Tile */}
        <section className="glass-panel p-6 rounded-[32px] flex items-center justify-between group flex-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart size={16} style={{ color: 'var(--accent-coral)' }} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Heart Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">{heartRate}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-coral)' }}>bpm</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255, 94, 98, 0.1)' }}>
            <Activity size={24} style={{ color: 'var(--accent-coral)' }} />
          </div>
        </section>

        {/* Step Count Tile */}
        <section className="glass-panel p-6 rounded-[32px] flex flex-col justify-center group flex-1 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Footprints size={16} style={{ color: 'var(--accent-lime)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Steps</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{steps.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>/ {stepGoal.toLocaleString()}</span>
          </div>
          
          <div className="w-full h-2 rounded-full overflow-hidden relative z-10" style={{ background: 'var(--surface-input)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--accent-lime)', filter: 'drop-shadow(0 0 4px rgba(204, 255, 0, 0.5))' }}
              initial={{ width: 0 }}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
