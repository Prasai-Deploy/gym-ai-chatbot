import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from '../../../design-system/icons';

interface OwnerAccessDeniedProps {
  role?: string;
  isDemo?: boolean;
}

export const OwnerAccessDenied: React.FC<OwnerAccessDeniedProps> = ({ role = 'Member', isDemo = false }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="w-full max-w-md bg-[#0D1017] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Subtle top indicator glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/50" />

        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
          <Shield className="w-7 h-7" />
        </div>

        <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-red-400 mb-2">
          HTTP 403 — Access Restricted
        </span>

        <h1 className="text-xl font-bold tracking-tight text-white mb-3">
          Gym Owner Workspace
        </h1>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          {isDemo
            ? 'The demo sandbox account cannot access production Gym Owner OS operations or manage organization infrastructure.'
            : `Your current account (${role}) does not have Organization Owner or Gym Manager authorization for this tenant workspace.`}
        </p>

        <div className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-400 mb-6 text-left flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
          <span>
            If you are a gym manager or franchise owner, request an invitation from your organization administrator.
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/v3/dashboard')}
          className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Member Home</span>
        </button>
      </div>
    </div>
  );
};
