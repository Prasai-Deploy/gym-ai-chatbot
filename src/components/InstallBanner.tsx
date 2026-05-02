/**
 * src/components/InstallBanner.tsx
 * Bottom install prompt banner (Android/Chrome + iOS variant).
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, X } from 'lucide-react';
import { PWAState } from '../hooks/usePWA';

interface Props {
  pwa: PWAState;
}

export function InstallBanner({ pwa }: Props) {
  const { showInstallBanner, dismissBanner, triggerInstall, canInstall, isIOS } = pwa;

  return (
    <AnimatePresence>
      {showInstallBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-[150] px-4 pb-4 pt-2"
          style={{ background: 'linear-gradient(to top, rgba(9,9,11,0.98) 80%, transparent)' }}
        >
          <div
            className="max-w-lg mx-auto rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: 'rgba(24,24,27,0.95)',
              border: '1px solid rgba(124,58,237,0.35)',
              boxShadow: '0 -4px 32px rgba(124,58,237,0.15)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* App icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              S
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              {isIOS ? (
                <>
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Install Sweatfix AI
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    Tap <Share size={11} className="inline text-blue-400 flex-shrink-0" /> then <strong className="text-blue-400">"Add to Home Screen"</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Install Sweatfix AI
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Get the best experience — works offline too!
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && canInstall && (
                <button
                  id="pwa-install-btn"
                  onClick={triggerInstall}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Download size={14} />
                  Install
                </button>
              )}
              <button
                onClick={dismissBanner}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Dismiss install prompt"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
