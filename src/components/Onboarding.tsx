import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Target, 
  User, 
  Zap, 
  Focus, 
  Calculator 
} from 'lucide-react';

interface OnboardingProps {
  userId: number | string;
  onComplete: (data: any) => void;
}

const GOALS = ["Lose weight", "Build muscle", "Get fit", "Stay healthy"];
const ACTIVITY_LEVELS = ["Sedentary", "Lightly active", "Moderately active", "Very active"];
const FOCUS_AREAS = [
  "Upper body", "Lower body", "Core strength", "Cardio", 
  "Flexibility", "Weight loss", "Nutrition", "Sleep & recovery", 
  "Mental wellness", "Posture"
];

const ACCENT_COLOR = "#1D9E75";

export const Onboarding: React.FC<OnboardingProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goal: "",
    gender: "Male",
    age: 25,
    weight_kg: 70,
    height_cm: 175,
    activity_level: "",
    focus_areas: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);

  const calculateBMI = () => {
    const heightM = formData.height_cm / 100;
    return (formData.weight_kg / (heightM * heightM)).toFixed(1);
  };

  const calculateCalories = () => {
    let bmr = (10 * formData.weight_kg) + (6.25 * formData.height_cm) - (5 * formData.age);
    bmr = formData.gender === "Male" ? bmr + 5 : bmr - 161;
    
    const multipliers: Record<string, number> = {
      "Sedentary": 1.2,
      "Lightly active": 1.375,
      "Moderately active": 1.55,
      "Very active": 1.725
    };
    
    const multiplier = multipliers[formData.activity_level] || 1.2;
    return Math.round(bmr * multiplier);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleFocusArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          focus_areas: formData.focus_areas.join(', ')
        }),
      });
      
      if (response.ok) {
        onComplete(formData);
      } else {
        alert("Failed to save profile. Please try again.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT_COLOR}20` }}>
                <Target size={32} style={{ color: ACCENT_COLOR }} />
              </div>
              <h2 className="text-2xl font-bold">What's your primary goal?</h2>
              <p className="text-zinc-400 mt-2">Help us personalize your experience</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {GOALS.map(goal => (
                <button
                  key={goal}
                  onClick={() => { setFormData({...formData, goal}); handleNext(); }}
                  className={`p-4 rounded-2xl text-left font-semibold transition-all border-2 ${formData.goal === goal ? `border-[${ACCENT_COLOR}] bg-[${ACCENT_COLOR}]10` : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}
                  style={formData.goal === goal ? { borderColor: ACCENT_COLOR, backgroundColor: `${ACCENT_COLOR}10` } : {}}
                >
                  {goal}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT_COLOR}20` }}>
                <User size={32} style={{ color: ACCENT_COLOR }} />
              </div>
              <h2 className="text-2xl font-bold">Tell us about yourself</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Age</label>
                  <input 
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weight (kg)</label>
                  <span className="font-bold text-emerald-500">{formData.weight_kg} kg</span>
                </div>
                <input 
                  type="range" min="40" max="160" 
                  value={formData.weight_kg}
                  onChange={e => setFormData({...formData, weight_kg: parseInt(e.target.value)})}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Height (cm)</label>
                  <span className="font-bold text-emerald-500">{formData.height_cm} cm</span>
                </div>
                <input 
                  type="range" min="140" max="220" 
                  value={formData.height_cm}
                  onChange={e => setFormData({...formData, height_cm: parseInt(e.target.value)})}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT_COLOR}20` }}>
                <Zap size={32} style={{ color: ACCENT_COLOR }} />
              </div>
              <h2 className="text-2xl font-bold">Activity Level</h2>
              <p className="text-zinc-400 mt-2">How active are you daily?</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {ACTIVITY_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => { setFormData({...formData, activity_level: level}); handleNext(); }}
                  className={`p-4 rounded-2xl text-left font-semibold transition-all border-2 ${formData.activity_level === level ? `border-[${ACCENT_COLOR}] bg-[${ACCENT_COLOR}]10` : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}
                  style={formData.activity_level === level ? { borderColor: ACCENT_COLOR, backgroundColor: `${ACCENT_COLOR}10` } : {}}
                >
                  {level}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT_COLOR}20` }}>
                <Focus size={32} style={{ color: ACCENT_COLOR }} />
              </div>
              <h2 className="text-2xl font-bold">Focus Areas</h2>
              <p className="text-zinc-400 mt-2">Select all that apply</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => toggleFocusArea(area)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border-2 ${formData.focus_areas.includes(area) ? `border-[${ACCENT_COLOR}] bg-[${ACCENT_COLOR}] text-white` : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'}`}
                  style={formData.focus_areas.includes(area) ? { borderColor: ACCENT_COLOR, backgroundColor: ACCENT_COLOR } : {}}
                >
                  {area}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT_COLOR}20` }}>
                <Calculator size={32} style={{ color: ACCENT_COLOR }} />
              </div>
              <h2 className="text-2xl font-bold">Your Fitness Profile</h2>
              <p className="text-zinc-400 mt-2">Based on your input</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-zinc-900 border-2 border-zinc-800 text-center">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Daily Calories</p>
                <div className="text-3xl font-extrabold text-white">{calculateCalories()}</div>
                <p className="text-[10px] text-emerald-500 font-bold mt-1">kcal / day</p>
              </div>
              <div className="p-6 rounded-3xl bg-zinc-900 border-2 border-zinc-800 text-center">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Current BMI</p>
                <div className="text-3xl font-extrabold text-white">{calculateBMI()}</div>
                <p className="text-[10px] text-emerald-500 font-bold mt-1">Normal (18.5 - 25)</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/50 border-2 border-zinc-800 space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Goal</span>
                <span className="text-white font-bold">{formData.goal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Activity</span>
                <span className="text-white font-bold">{formData.activity_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Focus</span>
                <span className="text-white font-bold text-right truncate ml-4">{formData.focus_areas.slice(0, 2).join(', ')}{formData.focus_areas.length > 2 ? '...' : ''}</span>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--surface-primary)] z-[100] flex flex-col overflow-hidden" style={{ height: '100svh' }}>
      {/* Decorative Blobs */}
      <div className="bg-blob bg-blob-1 opacity-20" />
      <div className="bg-blob bg-blob-2 opacity-20" />

      {/* Header with dots */}
      <div className="px-6 pt-12 pb-6 flex flex-col items-center gap-6 relative z-10" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{ 
                background: step === i ? ACCENT_COLOR : 'var(--text-muted)',
                opacity: step === i ? 1 : 0.3,
                transform: step === i ? 'scale(1.2)' : 'scale(1)'
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 relative z-10">
        <div className="max-w-md mx-auto w-full h-full flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full flex flex-col"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)] to-transparent"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto flex gap-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={isSaving}
              className="w-14 h-14 rounded-2xl bg-[var(--surface-elevated)] text-white font-bold flex items-center justify-center border border-[var(--glass-border)] active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !formData.goal) || (step === 3 && !formData.activity_level) || (step === 4 && formData.focus_areas.length === 0)}
              className="flex-1 h-14 rounded-2xl text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: ACCENT_COLOR }}
            >
              Continue <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 h-14 rounded-2xl text-black font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: ACCENT_COLOR }}
            >
              {isSaving ? "Saving..." : "Start My Journey"} <Check size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
