export type CoachState = 'idle' | 'thinking' | 'generating' | 'calling_tools' | 'error';

export interface CoachMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: CoachState;
  metadata?: {
    toolName?: string;
    action?: string;
  };
}

export interface CoachCardProps {
  type: 'WorkoutRecommendation' | 'MealRecommendation' | 'RecoveryRecommendation' | 'HydrationReminder' | 'Milestone';
  title: string;
  reason: string;
  confidence: 'High' | 'Medium' | 'Low';
  suggestedAction: string;
  data?: any;
  onAccept?: () => void;
  onDismiss?: () => void;
}
