import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface UpdateNotificationProps {
  needRefresh: boolean;
  onRefresh: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({ needRefresh, onRefresh, onDismiss }: UpdateNotificationProps) {
  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="update-toast"
          id="update-notification"
        >
          <div className="flex items-center gap-3 flex-1">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={18} style={{ color: 'var(--accent-primary)' }} />
            </motion.div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New version available
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
            >
              Update
            </button>
            <button
              onClick={onDismiss}
              className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
