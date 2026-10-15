import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-8 h-8 border-2 border-[#84CC16]/20 border-t-[#84CC16] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
          Loading STRIVA...
        </span>
      </div>
    );
  }

  // If no user is authenticated, redirect to login while preserving destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
