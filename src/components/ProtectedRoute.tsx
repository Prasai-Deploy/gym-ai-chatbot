import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Return children immediately to prevent showing a black loading screen.
    // App.tsx handles null user gracefully with fallback UI while loading.
    return <>{children}</>;
  }

  // If no user (neither Supabase nor Demo), redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
