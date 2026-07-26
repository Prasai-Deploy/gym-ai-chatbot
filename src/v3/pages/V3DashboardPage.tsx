import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { pageVariants } from '../theme/animations';
import { Play, Sparkles, Droplets, Beef, Activity, ChevronRight, HeartPulse, CheckCircle } from 'lucide-react';

export const V3DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.name || 'Athlete';

  return (
    <div className="min-h-screen bg-[#090B10] text-white font-sans pt-20 pb-32 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
      <TopNav />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        {/* Header Greeting & Recovery Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
              Good Morning, {userName}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Here is your hyper-personalized daily training directive.
            </p>
          </div>

          {/* WHOOP-Style Recovery Score Badge */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#131722] border border-emerald-500/30 self-start sm:self-auto">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block">88% Optimal Recovery</span>
              <span className="text-[10px] text-slate-400 font-semibold">High strain capacity today</span>
            </div>
          </div>
        </div>

        {/* TODAY'S MISSION HERO CARD */}
        <Card variant="hero" className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316]">
                TODAY'S MISSION DIRECTIVE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                Upper Body Hypertrophy
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Chest & Back Focus • 5 Exercises • 45 minutes target
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
              High Intensity
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5 fill-white" />}
              onClick={() => navigate('/v3/workout')}
              className="flex-1"
            >
              START WORKOUT ENGINE
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/v3/coach')}
            >
              Modify with AI
            </Button>
          </div>
        </Card>

        {/* SINGLE COACH RECOMMENDATION CARD */}
        <Card variant="coach" className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                COACH RECOMMENDATION
              </span>
              <span className="text-[10px] text-slate-400">Updated 10m ago</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              "Your sleep quality reached 92% last night. Hydrate with +500ml water before starting your bench press sets."
            </p>
          </div>
        </Card>

        {/* VITAL METRICS PAIR (Hydration + Protein Only - No 20 cards!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="metric" className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">Hydration Target</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-display">1.5 / 2.5 L</div>
              <span className="text-[10px] text-cyan-400 font-semibold">60% Completed</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/v3/nutrition')}>
              +250ml
            </Button>
          </Card>

          <Card variant="metric" className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Beef className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300">Protein Intake</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-display">110 / 160 g</div>
              <span className="text-[10px] text-indigo-400 font-semibold">68% Target</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/v3/nutrition')}>
              Log Meal
            </Button>
          </Card>
        </div>

        {/* ACTIVITY TIMELINE (3 Items Only) */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-extrabold text-white">Recent Activity Stream</h3>
            </div>
            <button 
              onClick={() => navigate('/v3/progress')} 
              className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline"
            >
              View History <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Leg Day Hypertrophy Completed', detail: '6 Exercises • 520 kcal • 48 min', date: 'Yesterday' },
              { title: 'New Personal Record: Bench Press', detail: '100 kg × 5 reps', date: 'Jul 24' },
              { title: 'Hydration Target Reached', detail: '2.5L Water Intake', date: 'Jul 24' },
            ].map((act, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-[#1A2030]/60 border border-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">{act.title}</p>
                    <p className="text-[11px] text-slate-400">{act.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{act.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <MobileDock />
    </div>
  );
};
