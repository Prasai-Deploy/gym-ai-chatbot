import React, { useState, useEffect, useRef } from 'react';
import { Dumbbell, ArrowRight, Sparkles, Shield } from '../design-system/icons';
import { Button } from '../design-system/components/Button';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LOGIN_BACKGROUND_VIDEO } from '../config/loginBackground';

export function Login() {
  const [demoLoading, setDemoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { user, loading, setUser, rehydrate } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (videoRef.current) {
        if (document.hidden) {
          videoRef.current.pause();
        } else {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/v3/dashboard" replace />;
  }

  // Google login via Express backend
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const password = import.meta.env.VITE_DEMO_PASSWORD || 'demo@2026';

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'demo@sweatfix.com',
        password: password,
      });

      if (authError || !authData.session) {
        throw new Error(authError?.message || 'Failed to authenticate demo user');
      }

      // Reset demo user data
      try {
        const { authApi } = await import('../api/authApi');
        await authApi.resetDemoUser();
      } catch {
        // Continue if reset fails
      }

      // Rehydrate session context
      const restoredUser = await rehydrate();
      if (!restoredUser) {
        throw new Error('Failed to load demo profile.');
      }

      navigate('/v3/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[Login] Demo login error:', error);
      alert(error.message || 'Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-[#050608] select-none">
      {/* Fullscreen Looping Video Background */}
      {!videoError && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-25"
            style={{ transform: 'translate3d(0, 0, 0)' }}
          >
            <source src={LOGIN_BACKGROUND_VIDEO} type="video/mp4" />
          </video>
          {/* Dark atmospheric overlay */}
          <div className="absolute inset-0 bg-[#050608]/85 backdrop-blur-[2px] z-[1] pointer-events-none" />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full relative z-10 flex flex-col items-center gap-6"
      >
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#11141D] border border-white/[0.08] shadow-lg flex items-center justify-center text-orange-400">
          <Dumbbell className="w-8 h-8" />
        </div>

        {/* Title & Tagline */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
            STRIVA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs">
            Premium AI Health & Performance Operating System
          </p>
        </div>

        {/* Actions Card */}
        <div className="w-full rounded-2xl bg-[#11141D] border border-white/[0.08] p-6 flex flex-col gap-4 shadow-xl">
          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold shadow-md shadow-orange-500/20"
            isLoading={demoLoading}
            onClick={handleDemoLogin}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Explore as PRO Demo User
          </Button>

          <span className="text-[11px] text-slate-400">
            Instant 1-click test access with complete telemetry.
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Enterprise End-to-End Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
}
