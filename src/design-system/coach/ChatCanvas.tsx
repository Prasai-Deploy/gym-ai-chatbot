import React, { useRef, useEffect } from 'react';
import { MessageBubble, ChatMessage } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '../tokens';

export interface ChatCanvasProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onActionClick?: (action: string, payload?: any) => void;
  className?: string;
}

export const ChatCanvas: React.FC<ChatCanvasProps> = React.memo(({
  messages,
  isLoading = false,
  onActionClick,
  className,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={cn('flex-1 w-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-4', className)}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onActionClick={onActionClick} />
      ))}

      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
});

ChatCanvas.displayName = 'ChatCanvas';
