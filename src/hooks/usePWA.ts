/**
 * src/hooks/usePWA.ts
 * Manages PWA install prompt, iOS detection, and visit count.
 */
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  showInstallBanner: boolean;
  dismissBanner: () => void;
  triggerInstall: () => Promise<void>;
}

const VISIT_KEY = 'sweatfix_visit_count';
const DISMISS_KEY = 'sweatfix_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Track visits
  useEffect(() => {
    if (isStandalone) return;
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0');
    const wasDismissedRecently = dismissed && Date.now() - dismissed < DISMISS_DURATION_MS;

    if (visits >= 2 && !wasDismissedRecently) {
      // On iOS show immediately (no beforeinstallprompt); on others wait for event
      if (isIOS) setShowInstallBanner(true);
    }
  }, [isStandalone, isIOS]);

  // Capture beforeinstallprompt
  useEffect(() => {
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0');
      const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0');
      const wasDismissedRecently = dismissed && Date.now() - dismissed < DISMISS_DURATION_MS;

      if (visits >= 2 && !wasDismissedRecently) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone]);

  const dismissBanner = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt,
    isIOS,
    isStandalone,
    showInstallBanner,
    dismissBanner,
    triggerInstall,
  };
}
