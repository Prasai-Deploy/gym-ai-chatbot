import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  water_goal?: number;
  calorie_goal?: number;
  protein_goal?: number;
  carb_goal?: number;
  fat_goal?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  rehydrate: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const rehydrate = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
      });
      console.log('[AuthContext] /api/auth/me status:', res.status);
      const data = await res.json();
      console.log('[AuthContext] /api/auth/me response:', data);
      const resolvedUser = data && data.id ? data : null;
      setUser(resolvedUser);
      return resolvedUser;
    } catch (error) {
      console.error('[AuthContext] Failed to rehydrate user session:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const logout = () => {
    setUser(null);
    window.location.href = '/auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, rehydrate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
