import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBackendUser = async () => {
      try {
        const res = await fetch('/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setUser(data);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Use onAuthStateChange as the single source of truth.
    // This handles:
    //  - Initial page load (fires INITIAL_SESSION)
    //  - Redirect callback with #access_token hash (fires SIGNED_IN)
    //  - Token refreshes and sign outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Event:', event, '| Has session:', !!session);
      if (event === 'INITIAL_SESSION') {
        // This fires on every page load. If there's a session, fetch the user.
        if (session) {
          fetchBackendUser();
        } else {
          // No session — stop loading and show login
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchBackendUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
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
