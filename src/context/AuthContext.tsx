import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  rehydrate: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to map Supabase User to our app's User interface
  const mapSupabaseUser = (sbUser: any): User | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id as any, // ID will be string from Supabase, but our interface expects number. Hacky cast for now.
      email: sbUser.email || '',
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'User',
      avatar: sbUser.user_metadata?.avatar_url || '',
    };
  };

  const rehydrate = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no Supabase session, fallback to checking demo login session via backend
      if (!session) {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        
        // RACE CONDITION FIX: While fetch was running, Supabase might have finished parsing the OAuth hash 
        // and fired SIGNED_IN via onAuthStateChange. Let's double check the latest session.
        const { data: { session: latestSession } } = await supabase.auth.getSession();
        if (latestSession) {
          const mappedUser = mapSupabaseUser(latestSession.user);
          setUser(mappedUser);
          return mappedUser;
        }

        if (data && data.id) {
          setUser(data);
          return data;
        }
        
        setUser(null);
        return null;
      }

      const mappedUser = mapSupabaseUser(session.user);
      setUser(mappedUser);
      return mappedUser;
    } catch (error) {
      console.error('[AuthContext] Failed to load session:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    rehydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(mapSupabaseUser(session.user));
      } else {
        // Only clear user if it's not a demo login (demo has id=999)
        setUser((prev) => (prev?.id === 999 ? prev : null));
      }
    });

    return () => subscription.unsubscribe();
  }, [rehydrate]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/auth/logout'; // Clear backend session too for demo users and redirect to root
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
