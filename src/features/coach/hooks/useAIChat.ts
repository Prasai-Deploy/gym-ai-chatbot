import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../../../api/aiApi';
import { CoachMessageData, CoachState } from '../types/coach.types';

export const useAIChat = () => {
  const [messages, setMessages] = useState<CoachMessageData[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [coachState, setCoachState] = useState<CoachState>('idle');

  const chatMutation = useMutation({
    mutationFn: async (text: string) => {
      setCoachState('thinking');
      return aiApi.chat(text, conversationId);
    },
    onSuccess: (res) => {
      if (res.data.conversationId) {
        setConversationId(res.data.conversationId);
      }
      const assistantMessage: CoachMessageData = {
        id: Date.now().toString(),
        role: 'assistant',
        content: res.data.message,
        timestamp: new Date().toISOString(),
        status: res.data.status === 'tools_executed' ? 'idle' : 'idle'
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setCoachState('idle');
    },
    onError: (error) => {
      console.error("Coach Chat Error:", error);
      setCoachState('error');
      const errorMessage: CoachMessageData = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "**Error connecting to Coach.** Please try again.",
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  });

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMessage: CoachMessageData = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(text);
  }, [chatMutation]);

  return {
    messages,
    sendMessage,
    coachState,
    isTyping: chatMutation.isPending
  };
};
