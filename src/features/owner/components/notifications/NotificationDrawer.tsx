import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  CheckCheck,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  useOwnerNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../../hooks/useOwnerNotifications';
import { OrgNotificationItem } from '../../../../api/notificationApi';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VALID_OWNER_DESTINATIONS = new Set([
  '/owner/dashboard',
  '/owner/members',
  '/owner/attendance',
  '/owner/trainers',
  '/owner/analytics',
  '/owner/billing',
]);

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [filterUnread, setFilterUnread] = useState(false);

  const { data, isLoading, isError, refetch } = useOwnerNotifications({
    unread_only: filterUnread,
    limit: 30,
  });

  const markOneMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();

  if (!isOpen) return null;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleActionClick = (notification: OrgNotificationItem) => {
    if (!notification.is_read) {
      markOneMutation.mutate(notification.id);
    }
    if (notification.action_path && VALID_OWNER_DESTINATIONS.has(notification.action_path)) {
      onClose();
      navigate(notification.action_path);
    }
  };

  const handleMarkOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markOneMutation.mutate(id);
  };

  const handleMarkAll = () => {
    markAllMutation.mutate();
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090C12] border-l border-white/[0.08] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight font-sans">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Operational alerts & tenant events
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={markAllMutation.isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close notification panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-5 py-2.5 border-b border-white/[0.06] flex items-center gap-2 bg-[#06080D]">
            <button
              type="button"
              onClick={() => setFilterUnread(false)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                !filterUnread
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterUnread(true)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterUnread
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notification List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-3 space-y-2">
            {isLoading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                <span className="text-xs">Loading operational alerts...</span>
              </div>
            )}

            {isError && (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-400">Failed to load notifications.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-[11px] text-orange-400 underline hover:text-orange-300"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-white mt-1">You're all caught up</h3>
                <p className="text-[11px] text-slate-400 max-w-[240px]">
                  {filterUnread
                    ? 'No unread notifications at this time.'
                    : 'No operational notifications or alerts found.'}
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              notifications.map((n) => {
                const isCritical = n.severity === 'critical';
                const isWarning = n.severity === 'warning';

                const borderCls = isCritical
                  ? 'border-red-500/25 bg-red-500/[0.03]'
                  : isWarning
                  ? 'border-amber-500/25 bg-amber-500/[0.03]'
                  : 'border-blue-500/20 bg-blue-500/[0.02]';

                const iconCls = isCritical
                  ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : isWarning
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-blue-400 bg-blue-500/10 border-blue-500/20';

                const Icon = isCritical ? AlertCircle : isWarning ? AlertTriangle : Info;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleActionClick(n)}
                    className={`group p-3.5 rounded-xl border ${borderCls} ${
                      !n.is_read ? 'ring-1 ring-orange-500/20' : 'opacity-85'
                    } hover:border-white/[0.18] transition-all cursor-pointer relative flex flex-col gap-2`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${iconCls}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white tracking-tight font-sans">
                              {n.title}
                            </h4>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans">
                            {n.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatRelativeTime(n.created_at)}
                        </span>
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkOne(e, n.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {n.action_path && VALID_OWNER_DESTINATIONS.has(n.action_path) && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                        <span className="text-[10px] text-slate-400 capitalize">
                          {n.resource_type || 'System alert'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 group-hover:text-orange-300">
                          <span>{n.action_label || 'View details'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.06] bg-[#07090E] flex items-center justify-between text-[11px] text-slate-400">
            <span>STRIVA Tenant Attention System</span>
            <span className="text-slate-400">Real-time Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
