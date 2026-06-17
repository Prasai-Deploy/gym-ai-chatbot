import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Dumbbell,
  Utensils,
  TrendingUp,
  MessageSquare,
  LogOut,
  QrCode,
  Plus,
  ChevronRight,
  User as UserIcon,
  Flame,
  Droplets,
  Beef,
  Wheat,
  Activity,
  Edit2,
  Check,
  Bot,
  Mic,
  MicOff,
  History
} from 'lucide-react';
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { getFitnessAdvice } from './services/chatService';
import {
  cacheUser, getCachedUser,
  cacheProgress, getCachedProgress,
  cachePlans, getCachedPlans,
  queueRequest, replayQueue,
} from './services/offlineStorage';

// --- START FEATURE: THEME TOGGLE ---
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
// --- END FEATURE: THEME TOGGLE ---

import { useAuth } from './context/AuthContext';

// --- START FEATURE: MACRO TRACKER ---
import { MacroTracker } from './components/MacroTracker';
// --- END FEATURE: MACRO TRACKER ---

// --- START FEATURE: WORKOUT TRACKER ---
import { WorkoutTracker } from './components/WorkoutTracker';
// --- END FEATURE: WORKOUT TRACKER ---

// --- START FEATURE: CALORIES RING ---
import { CaloriesRing } from './components/CaloriesRing';
// --- END FEATURE: CALORIES RING ---

// --- START FEATURE: BOTTOM NAV ---
import { BottomNav } from './components/BottomNav';
// --- END FEATURE: BOTTOM NAV ---

// --- START FEATURE: PWA COMPONENTS ---
import { InstallPrompt } from './components/InstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
// --- END FEATURE: PWA COMPONENTS ---

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
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

// ─── Daily Water Tracker Component ───────────────────────────────────────────
interface WaterTrackerProps {
  currentWater: number;
  waterGoal: number;
  onAddWater: (amount: number) => void;
  onUpdateGoal: (newGoal: number) => void;
  onRemoveWater?: (id: number) => void;
}

function WaterTracker({ currentWater, waterGoal, onAddWater, onUpdateGoal, onRemoveWater, logs = [] }: WaterTrackerProps & { logs?: any[] }) {
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
    <section className="card p-6 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Droplets size={22} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight text-white">Daily Water Log</h3>
            <p className="text-[10px] uppercase tracking-widest font-black text-blue-500/80 mt-0.5">Smart Hydration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className={`p-2 rounded-xl transition-colors ${showLogs ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <History size={18} />
          </button>
          {isEditingGoal ? (
            <div className="flex items-center gap-2 bg-zinc-900 rounded-xl p-1 px-2 border border-blue-500/30">
              <input 
                type="number" 
                value={tempGoal} 
                onChange={e => setTempGoal(e.target.value)} 
                className="w-16 px-1 py-1 text-xs bg-transparent text-white outline-none font-bold" 
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
              />
              <button onClick={handleSaveGoal} className="text-[10px] font-black text-blue-400 uppercase">Set</button>
            </div>
          ) : (
            <button
              onClick={() => { setTempGoal((waterGoal || 2000).toString()); setIsEditingGoal(true); }}
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-all"
            >
              Goal
            </button>
          )}
        </div>
      </div>

      {showLogs ? (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Today's Intake</span>
             <button onClick={() => setShowLogs(false)} className="text-[10px] font-bold text-blue-400">Back</button>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Droplets size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{log.intake_amount}ml</div>
                    <div className="text-[9px] text-zinc-500 uppercase">{format(new Date(log.created_at), 'hh:mm a')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{log.source}</div>
                  <button 
                    onClick={() => onRemoveWater?.(log.id)}
                    className="p-1 hover:text-red-500 transition-colors"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-xs text-zinc-600 italic">No logs for today.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Total + Progress Circle */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-left">
              <div className="text-4xl font-black tabular-nums tracking-tight text-white">
                {(currentWater / 1000).toFixed(2)}
                <span className="text-xl font-bold ml-1 text-zinc-500">L</span>
              </div>
              <div className="text-xs font-bold mt-1 text-zinc-400">
                {currentWater} / {waterGoal || 2000} ml · <span className="text-blue-400">{pct}%</span>
              </div>
              <div className="text-xs font-bold mt-2 text-blue-500 uppercase tracking-wider">{status}</div>
            </div>
            
            {/* Simple Animated Ring */}
            <div className="relative w-20 h-20">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" 
                    strokeDasharray="283" strokeDashoffset={283 - (283 * pct) / 100}
                    strokeLinecap="round" className="transition-all duration-1000 ease-out"
                  />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center">
                  <Droplets size={20} className={pct >= 100 ? "text-blue-400" : "text-zinc-700"} />
               </div>
            </div>
          </div>

          {/* Quick Add Grid */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[250, 500, 750, 1000].map(amount => (
              <button
                key={amount}
                onClick={() => onAddWater(amount)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
              >
                <span className="text-xs font-black text-white group-hover:text-blue-400">{amount >= 1000 ? '1L' : amount}</span>
                <span className="text-[8px] font-bold text-zinc-600 uppercase mt-0.5 group-hover:text-blue-500/50">{amount >= 1000 ? '' : 'ml'}</span>
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="number"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="Custom log"
                className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-none border border-white/5 focus:border-blue-500/50 placeholder-zinc-700 bg-zinc-900/80 text-white"
                onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase">ml</span>
            </div>
            <button
              onClick={handleCustomAdd}
              className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  useTheme(); // Initialize theme from localStorage on load
  const { user, setUser, logout } = useAuth();
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'model', content: "Welcome to Sweat Fix. How can I assist with your fitness goals or macros today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [planHistory, setPlanHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [waterSummary, setWaterSummary] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [chartMetric, setChartMetric] = useState<'calories_burned' | 'workouts_completed' | 'exercises_completed' | 'workout_duration' | 'hydration_completion'>('calories_burned');
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, chatOpen]);

  // Plan state
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    workout_plan: '',
    diet_plan: ''
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    workout_name: string;
    calories: number | '';
    protein: number | '';
    carbs: number | '';
    fats: number | '';
    water: number | '';
  }>({
    workout_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    water: ''
  });

  // Prevent background scrolling when modals are open
  useEffect(() => {
    const isModalOpen = chatOpen || showForm || showPlanForm || showProfile;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Horizontal wheel scroll for desktop analytics tabs
    const tabs = document.getElementById('analytics-tabs');
    const handleWheel = (e: WheelEvent) => {
      if (tabs && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        tabs.scrollLeft += e.deltaY;
      }
    };
    tabs?.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      document.body.style.overflow = '';
      tabs?.removeEventListener('wheel', handleWheel);
    };
  }, [chatOpen, showForm, showPlanForm, showProfile]);

  useEffect(() => {
    fetchUser();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);

    // Replay queued offline requests when we come back online
    const handleOnline = async () => {
      const replayed = await replayQueue();
      if (replayed > 0) {
        fetchProgress();
        fetchPlans();
      }
    };
    window.addEventListener('online', handleOnline);

    // Listen for workout completion to refresh dashboard
    const handleWorkoutCompleted = () => {
      fetchProgress();
      fetchPlans();
      fetchWeeklyProgress();
      fetchActivities();
    };
    window.addEventListener('workout-completed', handleWorkoutCompleted);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('workout-completed', handleWorkoutCompleted);
    };

  }, []);

  useEffect(() => {
    fetchActivities();
    fetchWeeklyProgress();
  }, [user]);

  // ── SSE: real-time push from server after every chat-triggered DB write ──────
  useEffect(() => {
    if (!user) return;

    const es = new EventSource('/api/stream');

    es.addEventListener('dashboard-update', (e: MessageEvent) => {
      try {
        const flags = JSON.parse(e.data);
        if (flags.progress || flags.activity) {
          fetchProgress();
          fetchWeeklyProgress();
          fetchActivities();
        }
        if (flags.hydration) {
          fetchTodayWater();
          fetchDashboardData();
        }
        if (flags.weight) {
          fetchDashboardData();
        }
        if (flags.macros || flags.userProfile) {
          fetchUser();
        }
        if (flags.plans) {
          fetchPlans();
          fetchTodayWater();
          fetchUser();
        }
      } catch {}
    });

    es.onerror = () => {
      // SSE disconnected — browser auto-reconnects; silent
    };

    // Fallback polling at 30s (handles tabs that lose SSE)
    const fallbackPoll = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      es.close();
      clearInterval(fallbackPoll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useLayoutEffect(() => {
    if (!weeklyChartData.length) return;

    let root = am5.Root.new("chartdiv");

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root)
    ]);

    let chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: true,
      panY: false,
      wheelX: "panX",
      wheelY: "zoomX",
      pinchZoomX: true,
      layout: root.verticalLayout
    }));

    // Add cursor (tooltips only, no behavior change)
    let cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
      behavior: "none"
    }));
    cursor.lineX.set("visible", false);
    cursor.lineY.set("visible", false);

    // Create axes
    let xAxisRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30,
      minorGridEnabled: true
    });
    xAxisRenderer.grid.template.set("strokeOpacity", 0);

    let xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
      categoryField: "date",
      renderer: xAxisRenderer,
      tooltip: am5.Tooltip.new(root, {})
    }));
    
    const formattedData = weeklyChartData.map(d => ({
      ...d,
      date: format(new Date(d.date), 'EEE')
    }));
    xAxis.data.setAll(formattedData);

    let yAxisRenderer = am5xy.AxisRendererY.new(root, {});
    yAxisRenderer.grid.template.set("strokeOpacity", 0.05);
    yAxisRenderer.grid.template.set("strokeDasharray", [3, 3]);

    let yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
      renderer: yAxisRenderer,
      min: 0
    }));

    // Series color and type selection
    const config = {
      calories_burned:      { color: 0x10b981, type: 'area', unit: 'kcal' }, 
      workouts_completed:   { color: 0x7c3aed, type: 'line', unit: 'workouts' },
      hydration_completion: { color: 0x3b82f6, type: 'area', unit: '%' },
      exercises_completed:  { color: 0xf59e0b, type: 'line', unit: 'exercises' }
    }[chartMetric] || { color: 0x7c3aed, type: 'line', unit: '' };

    let series: am5xy.LineSeries;
    if (config.type === 'area') {
      series = chart.series.push(am5xy.LineSeries.new(root, {
        name: chartMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: chartMetric,
        categoryXField: "date",
        fill: am5.color(config.color),
        stroke: am5.color(config.color),
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY} " + config.unit
        })
      }));
      series.fills.template.setAll({
        fillOpacity: 0.2,
        visible: true
      });
    } else {
      series = chart.series.push(am5xy.LineSeries.new(root, {
        name: chartMetric.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: chartMetric,
        categoryXField: "date",
        stroke: am5.color(config.color),
        tooltip: am5.Tooltip.new(root, {
          labelText: "{valueY} " + config.unit
        })
      }));
    }

    series.strokes.template.setAll({
      strokeWidth: 4
    });

    series.bullets.push(function () {
      let graphics = am5.Circle.new(root, {
        radius: 6,
        fill: am5.color(0x18181b),
        stroke: am5.color(config.color),
        strokeWidth: 2
      });

      return am5.Bullet.new(root, {
        sprite: graphics
      });
    });

    series.data.setAll(formattedData);
    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [weeklyChartData, chartMetric]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/auth/me');
      const data = await res.json();
      setUser(data);
      if (data) {
        await cacheUser(data); // Cache for offline
        fetchProgress();
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
      // Offline fallback: load from IndexedDB
      const cached = await getCachedUser();
      if (cached) {
        setUser(cached);
        const cachedProgress = await getCachedProgress();
        if (cachedProgress) setProgress(cachedProgress);
        const cachedPlans = await getCachedPlans();
        if (cachedPlans) setDailyPlans(cachedPlans);
      }
    }
  };

  const fetchWeeklyProgress = async () => {
    try {
      const [chartRes, summaryRes] = await Promise.all([
        fetch('/api/progress/chart-data'),
        fetch('/api/progress/summary')
      ]);
      if (chartRes.ok) {
        const data = await chartRes.json();
        setWeeklyChartData(Array.isArray(data) ? data : []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setWeeklySummary(data || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard/progress');
      if (!res.ok) return;
      const data = await res.json();
      setDashboardData(data);
      if (data.today_stats) {
        setWaterSummary({
          total_consumed: data.today_stats.water_ml,
          daily_goal: user?.water_goal || 2000,
          completion_percentage: Math.min(100, Math.round((data.today_stats.water_ml / (user?.water_goal || 2000)) * 100))
        });
      }
      if (data.recent_workouts) {
        setProgress(data.recent_workouts); // Backwards compatibility if needed
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity/recent?limit=10');
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTodayWater = async () => {
    try {
      const res = await fetch('/api/water/today');
      if (res.ok) {
        const { summary, logs } = await res.json();
        setWaterSummary(summary);
        setWaterLogs(logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWater = async (amount: number) => {
    // Optimistic UI
    setWaterSummary((prev: any) => ({
      ...prev,
      total_consumed: (prev?.total_consumed || 0) + amount,
      completion_percentage: Math.min(100, Math.round(((prev?.total_consumed || 0) + amount) / (prev?.daily_goal || 2000) * 100))
    }));

    // Optimistic UI for chart
    const today = new Date().toISOString().split('T')[0];
    setWeeklyChartData(prev => prev.map(d => 
      d.date.includes(today) ? { ...d, hydration_completion: Math.min(100, (d.hydration_completion || 0) + (amount / 2000 * 100)) } : d
    ));

    try {
      const res = await fetch('/api/water/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, source: 'manual' })
      });
      if (res.ok) {
        fetchTodayWater();
        fetchDashboardData();
        fetchWeeklyProgress();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWaterGoal = async (goal: number) => {
    try {
      const res = await fetch('/api/water/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, isAI: false })
      });
      if (res.ok) {
        fetchTodayWater();
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveWater = async (id: number) => {
    try {
      const res = await fetch(`/api/water/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTodayWater();
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPlans = async () => {
    try {
      // 1. Fetch latest active plan
      const res = await fetch('/api/dashboard/latest-plan');
      if (res.ok) {
        const plan = await res.json();
        if (plan) {
          // Map to dailyPlans for backwards compatibility
          setDailyPlans([{
            id: plan.id,
            date: format(new Date(plan.created_at), 'MMM dd'),
            workout_plan: plan.workout_title || 'Workout',
            diet_plan: plan.diet_title || 'Diet',
            completed: false, // We'll handle this with the new percentage
            ...plan
          }]);
        }
      }

      // 2. Fetch legacy plans if needed
      const legacyRes = await fetch('/api/plans');
      if (legacyRes.ok) {
        const data = await legacyRes.json();
        // setDailyPlans(prev => [...prev, ...data]); // Merge or handle separately
      }
      
      // 3. Fetch history
      const historyRes = await fetch('/api/dashboard/history');
      if (historyRes.ok) {
        const history = await historyRes.json();
        setPlanHistory(Array.isArray(history) ? history : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProgress = async () => {
    fetchDashboardData();
  };

  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDemoLogin = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        const userData = await res.json();
        if (userData && userData.id) {
          setUser(userData);
        } else {
          fetchUser();
        }
      } else {
        alert('Demo login failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      calories: Number(formData.calories) || 0,
      protein: Number(formData.protein) || 0,
      carbs: Number(formData.carbs) || 0,
      fats: Number(formData.fats) || 0,
      water: Number(formData.water) || 0,
      date: format(new Date(), 'MMM dd')
    };
    // Optimistic UI for chart
    const today = new Date().toISOString().split('T')[0];
    setWeeklyChartData(prev => prev.map(d => 
      d.date.includes(today) ? { ...d, calories_burned: (d.calories_burned || 0) + (payload.calories || 0) } : d
    ));

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchWeeklyProgress();
    } catch {
      // Offline: queue for later
      await queueRequest('/api/progress', 'POST', payload);
    }
    setFormData({ workout_name: '', calories: '', protein: '', carbs: '', fats: '', water: '' });
    setShowForm(false);
    fetchProgress();
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...planForm,
        date: format(new Date(), 'MMM dd')
      })
    });
    setPlanForm({ workout_plan: '', diet_plan: '' });
    setShowPlanForm(false);
    fetchPlans();
  };

  const handleTogglePlan = async (id: number, currentStatus: boolean) => {
    await fetch(`/api/plans/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !currentStatus })
    });
    fetchPlans();
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEditingProfile(false);
    }
  };



  const handleSendMessage = async (explicitMessage?: string | React.MouseEvent | React.KeyboardEvent) => {
    const textToSend = typeof explicitMessage === 'string' ? explicitMessage : input;
    if (!textToSend.trim()) return;
    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const response = await getFitnessAdvice(textToSend, history);
      const advice = response.text || "I am here to help!";
      const updates = response.updates || {};

      // ── Immediate targeted refetches per update flag ─────────────────────
      const refetches: Promise<any>[] = [];

      if (updates.userProfile || updates.macros) {
        refetches.push(fetchUser());
      }

      if (updates.progress) {
        refetches.push(
          fetchProgress(),
          fetchWeeklyProgress(),
          fetchActivities(),
          fetchDashboardData()
        );
        window.dispatchEvent(new CustomEvent('progress-logged'));
      }

      if (updates.hydration) {
        // Optimistic UI: bump water display immediately
        setWaterSummary((prev: any) => ({
          ...prev,
          total_consumed: (prev?.total_consumed || 0) + 500, // rough bump; real value comes from fetch
          completion_percentage: Math.min(100, ((prev?.total_consumed || 0) + 500) / (prev?.daily_goal || 2000) * 100)
        }));
        refetches.push(fetchTodayWater(), fetchDashboardData());
      }

      if (updates.weight) {
        refetches.push(fetchDashboardData());
      }

      if (updates.activity) {
        refetches.push(fetchActivities(), fetchWeeklyProgress());
      }

      if (updates.plans) {
        refetches.push(
          fetchPlans(),
          fetchActivities(),
          fetchUser(),
          fetchTodayWater()
        );
        window.dispatchEvent(new CustomEvent('plan-generated'));
      }

      // Fire all refetches in parallel (non-blocking — SSE will also handle this)
      if (refetches.length > 0) Promise.all(refetches).catch(() => {});

      setMessages([...newMessages, { role: 'model', content: advice }]);
    } catch (e: any) {
      console.error(e);
      setMessages([...newMessages, { role: 'model', content: "**Error:** " + e.message }]);
    } finally {
      setIsTyping(false);
    }
  };
  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.intentionallyStopped = true;
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.intentionallyStopped = false;
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let originalInput = input; // Capture what they already typed

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Update the input field with the original text + whatever is definitively transcribed + whatever they are currently saying
      if (finalTranscript) {
        originalInput = (originalInput + ' ' + finalTranscript).trim();
      }

      setInput((originalInput + ' ' + interimTranscript).trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech') {
        recognition.intentionallyStopped = true;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!recognition.intentionallyStopped) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'coach') {
      setChatOpen(true);
    } else {
      setChatOpen(false);
      const sectionMap: Record<string, string> = {
        home: 'dashboard-top',
        workouts: 'workout-section',
        nutrition: 'nutrition-section',
      };
      const targetId = sectionMap[tab];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (!user) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#09090b',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #27272a',
          borderTopColor: '#10b981', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  const today1 = format(new Date(), 'MMM dd');
  const today2 = new Date().toISOString().split('T')[0];
  const todaysProgress = progress.filter(p => p.date === today1 || p.date === today2);
  const totalProteinRaw = todaysProgress.reduce((sum, p) => sum + (p.protein || 0), 0);
  const totalCarbsRaw = todaysProgress.reduce((sum, p) => sum + (p.carbs || 0), 0);
  const totalFatsRaw = todaysProgress.reduce((sum, p) => sum + (p.fats || 0), 0);
  const totalWaterRaw = todaysProgress.reduce((sum, p) => sum + (p.water || 0), 0);
  const totalCaloriesRaw = todaysProgress.reduce((sum, p) => sum + (p.calories || 0), 0);
  const stats = dashboardData?.today_stats || {
    protein: totalProteinRaw,
    carbs: totalCarbsRaw,
    fats: totalFatsRaw,
    calories_consumed: totalCaloriesRaw,
    calories_burned: 0,
  };

  const totalProtein = stats.protein || totalProteinRaw;
  const totalCarbs = stats.carbs || totalCarbsRaw;
  const totalFats = stats.fats || totalFatsRaw;
  const totalCalories = stats.calories_consumed || totalCaloriesRaw;
  const totalBurned = stats.calories_burned || 0;
  const totalWater = stats.water_ml || totalWaterRaw;

  return (
    <div className="min-h-screen font-sans pb-28 relative overflow-hidden">
      {/* Decorative Background Blobs */}
      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center sticky top-0 z-40 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex flex-shrink-0 items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#121212' }} />
          </div>
          <div className="min-w-0 flex-shrink">
            <h2 className="font-bold text-sm sm:text-lg leading-tight uppercase tracking-widest truncate" style={{ color: 'var(--accent-primary)' }}>SWEAT FIX GYM</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* --- START FEATURE: THEME TOGGLE --- */}
          <ThemeToggle />
          {/* --- END FEATURE: THEME TOGGLE --- */}
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfile(true)} className="hover:scale-105 transition-transform">
              <img src={user.avatar} className="w-8 h-8 rounded-full" style={{ border: '1px solid var(--border-subtle)' }} alt={user.name} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* --- START FEATURE: PWA BANNERS --- */}
      <OfflineBanner />
      <InstallPrompt />
      {/* --- END FEATURE: PWA BANNERS --- */}

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 relative z-10">
        {/* Welcome Section */}
        <section id="dashboard-top">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Hello, {user.name.split(' ')[0]}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Ready to crush your goals today?</p>
        </section>

        {/* --- START FEATURE: CALORIES RING --- */}
        <CaloriesRing burned={totalCalories} goal={user.calorie_goal || 2000} />
        {/* --- END FEATURE: CALORIES RING --- */}

        {/* --- START FEATURE: MACRO TRACKER (upper section) --- */}
        <MacroTracker 
          protein={totalProtein} carbs={totalCarbs} fats={totalFats}
          proteinGoal={user.protein_goal} carbsGoal={user.carb_goal} fatsGoal={user.fat_goal}
        />
        {/* --- END FEATURE: MACRO TRACKER (upper section) --- */}

        {/* Track Workout Section */}
        <section className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Track Workout & Macros</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Log your recent activity to update your stats and progress chart.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 btn-accent px-6 py-3 rounded-[24px] whitespace-nowrap"
          >
            <Plus size={20} /> <span className="md:inline">Log Activity</span>
          </button>
        </section>

        {/* --- START FEATURE: WORKOUT TRACKER --- */}
        <div id="workout-section">
          <WorkoutTracker />
        </div>
        {/* --- END FEATURE: WORKOUT TRACKER --- */}

        {/* Progress Chart + Water Log Row */}
        <div id="nutrition-section" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Weekly Progress Chart */}
          <section className="card p-6 sm:p-8 md:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Weekly Progress</h3>
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Visualize your fitness journey</p>
              </div>
              <div 
                id="analytics-tabs"
                className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar w-full sm:w-auto snap-x snap-proximity scroll-smooth"
              >
                {[
                  { id: 'calories_burned', label: 'Calories', icon: Flame },
                  { id: 'workouts_completed', label: 'Workouts', icon: Dumbbell },
                  { id: 'hydration_completion', label: 'Hydration', icon: Droplets },
                  { id: 'exercises_completed', label: 'Activity', icon: Activity }
                ].map((m) => (
                  <button
                    key={m.id}
                    id={`tab-${m.id}`}
                    onClick={() => {
                      setChartMetric(m.id as any);
                      document.getElementById(`tab-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap snap-center ${chartMetric === m.id ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <m.icon size={14} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Weekly Summary Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
               <div className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Total Burned</div>
                  <div className="text-lg font-bold text-emerald-500">{weeklySummary?.total_calories || 0} kcal</div>
               </div>
               <div className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Workouts</div>
                  <div className="text-lg font-bold text-purple-500">{weeklySummary?.total_workouts || 0}</div>
               </div>
               <div className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Avg Hydration</div>
                  <div className="text-lg font-bold text-blue-500">{Math.round(weeklySummary?.avg_hydration || 0)}%</div>
               </div>
               <div className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">Avg Diet</div>
                  <div className="text-lg font-bold text-orange-500">{Math.round(weeklySummary?.avg_diet || 0)}%</div>
               </div>
            </div>

            <div className="relative min-h-[300px]">
              {!weeklyChartData.length && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 backdrop-blur-[2px] z-10 rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading Analytics...</p>
                  </div>
                </div>
              )}
              <div id="chartdiv" className="h-[300px] w-full" />
            </div>
          </section>

          {/* Daily Water Log */}
          <WaterTracker 
            currentWater={waterSummary?.total_consumed || 0} 
            waterGoal={waterSummary?.daily_goal || user?.water_goal || 2000} 
            onAddWater={handleAddWater} 
            onUpdateGoal={handleUpdateWaterGoal} 
            onRemoveWater={handleRemoveWater}
            logs={waterLogs}
          />
        </div>

        {/* Diet & Workout Chart Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(124, 58, 237, 0.1)' }}>
                  <Bot size={24} className="text-purple-500" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Workout & Diet Chart</h3>
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Your personalized routines generated by Sweat Fix Coach</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl transition-colors bg-zinc-800 text-zinc-400 hover:text-white"
              >
                View History
              </button>
              <button
                onClick={() => setShowPlanForm(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl transition-colors btn-accent"
              >
                Update Plan
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {dashboardData?.today_plan ? (
              <div className="p-5 sm:p-6 card transition-colors">
                {/* Plan header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Live Active Plan</span>
                    <h4 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                      {dashboardData.today_plan.workout_title || 'Daily Routine'}
                    </h4>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {dashboardData.today_plan.difficulty && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                          {dashboardData.today_plan.difficulty}
                        </span>
                      )}
                      {dashboardData.today_plan.duration && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {dashboardData.today_plan.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-bold text-emerald-500">
                        {dashboardData.today_stats?.completed_percentage || 0}%
                     </div>
                     <div className="text-[10px] uppercase font-bold text-zinc-500">Completion</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Workout Section */}
                  <div className="p-5 rounded-[24px]" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Dumbbell size={18} className="text-emerald-500" />
                      <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Workout Protocol</span>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {dashboardData.today_plan.workout_exercises && dashboardData.today_plan.workout_exercises.length > 0 ? (
                        dashboardData.today_plan.workout_exercises.map((ex: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ex.name}</div>
                              {ex.description && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ex.description}</div>}
                              {(ex.sets || ex.reps) && (
                                <div className="flex gap-2 mt-1.5 flex-wrap">
                                  {ex.sets && <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">{ex.sets} Sets</span>}
                                  {ex.reps && <span className="text-[10px] font-bold text-zinc-400">{ex.reps} Reps</span>}
                                  {ex.weight && ex.weight !== 'bodyweight' && <span className="text-[10px] font-bold text-zinc-500">@ {ex.weight}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center">
                          <Dumbbell size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Workout plan ready — ask coach for a structured exercise list.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diet Section */}
                  <div className="p-5 rounded-[24px]" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Utensils size={18} className="text-orange-500" />
                        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Meal Schedule</span>
                      </div>
                      {dashboardData.today_plan.calories_target ? (
                        <div className="text-xs font-bold text-orange-500">{dashboardData.today_plan.calories_target} kcal</div>
                      ) : null}
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {dashboardData.today_plan.diet_meals && dashboardData.today_plan.diet_meals.length > 0 ? (
                        dashboardData.today_plan.diet_meals.map((meal: any, idx: number) => {
                          const isMarkdownBlob = meal.items?.length === 1 && typeof meal.items[0] === 'string' && meal.items[0].length > 200;
                          return (
                            <div key={idx} className="p-3 rounded-xl bg-black/20 border border-white/5">
                              {!isMarkdownBlob && (
                                <div className="flex justify-between items-center mb-1">
                                  <div className="text-xs font-bold uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>{meal.type || `Meal ${idx+1}`}</div>
                                  {meal.calories && <div className="text-[10px] font-bold text-zinc-500">{meal.calories} kcal</div>}
                                </div>
                              )}
                              {isMarkdownBlob ? (
                                <div className="text-xs leading-relaxed prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                                  <ReactMarkdown>{meal.items[0]}</ReactMarkdown>
                                </div>
                              ) : (
                                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                  {meal.items?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2"><span className="text-orange-500 flex-shrink-0">•</span><span>{item}</span></li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center">
                          <Utensils size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                            {dashboardData.today_plan.diet_title ? `${dashboardData.today_plan.diet_title} ready — ask coach for detailed meals.` : 'No diet plan yet.'}
                          </p>
                        </div>
                      )}
                    </div>
                    {(dashboardData.today_plan.protein_goal || dashboardData.today_plan.carb_goal || dashboardData.today_plan.fat_goal) ? (
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                        <div className="text-center">
                          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{dashboardData.today_plan.protein_goal}g</div>
                          <div className="text-[9px] uppercase font-bold text-zinc-500">Protein</div>
                        </div>
                        <div className="text-center border-x border-white/5">
                          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{dashboardData.today_plan.carb_goal}g</div>
                          <div className="text-[9px] uppercase font-bold text-zinc-500">Carbs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{dashboardData.today_plan.fat_goal}g</div>
                          <div className="text-[9px] uppercase font-bold text-zinc-500">Fats</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : dailyPlans.length > 0 ? (
              dailyPlans.slice(0, 1).map((plan, i) => (
                <div key={i} className="p-5 sm:p-6 card">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Daily Routine</h4>
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{plan.date}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-zinc-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase text-zinc-400">Workout Plan</span>
                      </div>
                      <div className="text-sm prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                        <ReactMarkdown>{plan.workout_plan}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-900/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Utensils size={16} className="text-orange-500" />
                        <span className="text-xs font-bold uppercase text-zinc-400">Diet Plan</span>
                      </div>
                      <div className="text-sm prose prose-invert prose-sm max-w-none" style={{ color: 'var(--text-secondary)' }}>
                        <ReactMarkdown>{plan.diet_plan}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-[32px]" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                <Bot size={48} className="mx-auto mb-4 opacity-20" />
                <h4 className="text-lg font-bold mb-1">No AI Plan Generated</h4>
                <p className="text-sm max-w-xs mx-auto">Ask the Sweat Fix Coach to generate a personalized workout and diet plan for you.</p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity Feed */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <button className="text-sm font-bold flex items-center gap-1 text-purple-500 hover:text-purple-400 transition-colors">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-4">
            {activities.length > 0 ? activities.map((item, i) => {
              const Icon = {
                workout: Dumbbell,
                diet: Utensils,
                hydration: Droplets,
                chatbot: Bot,
                achievement: TrendingUp,
                progress: Activity,
                account: UserIcon
              }[item.activity_type as string] || Activity;

              const colors = {
                workout: 'text-emerald-500',
                diet: 'text-orange-500',
                hydration: 'text-blue-500',
                chatbot: 'text-purple-500',
                achievement: 'text-yellow-500',
                progress: 'text-zinc-400',
                account: 'text-zinc-500'
              }[item.activity_type as string] || 'text-zinc-500';

              return (
                <motion.div 
                  key={item.id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 card group hover:bg-zinc-800/30 transition-all border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-zinc-900 border border-white/5 group-hover:border-white/10 transition-colors">
                      <Icon size={20} className={colors} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">{item.activity_title}</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px] sm:max-w-xs truncate">{item.activity_description}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                      {format(new Date(item.created_at), 'hh:mm a')}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500/50 uppercase tracking-tighter">
                      {format(new Date(item.created_at), 'MMM dd')}
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="text-center py-12 border-2 border-dashed rounded-[32px] border-white/5 text-zinc-500">
                <Activity size={40} className="mx-auto mb-4 opacity-10" />
                <p className="text-sm font-medium">No activity logged yet.</p>
                <p className="text-[10px] uppercase tracking-widest mt-1 opacity-50">Start your journey today!</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- START FEATURE: BOTTOM NAV --- */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogPress={() => setShowForm(true)}
      />
      {/* --- END FEATURE: BOTTOM NAV --- */}

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed inset-0 md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[600px] card md:rounded-[32px] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="p-6 flex justify-between items-center" style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Sweat Fix Coach</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Always Online</p>
                </div>
              </div>
              <button aria-label="Close Chat" onClick={() => setChatOpen(false)} className="hover:opacity-70 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none" style={{ color: 'var(--text-muted)' }}>
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium`} style={{ background: m.role === 'user' ? 'var(--gradient-primary)' : 'var(--surface-elevated)', color: m.role === 'user' ? 'white' : 'var(--text-primary)' }}>
                    <div className="prose chat-prose max-w-none prose-p:leading-relaxed prose-ul:ml-4 prose-ul:list-disc prose-ul:my-1 prose-li:my-0 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-strong:text-emerald-400">
                      <ReactMarkdown>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl flex gap-1.5 items-center min-h-[44px]" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Prompts */}
            <div className="pt-3 pb-2 px-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex overflow-x-auto gap-2 px-4 pb-2 no-scrollbar snap-x">
                {QUICK_ACTIONS.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(action)}
                    className="whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 snap-start shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px]"
                    style={{ background: 'var(--surface-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4" style={{ background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  aria-label="Chat input"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      setTimeout(() => {
                        e.currentTarget.style.height = 'auto';
                      }, 0);
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 border-none rounded-2xl px-4 py-3 min-h-[44px] max-h-[120px] resize-none text-sm focus:ring-2 focus:ring-purple-500 shadow-inner outline-none transition-all duration-200 block no-scrollbar"
                 
                />
                <button
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                  onClick={toggleListening}
                  className={`min-w-[44px] w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'}`}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  aria-label="Send message"
                  onClick={() => {
                    handleSendMessage();
                    const textarea = document.querySelector('textarea[aria-label="Chat input"]') as HTMLTextAreaElement;
                    if (textarea) textarea.style.height = 'auto';
                  }}
                  className="btn-primary min-w-[44px] w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:scale-105 active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Progress Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold">Log Progress</h3>
                  <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white">
                    <Plus className="rotate-45" size={28} />
                  </button>
                </div>

                <form onSubmit={handleSubmitProgress} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Workout Name</label>
                    <input
                      required
                      value={formData.workout_name}
                      onChange={e => setFormData({ ...formData, workout_name: e.target.value })}
                      placeholder="e.g. Chest Day"
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Calories (kcal)</label>
                      <input
                        type="number"
                        value={formData.calories}
                        onChange={e => setFormData({ ...formData, calories: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Protein (g)</label>
                      <input
                        type="number"
                        value={formData.protein}
                        onChange={e => setFormData({ ...formData, protein: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Carbs (g)</label>
                      <input
                        type="number"
                        value={formData.carbs}
                        onChange={e => setFormData({ ...formData, carbs: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Fats (g)</label>
                      <input
                        type="number"
                        value={formData.fats}
                        onChange={e => setFormData({ ...formData, fats: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Water (ml)</label>
                    <input
                      type="number"
                      value={formData.water}
                      onChange={e => setFormData({ ...formData, water: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder-zinc-600"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
                  >
                    Save Entry
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Plan Modal */}
      <AnimatePresence>
        {showPlanForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Daily Protocol</h3>
                <button onClick={() => setShowPlanForm(false)} className="text-zinc-500 hover:text-white">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto">
                <form onSubmit={handleSavePlan} className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">
                      <Dumbbell size={16} /> Workout Plan
                    </label>
                    <textarea
                      required
                      value={planForm.workout_plan}
                      onChange={e => setPlanForm({ ...planForm, workout_plan: e.target.value })}
                      placeholder="E.g., 4x10 Pull-ups, 3x15 Push-ups"
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-y"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">
                      <Utensils size={16} /> Nutrition Plan
                    </label>
                    <textarea
                      required
                      value={planForm.diet_plan}
                      onChange={e => setPlanForm({ ...planForm, diet_plan: e.target.value })}
                      placeholder="E.g., Breakfast: Oatmeal & Eggs. Lunch: Chicken & Rice."
                      className="w-full bg-zinc-800 border-none rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-y"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full btn-primary py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
                  >
                    Lock In Plan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Plan History</h3>
                  <p className="text-xs text-zinc-500 mt-1">Previous protocols generated for you</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                {planHistory.length > 0 ? planHistory.map((h, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex justify-between items-center hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <History size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-white">{h.workout_title || h.diet_title || 'Plan Update'}</div>
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{format(new Date(h.created_at), 'MMM dd, yyyy')}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {h.active ? (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Active</span>
                       ) : (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/5 uppercase tracking-widest">Archived</span>
                       )}
                       <ChevronRight size={16} className="text-zinc-600" />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-zinc-500">
                    No plan history found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-6" onClick={() => setShowProfile(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowProfile(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-zinc-800 shadow-xl" />

              {isEditingProfile ? (
                <div className="flex items-center gap-2 mb-6">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-zinc-800 text-white font-bold text-xl rounded-xl px-4 py-2 border border-emerald-500/50 outline-none focus:border-emerald-500 text-center"
                    autoFocus
                  />
                  <button onClick={handleSaveProfile} className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400">
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center mb-6 relative group">
                  <h3 className="text-white text-2xl font-bold">{user.name}</h3>
                  <button
                    onClick={() => {
                      setEditName(user.name);
                      setIsEditingProfile(true);
                    }}
                    className="absolute -right-2 top-0 p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 size={14} />
                  </button>
                  <p className="text-zinc-500 mt-1">{user.email}</p>
                </div>
              )}

              <div className="rounded-2xl p-4 mb-8 text-left" style={{ background: 'var(--surface-elevated)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400 text-sm">Member ID</span>
                  <span className="text-white font-mono text-sm">#{user.id.toString().padStart(4, '0')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Status</span>
                  <span className="text-emerald-500 font-bold text-sm tracking-widest uppercase">Active</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
