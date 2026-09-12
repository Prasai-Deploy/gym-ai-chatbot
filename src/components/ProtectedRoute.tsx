import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          Loading STRIVA...
        </span>
      </div>
    );
  }

  // If no user is authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
