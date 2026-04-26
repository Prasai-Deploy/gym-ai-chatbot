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
  MicOff
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

// --- START FEATURE: THEME TOGGLE ---
import { DashboardInsights } from './components/DashboardInsights';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
// --- END FEATURE: THEME TOGGLE ---

// --- START FEATURE: MACRO TRACKER ---
import { MacroTracker } from './components/MacroTracker';
// --- END FEATURE: MACRO TRACKER ---

// --- START FEATURE: WORKOUT TRACKER ---
import { WorkoutTracker } from './components/WorkoutTracker';
// --- END FEATURE: WORKOUT TRACKER ---

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
}

function WaterTracker({ currentWater, waterGoal, onAddWater, onUpdateGoal }: WaterTrackerProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState((waterGoal || 2000).toString());
  const [customAmount, setCustomAmount] = useState('');

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
    <section className="glass-panel p-6 rounded-[40px] flex flex-col" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Droplets size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Daily Water Log</h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-blue-400">{format(new Date(), 'MMM dd')}</p>
          </div>
        </div>
        
        {isEditingGoal ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={tempGoal} 
              onChange={e => setTempGoal(e.target.value)} 
              className="w-16 px-2 py-1 text-xs rounded bg-zinc-800 text-white outline-none" 
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
            />
            <button onClick={handleSaveGoal} className="text-xs text-blue-400 font-bold">Save</button>
          </div>
        ) : (
          <button
            onClick={() => { setTempGoal((waterGoal || 2000).toString()); setIsEditingGoal(true); }}
            className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 flex items-center gap-1"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}
          >
            <Edit2 size={12} /> Goal
          </button>
        )}
      </div>

      {/* Total + Status */}
      <div className="text-center mb-5">
        <div className="text-4xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {(currentWater / 1000).toFixed(2)}
          <span className="text-lg font-semibold ml-1" style={{ color: 'var(--text-muted)' }}>L</span>
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {currentWater} / {waterGoal || 2000} ml · {pct}%
        </div>
        <div className="text-sm font-semibold mt-1 text-blue-400">{status}</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="flex gap-2 mb-4">
        {[250, 500].map(amount => (
          <button
            key={amount}
            onClick={() => onAddWater(amount)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors hover:opacity-80"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
          >
            +{amount}ml
          </button>
        ))}
      </div>

      {/* Custom Amount Input */}
      <div className="flex gap-2 flex-1 items-end">
        <div className="flex-1 relative">
          <input
            type="number"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="Custom amount"
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-zinc-600"
            style={{ background: 'var(--surface-input)', color: 'var(--text-primary)' }}
            onKeyDown={e => e.key === 'Enter' && handleCustomAdd()}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            ml
          </span>
        </div>
        <button
          onClick={handleCustomAdd}
          className="btn-gradient px-4 py-3 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }}
        >
          Add
        </button>
      </div>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  useTheme(); // Initialize theme from localStorage on load
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
    return () => {
      document.body.style.overflow = '';
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
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Poll for real-time updates from the database
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (user) {
      intervalId = setInterval(() => {
        fetchProgress();
        fetchPlans();
      }, 5000); // 5 seconds polling
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  useLayoutEffect(() => {
    if (!progress.length) return;

    let root = am5.Root.new("chartdiv");

    root.setThemes([
      am5themes_Animated.new(root),
      am5themes_Dark.new(root)
    ]);

    let chart = root.container.children.push(am5xy.XYChart.new(root, {
      panX: true,
      panY: true,
      wheelX: "panX",
      wheelY: "zoomX",
      pinchZoomX: true
    }));

    let cursor = chart.set("cursor", am5xy.XYCursor.new(root, {
      behavior: "none"
    }));
    cursor.lineY.set("visible", false);

    let xAxisRenderer = am5xy.AxisRendererX.new(root, {});
    xAxisRenderer.grid.template.set("strokeOpacity", 0);

    let xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
      categoryField: "date",
      renderer: xAxisRenderer,
      tooltip: am5.Tooltip.new(root, {})
    }));
    xAxis.data.setAll(progress);

    let yAxisRenderer = am5xy.AxisRendererY.new(root, {});
    yAxisRenderer.grid.template.set("strokeOpacity", 0.1);
    yAxisRenderer.grid.template.set("strokeDasharray", [3, 3]);

    let yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
      renderer: yAxisRenderer
    }));

    let series = chart.series.push(am5xy.LineSeries.new(root, {
      name: "Calories",
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: "calories",
      categoryXField: "date",
      tooltip: am5.Tooltip.new(root, {
        labelText: "{valueY} kcal"
      })
    }));

    series.strokes.template.setAll({
      strokeWidth: 4,
      stroke: am5.color(0x10b981) // emerald-500
    });

    series.bullets.push(function () {
      return am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 5,
          fill: am5.color(0x18181b),
          stroke: am5.color(0x10b981),
          strokeWidth: 2
        })
      });
    });

    series.data.setAll(progress);
    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [progress]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      setUser(data);
      if (data) {
        fetchProgress();
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      setDailyPlans(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/progress');
      const data = await res.json();
      setProgress(data.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    await fetch('/api/logout');
    setUser(null);
    setProgress([]);
    setDailyPlans([]);
    setMessages([{ role: 'model', content: "Welcome to Sweat Fix. How can I assist with your fitness goals or macros today?" }]);
  };

  const handleDemoLogin = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) fetchUser();
      else alert('Demo login failed');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        calories: Number(formData.calories) || 0,
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fats: Number(formData.fats) || 0,
        water: Number(formData.water) || 0,
        date: format(new Date(), 'MMM dd')
      })
    });
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

  const handleUpdateWaterGoal = async (newGoal: number) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ water_goal: newGoal })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWater = async (amount: number) => {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout_name: `Drank Water`,
        water: amount,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        date: format(new Date(), 'MMM dd')
      })
    });
    fetchProgress();
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
      let advice = await getFitnessAdvice(textToSend, history);

      // Auto-fill parsing
      const jsonMatch = advice.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const planData = JSON.parse(jsonMatch[1]);
          if (planData.workout_plan || planData.diet_plan) {
            advice = advice.replace(/```json\n[\s\S]*?\n```/, '').trim();

            let planMarkdown = `\n\n### 📝 Your Generated Protocol\n\n`;
            if (planData.workout_plan) {
              planMarkdown += `**Workout Plan:**\n${planData.workout_plan}\n\n`;
            }
            if (planData.diet_plan) {
              planMarkdown += `**Diet Plan:**\n${planData.diet_plan}\n\n`;
            }

            advice += planMarkdown + "*(I have automatically attached this plan to your Daily Protocol!)*";

            await fetch('/api/plans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workout_plan: planData.workout_plan || '',
                diet_plan: planData.diet_plan || '',
                date: format(new Date(), 'MMM dd')
              })
            });
            fetchPlans();
          }
          if (planData.macro_goals) {
            fetchUser();
          }
          if (planData.progress_log) {
            fetchProgress();
            advice = advice.replace(/```json\n[\s\S]*?\n```/, '').trim();
            advice += `\n\n*(I have automatically logged your progress!)*`;
          }
        } catch (err) {
          console.error("Auto-fill parsing failed:", err);
        }
      }

      setMessages([...newMessages, { role: 'model', content: advice || 'I am here to help!' }]);
    } catch (e: any) {
      console.error(e);
      setMessages([...newMessages, { role: 'model', content: `**Error:** ${e.message}` }]);
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

  if (loading) return <div className="h-screen flex items-center justify-center font-bold" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}>Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={{ background: 'var(--surface-primary)' }}>
        {/* Decorative Blobs */}
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg" style={{ background: 'var(--gradient-primary)' }}>
            <Dumbbell className="text-white w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>SWEAT FIX GYM</h1>
          <p className="mb-12 text-lg" style={{ color: 'var(--text-secondary)' }}>Your premium journey to peak performance starts here.</p>

          <button
            onClick={handleLogin}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl mb-4"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>

          <div className="glass-panel rounded-2xl p-6 shadow-xl w-full">
            <h3 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Try the Demo</h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>Experience the full platform without creating an account.</p>
            <button
              onClick={handleDemoLogin}
              className="w-full btn-gradient py-3 rounded-xl font-semibold"
            >
              Explore as Demo User
            </button>
          </div>

          <div className="mt-12 pt-12" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 mx-auto text-sm uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <QrCode size={16} />
              Scan to Access
            </button>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 bg-white rounded-2xl inline-block"
              >
                <QRCodeSVG value={window.location.href} size={150} />
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const today1 = format(new Date(), 'MMM dd');
  const today2 = new Date().toISOString().split('T')[0];
  const todaysProgress = progress.filter(p => p.date === today1 || p.date === today2);
  const totalProtein = todaysProgress.reduce((sum, p) => sum + (p.protein || 0), 0);
  const totalCarbs = todaysProgress.reduce((sum, p) => sum + (p.carbs || 0), 0);
  const totalFats = todaysProgress.reduce((sum, p) => sum + (p.fats || 0), 0);
  const totalWater = todaysProgress.reduce((sum, p) => sum + (p.water || 0), 0);
  const totalCalories = todaysProgress.reduce((sum, p) => sum + (p.calories || 0), 0);

  return (
    <div className="min-h-screen font-sans pb-24 relative overflow-hidden" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
      {/* Decorative Background Blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center sticky top-0 z-40 glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex flex-shrink-0 items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Dumbbell className="text-white w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-shrink">
            <h2 className="font-bold text-sm sm:text-lg leading-tight uppercase tracking-widest truncate" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SWEAT FIX GYM</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* --- START FEATURE: THEME TOGGLE --- */}
          <ThemeToggle />
          {/* --- END FEATURE: THEME TOGGLE --- */}
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfile(true)} className="hover:scale-105 transition-transform">
              <img src={user.avatar} className="w-8 h-8 rounded-full" style={{ border: '1px solid var(--glass-border)' }} alt={user.name} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-full hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 pb-32">
        {/* Simulated Hero Dashboard Insights */}
        <div className="lg:col-span-12">
          <DashboardInsights 
            userName={user.name} 
            caloriesBurned={progress.reduce((acc, curr) => acc + (curr.calories || 0), 0)} 
            caloriesGoal={user.calorie_goal} 
          />
        </div>

        {/* --- START FEATURE: MACRO TRACKER (upper section) --- */}
        <div className="lg:col-span-12">
        <MacroTracker 
          protein={totalProtein} carbs={totalCarbs} fats={totalFats} calories={totalCalories} 
          proteinGoal={user.protein_goal} carbsGoal={user.carb_goal} fatsGoal={user.fat_goal} caloriesGoal={user.calorie_goal}
        />
        </div>
        {/* --- END FEATURE: MACRO TRACKER (upper section) --- */}

        {/* Track Workout Section */}
        <section className="lg:col-span-12 glass-panel p-6 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Track Workout & Macros</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Log your recent activity to update your stats and progress chart.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 btn-gradient px-6 py-3 rounded-2xl whitespace-nowrap"
          >
            <Plus size={20} /> <span className="md:inline">Log Activity</span>
          </button>
        </section>

        {/* --- START FEATURE: WORKOUT TRACKER --- */}
        <div className="lg:col-span-12">
          <WorkoutTracker customPlanString={dailyPlans[0]?.workout_plan} />
        </div>
        {/* --- END FEATURE: WORKOUT TRACKER --- */}

        {/* Progress Chart + Water Log Row */}
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Weekly Progress Chart */}
          <section className="glass-panel p-8 rounded-[40px] lg:col-span-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blob-2 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Weekly Progress</h3>
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Calorie intake overview</p>
              </div>
            </div>
            <div id="chartdiv" className="h-[300px] w-full" />
          </section>

          <div className="lg:col-span-4 h-full">
            <WaterTracker 
              currentWater={totalWater} 
            waterGoal={user.water_goal || 2000} 
            onAddWater={handleAddWater} 
            onUpdateGoal={handleUpdateWaterGoal} 
          />
        </div>

        </div>

        {/* Diet & Workout Chart Section */}
        <section className="lg:col-span-7 glass-panel p-8 rounded-[40px] flex flex-col h-full">
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
            <button
              onClick={() => setShowPlanForm(true)}
              className="px-4 py-2 text-sm font-bold rounded-xl transition-colors"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
            >
              Update Plan
            </button>
          </div>
          <div className="space-y-4">
            {dailyPlans.length > 0 ? dailyPlans.slice(0, 3).map((plan, i) => (
              <div key={i} className={`p-5 sm:p-6 rounded-[24px] glass-panel transition-colors ${plan.completed ? '' : ''}`} style={plan.completed ? { borderColor: 'rgba(16, 185, 129, 0.2)' } : {}}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{plan.date === format(new Date(), 'MMM dd') ? 'Today' : plan.date}</span>
                    <h4 className={`text-lg font-bold mt-1 ${plan.completed ? 'text-emerald-500 line-through opacity-70' : ''}`} style={plan.completed ? {} : { color: 'var(--text-primary)' }}>Daily Routine</h4>
                  </div>
                  <button
                    onClick={() => handleTogglePlan(plan.id, plan.completed)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${plan.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'text-transparent'}`}
                    style={plan.completed ? {} : { borderColor: 'var(--text-muted)' }}
                  >
                    <Check size={16} />
                  </button>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${plan.completed ? 'opacity-50' : ''}`}>
                  <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell size={16} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-bold uppercase tracking-widest" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Workout Chart</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{plan.workout_plan || 'No training logged.'}</p>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-elevated)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils size={16} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-bold uppercase tracking-widest" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diet Plan</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{plan.diet_plan || 'No nutrition logged.'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--glass-border)' }}>
                No daily plan set. Log your workout and diet protocols for the day.
              </div>
            )}
          </div>
        </section>

        {/* Recent Workouts */}
        <section className="lg:col-span-5 glass-panel p-8 rounded-[40px] flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
            <button className="text-sm font-bold flex items-center gap-1" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              View All <ChevronRight size={16} className="text-purple-500" />
            </button>
          </div>
          <div className="space-y-3">
            {progress.slice().reverse().map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 glass-panel glass-panel-hover rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-elevated)' }}>
                    <Dumbbell size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.workout_name || 'General Training'}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-400">+{item.calories} kcal</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Burned</div>
                </div>
              </div>
            ))}
            {progress.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--glass-border)' }}>
                No activity logged yet. Start your journey today!
              </div>
            )}
          </div>
        </section>
      </main>

      {/* AI Voice Waveform Background */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-30 flex items-end justify-center pb-8 opacity-40">
        <div className="flex gap-1.5 items-end h-16">
          {[...Array(30)].map((_, i) => (
            <div 
              key={i}
              className={`w-1 sm:w-1.5 rounded-t-full animate-waveform`}
              style={{ 
                background: 'var(--accent-lime)',
                height: `${Math.max(20, Math.random() * 100)}%`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-panel px-8 py-4 rounded-full shadow-2xl flex items-center gap-10 z-50">
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95" style={{ color: 'var(--accent-lime)' }}>
          <Activity size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Home</span>
        </button>
        <button onClick={() => setChatOpen(true)} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95 relative group" style={{ color: 'var(--text-muted)' }}>
          <div className="absolute -inset-4 bg-lime-400 opacity-0 group-hover:opacity-10 blur-xl rounded-full transition-opacity" />
          <MessageSquare size={24} className="group-hover:text-white transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block group-hover:text-white transition-colors">Coach</span>
        </button>
        <button onClick={() => setShowProfile(true)} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95 group" style={{ color: 'var(--text-muted)' }}>
          <UserIcon size={24} className="group-hover:text-white transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block group-hover:text-white transition-colors">Profile</span>
        </button>
      </nav>

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed inset-0 md:inset-auto md:bottom-24 md:right-8 md:w-[400px] md:h-[600px] glass-panel md:rounded-[32px] shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="p-6 flex justify-between items-center" style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
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
            <div className="pt-3 pb-2 px-0" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex overflow-x-auto gap-2 px-4 pb-2 no-scrollbar snap-x">
                {QUICK_ACTIONS.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(action)}
                    className="whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 snap-start shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[44px]"
                    style={{ background: 'var(--surface-input)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4" style={{ background: 'var(--surface-elevated)', borderTop: '1px solid var(--glass-border)' }}>
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
                  style={{ background: 'var(--surface-input)', color: 'var(--text-primary)' }}
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
                  className="btn-gradient min-w-[44px] w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:scale-105 active:scale-95"
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
              className="glass-panel w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
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
                    className="w-full btn-gradient py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
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
              className="glass-panel w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid var(--glass-border)' }}>
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
                    className="w-full btn-gradient py-5 rounded-2xl transition-all active:scale-95 shadow-xl mt-4"
                  >
                    Lock In Plan
                  </button>
                </form>
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
              className="glass-panel p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] text-center max-w-sm w-full shadow-2xl"
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
