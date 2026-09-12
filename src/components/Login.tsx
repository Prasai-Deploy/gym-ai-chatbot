import React, { useState, useEffect, useRef } from "react";
import { Dumbbell, ArrowRight, Shield } from "../design-system/icons";
import { Button } from "../design-system/components/Button";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LOGIN_BACKGROUND_VIDEO } from "../config/loginBackground";

export function Login() {
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, loading, rehydrate } = useAuth();
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  // Google login via Supabase OAuth flow
  const handleLogin = async () => {
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      const redirectOrigin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Google login error:", error);
        setErrorMessage(
          error.message || "Google login could not start. Please try again.",
        );
      }
    } catch (err: any) {
      console.error("Google login exception:", err);
      // Fallback to backend redirect if needed
      window.location.href = "/auth/google";
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setErrorMessage(null);
    try {
      const password = import.meta.env.VITE_DEMO_PASSWORD;
      if (!password) {
        throw new Error("Demo access is not configured for this deployment.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: "demo@sweatfix.com",
          password: password,
        });

      if (authError || !authData.session) {
        throw new Error(
          authError?.message || "Failed to authenticate demo user",
        );
      }

      // Reset demo user data
      try {
        const { authApi } = await import("../api/authApi");
        await authApi.resetDemoUser();
      } catch {
        // Continue if reset fails
      }

      // Rehydrate session context
      const restoredUser = await rehydrate();
      if (!restoredUser) {
        throw new Error("Failed to load demo profile.");
      }

      navigate("/v3/dashboard", { replace: true });
    } catch (error: any) {
      console.error("[Login] Demo login error:", error);
      setErrorMessage(error.message || "Demo login failed. Please try again.");
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
            style={{ transform: "translate3d(0, 0, 0)" }}
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
          <p className="text-sm text-slate-300 font-medium max-w-xs">
            Workouts, nutrition, progress, and coaching in one place.
          </p>
        </div>

        {/* Actions Card */}
        <div className="w-full rounded-2xl bg-[#11141D] border border-white/[0.08] p-6 flex flex-col gap-4 shadow-xl">
          <button
            type="button"
            onClick={handleLogin}
            disabled={googleLoading}
            className="w-full min-h-12 py-3 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-950 font-bold text-sm flex items-center justify-center gap-3 transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 cursor-pointer"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-4 h-4"
              alt="Google"
            />
            <span>
              {googleLoading
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Or
            </span>
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
            Explore the demo
          </Button>

          <span className="text-xs text-slate-300">
            Uses a resettable demo account. Your changes do not affect live
            member data.
          </span>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {errorMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure authentication powered by Supabase</span>
        </div>
      </motion.div>
    </div>
  );
}
