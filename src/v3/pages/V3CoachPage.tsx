import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAIChat } from '../../features/coach/hooks/useAIChat';
import { useCoachData } from '../../hooks/useStrivaApi';
import { AppShell } from '../../design-system/shell/AppShell';
import { CoachLayout } from '../../design-system/coach/CoachLayout';
import { ChatMessage } from '../../design-system/coach/MessageBubble';

export const V3CoachPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userName = user?.name || user?.email?.split('@')[0] || 'Athlete';
  const { messages, sendMessage, isTyping } = useAIChat();
  const { isSending } = useCoachData();

  const formattedMessages: ChatMessage[] = messages.map((m: any, idx: number) => ({
    id: m.id || `msg-${idx}`,
    sender: m.role === 'user' ? 'user' : 'assistant',
    content: m.text || m.content || '',
    timestamp: 'Just now',
    workoutData: m.workoutData,
    mealData: m.mealData,
    recoveryData: m.recoveryData,
    progressData: m.progressData,
  }));

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  return (
    <AppShell
      currentPath="/v3/coach"
      onNavigate={(path) => navigate(path)}
      onLogout={() => signOut?.()}
      user={{
        name: userName,
        email: user?.email || 'athlete@striva.app',
        role: 'PRO Member',
      }}
    >
      <CoachLayout
        userName={userName}
        messages={formattedMessages}
        isLoading={isTyping || isSending}
        onSendMessage={handleSend}
        onActionClick={(action) => {
          if (action === 'load_workout') navigate('/v3/workout');
          else if (action === 'log_meal') navigate('/v3/nutrition');
        }}
      />
    </AppShell>
  );
};
