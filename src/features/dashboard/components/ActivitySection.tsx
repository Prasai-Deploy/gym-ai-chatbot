import React from 'react';
import { motion } from 'motion/react';
import { Activity, ChevronRight, Dumbbell, Utensils, Droplets, Bot, TrendingUp, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityItem } from '../types/dashboard.types';
import { SectionCard, Card, EmptyState, Button } from '../../../shared';

interface ActivitySectionProps {
  activities: ActivityItem[];
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({ activities }) => {
  return (
    <SectionCard
      padding="none"
      className="bg-transparent border-none shadow-none"
      title={<span className="text-xl font-bold text-text-primary">Recent Activity</span>}
      action={
        <Button variant="ghost" size="sm" className="text-purple-500 hover:text-purple-400">
          View All <ChevronRight size={16} />
        </Button>
      }
    >
      <div className="space-y-4">
        {activities.length > 0 ? activities.map((item, i) => {
          const Icon = {
            workout: Dumbbell,
            diet: Utensils,
            hydration: Droplets,
            chatbot: Bot,
            achievement: TrendingUp,
            progress: Activity,
            account: UserIcon
          }[item.activity_type as string] || Activity;

          const colors = {
            workout: 'text-emerald-500',
            diet: 'text-orange-500',
            hydration: 'text-blue-500',
            chatbot: 'text-purple-500',
            achievement: 'text-yellow-500',
            progress: 'text-zinc-400',
            account: 'text-zinc-500'
          }[item.activity_type as string] || 'text-zinc-500';

          return (
            <motion.div 
              key={item.id || i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card padding="sm" className="flex items-center justify-between group hover:bg-surface-elevated transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-elevated border border-border-subtle group-hover:border-border-focus transition-colors">
                    <Icon size={20} className={colors} />
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-sm sm:text-base">{item.activity_title}</h4>
                    <p className="text-xs text-text-muted leading-relaxed max-w-[200px] sm:max-w-xs truncate">{item.activity_description}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                    {format(new Date(item.created_at), 'hh:mm a')}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500/50 uppercase tracking-tighter">
                    {format(new Date(item.created_at), 'MMM dd')}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        }) : (
          <EmptyState
            icon={<Activity size={24} />}
            title="No activity logged yet."
            description="Start your journey today!"
            className="border-dashed"
          />
        )}
      </div>
    </SectionCard>
  );
};
