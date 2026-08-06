import React from 'react';
import { Badge } from '../components/Badge';

export interface MembershipValidationProps {
  status: 'Valid' | 'Due Soon' | 'Expired' | 'Restricted';
  className?: string;
}

export const MembershipValidation: React.FC<MembershipValidationProps> = React.memo(({
  status,
  className,
}) => {
  const getVariant = (st: string) => {
    switch (st) {
      case 'Valid':
        return 'success';
      case 'Due Soon':
        return 'warning';
      case 'Expired':
      case 'Restricted':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Badge variant={getVariant(status)} size="sm" className={className}>
      Pass: {status}
    </Badge>
  );
});

MembershipValidation.displayName = 'MembershipValidation';
