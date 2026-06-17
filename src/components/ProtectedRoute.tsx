import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log('[ProtectedRoute] loading:', loading, '| user:', user ? `id=${user.id}` : 'null');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-bold">
        Loading...
      </div>
    );
  }

  if (!user) {
    console.warn('[ProtectedRoute] No user after loading — redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
