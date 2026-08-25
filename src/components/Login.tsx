import React, { useState, useEffect, useRef } from 'react';
import { Button, LoadingButton } from '../shared';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { BrandMark } from '../design-system/brand/BrandMark';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LOGIN_BACKGROUND_VIDEO } from '../config/loginBackground';

export function Login() {
  const [demoLoading, setDemoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { user, loading, setUser, rehydrate } = useAuth();
  const { businessName } = useBranding();
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
    return <div className="h-screen flex items-center justify-center font-bold">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Google login via Express backend
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // 1. Authenticate natively with Supabase using env password
      const password = import.meta.env.VITE_DEMO_PASSWORD;
      if (!password) {
        throw new Error('VITE_DEMO_PASSWORD is not configured in the environment.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'demo@sweatfix.com',
        password: password,
      });

      if (authError || !authData.session) {
        throw new Error(authError?.message || 'Failed to authenticate demo user');
      }

      // 2. Clear backend data via the new v2 endpoint
      // Note: Because we have a Supabase session, httpClient automatically attaches the Bearer token!
      const { authApi } = await import('../api/authApi');
      await authApi.resetDemoUser();

      // 3. Rehydrate session context
      const restoredUser = await rehydrate();
      if (!restoredUser) {
        throw new Error('Failed to load demo profile.');
      }

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[Login] Demo login error:', error);
      alert(error.message || 'Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-black" 
      style={{ background: videoError ? 'var(--surface-primary)' : undefined }}
    >
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
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            style={{ transform: 'translate3d(0, 0, 0)' }}
          >
            <source src={LOGIN_BACKGROUND_VIDEO} type="video/mp4" />
          </video>
          {/* Subtle dark overlay for readability */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] z-[1] pointer-events-none" />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10 rounded-[32px] border border-white/15 bg-slate-950/68 backdrop-blur-2xl shadow-2xl shadow-black/35 p-5 sm:p-8"
      >
        {/* On a first-ever visit there is no cached branding yet — the gym is
            unknown until after login — so this shows the default mark. Every
            visit after that is correctly branded. */}
        <BrandMark size="lg" showWordmark={false} className="justify-center mb-6" />
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight text-white">
          {businessName}
        </h1>
        <p className="mb-8 text-sm sm:text-base text-slate-300">Your training, nutrition, and progress, all in one focused place.</p>

        <Button
          onClick={handleLogin}
          className="w-full bg-white text-black hover:bg-zinc-200 gap-3 mb-4 py-4 h-auto shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </Button>

        <div className="w-full text-center border-t border-white/15 mt-3 pt-6">
          <h3 className="text-base font-bold mb-1.5 text-white">Explore first</h3>
          <p className="text-sm text-slate-400 mb-5">Try the experience without creating an account.</p>
          <div className="flex flex-col gap-3">
            <LoadingButton
              onClick={handleDemoLogin}
              loading={demoLoading}
              loadingText="Loading..."
              className="w-full py-3 h-auto"
            >
              Explore as Demo User
            </LoadingButton>
          </div>
        </div>



        {/* PrasAI Cloud Branding Footer */}
        <div className="mt-8 flex flex-col items-center justify-center gap-1.5 opacity-55 hover:opacity-80 transition-opacity duration-200">
          <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-slate-500">Powered by</p>
          <img src="/prasai_cloud_logo.png" alt="PrasAI Cloud Logo" className="h-8 object-contain" />
        </div>
      </motion.div>
    </div>
  );
}
