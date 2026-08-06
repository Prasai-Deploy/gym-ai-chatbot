import React from 'react';
import { Button } from '../components/Button';
import { Bell, Plus, ExternalLink, User } from '../icons';

export interface BulkActionsProps {
  onAddMember?: () => void;
  onSendBroadcast?: () => void;
  onExportCSV?: () => void;
  className?: string;
}

export const BulkActions: React.FC<BulkActionsProps> = React.memo(({
  onAddMember,
  onSendBroadcast,
  onExportCSV,
  className,
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 select-none ${className}`}>
      <Button
        variant="primary"
        size="md"
        leftIcon={<User className="w-4 h-4" />}
        onClick={onAddMember}
      >
        + Add New Member
      </Button>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Bell className="w-4 h-4 text-indigo-400" />}
        onClick={onSendBroadcast}
      >
        Send Broadcast
      </Button>

      <Button
        variant="outline"
        size="md"
        leftIcon={<ExternalLink className="w-4 h-4 text-slate-400" />}
        onClick={onExportCSV}
      >
        Export Roster CSV
      </Button>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';
