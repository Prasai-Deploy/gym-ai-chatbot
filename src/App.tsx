import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, MessageSquare, Mic, MicOff, ChevronRight, Check, Dumbbell, Utensils, TrendingUp,
  LayoutDashboard, Award, User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

// Components
import { ThemeToggle } from './components/ThemeToggle';
import { MacroTracker } from './components/MacroTracker';
import { WorkoutTracker } from './components/WorkoutTracker';
import { OnboardingFlow } from './components/OnboardingFlow';
import { Sidebar } from './components/Sidebar';
import { OverviewCharts } from './components/OverviewCharts';

// Hooks & Services
import { useTheme } from './hooks/useTheme';
import { getFitnessAdvice } from './services/chatService';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: 'free' | 'premium' | 'admin';
  streak: number;
  fitness_goal?: string;
  weight?: number;
  height?: number;
  age?: number;
  water_goal?: number;
  calorie_goal?: number;
  protein_goal?: number;
  carb_goal?: number;
  fat_goal?: number;
}

interface ProgressData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  workout_name: string;
}

interface DailyPlan {
  id: number;
  date: string;
  workout_plan: string;
  diet_plan: string;
  completed: boolean;
}

const QUICK_ACTIONS = [
  "🏋️ Workout Plans",
  "🥗 Diet Chart",
  "💪 Membership",
  "📅 Book a Session"
];

export default function App() {
  useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'profile' | 'achievements'>('dashboard');
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'model', content: "Welcome to your Premium AI Fitness Hub. How can I assist you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProgress();
      fetchWeeklyStats();
      fetchPlans();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    const res = await fetch('/api/progress');
    const data = await res.json();
    setProgress(data);
  };

  const fetchWeeklyStats = async () => {
    const res = await fetch('/api/stats/weekly');
    const data = await res.json();
    setWeeklyStats(data);
  };

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setDailyPlans(data);
  };

  const handleOnboardingComplete = async (data: any) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout');
    window.location.reload();
  };

  const handleSendMessage = async (explicitMessage?: string) => {
    const text = explicitMessage || input;
    if (!text.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      const advice = await getFitnessAdvice(text, history);
      setMessages([...newMsgs, { role: 'model', content: advice }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white font-bold">Initializing Platform...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="bg-blob bg-blob-1 opacity-30" />
        <div className="bg-blob bg-blob-2 opacity-30" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/40">
            <Dumbbell className="text-white" size={40} />
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-white uppercase italic">Sweat Fix AI</h1>
          <p className="text-zinc-400 text-lg mb-12">The next generation of personalized fitness and nutrition intelligence.</p>
          
          <button 
            onClick={() => window.location.href = '/api/auth/google'}
            className="w-full bg-white text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
            GET STARTED WITH GOOGLE
          </button>

          <button 
            onClick={async () => {
              const res = await fetch('/api/auth/demo', { method: 'POST' });
              if (res.ok) fetchUser();
            }}
            className="w-full mt-4 bg-zinc-900 text-zinc-400 font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-all"
          >
            TRY THE LIVE DEMO
          </button>
        </motion.div>
      </div>
    );
  }

  // Show onboarding if essential data is missing
  if (!user.fitness_goal) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* SaaS Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 pb-24 lg:pb-10 transition-all duration-300">
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-10">
          
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl lg:text-4xl font-black tracking-tight italic">
                {activeTab === 'dashboard' ? 'MY PERFORMANCE' : 
                 activeTab === 'chat' ? 'AI COACH' : 
                 activeTab === 'achievements' ? 'ACCOLADES' : 'MY PROFILE'}
              </h1>
              <p className="text-xs lg:text-sm text-zinc-500 font-medium">Tracking your journey to greatness.</p>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] lg:text-sm font-bold tracking-widest text-emerald-500 uppercase">{user.streak} DAY STREAK</span>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Daily Calories" value="1,850" unit="kcal" sub="75% of goal" color="emerald" />
                  <StatCard label="Protein Logged" value="142" unit="g" sub="+12g from yesterday" color="blue" />
                  <StatCard label="Water Intake" value="2.4" unit="L" sub="Almost there!" color="cyan" />
                  <StatCard label="Workout Score" value="A+" unit="" sub="Consistent week" color="purple" />
                </div>

                {/* Macro Tracker Integration */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-widest italic">Macro Breakdown</h2>
                    <button onClick={() => setShowForm(true)} className="btn-gradient px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                      <Plus size={16} /> LOG MEAL
                    </button>
                  </div>
                  <MacroTracker 
                    protein={progress.reduce((s, p) => s + (p.protein || 0), 0)} 
                    carbs={progress.reduce((s, p) => s + (p.carbs || 0), 0)} 
                    fats={progress.reduce((s, p) => s + (p.fats || 0), 0)} 
                    calories={progress.reduce((s, p) => s + (p.calories || 0), 0)}
                    proteinGoal={user.protein_goal} 
                    carbsGoal={user.carb_goal} 
                    fatsGoal={user.fat_goal} 
                    caloriesGoal={user.calorie_goal}
                  />
                </section>

                {/* High-Value Charts */}
                <section className="space-y-6">
                  <h2 className="text-xl font-black uppercase tracking-widest italic">Performance Trends</h2>
                  <OverviewCharts data={weeklyStats} />
                </section>

                {/* Protocol Section */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h2 className="text-xl font-black uppercase tracking-widest italic">Workout Protocol</h2>
                    <div className="glass-panel p-6 rounded-[32px] min-h-[200px]">
                      {dailyPlans[0]?.workout_plan ? (
                        <div className="whitespace-pre-wrap text-zinc-400 leading-relaxed font-medium capitalize">
                          {dailyPlans[0].workout_plan}
                        </div>
                      ) : (
                        <p className="text-zinc-600 italic">No workout logged for today. Ask your AI coach!</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-xl font-black uppercase tracking-widest italic">Nutrition Protocol</h2>
                    <div className="glass-panel p-6 rounded-[32px] min-h-[200px]">
                      {dailyPlans[0]?.diet_plan ? (
                        <div className="whitespace-pre-wrap text-zinc-400 leading-relaxed font-medium">
                          {dailyPlans[0].diet_plan}
                        </div>
                      ) : (
                        <p className="text-zinc-600 italic">No nutrition logged for today. Ask your AI coach!</p>
                      )}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-[calc(100vh-280px)] lg:h-[calc(100vh-240px)] flex flex-col glass-panel rounded-[24px] lg:rounded-[40px] overflow-hidden transition-all duration-300"
              >
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-4 lg:space-y-6 scroll-smooth">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] lg:max-w-[75%] p-4 lg:p-6 rounded-[20px] lg:rounded-3xl ${m.role === 'user' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-900/50 border border-zinc-900 text-zinc-100'}`}>
                        <div className="prose prose-invert max-w-none text-xs lg:text-base leading-relaxed font-medium">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900/50 px-4 py-3 lg:p-6 rounded-2xl lg:rounded-3xl flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 lg:p-6 bg-zinc-900/30 border-t border-zinc-900">
                  <div className="flex gap-3 lg:gap-4 items-end max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Ask your coach anything..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 outline-none focus:ring-2 ring-blue-500/50 resize-none max-h-32 min-h-[48px] lg:min-h-[56px] text-sm lg:text-base"
                        rows={1}
                      />
                    </div>
                    <button 
                      onClick={() => handleSendMessage()}
                      className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-600 rounded-xl lg:rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-600/30 flex-shrink-0"
                    >
                      <ChevronRight size={20} className="lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div 
                key="achievements"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                <BadgeCard title="First Rep" description="Log your first workout" icon={<Dumbbell />} date="Yesterday" unlocked />
                <BadgeCard title="Macro Master" description="Hit your protein goal 7 days in a row" icon={<Utensils />} locked />
                <BadgeCard title="Hydration Hero" description="Drink 3L of water for 3 days" icon={<TrendingUp />} locked />
                <BadgeCard title="Early Bird" description="Log a workout before 7 AM" icon={<TrendingUp />} locked />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Legacy Modals Integration */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel w-full max-w-md p-8 rounded-[32px]"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold italic uppercase tracking-widest">Log Nutrient</h2>
                <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><Plus className="rotate-45" size={24} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = {
                  food_name: (form.elements.namedItem('food_name') as HTMLInputElement).value,
                  calories: Number((form.elements.namedItem('calories') as HTMLInputElement).value),
                  protein: Number((form.elements.namedItem('protein') as HTMLInputElement).value),
                  carbs: Number((form.elements.namedItem('carbs') as HTMLInputElement).value),
                  fats: Number((form.elements.namedItem('fats') as HTMLInputElement).value),
                  meal_type: (form.elements.namedItem('meal_type') as HTMLSelectElement).value,
                };
                await fetch('/api/food-logs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                setShowForm(false);
                fetchProgress();
                fetchWeeklyStats();
              }} className="space-y-4">
                <input name="food_name" placeholder="What did you eat?" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <input name="calories" type="number" placeholder="Calories" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" required />
                  <input name="protein" type="number" placeholder="Protein (g)" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input name="carbs" type="number" placeholder="Carbs (g)" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" required />
                  <input name="fats" type="number" placeholder="Fats (g)" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" required />
                </div>
                <select name="meal_type" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none">
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                <button type="submit" className="w-full btn-gradient py-4 rounded-xl font-black uppercase tracking-widest text-sm italic">Lock In Meal</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-900 px-6 pb-6 pt-2 z-50 flex items-center justify-between">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Stats' },
          { id: 'chat', icon: MessageSquare, label: 'Coach' },
          { id: 'achievements', icon: Award, label: 'Badges' },
          { id: 'profile', icon: UserIcon, label: 'Me' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-blue-500 scale-110' : 'text-zinc-500'}`}
          >
            <item.icon size={20} fill={activeTab === item.id ? 'currentColor' : 'none'} fillOpacity={0.2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, sub, color }: any) {
  const colors: any = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    cyan: 'text-cyan-500 bg-cyan-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };
  return (
    <div className="glass-panel p-5 lg:p-6 rounded-[24px] lg:rounded-[32px] space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 truncate">{label}</p>
      <div className="flex items-baseline flex-wrap gap-1">
        <span className="text-2xl lg:text-3xl font-black tracking-tight italic">{value}</span>
        <span className="text-[10px] font-bold text-zinc-500 uppercase">{unit}</span>
      </div>
      <p className={`text-[10px] lg:text-xs font-bold px-2 py-1 rounded-lg inline-block ${colors[color]}`}>{sub}</p>
    </div>
  );
}

function BadgeCard({ title, description, icon, date, unlocked, locked }: any) {
  return (
    <div className={`glass-panel p-6 rounded-[32px] text-center space-y-4 ${locked ? 'opacity-40 grayscale' : ''}`}>
      <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${unlocked ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/20' : 'bg-zinc-900 text-zinc-600'}`}>
        {React.cloneElement(icon, { size: 32 })}
      </div>
      <div>
        <h4 className="font-black uppercase tracking-widest text-sm italic">{title}</h4>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </div>
      {date && <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600">{date}</p>}
    </div>
  );
}
