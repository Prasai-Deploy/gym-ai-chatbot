import React, { useState } from 'react';
import { TrainerHero } from './TrainerHero';
import { AttentionRequired } from './AttentionRequired';
import { TodaysSessions } from './TodaysSessions';
import { ClientOverview } from './ClientOverview';
import { WorkoutAssignments } from './WorkoutAssignments';
import { NutritionAssignments } from './NutritionAssignments';
import { ProgressReview } from './ProgressReview';
import { PendingCheckIns } from './PendingCheckIns';
import { UnreadMessages } from './UnreadMessages';
import { AITrainerAssistant } from './AITrainerAssistant';
import { SessionTimeline } from './SessionTimeline';
import { WorkoutApproval } from './WorkoutApproval';
import { ExerciseFeedback } from './ExerciseFeedback';
import { MemberSearch } from './MemberSearch';
import { ClientFilters } from './ClientFilters';
import { UpcomingRenewals } from './UpcomingRenewals';
import { TrainerCalendar } from './TrainerCalendar';
import { TrainerStats } from './TrainerStats';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { NotesPanel } from './NotesPanel';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface TrainerWorkspaceLayoutProps {
  trainerName?: string;
  className?: string;
}

export const TrainerWorkspaceLayout: React.FC<TrainerWorkspaceLayoutProps> = React.memo(({
  trainerName = 'Coach Elena',
  className,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <TrainerHero trainerName={trainerName} activeClientsCount={24} pendingCheckInsCount={3} sessionsTodayCount={5} />

      {/* 2. Quick Actions Bar */}
      <QuickActions />

      {/* 3. High-Priority Attention Queue & Today's PT Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttentionRequired />
        <TodaysSessions />
      </div>

      {/* 4. Client Roster Search & Filter Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <MemberSearch value={searchVal} onChange={setSearchVal} className="w-full sm:max-w-md" />
        <ClientFilters activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>

      {/* 5. Client Overview Roster */}
      <ClientOverview />

      {/* 6. AI Coaching Copilot & Routine Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AITrainerAssistant />
        <WorkoutApproval />
      </div>

      {/* 7. Workout & Nutrition Program Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkoutAssignments />
        <NutritionAssignments />
      </div>

      {/* 8. Pending Check-Ins & Form Check Video Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingCheckIns />
        <ProgressReview />
      </div>

      {/* 9. Unread Client Messages & PT Session Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UnreadMessages />
        <SessionTimeline />
      </div>

      {/* 10. Weekly PT Calendar & Expiring Client Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrainerCalendar className="lg:col-span-2" />
        <UpcomingRenewals />
      </div>

      {/* 11. Member RPE Feedback & Live Client Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExerciseFeedback />
        <RecentActivity />
      </div>

      {/* 12. Trainer Performance Stats & Private Notes Panel */}
      <TrainerStats ptHoursLogged={124} clientRetentionPct={96.4} monthlyEarnings={8450} avgRating={4.9} />
      <NotesPanel />
    </PageContainer>
  );
});

TrainerWorkspaceLayout.displayName = 'TrainerWorkspaceLayout';
