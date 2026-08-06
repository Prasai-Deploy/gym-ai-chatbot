import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { User, Plus } from '../icons';

export interface GuestPassProps {
  onIssuePass?: () => void;
  className?: string;
}

export const GuestPass: React.FC<GuestPassProps> = React.memo(({
  onIssuePass,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Temporary Guest & Trial Pass Issuer</span>
        </div>
        <Badge variant="primary" size="sm">24-Hour Pass</Badge>
      </div>

      <p className="text-xs text-slate-300">
        Issue single-day trial or guest pass QR codes for prospective members or visiting athletes.
      </p>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus className="w-4 h-4 text-indigo-400" />}
        onClick={onIssuePass}
        className="w-full"
      >
        Issue 1-Day Guest QR Pass
      </Button>
    </Card>
  );
});

GuestPass.displayName = 'GuestPass';
