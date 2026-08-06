import React from 'react';
import { Badge } from '../components/Badge';

export interface MembershipStatusProps {
  status: 'Active' | 'Due Soon' | 'Expired' | 'Paused';
  className?: string;
}

export const MembershipStatus: React.FC<MembershipStatusProps> = React.memo(({
  status,
  className,
}) => {
  const getVariant = (st: string) => {
    switch (st) {
      case 'Active':
        return 'success';
      case 'Due Soon':
        return 'warning';
      case 'Expired':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Badge variant={getVariant(status)} size="sm" className={className}>
      {status}
    </Badge>
  );
});

MembershipStatus.displayName = 'MembershipStatus';
