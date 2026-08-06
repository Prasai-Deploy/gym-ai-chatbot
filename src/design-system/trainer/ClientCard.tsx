import React from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ClientHealthScore } from './ClientHealthScore';
import { ChevronRight } from '../icons';

export interface ClientData {
  id: string;
  name: string;
  avatarUrl?: string;
  program: string;
  healthScore: number;
  lastWorkout: string;
  needsAttention?: boolean;
}

export interface ClientCardProps {
  client: ClientData;
  onSelectClient?: (id: string) => void;
  className?: string;
}

export const ClientCard: React.FC<ClientCardProps> = React.memo(({
  client,
  onSelectClient,
  className,
}) => {
  return (
    <Card
      variant="default"
      className={`p-4 flex items-center justify-between gap-4 transition-all select-none ${
        client.needsAttention ? 'border-amber-500/50 bg-amber-500/10' : 'hover:border-white/20'
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <Avatar name={client.name} src={client.avatarUrl} size="md" />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white">{client.name}</h4>
            <ClientHealthScore score={client.healthScore} />
          </div>
          <span className="text-[10px] text-slate-400">
            {client.program} • Last: <span className="text-slate-300 font-semibold">{client.lastWorkout}</span>
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        rightIcon={<ChevronRight className="w-4 h-4" />}
        onClick={() => onSelectClient?.(client.id)}
      >
        View
      </Button>
    </Card>
  );
});

ClientCard.displayName = 'ClientCard';
