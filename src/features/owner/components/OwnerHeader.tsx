import React, { useState } from 'react';
import { Shield, ChevronDown, Check, Building2, MapPin, Bell } from 'lucide-react';
import { useUserOrganizations } from '../hooks/useOwnerOverview';
import { useOwnerNotificationCount } from '../hooks/useOwnerNotifications';
import { NotificationDrawer } from './notifications/NotificationDrawer';

interface OwnerHeaderProps {
  organizationName: string;
  primaryLocationName?: string;
  totalLocations?: number;
  status?: string;
  currentOrgId?: string;
  onSelectOrganization?: (orgId: string) => void;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({
  organizationName,
  primaryLocationName,
  totalLocations = 1,
  status = 'active',
  currentOrgId,
  onSelectOrganization,
}) => {
  const { data: userOrgs = [] } = useUserOrganizations();
  const { data: unreadCount = 0 } = useOwnerNotificationCount();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const hasMultipleOrgs = userOrgs.length > 1;

  return (
    <header className="w-full bg-[#07090E] border-b border-white/[0.08] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Organization Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-sm shadow-orange-500/10">
          <Building2 className="w-5 h-5" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 relative">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
              {organizationName || 'STRIVA Facility'}
            </h1>

            {hasMultipleOrgs && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-expanded={isDropdownOpen}
                  aria-label="Switch organization"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 mt-2 w-56 bg-[#0D1017] border border-white/[0.12] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      Your Organizations
                    </div>
                    {userOrgs.map((org: any) => {
                      const isCurrent = org.id === currentOrgId;
                      return (
                        <button
                          key={org.id}
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            onSelectOrganization?.(org.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                            isCurrent
                              ? 'text-orange-400 bg-orange-500/10'
                              : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <span className="truncate">{org.name}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Context Line */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-slate-400">
              <MapPin className="w-3 h-3 text-orange-400/80 shrink-0" />
              <span>
                {primaryLocationName
                  ? `${primaryLocationName}${totalLocations > 1 ? ` (+${totalLocations - 1} locations)` : ''}`
                  : totalLocations > 1
                  ? `${totalLocations} Locations (Organization-wide)`
                  : 'Organization-wide telemetry'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Operational Badge & Actions */}
      <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
        {/* Notification Bell Trigger */}
        <button
          type="button"
          onClick={() => setIsNotificationOpen(true)}
          className="relative min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
          aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-orange-500 text-black text-[10px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wide uppercase">Live Facility</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[11px] font-semibold text-slate-300">Gym Owner OS</span>
        </div>
      </div>

      {/* Notification Slide-Over Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </header>
  );
};
