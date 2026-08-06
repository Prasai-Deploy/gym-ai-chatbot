import React from 'react';
import { Drawer } from '../components/Drawer';
import { Button } from '../components/Button';
import { Building, Settings, Users, CreditCard, ChevronRight } from '../icons';

export interface Facility {
  id: string;
  name: string;
  location: string;
  active: boolean;
}

export interface OwnerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  facilities?: Facility[];
  onSelectFacility?: (id: string) => void;
}

export const OwnerSidebar: React.FC<OwnerSidebarProps> = React.memo(({
  isOpen,
  onClose,
  facilities = [
    { id: '1', name: 'STRIVA Metro Flagship', location: 'Downtown Hub', active: true },
    { id: '2', name: 'STRIVA Westside Performance Center', location: 'West End', active: false },
    { id: '3', name: 'STRIVA Coastal Recovery Lab', location: 'Beachside', active: false },
  ],
  onSelectFacility,
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Facility & Organization Switcher" side="left">
      <div className="flex flex-col gap-4 select-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Gym Locations</span>

        <div className="flex flex-col gap-2">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              onClick={() => {
                if (onSelectFacility) onSelectFacility(fac.id);
                onClose();
              }}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                fac.active
                  ? 'bg-amber-500/15 border-amber-500/50 text-white'
                  : 'bg-slate-900 border-white/10 hover:border-white/20 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building className={`w-5 h-5 ${fac.active ? 'text-amber-400' : 'text-slate-500'}`} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{fac.name}</span>
                  <span className="text-[10px] text-slate-400">{fac.location}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="md"
          leftIcon={<Settings className="w-4 h-4 text-amber-400" />}
          onClick={onClose}
          className="w-full mt-2"
        >
          Facility Operations & POS Settings
        </Button>
      </div>
    </Drawer>
  );
});

OwnerSidebar.displayName = 'OwnerSidebar';
