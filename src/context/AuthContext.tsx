import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authApi } from '../api/authApi';

interface User {
  id: string;
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
      id: sbUser.id as string,
      email: sbUser.email || '',
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'User',
      avatar: sbUser.user_metadata?.avatar_url || '',
    };
  };

  const rehydrate = useCallback(async (): Promise<User | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no Supabase session, the user is not authenticated.
      // (Demo logins now natively generate a Supabase session).
      if (!session) {
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

    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            const { data: adminData } = await supabase
              .from('admins')
              .select('role')
              .eq('email', session.user.email)
              .single();

            if (adminData) {
              window.location.replace('/admin');
            } else {
              setUser(mapSupabaseUser(session.user));
              if (window.location.pathname.startsWith('/admin')) {
                window.location.replace('/dashboard');
              }
            }
          } catch (err) {
            console.error('Error checking admin status:', err);
          }
        } else if (!session) {
          setUser((prev) => (prev?.email === 'demo@sweatfix.com' ? prev : null));
        }
      });

      return () => {
        data?.subscription?.unsubscribe();
      };
    } catch (err) {
      console.error('Error in onAuthStateChange:', err);
    }
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
