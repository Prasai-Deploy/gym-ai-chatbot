import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Dumbbell,
  Sparkles,
  Activity,
  Flame,
  TrendingUp,
  Shield,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Zap,
  BarChart2,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Cpu,
  Target
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [activePreviewTab, setActivePreviewTab] = useState<'ai' | 'workout' | 'nutrition' | 'progress'>('ai');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handlePrimaryCta = () => {
    if (user) {
      navigate('/v3/dashboard');
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'What is STRIVA and how does it differ from traditional fitness apps?',
      a: 'STRIVA is a unified health and athletic performance operating system. Instead of fragmented trackers, STRIVA combines progressive workout execution, granular macro/hydration tracking, and TRINETRA AI—an intelligent guidance layer that remembers your historical training data to provide actionable, adaptive coaching.'
    },
    {
      q: 'How does the TRINETRA AI Coach assist my daily training?',
      a: 'TRINETRA AI acts as your contextual fitness copilot. It analyzes completed sessions, volume progression, and daily nutrition logs to suggest weight increments, flag fatigue patterns, evaluate recovery readiness, and answer training questions grounded in your actual metrics.'
    },
    {
      q: 'What is included in the 14-day free trial?',
      a: 'Your 14-day free trial provides full, unrestricted access to the entire STRIVA V2 suite: unlimited workout plans, active training execution with rest timers, macro and hydration logging, longitudinal analytics, and TRINETRA AI coaching.'
    },
    {
      q: 'Can I cancel or switch between monthly and annual plans?',
      a: 'Yes, absolutely. You can switch intervals or cancel anytime directly from your Billing settings. If you cancel, your access remains active until the end of your current billing period with zero cancellation fees.'
    },
    {
      q: 'Does STRIVA work on mobile devices and small screens?',
      a: 'Yes. STRIVA is built with a responsive, mobile-first design. All core workflows—logging sets, checking macros, chatting with TRINETRA, and reviewing analytics—are optimized for high-performance touch interaction on mobile and desktop browsers.'
    },
    {
      q: 'How is my personal health and workout data protected?',
      a: 'Your data is secured using enterprise-grade PostgreSQL Row Level Security (RLS) and Supabase authentication. Workouts, body metrics, and private AI conversations are strictly isolated to your verified account identity and are never shared or made public.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans antialiased selection:bg-[#84CC16]/20 selection:text-white">
      {/* ------------------------------------------------------------------ */}
      {/* 1. NAVIGATION BAR                                                  */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 w-full bg-[#050608]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16] rounded-xl p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-[#11141D] border border-white/[0.12] flex items-center justify-center text-[#84CC16] group-hover:border-[#84CC16]/50 transition-colors shadow-sm">
              <Dumbbell className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white font-display">
                STRIVA
              </span>
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase -mt-1">
                OS V2
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84CC16] rounded px-1"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84CC16] rounded px-1"
            >
              Product Preview
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84CC16] rounded px-1"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84CC16] rounded px-1"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#84CC16] rounded px-1"
            >
              FAQ
            </button>
          </nav>

          {/* Auth Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/v3/dashboard')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-[#84CC16]/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white flex items-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-[#84CC16]/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#11141D] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#090B10] border-b border-white/[0.08] px-4 pt-3 pb-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
            <button
              onClick={() => scrollToSection('capabilities')}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Product Preview
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-left text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              FAQ
            </button>

            <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/v3/dashboard');
                  }}
                  className="w-full min-h-[44px] py-3 rounded-xl bg-[#84CC16] text-black font-bold text-sm flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full min-h-[44px] py-2.5 rounded-xl border border-white/[0.12] text-center text-sm font-semibold text-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full min-h-[44px] py-3 rounded-xl bg-[#84CC16] text-black font-bold text-sm flex items-center justify-center gap-2"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ------------------------------------------------------------------ */}
        {/* 2. HERO SECTION                                                    */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden border-b border-white/[0.06]">
          {/* Atmospheric background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#84CC16]/10 blur-[130px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-[#6366F1]/10 blur-[140px] pointer-events-none rounded-full" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#11141D] border border-[#84CC16]/30 text-xs font-semibold text-[#84CC16] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#84CC16]" />
              <span>STRIVA V2 · Powered by TRINETRA AI</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight font-display leading-[1.08]">
              Train with purpose.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-emerald-400">
                Progress with intelligence.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
              Plan workouts, track nutrition, understand your progress, and get personalized guidance with STRIVA.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#84CC16]/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
              >
                <span>{user ? 'Continue to Dashboard' : 'Get started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('capabilities')}
                className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-xl bg-[#11141D] hover:bg-[#181C28] border border-white/[0.12] text-slate-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]"
              >
                <span>Explore STRIVA</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Value Highlights Pill Bar */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2 bg-[#11141D]/70 border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2 bg-[#11141D]/70 border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>Zero Card Required to Explore</span>
              </div>
              <div className="flex items-center gap-2 bg-[#11141D]/70 border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>TRINETRA AI Intelligence</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 3. PRODUCT CAPABILITIES SECTION                                    */}
        {/* ------------------------------------------------------------------ */}
        <section id="capabilities" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#84CC16]">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              Built for serious training and measurable progress.
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Five integrated modules engineered into a single, cohesive operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 1: Precision Workout Tracking */}
            <div className="bg-[#0C0E14] border border-white/[0.08] hover:border-[#84CC16]/40 p-7 rounded-2xl flex flex-col justify-between transition-colors group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#11141D] border border-white/[0.08] text-[#84CC16] flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Precision Workout Execution
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Log active workout sessions set by set with weights, repetitions, and RPE. Features automated rest timers and instant volume calculations to maintain training intensity.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>Live Rest Countdown & Set History</span>
              </div>
            </div>

            {/* Capability 2: Personalized Plans & Progressive Overload */}
            <div className="bg-[#0C0E14] border border-white/[0.08] hover:border-[#84CC16]/40 p-7 rounded-2xl flex flex-col justify-between transition-colors group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#11141D] border border-white/[0.08] text-[#84CC16] flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Structured Training Programs
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Design or follow structured multi-week workout plans with Push/Pull/Legs or custom splits. Track progressive overload trends across multi-joint compound movements.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>Canonical Exercise Library with Video Tips</span>
              </div>
            </div>

            {/* Capability 3: Nutrition & Hydration Telemetry */}
            <div className="bg-[#0C0E14] border border-white/[0.08] hover:border-[#84CC16]/40 p-7 rounded-2xl flex flex-col justify-between transition-colors group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#11141D] border border-white/[0.08] text-[#84CC16] flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Nutrition & Macro Balance
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Monitor daily calorie targets and macronutrient distributions (protein, carbohydrates, healthy fats) alongside progressive water hydration goals.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>Macro Ring Visuals & Daily Hydration</span>
              </div>
            </div>

            {/* Capability 4: Progress Analytics */}
            <div className="bg-[#0C0E14] border border-white/[0.08] hover:border-[#84CC16]/40 p-7 rounded-2xl flex flex-col justify-between transition-colors group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#11141D] border border-white/[0.08] text-[#84CC16] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Longitudinal Progress Telemetry
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Visualize total tonnage moved, workout consistency streaks, body weight shifts, and personal records over rolling 7, 30, and 90-day intervals.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-[#84CC16]" />
                <span>Objective Metric Graphs & PR Alerts</span>
              </div>
            </div>

            {/* Capability 5: TRINETRA AI Coach */}
            <div className="bg-[#0C0E14] border border-white/[0.08] hover:border-[#6366F1]/50 p-7 rounded-2xl flex flex-col justify-between transition-colors group md:col-span-2 lg:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#6366F1]/10 blur-[80px] pointer-events-none rounded-full" />
              <div className="space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-xs font-semibold text-[#6366F1]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>TRINETRA AI Guidance Layer</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Intelligent Guidance Grounded in Your Actual Data
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  TRINETRA AI is not a generic text bot. It consumes verified backend domain tools to evaluate your volume load, recall workout history from long-term memory, suggest deloads, and refine your split based on real performance.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs text-slate-400 font-semibold relative z-10">
                <span className="flex items-center gap-1.5 text-[#6366F1]">
                  <Check className="w-3.5 h-3.5" /> Contextual Memory
                </span>
                <span className="flex items-center gap-1.5 text-[#6366F1]">
                  <Check className="w-3.5 h-3.5" /> Domain Tool Auditing
                </span>
                <span className="flex items-center gap-1.5 text-[#6366F1]">
                  <Check className="w-3.5 h-3.5" /> Real-time Streaming
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 4. PRODUCT PREVIEW SECTION (AUTHENTIC STRIVA V2 UI)                */}
        {/* ------------------------------------------------------------------ */}
        <section id="preview" className="py-20 md:py-28 bg-[#07090E] border-y border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#84CC16]">
                Interface Showcase
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
                Engineered for focus. Zero clutter.
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Inspect genuine STRIVA V2 views across the key pillars of training and nutrition.
              </p>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePreviewTab('ai')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'ai'
                    ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/20'
                    : 'bg-[#11141D] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                TRINETRA AI Coach
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('workout')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'workout'
                    ? 'bg-[#84CC16] text-black shadow-md shadow-[#84CC16]/20'
                    : 'bg-[#11141D] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                Active Workout Session
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('nutrition')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'nutrition'
                    ? 'bg-[#84CC16] text-black shadow-md shadow-[#84CC16]/20'
                    : 'bg-[#11141D] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                Nutrition & Hydration
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('progress')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activePreviewTab === 'progress'
                    ? 'bg-[#84CC16] text-black shadow-md shadow-[#84CC16]/20'
                    : 'bg-[#11141D] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                Progress Analytics
              </button>
            </div>

            {/* Authentically Rendered Preview Frame */}
            <div className="max-w-4xl mx-auto rounded-3xl bg-[#0B0D14] border border-white/[0.12] p-4 sm:p-8 shadow-2xl overflow-hidden relative">
              {/* Preview Window Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-500">
                    app.striva.space/{activePreviewTab === 'ai' ? 'v3/coach' : activePreviewTab === 'workout' ? 'v3/workout' : activePreviewTab === 'nutrition' ? 'v3/nutrition' : 'v3/progress'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-[#11141D] px-2.5 py-1 rounded-md border border-white/[0.06]">
                  Genuine UI Preview
                </span>
              </div>

              {/* TAB 1: TRINETRA AI Coach */}
              {activePreviewTab === 'ai' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-[#11141D] border border-white/[0.08] p-4 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 text-[#6366F1] flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">TRINETRA Intelligence</span>
                        <span className="text-[10px] text-[#6366F1] font-semibold bg-[#6366F1]/10 px-2 py-0.5 rounded-full">
                          Context Loaded
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        I noticed your bench press volume jumped 12% over the last 3 sessions (currently at 85 kg × 8 reps). Your recovery score is 88%. Today is scheduled as Chest & Triceps Push. Would you like to attempt 87.5 kg for your top set?
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#181C28] border border-white/[0.12] p-4 rounded-2xl flex items-start gap-3 ml-auto max-w-lg text-left">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-300">You (Athlete)</span>
                      <p className="text-xs sm:text-sm text-white">
                        Yes, let&apos;s go for 87.5 kg. What warmup sets do you recommend before the working set?
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#11141D] border border-white/[0.08] p-4 rounded-2xl flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 text-[#6366F1] flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-white">TRINETRA Warmup Progression</span>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-[#090B10] p-2 rounded-lg border border-white/[0.06]">
                          <p className="text-slate-400 text-[10px]">Set 1</p>
                          <p className="font-bold text-white">50 kg × 8 reps</p>
                        </div>
                        <div className="bg-[#090B10] p-2 rounded-lg border border-white/[0.06]">
                          <p className="text-slate-400 text-[10px]">Set 2</p>
                          <p className="font-bold text-white">70 kg × 4 reps</p>
                        </div>
                        <div className="bg-[#090B10] p-2 rounded-lg border border-white/[0.06]">
                          <p className="text-slate-400 text-[10px]">Set 3</p>
                          <p className="font-bold text-white">80 kg × 2 reps</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Workout Session */}
              {activePreviewTab === 'workout' && (
                <div className="space-y-4 text-left animate-in fade-in duration-300">
                  <div className="flex items-center justify-between bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                    <div>
                      <h4 className="text-base font-bold text-white">Push Day — Upper Hypertrophy</h4>
                      <p className="text-xs text-slate-400">Exercise 2 of 5 · 45 mins elapsed</p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#84CC16]/10 border border-[#84CC16]/30 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#84CC16]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Rest Timer: 01:24</span>
                    </div>
                  </div>

                  <div className="bg-[#090B10] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Barbell Bench Press</span>
                      <span className="text-xs text-slate-400 font-mono">Target: 4 sets</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span>Set 1 · 80.0 kg × 10 reps</span>
                        <span className="flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Done (RPE 7.5)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span>Set 2 · 85.0 kg × 8 reps</span>
                        <span className="flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Done (RPE 8.0)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#11141D] border border-[#84CC16]/40 text-[#84CC16]">
                        <span>Set 3 · 87.5 kg × 6 reps</span>
                        <span className="font-bold underline">Active Set</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Nutrition & Hydration */}
              {activePreviewTab === 'nutrition' && (
                <div className="space-y-4 text-left animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calories</span>
                      <p className="text-2xl font-black text-white mt-1">2,240</p>
                      <p className="text-[10px] text-emerald-400">Target: 2,400 kcal</p>
                    </div>
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Protein</span>
                      <p className="text-2xl font-black text-[#84CC16] mt-1">178g</p>
                      <p className="text-[10px] text-slate-400">Goal: 180g (99%)</p>
                    </div>
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carbs</span>
                      <p className="text-2xl font-black text-amber-400 mt-1">210g</p>
                      <p className="text-[10px] text-slate-400">Goal: 240g</p>
                    </div>
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hydration</span>
                      <p className="text-2xl font-black text-cyan-400 mt-1">2.75 L</p>
                      <p className="text-[10px] text-cyan-300">Daily Target: 3.0 L</p>
                    </div>
                  </div>

                  <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Daily Macro Adherence</h4>
                      <p className="text-xs text-slate-400">Optimal post-workout protein synthesis threshold met.</p>
                    </div>
                    <span className="text-xs font-bold text-[#84CC16] bg-[#84CC16]/10 px-3 py-1.5 rounded-xl border border-[#84CC16]/20">
                      On Target (93%)
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: Progress Analytics */}
              {activePreviewTab === 'progress' && (
                <div className="space-y-4 text-left animate-in fade-in duration-300">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Volume (30d)</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">42,650 kg</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">+8.4% vs previous</p>
                    </div>
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sessions</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-[#84CC16] mt-1">18 / 20</p>
                      <p className="text-[10px] text-slate-400 font-semibold">90% adherence</p>
                    </div>
                    <div className="bg-[#11141D] p-4 rounded-2xl border border-white/[0.08]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Streak</span>
                      <p className="text-xl sm:text-2xl font-extrabold text-orange-400 mt-1">5 Days</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Consistent athlete</p>
                    </div>
                  </div>

                  <div className="bg-[#11141D] p-5 rounded-2xl border border-white/[0.08] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Weekly Load Distribution</span>
                      <span className="text-slate-500 font-mono">Mon · Tue · Thu · Fri · Sat</span>
                    </div>
                    <div className="h-4 bg-[#090B10] rounded-full overflow-hidden flex">
                      <div className="w-[30%] bg-[#84CC16]" title="Chest/Triceps" />
                      <div className="w-[25%] bg-[#A3E635]" title="Back/Biceps" />
                      <div className="w-[20%] bg-emerald-500" title="Legs/Core" />
                      <div className="w-[25%] bg-[#6366F1]" title="Shoulders/Arms" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 5. HOW IT WORKS SECTION                                            */}
        {/* ------------------------------------------------------------------ */}
        <section id="how-it-works" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#84CC16]">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              How STRIVA accelerates your progress.
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Three simple steps from initial setup to intelligent progression.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0C0E14] border border-white/[0.08] p-8 rounded-3xl relative">
              <span className="text-5xl font-black text-[#84CC16]/20 font-display">01</span>
              <h3 className="text-xl font-bold text-white mt-4 tracking-tight">
                Set Targets & Baseline
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Configure your split schedule, target muscle groups, and daily calorie/macronutrient breakdown.
              </p>
            </div>

            <div className="bg-[#0C0E14] border border-white/[0.08] p-8 rounded-3xl relative">
              <span className="text-5xl font-black text-[#84CC16]/20 font-display">02</span>
              <h3 className="text-xl font-bold text-white mt-4 tracking-tight">
                Execute & Log Precision Sets
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Follow your plan in the gym with automatic rest timers, live RPE notes, and real-time tonnage calculation.
              </p>
            </div>

            <div className="bg-[#0C0E14] border border-white/[0.08] p-8 rounded-3xl relative">
              <span className="text-5xl font-black text-[#6366F1]/30 font-display">03</span>
              <h3 className="text-xl font-bold text-white mt-4 tracking-tight">
                Progress with TRINETRA AI
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Review automated progressive overload recommendations, recovery evaluations, and fatigue management insights.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 6. MEMBERSHIP & PRICING SECTION (VERIFIED CURRENT PRICING ONLY)     */}
        {/* ------------------------------------------------------------------ */}
        <section id="pricing" className="py-20 md:py-28 bg-[#07090E] border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#84CC16]">
                Transparent Membership
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
                One complete membership. Zero hidden add-ons.
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                Full access to all STRIVA V2 modules and the TRINETRA AI guidance engine.
              </p>
            </div>

            {/* Interval Toggle */}
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-[#11141D] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'bg-[#1F2433] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly · ₹799/mo
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`min-h-[44px] px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  billingInterval === 'yearly'
                    ? 'bg-[#84CC16] text-black shadow-md shadow-[#84CC16]/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Annual · ₹6,999/yr</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-black px-2 py-0.5 rounded-full">
                  Save ~27%
                </span>
              </button>
            </div>

            {/* Plan Card */}
            <div className="bg-[#0C0E14] border border-white/[0.12] rounded-3xl p-8 sm:p-12 text-left relative overflow-hidden shadow-2xl">
              {billingInterval === 'yearly' && (
                <div className="absolute top-0 right-0 bg-[#84CC16] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-sm">
                  Recommended · Save ~27%
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/[0.08] pb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    STRIVA Membership
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Complete access for individual athletes and performance enthusiasts.
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-white font-display">
                      {billingInterval === 'yearly' ? '₹6,999' : '₹799'}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-400">
                      {billingInterval === 'yearly' ? '/ year' : '/ month'}
                    </span>
                  </div>
                  <p className="text-xs text-[#84CC16] font-semibold mt-1">
                    {billingInterval === 'yearly' ? 'Equivalent to ~₹583/month' : 'Cancel anytime with zero fees'}
                  </p>
                </div>
              </div>

              {/* Verified Features */}
              <div className="py-8 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Included in every membership:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-200">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>TRINETRA AI Coach with context memory</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>Active workout logging & live rest timers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>Calorie, macro, and hydration telemetry</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>Longitudinal volume & progressive overload charts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>Personalized workout program design</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#84CC16] shrink-0" />
                    <span>Multi-device sync & high contrast dark UI</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="w-full min-h-[48px] py-4 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#84CC16]/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{user ? 'Manage Membership in Dashboard' : 'Start with 14 Days Free'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-3">
                14-day free trial on initial account setup. Instant activation.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ)                                */}
        {/* ------------------------------------------------------------------ */}
        <section id="faq" className="py-20 md:py-28 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#84CC16]">
              Knowledge Base
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              Frequently asked questions.
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Clear answers about accounts, workflows, and platform intelligence.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0C0E14] border border-white/[0.08] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full min-h-[44px] p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {item.q}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#11141D] flex items-center justify-center text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-4 animate-in fade-in duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 8. PRE-FOOTER CALL TO ACTION                                       */}
        {/* ------------------------------------------------------------------ */}
        <section className="py-16 md:py-20 border-t border-white/[0.06] bg-[#090B10]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
              Ready to elevate your training standards?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Join athletes using STRIVA to build muscle, optimize nutrition, and progress with TRINETRA AI.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="min-h-[48px] px-8 py-3.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-black font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-[#84CC16]/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{user ? 'Open STRIVA Dashboard' : 'Get Started Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* 9. FOOTER                                                          */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#11141D] border border-white/[0.12] flex items-center justify-center text-[#84CC16]">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white font-display">STRIVA</span>
              <span className="text-xs text-slate-500 ml-2">Athletic Performance Operating System</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <button
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Operational · STRIVA V2</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-white/[0.04] text-center text-xs text-slate-600">
          <p>© 2026 STRIVA. All rights reserved. Train with purpose. Progress with intelligence.</p>
        </div>
      </footer>
    </div>
  );
};
