import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Dumbbell, Target, User as UserIcon } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (data: any) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    fitness_goal: 'fat loss'
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = () => {
    onComplete(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-blob bg-blob-1 opacity-20" />
      <div className="bg-blob bg-blob-2 opacity-20" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-lg p-6 lg:p-10 rounded-[28px] lg:rounded-[40px] relative z-10 mx-auto overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6 lg:mb-10">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
          ))}
        </div>

        <div className="min-h-[320px] lg:min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <UserIcon className="text-blue-500" size={24} />
                  </div>
                  <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter">The Basics</h2>
                </div>
                <p className="text-sm lg:text-lg text-zinc-400 font-medium">Let's start with some basic information about you.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Age</label>
                    <input 
                      type="number" 
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 ring-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Gender</label>
                    <select 
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 ring-blue-500/50 appearance-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Dumbbell className="text-emerald-500" size={24} />
                  </div>
                  <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter">Body Metrics</h2>
                </div>
                <p className="text-sm lg:text-lg text-zinc-400 font-medium">Accurate metrics help us calculate your perfect macro goals.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={formData.weight}
                      onChange={e => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 ring-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Height (cm)</label>
                    <input 
                      type="number" 
                      value={formData.height}
                      onChange={e => setFormData({ ...formData, height: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 ring-emerald-500/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl">
                    <Target className="text-purple-500" size={24} />
                  </div>
                  <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter">Your Goal</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Fat Loss', 'Muscle Gain', 'Maintenance', 'Body Recomp'].map(goal => (
                    <button
                      key={goal}
                      onClick={() => setFormData({ ...formData, fitness_goal: goal.toLowerCase() })}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        formData.fitness_goal === goal.toLowerCase()
                          ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm uppercase tracking-widest italic">{goal}</span>
                        {formData.fitness_goal === goal.toLowerCase() && <Check size={16} />}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 mt-10">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <ChevronLeft size={20} /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          
          <button
            onClick={step === 3 ? handleFinish : nextStep}
            className="flex-[2] py-4 btn-gradient text-white font-black uppercase tracking-widest text-sm italic rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {step === 3 ? 'Get Started' : 'Continue'} <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
