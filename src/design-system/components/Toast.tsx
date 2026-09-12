import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '../icons';
import { cn } from '../tokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: { type: ToastType; message: string; description?: string }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type, message, description }: { type: ToastType; message: string; description?: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, description }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#11141D] border border-white/[0.09] shadow-2xl backdrop-blur-xl'
              )}
            >
              <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-white">{t.message}</span>
                {t.description && <span className="text-xs text-slate-400">{t.description}</span>}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
