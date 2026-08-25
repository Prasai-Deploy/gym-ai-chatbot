import React from 'react';
import { MinimalCoachHero } from './MinimalCoachHero';
import { TrinityRecommendation } from './TrinityRecommendation';
import { TrinityQuickQuestions } from './TrinityQuickQuestions';
import { MinimalChatExperience } from './MinimalChatExperience';
import { TrinityInput } from './TrinityInput';
import { ChatMessage } from './MessageBubble';
import { cn } from '../tokens';

export interface CoachLayoutProps {
  userName?: string;
  messages: ChatMessage[];
  isLoading?: boolean;
  onSendMessage: (text: string) => void;
  onActionClick?: (action: string) => void;
  className?: string;
}

export const CoachLayout: React.FC<CoachLayoutProps> = React.memo(({
  userName = 'Athlete',
  messages,
  isLoading = false,
  onSendMessage,
  onActionClick,
  className,
}) => {
  return (
    <div className={cn('w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 min-h-[calc(100vh-140px)]', className)}>
      {/* 1. Trinity Intelligence Hero */}
      <MinimalCoachHero
        userName={userName}
        insightQuote="You're recovered and ready to train."
        recoveryScore={88}
        sleepScore={92}
        trainingStatus="On track"
      />

      {/* 2. Today's Core Recommendation */}
      <TrinityRecommendation
        workoutName="Train Upper Body"
        workoutNote="Keep intensity high on your main lifts and track your RPE."
        nutritionNote="Aim for 150g protein and hydrate with 2.5L water."
        recoveryNote="Get to bed before 11:30 PM to consolidate recovery."
        onStartWorkout={() => onActionClick?.('load_workout')}
      />

      {/* 3. Contextual Quick Questions */}
      <TrinityQuickQuestions
        onSelectQuestion={(q) => onSendMessage(q)}
      />

      {/* 4. Conversation Stream */}
      <MinimalChatExperience
        messages={messages}
        isLoading={isLoading}
        onActionClick={onActionClick}
      />

      {/* 5. Sticky Bottom Input */}
      <div className="mt-auto">
        <TrinityInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
});

CoachLayout.displayName = 'CoachLayout';
