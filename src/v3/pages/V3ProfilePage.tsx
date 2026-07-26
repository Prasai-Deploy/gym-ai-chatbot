import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pageVariants } from '../theme/animations';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Shield, Settings, Award } from 'lucide-react';

export const V3ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
        <div className="flex items-center gap-4 p-6 bg-[#131722] border border-white/10 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-lg shadow-orange-500/20">
            <img 
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Athlete'} 
              className="w-full h-full rounded-full object-cover bg-[#090B10]"
              alt="Profile"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-white font-display">{user?.name || 'STRIVA Athlete'}</h1>
            <p className="text-xs text-slate-400">{user?.email || 'athlete@striva.fit'}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
              PRO MEMBER
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="default" className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-extrabold text-white">Fitness Targets</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Daily Calorie Target</span>
                <span className="font-bold text-white">2,000 kcal</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Protein Goal</span>
                <span className="font-bold text-white">160 g</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Hydration Goal</span>
                <span className="font-bold text-white">2.5 L</span>
              </div>
            </div>
          </Card>

          <Card variant="default" className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-extrabold text-white">Member Accomplishments</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Active Streak</span>
                <span className="font-bold text-amber-400">7 Days</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Workouts Mastered</span>
                <span className="font-bold text-white">24 Sessions</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Total Volume Lifted</span>
                <span className="font-bold text-white">142,500 kg</span>
              </div>
            </div>
          </Card>
        </div>

        <Button 
          variant="destructive" 
          size="lg" 
          icon={<LogOut className="w-5 h-5" />} 
          onClick={logout}
          className="w-full"
        >
          Sign Out of STRIVA
        </Button>
      </motion.div>

      <MobileDock />
    </div>
  );
};
