import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function AuthCallback() {
  const navigate = useNavigate();
  const { rehydrate } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          if (isMounted) navigate('/login', { replace: true });
          return;
        }
        
        if (session) {
          await rehydrate();
          if (isMounted) navigate('/v3/dashboard', { replace: true });
        } else {
          // Listen for session exchange from hash fragment
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session && isMounted) {
              await rehydrate();
              navigate('/v3/dashboard', { replace: true });
              subscription.unsubscribe();
            }
          });

          // Timeout fallback in case hash is invalid or rejected
          setTimeout(() => {
            if (isMounted) {
              navigate('/login', { replace: true });
            }
          }, 4000);
        }
      } catch (err) {
        console.error('Unexpected auth callback error:', err);
        if (isMounted) navigate('/login', { replace: true });
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, rehydrate]);

  return (
    <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center gap-3 select-none">
      <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
        Authenticating with STRIVA...
      </span>
    </div>
  );
}
