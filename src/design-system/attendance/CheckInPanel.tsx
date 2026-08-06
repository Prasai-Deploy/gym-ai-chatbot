import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { User, Check } from '../icons';

export interface CheckInPanelProps {
  onManualCheckIn?: (query: string) => void;
  className?: string;
}

export const CheckInPanel: React.FC<CheckInPanelProps> = React.memo(({
  onManualCheckIn,
  className,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (onManualCheckIn) onManualCheckIn(query);
    setQuery('');
  };

  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-emerald-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Manual Front Desk Check-in</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter member phone #, email, or barcode ID..."
          className="flex-1"
        />
        <Button variant="primary" size="md" leftIcon={<Check className="w-4 h-4 stroke-[3]" />} type="submit">
          Grant Entry
        </Button>
      </form>
    </Card>
  );
});

CheckInPanel.displayName = 'CheckInPanel';
