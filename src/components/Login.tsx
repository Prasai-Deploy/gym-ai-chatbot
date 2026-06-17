import React, { useState } from 'react';
import { Dumbbell, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
  const [showQR, setShowQR] = useState(false);
  const { user, loading, setUser } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-bold">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Automatically redirect to the correct domain (localhost or production)
        redirectTo: `${window.location.origin}/dashboard` 
      }
    });
    if (error) {
      console.error('Error logging in:', error.message);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        const userData = await res.json();
        if (userData && userData.id) {
          setUser(userData);
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        alert('Demo login failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={{ background: 'var(--surface-primary)' }}>
      {/* Decorative Blobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
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

        <div className="card rounded-2xl p-6 shadow-xl w-full">
          <h3 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Try the Demo</h3>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>Experience the full platform without creating an account.</p>
          <button
            onClick={handleDemoLogin}
            className="w-full btn-primary py-3 rounded-xl font-semibold"
          >
            Explore as Demo User
          </button>
        </div>

        <div className="mt-12 pt-12" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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
