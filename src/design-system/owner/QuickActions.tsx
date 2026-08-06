import React from 'react';
import { Button } from '../components/Button';
import { Plus, Bell, CreditCard, User } from '../icons';

export interface QuickActionsProps {
  onAddMember?: () => void;
  onCreateClass?: () => void;
  onSendBroadcast?: () => void;
  onIssueRefund?: () => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  onAddMember,
  onCreateClass,
  onSendBroadcast,
  onIssueRefund,
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
        leftIcon={<Plus className="w-4 h-4 text-amber-400" />}
        onClick={onCreateClass}
      >
        Create Group Class
      </Button>

      <Button
        variant="outline"
        size="md"
        leftIcon={<Bell className="w-4 h-4 text-indigo-400" />}
        onClick={onSendBroadcast}
      >
        Send Push Broadcast
      </Button>

      <Button
        variant="ghost"
        size="md"
        leftIcon={<CreditCard className="w-4 h-4 text-slate-400" />}
        onClick={onIssueRefund}
      >
        POS Terminal
      </Button>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
