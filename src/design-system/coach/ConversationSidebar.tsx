import React from 'react';
import { Drawer } from '../components/Drawer';
import { Button } from '../components/Button';
import { ConversationHistory, SessionItem } from './ConversationHistory';
import { Plus } from '../icons';

export interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionItem[];
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = React.memo(({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onNewSession,
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Coaching History" side="left">
      <div className="flex flex-col gap-4">
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            onNewSession();
            onClose();
          }}
          className="w-full"
        >
          New Coaching Session
        </Button>

        <ConversationHistory
          sessions={sessions}
          onSelectSession={(id) => {
            onSelectSession(id);
            onClose();
          }}
        />
      </div>
    </Drawer>
  );
});

ConversationSidebar.displayName = 'ConversationSidebar';
