import React from 'react';
import { Plus } from 'lucide-react';
import { WorkoutTracker } from '../../../components/WorkoutTracker';

interface WorkoutSectionProps {
  onLogActivity: () => void;
}

export const WorkoutSection: React.FC<WorkoutSectionProps> = ({ onLogActivity }) => {
  return (
    <>
      {/* Track Workout Section */}
      <section className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Track Workout & Macros</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Log your recent activity to update your stats and progress chart.</p>
        </div>
        <button
          onClick={onLogActivity}
          className="flex items-center gap-2 btn-accent px-6 py-3 rounded-[24px] whitespace-nowrap"
        >
          <Plus size={20} /> <span className="md:inline">Log Activity</span>
        </button>
      </section>

      {/* --- START FEATURE: WORKOUT TRACKER --- */}
      <div id="workout-section">
        <WorkoutTracker />
      </div>
      {/* --- END FEATURE: WORKOUT TRACKER --- */}
    </>
  );
};
