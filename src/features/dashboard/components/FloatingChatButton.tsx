import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CoachPanel } from '../../coach/components/CoachPanel';

interface FloatingChatButtonProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  // Legacy props (will be removed when DashboardPage is fully refactored)
  messages?: any[];
  input?: string;
  setInput?: (input: string) => void;
  isTyping?: boolean;
  isListening?: boolean;
  toggleListening?: () => void;
  handleSendMessage?: (explicitMessage?: string | React.MouseEvent | React.KeyboardEvent) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  chatOpen,
  setChatOpen,
}) => {
  const isMobile = window.innerWidth < 768;

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className={`fixed z-50 ${isMobile ? 'inset-0' : 'bottom-24 right-8'}`}
        >
          <CoachPanel 
            isOpen={chatOpen} 
            onClose={() => setChatOpen(false)} 
            isMobile={isMobile}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

