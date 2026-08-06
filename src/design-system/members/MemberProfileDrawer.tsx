import React from 'react';
import { Drawer } from '../components/Drawer';
import { MemberRecord } from './MemberCard';
import { HealthScore } from './HealthScore';
import { MembershipStatus } from './MembershipStatus';
import { AttendanceHistory } from './AttendanceHistory';
import { WorkoutHistory } from './WorkoutHistory';
import { NutritionHistory } from './NutritionHistory';
import { ProgressSnapshot } from './ProgressSnapshot';
import { AchievementsPanel } from './AchievementsPanel';
import { MembershipTimeline } from './MembershipTimeline';
import { PaymentHistory } from './PaymentHistory';
import { AssignedTrainer } from './AssignedTrainer';
import { GoalsPanel } from './GoalsPanel';
import { ActivityTimeline } from './ActivityTimeline';
import { MemberJourney } from './MemberJourney';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { MessageSquare } from '../icons';

export interface MemberProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberRecord | null;
}

export const MemberProfileDrawer: React.FC<MemberProfileDrawerProps> = React.memo(({
  isOpen,
  onClose,
  member,
}) => {
  if (!member) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="360° Member Profile Inspection" side="right">
      <div className="flex flex-col gap-6 select-none pb-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} src={member.avatarUrl} size="lg" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">{member.name}</h3>
                <MembershipStatus status={member.status} />
              </div>
              <span className="text-xs text-slate-400">{member.email}</span>
              <span className="text-[10px] text-indigo-400 font-semibold">{member.planName}</span>
            </div>
          </div>

          <HealthScore score={member.healthScore} />
        </div>

        {/* Assigned Trainer */}
        <AssignedTrainer trainerName={member.assignedTrainer} />

        {/* Progress & Journey */}
        <ProgressSnapshot weightChangeKg={-1.8} strengthGrowthPct={14.5} bodyFatChangePct={-2.1} />
        <MemberJourney tenureDays={142} onboardingPct={100} />

        {/* Goals & Badges */}
        <GoalsPanel />
        <AchievementsPanel />

        {/* Activity & Histories */}
        <AttendanceHistory />
        <WorkoutHistory />
        <NutritionHistory />

        {/* Financials & Timeline */}
        <PaymentHistory />
        <MembershipTimeline />

        {/* Customer Event Stream */}
        <ActivityTimeline />

        <Button
          variant="primary"
          size="lg"
          leftIcon={<MessageSquare className="w-4 h-4 text-white" />}
          onClick={onClose}
          className="w-full"
        >
          Send Member Direct Message
        </Button>
      </div>
    </Drawer>
  );
});

MemberProfileDrawer.displayName = 'MemberProfileDrawer';
