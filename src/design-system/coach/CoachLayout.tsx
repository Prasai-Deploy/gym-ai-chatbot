import React, { useState } from 'react';
import { CoachHome } from './CoachHome';
import { ChatCanvas } from './ChatCanvas';
import { CoachInput } from './CoachInput';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessage } from './MessageBubble';
import { SessionItem } from './ConversationHistory';
import { PageContainer } from '../shell/PageContainer';
import { IconButton } from '../components/IconButton';
import { History, Plus } from '../icons';

export interface CoachLayoutProps {
  userName?: string;
  messages: ChatMessage[];
  isLoading?: boolean;
  onSendMessage: (text: string) => void;
  onActionClick?: (action: string, payload?: any) => void;
  onClearChat?: () => void;
  sessions?: SessionItem[];
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
  className?: string;
}

export const CoachLayout: React.FC<CoachLayoutProps> = React.memo(({
  userName = 'Alex',
  messages,
  isLoading = false,
  onSendMessage,
  onActionClick,
  onClearChat,
  sessions = [
    { id: '1', title: 'Hypertrophy Chest & Triceps Cycle', category: 'Workout', time: 'Today', active: true },
    { id: '2', title: 'Post-Workout Macro & Hydration Target', category: 'Diet', time: 'Yesterday' },
    { id: '3', title: 'CNS Deload Protocol & Mobility', category: 'Recovery', time: '3d ago' },
  ],
  onSelectSession = (id) => console.log('Selected session:', id),
  onNewSession = () => console.log('New session'),
  className,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <PageContainer maxWidth="lg" className={`flex flex-col h-[calc(100vh-5rem)] p-2 sm:p-4 gap-3 ${className}`}>
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <IconButton
            icon={<History className="w-4 h-4 text-indigo-400" />}
            aria-label="View history"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
          />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Personal Coach</span>
        </div>

        <IconButton
          icon={<Plus className="w-4 h-4 text-orange-400" />}
          aria-label="New Session"
          size="sm"
          onClick={onNewSession}
        />
      </div>

      {/* Main Canvas / Home State */}
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <CoachHome userName={userName} onSelectSuggestion={onSendMessage} />
        </div>
      ) : (
        <ChatCanvas
          messages={messages}
          isLoading={isLoading}
          onActionClick={onActionClick}
        />
      )}

      {/* Prompt Input */}
      <CoachInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        onClearChat={messages.length > 0 ? onClearChat : undefined}
      />

      {/* Past Conversations Sidebar Drawer */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        onSelectSession={onSelectSession}
        onNewSession={onNewSession}
      />
    </PageContainer>
  );
});

CoachLayout.displayName = 'CoachLayout';
