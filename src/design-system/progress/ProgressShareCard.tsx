import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Dumbbell, Award, ExternalLink, Copy } from '../icons';

export interface ProgressShareCardProps {
  userName?: string;
  prTitle?: string;
  prStat?: string;
  onShare?: () => void;
  className?: string;
}

export const ProgressShareCard: React.FC<ProgressShareCardProps> = React.memo(({
  userName = 'Alex',
  prTitle = 'Incline Bench Press PR',
  prStat = '102.5 kg × 5 Reps',
  onShare,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onShare) onShare();
  };

  return (
    <Card variant="premium" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="primary" size="sm" icon={<Award className="w-3.5 h-3.5" />}>
          STRIVA CERTIFIED MILESTONE
        </Badge>
        <span className="text-xs font-mono font-bold text-brand-400">Shareable Card</span>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/30">
          <Dumbbell className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-semibold">{userName}'s Achievement</span>
          <h4 className="text-base font-extrabold text-white">{prTitle}</h4>
          <span className="text-sm font-black text-brand-400 font-mono">{prStat}</span>
        </div>
      </div>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Copy className="w-4 h-4 text-brand-400" />}
        onClick={handleCopyLink}
        className="w-full"
      >
        {copied ? 'Achievement Link Copied!' : 'Copy Share Card Link'}
      </Button>
    </Card>
  );
});

ProgressShareCard.displayName = 'ProgressShareCard';
