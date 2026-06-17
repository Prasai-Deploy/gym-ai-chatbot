import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login', { replace: true });
        return;
      }
      
      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        // Wait for hash fragment to be processed by Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            navigate('/dashboard', { replace: true });
            subscription.unsubscribe();
          }
        });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#121212',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px', color: 'white'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #1f1f1f',
        borderTop: '3px solid #22c55e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#9ca3af' }}>Completing sign in...</p>
    </div>
  );
}
