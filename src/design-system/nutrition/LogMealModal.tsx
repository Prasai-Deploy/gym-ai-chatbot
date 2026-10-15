import React, { useState } from 'react';
import { X, Utensils, Loader2, AlertCircle } from '../icons';
import { cn } from '../tokens';

export interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeal: (data: {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }) => Promise<void>;
  isSaving?: boolean;
  error?: string | null;
}

export const LogMealModal: React.FC<LogMealModalProps> = ({
  isOpen,
  onClose,
  onSaveMeal,
  isSaving = false,
  error = null,
}) => {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('500');
  const [protein, setProtein] = useState('30');
  const [carbs, setCarbs] = useState('50');
  const [fats, setFats] = useState('15');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please enter a meal name or description');
      return;
    }

    const calNum = Number(calories) || 0;
    const proNum = Number(protein) || 0;
    const carbNum = Number(carbs) || 0;
    const fatNum = Number(fats) || 0;

    await onSaveMeal({
      meal_type: mealType,
      name: name.trim(),
      calories: calNum,
      protein_g: proNum,
      carbs_g: carbNum,
      fats_g: fatNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-sans">Log Meal</h2>
              <p className="text-[10px] text-slate-400 font-medium">Record daily fuel and macronutrients</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          {(validationError || error) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Meal Type Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
              Meal Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={cn(
                    'min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold capitalize transition-all border text-center cursor-pointer',
                    mealType === type
                      ? 'bg-lime-500/15 border-lime-500/40 text-lime-400 shadow-sm'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Description / Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
              Meal Name / Food Items
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scrambled eggs + avocado toast"
              className="w-full bg-[#111520] border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 font-sans"
            />
          </div>

          {/* Calorie & Macronutrient Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                min="0"
                className="w-full bg-[#111520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                Protein (g)
              </label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                min="0"
                className="w-full bg-[#111520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                Carbs (g)
              </label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                min="0"
                className="w-full bg-[#111520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-sans">
                Fats (g)
              </label>
              <input
                type="number"
                value={fats}
                onChange={(e) => setFats(e.target.value)}
                min="0"
                className="w-full bg-[#111520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-lime-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save Meal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
