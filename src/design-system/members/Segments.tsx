import React from 'react';
import { Chip } from '../components/Chip';

export interface SegmentsProps {
  selectedSegment: string;
  onSelectSegment: (segmentId: string) => void;
  className?: string;
}

export const Segments: React.FC<SegmentsProps> = React.memo(({
  selectedSegment,
  onSelectSegment,
  className,
}) => {
  const segments = [
    { id: 'all-segment', label: 'All Cohorts' },
    { id: 'new-joins', label: 'Joined <30 Days' },
    { id: 'high-checkins', label: '15+ Checkins/Mo' },
    { id: 'pt-clients', label: 'Personal Training Clients' },
    { id: 'off-peak', label: 'Off-Peak Members' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 select-none ${className}`}>
      {segments.map((seg) => (
        <Chip
          key={seg.id}
          label={seg.label}
          selected={selectedSegment === seg.id}
          onClick={() => onSelectSegment(seg.id)}
          variant="primary"
          size="sm"
        />
      ))}
    </div>
  );
});

Segments.displayName = 'Segments';
