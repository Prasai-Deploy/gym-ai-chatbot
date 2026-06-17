import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center font-bold text-xl" style={{ background: 'var(--surface-primary)', color: 'var(--text-primary)' }}>
      Verifying Authentication...
    </div>
  );
}
