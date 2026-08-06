import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { AlertTriangle, ExternalLink } from '../icons';

export interface EmergencyRollCallProps {
  occupantsCount?: number;
  className?: string;
}

export const EmergencyRollCall: React.FC<EmergencyRollCallProps> = React.memo(({
  occupantsCount = 142,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card variant="workout" className={`p-6 flex flex-col gap-4 border-red-500/50 bg-red-950/20 select-none ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Emergency Evacuation Protocol</span>
          </div>
          <Badge variant="danger" size="sm">CRITICAL PROTOCOL</Badge>
        </div>

        <p className="text-xs text-red-200">
          In case of fire or facility emergency, trigger live roll call to generate a instant evacuation list of all <span className="font-bold text-white">{occupantsCount} occupants</span> inside.
        </p>

        <Button
          variant="danger"
          size="md"
          leftIcon={<ExternalLink className="w-4 h-4" />}
          onClick={() => setIsOpen(true)}
          className="w-full"
        >
          Generate Live Evacuation Roll Call ({occupantsCount} Inside)
        </Button>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Live Facility Evacuation Roll Call" size="lg">
        <div className="flex flex-col gap-4 p-2 select-none">
          <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-xs text-red-200">
            <strong>EMERGENCY ROLL CALL ACTIVE:</strong> {occupantsCount} occupants currently checked into facility floor.
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {['Marcus Vance (VIP)', 'Sarah Jenkins (Gold)', 'Alexander Hayes (VIP)', 'Samantha Reed (Gold)'].map((name, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
                <span className="font-bold text-white">{i + 1}. {name}</span>
                <span className="text-[10px] text-emerald-400 font-bold">Accounted On Floor</span>
              </div>
            ))}
          </div>

          <Button variant="secondary" size="md" onClick={() => setIsOpen(false)} className="w-full mt-2">
            Close Evacuation View
          </Button>
        </div>
      </Modal>
    </>
  );
});

EmergencyRollCall.displayName = 'EmergencyRollCall';
