import React from 'react';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { User, MessageSquare } from '../icons';

export interface AssignedTrainerProps {
  trainerName?: string;
  trainerRole?: string;
  avatarUrl?: string;
  onMessageTrainer?: () => void;
  className?: string;
}

export const AssignedTrainer: React.FC<AssignedTrainerProps> = React.memo(({
  trainerName = 'Coach Elena Rostova',
  trainerRole = 'Head Strength & Conditioning Coach',
  avatarUrl,
  onMessageTrainer,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-4 flex items-center justify-between gap-3 select-none ${className}`}>
      <div className="flex items-center gap-3">
        <Avatar name={trainerName} src={avatarUrl} size="md" />
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Trainer</span>
          <span className="text-xs font-extrabold text-white">{trainerName}</span>
          <span className="text-[10px] text-indigo-300">{trainerRole}</span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        leftIcon={<MessageSquare className="w-3.5 h-3.5 text-indigo-400" />}
        onClick={onMessageTrainer}
      >
        Contact
      </Button>
    </Card>
  );
});

AssignedTrainer.displayName = 'AssignedTrainer';
