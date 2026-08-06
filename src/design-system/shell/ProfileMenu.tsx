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
      label: 'App Settings',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      onClick: () => onNavigate?.('/settings'),
    },
    {
      id: 'admin',
      label: 'Trainer Dashboard',
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
    <div className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-white/5 transition-all select-none">
      <Avatar src={user.avatarUrl} name={user.name} size="md" status="online" />
      <div className="hidden md:flex flex-col text-left">
        <span className="text-xs font-bold text-white leading-tight">{user.name}</span>
        <span className="text-[10px] font-semibold text-orange-400 flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          {user.role}
        </span>
      </div>
    </div>
  );

  return <Dropdown trigger={trigger} items={items} align="right" />;
});

ProfileMenu.displayName = 'ProfileMenu';
