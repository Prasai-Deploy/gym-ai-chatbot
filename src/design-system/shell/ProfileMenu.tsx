import React from 'react';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Avatar } from '../components/Avatar';
import { User, Settings, CreditCard, Shield, LogOut, Sparkles } from '../icons';

export interface ProfileMenuProps {
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
  };
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = React.memo(({
  user = { name: 'Gym Member', email: 'member@striva.app', role: 'PRO Member' },
  onNavigate,
  onLogout,
}) => {
  const items: DropdownItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4 text-orange-400" />,
      onClick: () => onNavigate?.('/v3/profile'),
    },
    {
      id: 'billing',
      label: 'Membership & Billing',
      icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
      onClick: () => onNavigate?.('/v3/billing'),
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      onClick: () => onNavigate?.('/settings'),
    },
    {
      id: 'admin',
      label: 'Management Console',
      icon: <Shield className="w-4 h-4 text-indigo-400" />,
      onClick: () => onNavigate?.('/admin'),
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: () => onLogout?.(),
    },
  ];

  const trigger = (
    <button
      type="button"
      className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.04] transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label="Open Profile Menu"
    >
      <Avatar src={user.avatarUrl} name={user.name} size="sm" status="online" />
      <div className="hidden xl:flex flex-col text-left">
        <span className="text-xs font-bold text-white leading-tight font-sans">{user.name}</span>
        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          {user.role}
        </span>
      </div>
    </button>
  );

  return <Dropdown trigger={trigger} items={items} align="right" />;
});

ProfileMenu.displayName = 'ProfileMenu';
