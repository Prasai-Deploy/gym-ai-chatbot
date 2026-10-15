import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useOwnerAccess } from '../hooks/useOwnerAccess';
import { OwnerAccessDenied } from '../components/OwnerAccessDenied';

export const OwnerLayout: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const { isAuthorized, role, isDemo } = useOwnerAccess();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center gap-3 select-none font-sans">
        <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400 tracking-wide">
          Verifying Organization Access...
        </span>
      </div>
    );
  }

  if (!isAuthorized) {
    return <OwnerAccessDenied role={role} isDemo={isDemo} />;
  }

  return <Outlet />;
};
