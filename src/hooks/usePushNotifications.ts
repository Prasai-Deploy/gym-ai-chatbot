/**
 * src/hooks/usePushNotifications.ts
 * Manages permission, subscription, and notification preferences.
 */
import { useState, useEffect, useCallback } from 'react';

export interface NotificationSettings {
  daily_reminder: boolean;
  reminder_time: string;
  streak_alerts: boolean;
  badge_alerts: boolean;
  weekly_summary: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  daily_reminder: true,
  reminder_time: '08:00',
  streak_alerts: true,
  badge_alerts: true,
  weekly_summary: true,
};

export function usePushNotifications(isLoggedIn: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // Load settings from backend
  useEffect(() => {
    if (!isLoggedIn || permission !== 'granted') return;
    (async () => {
      try {
        const res = await fetch('/api/push/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({
            daily_reminder: !!data.daily_reminder,
            reminder_time: data.reminder_time?.slice(0, 5) || '08:00',
            streak_alerts: !!data.streak_alerts,
            badge_alerts: !!data.badge_alerts,
            weekly_summary: !!data.weekly_summary,
          });
          setIsSubscribed(true);
        }
      } catch (e) { /* offline */ }
    })();
  }, [isLoggedIn, permission]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/push/vapid-public-key').then((r) => r.json());
      if (!publicKey) return false;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('[push] subscribe error:', e);
      return false;
    }
  }, []);

  const requestPermissionAndSubscribe = useCallback(async (): Promise<void> => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setShowNotifPrompt(false);
    if (result === 'granted') {
      await subscribe();
    }
  }, [subscribe]);

  const unsubscribeAll = useCallback(async (): Promise<void> => {
    await fetch('/api/push/unsubscribe', { method: 'DELETE' });
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    setIsSubscribed(false);
  }, []);

  const saveSettings = useCallback(async (newSettings: Partial<NotificationSettings>): Promise<void> => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      await fetch('/api/push/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...merged,
          reminder_time: merged.reminder_time + ':00',
          daily_reminder: merged.daily_reminder ? 1 : 0,
          streak_alerts: merged.streak_alerts ? 1 : 0,
          badge_alerts: merged.badge_alerts ? 1 : 0,
          weekly_summary: merged.weekly_summary ? 1 : 0,
        }),
      });
    } catch (e) { /* offline */ }
  }, [settings]);

  return {
    permission,
    isSubscribed,
    settings,
    showNotifPrompt,
    setShowNotifPrompt,
    requestPermissionAndSubscribe,
    unsubscribeAll,
    saveSettings,
  };
}
