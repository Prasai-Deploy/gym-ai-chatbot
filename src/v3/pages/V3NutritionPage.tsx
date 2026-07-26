import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatRing } from '../components/ui/StatRing';
import { pageVariants } from '../theme/animations';
import { Utensils, Droplets, Plus, Check } from 'lucide-react';

export const V3NutritionPage: React.FC = () => {
  const [waterAmount, setWaterAmount] = useState(1500);

  const MEALS = [
    { name: 'Breakfast', time: '08:30 AM', desc: 'Oatmeal with whey protein, blueberries & almond butter', cals: '480 kcal', protein: '38g', logged: true },
    { name: 'Lunch', time: '01:15 PM', desc: 'Grilled chicken breast with quinoa & roasted broccoli', cals: '620 kcal', protein: '52g', logged: true },
    { name: 'Post-Workout Snack', time: '04:45 PM', desc: 'Greek yogurt with honey & chia seeds', cals: '250 kcal', protein: '20g', logged: false },
    { name: 'Dinner', time: '08:00 PM', desc: 'Pan-seared salmon with sweet potato & asparagus', cals: '580 kcal', protein: '45g', logged: false },
  ];

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-white">Daily Nutrition Directive</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Timeline-based meal distribution and macro targets.</p>
          </div>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Log Custom Meal
          </Button>
        </div>

        {/* Macro Gauge Pair */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="metric" className="flex flex-col items-center p-6">
            <StatRing value={110} max={160} label="PROTEIN" unit="g" color="#6366F1" size={130} />
          </Card>
          <Card variant="metric" className="flex flex-col items-center p-6">
            <StatRing value={180} max={220} label="CARBS" unit="g" color="#F59E0B" size={130} />
          </Card>
          <Card variant="metric" className="flex flex-col items-center p-6">
            <StatRing value={45} max={65} label="FATS" unit="g" color="#10B981" size={130} />
          </Card>
        </div>

        {/* Timeline Based Meal Stream */}
        <Card variant="default" className="space-y-6">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#F97316]" />
            <h2 className="text-lg font-extrabold text-white font-display">Meal Schedule Timeline</h2>
          </div>

          <div className="space-y-4 relative before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {MEALS.map((meal, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  meal.logged ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-[#131722] border-slate-600'
                }`}>
                  {meal.logged && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <div className="flex-1 p-4 rounded-2xl bg-[#1A2030]/70 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white">{meal.name}</h3>
                    <span className="text-[11px] text-slate-400 font-bold">{meal.time}</span>
                  </div>
                  <p className="text-xs text-slate-300">{meal.desc}</p>
                  <div className="flex items-center gap-3 pt-2 text-[10px] font-bold">
                    <span className="text-orange-400">{meal.cals}</span>
                    <span className="text-indigo-400">{meal.protein} Protein</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Smart Water Tracker */}
        <Card variant="metric" className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300">Smart Water Tracker</span>
              <div className="text-2xl font-extrabold text-white font-display">{(waterAmount / 1000).toFixed(2)} / 2.50 L</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[250, 500, 750].map(amt => (
              <Button key={amt} variant="secondary" size="sm" onClick={() => setWaterAmount(prev => prev + amt)}>
                +{amt}ml
              </Button>
            ))}
          </div>
        </Card>
      </motion.div>

      <MobileDock />
    </div>
  );
};
