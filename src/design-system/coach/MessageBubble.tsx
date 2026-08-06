import React from 'react';
import { Avatar } from '../components/Avatar';
import { WorkoutResponseCard, WorkoutResponseCardProps } from './WorkoutResponseCard';
import { MealResponseCard, MealResponseCardProps } from './MealResponseCard';
import { RecoveryResponseCard, RecoveryResponseCardProps } from './RecoveryResponseCard';
import { ProgressResponseCard, ProgressResponseCardProps } from './ProgressResponseCard';
import { cn } from '../tokens';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  workoutData?: WorkoutResponseCardProps;
  mealData?: MealResponseCardProps;
  recoveryData?: RecoveryResponseCardProps;
  progressData?: ProgressResponseCardProps;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  onActionClick?: (action: string, payload?: any) => void;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  onActionClick,
  className,
}) => {
  const isUser = message.sender === 'user';

  return (
    <div className={cn('flex items-start gap-3 w-full my-2', isUser ? 'flex-row-reverse' : 'flex-row', className)}>
      <Avatar
        isBot={!isUser}
        name={isUser ? 'Member' : 'Trinity AI'}
        size="sm"
        className="shrink-0 mt-1"
      />

      <div className={cn('flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {isUser ? 'You' : 'Trinity AI Coach'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">{message.timestamp}</span>
        </div>

        <div
          className={cn(
            'p-4 rounded-3xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text shadow-sm',
            isUser
              ? 'bg-orange-500 text-white rounded-tr-sm shadow-orange-500/20 font-medium'
              : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-sm'
          )}
        >
          {message.content}
        </div>

        {/* Rich Response Cards */}
        {message.workoutData && (
          <WorkoutResponseCard
            {...message.workoutData}
            onLoadWorkout={() => onActionClick?.('load_workout', message.workoutData)}
          />
        )}

        {message.mealData && (
          <MealResponseCard
            {...message.mealData}
            onLogMeal={() => onActionClick?.('log_meal', message.mealData)}
          />
        )}

        {message.recoveryData && (
          <RecoveryResponseCard {...message.recoveryData} />
        )}

        {message.progressData && (
          <ProgressResponseCard {...message.progressData} />
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
