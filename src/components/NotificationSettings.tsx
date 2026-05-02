/**
 * src/components/NotificationSettings.tsx
 * Notification preferences panel rendered inside the Settings tab.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff, Clock, Zap, Trophy, BarChart2 } from 'lucide-react';
import { NotificationSettings, usePushNotifications } from '../hooks/usePushNotifications';

interface Props {
  push: ReturnType<typeof usePushNotifications>;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  delay?: number;
}

function ToggleRow({ icon, label, description, enabled, onChange, delay = 0 }: ToggleRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className="flex items-center justify-between min-h-[56px] py-2"
      style={{ borderBottom: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-elevated)' }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{description}</div>
        </div>
      </div>
      {/* Toggle */}
      <button
        onClick={() => onChange(!enabled)}
        className="relative w-[50px] h-7 rounded-full flex-shrink-0 transition-all duration-300 focus:outline-none"
        style={{ 
          background: enabled ? 'var(--gradient-primary)' : 'var(--surface-input)',
          border: enabled ? 'none' : '1px solid var(--glass-border)'
        }}
        aria-label={enabled ? 'Disable' : 'Enable'}
      >
        <div
          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300"
          style={{ transform: enabled ? 'translateX(24px)' : 'translateX(4px)' }}
        />
      </button>
    </motion.div>
  );
}

export function NotificationSettingsPanel({ push }: Props) {
  const { permission, isSubscribed, settings, saveSettings, requestPermissionAndSubscribe, unsubscribeAll } = push;
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<NotificationSettings>) => {
    setSaving(true);
    await saveSettings(patch);
    setSaving(false);
  };

  if (!('Notification' in window)) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <BellOff size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Push notifications are not supported browser.</p>
      </div>
    );
  }

  if (permission !== 'granted' || !isSubscribed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-inner" style={{ background: 'var(--surface-elevated)' }}>
          <Bell size={24} className="text-purple-400" />
        </div>
        <div>
          <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Enable Alerts</div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {permission === 'denied'
              ? 'Notifications are blocked. Please enable them in your device settings.'
              : 'Get daily coaching nudges, streak alerts, and badge unlocks.'}
          </div>
        </div>
        {permission !== 'denied' && (
          <button
            onClick={requestPermissionAndSubscribe}
            className="w-full h-14 rounded-2xl font-black text-white active:scale-95 transition-all shadow-lg"
            style={{ background: 'var(--gradient-primary)' }}
          >
            Allow Notifications
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Preferences</span>
        {saving && <div className="text-[10px] animate-pulse" style={{ color: 'var(--text-muted)' }}>Saving…</div>}
      </div>

      <div className="space-y-1">
        <ToggleRow
          delay={0.05} icon={<Bell size={18} className="text-purple-400" />}
          label="Daily Reminder" description="Personalized morning fitness nudge"
          enabled={settings.daily_reminder}
          onChange={(v) => update({ daily_reminder: v })}
        />

        {settings.daily_reminder && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between min-h-[56px] py-2"
            style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-elevated)' }}>
                <Clock size={18} className="text-purple-400" />
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Reminder Time</span>
            </div>
            <input
              type="time"
              value={settings.reminder_time}
              onChange={(e) => update({ reminder_time: e.target.value })}
              className="rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none border-none outline-none shadow-inner"
              style={{ background: 'var(--surface-input)', color: 'var(--text-primary)' }}
            />
          </motion.div>
        )}

        <ToggleRow
          delay={0.1} icon={<Zap size={18} className="text-amber-400" />}
          label="Streak Alerts" description="Prevent streak loss at 7 PM"
          enabled={settings.streak_alerts}
          onChange={(v) => update({ streak_alerts: v })}
        />
        <ToggleRow
          delay={0.15} icon={<Trophy size={18} className="text-amber-400" />}
          label="Milestones" description="Alert when you earn new badges"
          enabled={settings.badge_alerts}
          onChange={(v) => update({ badge_alerts: v })}
        />
        <ToggleRow
          delay={0.2} icon={<BarChart2 size={18} className="text-cyan-400" />}
          label="Weekly Recap" description="Sunday progress reports"
          enabled={settings.weekly_summary}
          onChange={(v) => update({ weekly_summary: v })}
        />
      </div>

      <div className="pt-4">
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          onClick={unsubscribeAll}
          className="w-full h-[52px] rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <BellOff size={14} className="inline mr-2 mb-0.5" />
          Disable all notifications
        </motion.button>
      </div>
    </div>
  );
}
