import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ClientCard, ClientData } from './ClientCard';

export interface ClientOverviewProps {
  clients?: ClientData[];
  onSelectClient?: (id: string) => void;
  className?: string;
}

export const ClientOverview: React.FC<ClientOverviewProps> = React.memo(({
  clients = [
    { id: 'c1', name: 'Marcus Vance', program: 'Hypertrophy Push', healthScore: 94, lastWorkout: 'Today', needsAttention: false },
    { id: 'c2', name: 'Sarah Jenkins', program: 'Strength & Recomp', healthScore: 78, lastWorkout: '2 days ago', needsAttention: true },
    { id: 'c3', name: 'David Miller', program: 'Endurance Build', healthScore: 91, lastWorkout: 'Yesterday', needsAttention: false },
    { id: 'c4', name: 'Samantha Reed', program: 'Fat Loss Shred', healthScore: 62, lastWorkout: '4 days ago', needsAttention: true },
  ],
  onSelectClient,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assigned Client Roster</span>
        <Badge variant="primary" size="sm">{clients.length} Total Clients</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {clients.map((c) => (
          <ClientCard key={c.id} client={c} onSelectClient={onSelectClient} />
        ))}
      </div>
    </Card>
  );
});

ClientOverview.displayName = 'ClientOverview';
