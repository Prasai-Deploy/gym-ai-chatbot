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

  return null;
}
