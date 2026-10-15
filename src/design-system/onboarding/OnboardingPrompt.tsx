import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Target, Dumbbell, Utensils, CheckCircle2, ArrowRight, X, Sparkles } from '../icons';
import { httpClient } from '../../api/httpClient';

export interface OnboardingPromptProps {
  onComplete?: () => void;
  onDismiss?: () => void;
  onNavigateProfile?: () => void;
}

export const OnboardingPrompt: React.FC<OnboardingPromptProps> = ({
  onComplete,
  onDismiss,
  onNavigateProfile,
}) => {
  const [step, setStep] = useState<number>(1);
  const [goal, setGoal] = useState<string>('Build Strength & Hypertrophy');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [trainingDays, setTrainingDays] = useState<number>(4);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isDismissed) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all([
        httpClient.patch('/identity/profile/fitness', {
          primary_goal: goal,
          level: level,
        }),
        httpClient.patch('/identity/profile/preferences', {
          unit_system: unitSystem,
        }),
      ]);
      onComplete?.();
      setIsDismissed(true);
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
      // Non-blocking: allow user to continue anyway
      setIsDismissed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      variant="glass"
      className="p-5 sm:p-6 rounded-3xl border border-white/10 bg-[#0E1118]/90 backdrop-blur-xl shadow-xl animate-fade-in relative overflow-hidden"
    >
      {/* Top Bar with Step Indicators & Dismiss */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 font-sans">
              Welcome to STRIVA • Step {step} of 4
            </span>
            <h3 className="text-base font-bold text-white font-display">
              Let's personalize STRIVA
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsDismissed(true);
            onDismiss?.();
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Dismiss personalization prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step 1: Fitness Goal */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">What is your primary fitness aspiration?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'Build Strength & Hypertrophy', label: 'Strength & Muscle' },
              { id: 'Improve Endurance & Conditioning', label: 'Endurance & Stamina' },
              { id: 'Fat Loss & Body Composition', label: 'Fat Loss & Lean Mass' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGoal(item.id)}
                className={`p-3 rounded-2xl text-left border text-xs font-semibold transition-all ${
                  goal === item.id
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                <Target className="w-4 h-4 mb-1 text-orange-400" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Training Level */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">How would you describe your training experience?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'beginner' as const, label: 'Beginner', desc: '< 1 year training' },
              { id: 'intermediate' as const, label: 'Intermediate', desc: '1 - 3 years consistent' },
              { id: 'advanced' as const, label: 'Advanced', desc: '3+ years dedicated' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLevel(item.id)}
                className={`p-3 rounded-2xl text-left border text-xs font-semibold transition-all ${
                  level === item.id
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                <Dumbbell className="w-4 h-4 mb-1 text-orange-400" />
                <span className="block text-white font-bold">{item.label}</span>
                <span className="text-[10px] text-slate-400 font-normal">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Weekly Commitment */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">Target weekly workout frequency:</p>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTrainingDays(days)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  trainingDays === days
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                {days} days / week
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Unit System & Confirmation */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">Choose your measurement units:</p>
          <div className="flex gap-2">
            {(['metric', 'imperial'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setUnitSystem(unit)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                  unitSystem === unit
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                {unit} ({unit === 'metric' ? 'kg, cm' : 'lbs, in'})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5">
        <button
          type="button"
          onClick={() => {
            setIsDismissed(true);
            onDismiss?.();
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300 font-medium transition-colors"
        >
          Skip for now
        </button>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="text-xs border-white/10"
            >
              Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Personalizing...' : 'Save & Start'}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
