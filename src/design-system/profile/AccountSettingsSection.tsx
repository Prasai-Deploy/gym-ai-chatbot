import React from 'react';
import { Shield, CreditCard, Lock, LogOut, ChevronRight } from '../icons';
import { Button } from '../components/Button';
import { cn } from '../tokens';

export interface AccountSettingsSectionProps {
  onNavigateBilling?: () => void;
  onNavigateSecurity?: () => void;
  onLogout?: () => void;
  className?: string;
}

export const AccountSettingsSection: React.FC<AccountSettingsSectionProps> = React.memo(({
  onNavigateBilling = () => console.log('Navigate billing'),
  onNavigateSecurity = () => console.log('Navigate security'),
  onLogout = () => console.log('Logout'),
  className,
}) => {
  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          ACCOUNT & SECURITY
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.05]">
        {/* Subscription */}
        <button
          type="button"
          onClick={onNavigateBilling}
          className="w-full flex items-center justify-between py-3 min-h-[44px] text-left hover:text-white transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-orange-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Subscription & Plan</span>
              <span className="text-[11px] text-slate-400">PRO Membership • Active</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </button>

        {/* Security */}
        <button
          type="button"
          onClick={onNavigateSecurity}
          className="w-full flex items-center justify-between py-3 min-h-[44px] text-left hover:text-white transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Security & Passwords</span>
              <span className="text-[11px] text-slate-400">2-Factor Authentication & session tokens</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <Button
          variant="destructive"
          size="md"
          className="w-full font-bold"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={onLogout}
        >
          Sign Out of STRIVA
        </Button>
      </div>
    </div>
  );
});

AccountSettingsSection.displayName = 'AccountSettingsSection';
