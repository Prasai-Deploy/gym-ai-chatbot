import React from 'react';
import { Activity, Check, ExternalLink } from '../icons';
import { cn } from '../tokens';

export interface DeviceItem {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected';
  lastSync?: string;
}

export interface ConnectedDevicesSectionProps {
  devices?: DeviceItem[];
  onManageConnections?: () => void;
  className?: string;
}

export const ConnectedDevicesSection: React.FC<ConnectedDevicesSectionProps> = React.memo(({
  devices = [
    { id: 'dev-1', name: 'WHOOP 4.0 Strap', category: 'Biometrics & Recovery', status: 'connected', lastSync: '10 min ago' },
    { id: 'dev-2', name: 'Apple Health', category: 'Health & Activity', status: 'disconnected' },
    { id: 'dev-3', name: 'Google Health Connect', category: 'Wearables & Steps', status: 'disconnected' },
  ],
  onManageConnections = () => console.log('Manage connections'),
  className,
}) => {
  return (
    <div className={cn('w-full rounded-2xl bg-[#11141D] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4 select-none shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          CONNECTED DEVICES
        </span>

        <button
          type="button"
          onClick={onManageConnections}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
        >
          <span>Manage</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.05]">
        {devices.map((device) => {
          const isConnected = device.status === 'connected';

          return (
            <div key={device.id} className="flex items-center justify-between py-2.5 min-h-[44px]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">{device.name}</span>
                <span className="text-[11px] text-slate-400">
                  {device.category} {device.lastSync && `• Synced ${device.lastSync}`}
                </span>
              </div>

              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                )}
              >
                {isConnected && <Check className="w-3 h-3 stroke-[2.5]" />}
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ConnectedDevicesSection.displayName = 'ConnectedDevicesSection';
