import React, { useState } from 'react';
import { MemberHero } from './MemberHero';
import { MemberStats } from './MemberStats';
import { MemberSearch } from './MemberSearch';
import { MemberFilters } from './MemberFilters';
import { Segments } from './Segments';
import { BulkActions } from './BulkActions';
import { MemberTable } from './MemberTable';
import { MemberRecord } from './MemberCard';
import { MemberProfileDrawer } from './MemberProfileDrawer';
import { AddMemberModal } from './AddMemberModal';
import { AIInsights } from './AIInsights';
import { PageContainer } from '../shell/PageContainer';
import { cn } from '../tokens';

export interface MemberManagementLayoutProps {
  className?: string;
}

export const MemberManagementLayout: React.FC<MemberManagementLayoutProps> = React.memo(({
  className,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all-segment');

  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const mockMembers: MemberRecord[] = [
    { id: '1', name: 'Marcus Vance', email: 'marcus@example.com', planName: 'VIP Unlimited', status: 'Active', healthScore: 94, assignedTrainer: 'Coach Elena', joinDate: '2024-01-15', expiryDate: '2025-01-15', checkinsThisMonth: 16 },
    { id: '2', name: 'Sarah Jenkins', email: 'sarah@example.com', planName: 'Gold Pro Plan', status: 'Due Soon', healthScore: 78, assignedTrainer: 'Coach Elena', joinDate: '2024-02-10', expiryDate: '2024-08-10', checkinsThisMonth: 12 },
    { id: '3', name: 'David Miller', email: 'david@example.com', planName: 'Standard Pass', status: 'Active', healthScore: 91, assignedTrainer: 'Coach Brandon', joinDate: '2024-03-01', expiryDate: '2024-09-01', checkinsThisMonth: 18 },
    { id: '4', name: 'Samantha Reed', email: 'samantha@example.com', planName: 'Gold Pro Plan', status: 'Active', healthScore: 88, assignedTrainer: 'Coach Maya', joinDate: '2024-04-12', expiryDate: '2024-10-12', checkinsThisMonth: 14 },
    { id: '5', name: 'Lucas Torrez', email: 'lucas@example.com', planName: 'VIP Unlimited', status: 'Expired', healthScore: 62, assignedTrainer: 'Coach Brandon', joinDate: '2023-08-01', expiryDate: '2024-08-01', checkinsThisMonth: 4 },
  ];

  const handleSelectMember = (id: string) => {
    const found = mockMembers.find((m) => m.id === id);
    if (found) {
      setSelectedMember(found);
      setIsDrawerOpen(true);
    }
  };

  return (
    <PageContainer maxWidth="xl" className={cn('gap-6', className)}>
      {/* 1. Hero Banner */}
      <MemberHero totalMembers={1240} avgHealthScore={88} churnRiskCount={14} />

      {/* 2. Bulk Action Bar */}
      <BulkActions onAddMember={() => setIsAddModalOpen(true)} />

      {/* 3. Customer Success KPI Strip */}
      <MemberStats totalMembers={1240} activePct={95.1} avgTenureMo={14.2} churnRiskCount={14} />

      {/* 4. AI Retention Advisor */}
      <AIInsights churnAlertsCount={14} />

      {/* 5. Search & Filters Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <MemberSearch value={searchVal} onChange={setSearchVal} className="w-full sm:max-w-md" />
        <MemberFilters activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>

      {/* 6. Cohort Segments */}
      <Segments selectedSegment={selectedSegment} onSelectSegment={setSelectedSegment} />

      {/* 7. Interactive Member Table */}
      <MemberTable members={mockMembers} onSelectMember={handleSelectMember} />

      {/* 8. Slide-over Profile Inspection Drawer */}
      <MemberProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        member={selectedMember}
      />

      {/* 9. Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMember={(data) => console.log('Add member:', data)}
      />
    </PageContainer>
  );
});

MemberManagementLayout.displayName = 'MemberManagementLayout';
