import { useState, useEffect, useCallback, useRef } from 'react';
import { coachApi } from '../../../api/coachApi';
import { isSubscriptionRequiredError } from '../../../utils/errorUtils';

export interface ConversationItem {
  id: string;
  user_id?: string;
  title: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  status?: 'sending' | 'streaming' | 'completed' | 'error';
  toolActivity?: string | null;
}

const FRIENDLY_TOOL_MAP: Record<string, string> = {
  get_profile: "Checking profile...",
  get_goals: "Reviewing goals...",
  get_today_workout: "Checking today's workout...",
  get_progress: "Analyzing progress...",
  get_nutrition: "Reviewing nutrition log...",
  get_recovery: "Checking recovery status...",
  create_workout: "Creating workout plan...",
  modify_workout: "Updating workout...",
  log_workout: "Logging workout...",
  log_meal: "Logging meal...",
  log_water: "Logging water intake...",
  update_goal: "Updating goal...",
};

export const getFriendlyToolDescription = (toolName: string): string => {
  if (!toolName) return "Working...";
  const key = toolName.toLowerCase().replace(/tool$/i, '');
  return FRIENDLY_TOOL_MAP[key] || FRIENDLY_TOOL_MAP[toolName] || `Executing ${toolName.replace(/_/g, ' ')}...`;
};

export const useTrinetraCoach = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeToolActivity, setActiveToolActivity] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubscriptionRequired, setIsSubscriptionRequired] = useState<boolean>(false);

  const activeConvRef = useRef<string | null>(null);
  activeConvRef.current = activeConversationId;

  // Load user conversation list
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const res: any = await coachApi.listConversations();
      if (res?.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err: any) {
      console.error('[useTrinetraCoach] Failed to load conversations:', err);
      if (isSubscriptionRequiredError(err)) {
        setIsSubscriptionRequired(true);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Select active conversation and load history
  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      setActiveConversationId(conversationId);
      setErrorMessage(null);
      setIsLoadingHistory(true);
      const res: any = await coachApi.history(conversationId);
      if (res?.success && Array.isArray(res.data)) {
        const loadedMessages: ChatMessageItem[] = res.data.map((m: any, index: number) => ({
          id: m.id || `msg-${index}-${Date.now()}`,
          role: m.role || 'assistant',
          content: m.content || '',
          timestamp: m.created_at || new Date().toISOString(),
          status: 'completed',
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useTrinetraCoach] Failed to load history:', err);
      setErrorMessage('Failed to load conversation history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setActiveToolActivity(null);
  }, []);

  // Send message with SSE streaming
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);
    setActiveToolActivity(null);

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    const now = new Date().toISOString();

    const userMsg: ChatMessageItem = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      timestamp: now,
      status: 'completed',
    };

    const assistantMsgPlaceholder: ChatMessageItem = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: now,
      status: 'streaming',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsgPlaceholder]);

    const targetConvId = activeConvRef.current || undefined;

    try {
      let accumulatedTokenContent = '';

      await coachApi.streamChat(
        {
          message: trimmed,
          conversationId: targetConvId,
          stream: true,
        },
        (eventType: string, data: any) => {
          if (eventType === 'token') {
            const tokenStr = typeof data === 'string' ? data : (data?.token || '');
            accumulatedTokenContent += tokenStr;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedTokenContent, status: 'streaming' }
                  : msg
              )
            );
          } else if (eventType === 'tool_call') {
            const toolName = typeof data === 'object' ? data?.tool : String(data);
            const friendlyDesc = getFriendlyToolDescription(toolName);
            setActiveToolActivity(friendlyDesc);

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolActivity: friendlyDesc }
                  : msg
              )
            );
          } else if (eventType === 'tool_result') {
            setActiveToolActivity(null);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolActivity: null }
                  : msg
              )
            );
          } else if (eventType === 'done') {
            const finalMessage = typeof data === 'object' ? data?.message : String(data);
            const convId = data?.conversationId || targetConvId;

            if (convId && !activeConvRef.current) {
              setActiveConversationId(convId);
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: finalMessage || accumulatedTokenContent,
                      status: 'completed',
                      toolActivity: null,
                    }
                  : msg
              )
            );

            setIsGenerating(false);
            setActiveToolActivity(null);
            loadConversations();
          } else if (eventType === 'error') {
            const rawErr = typeof data === 'object' ? data?.message : String(data);
            const category = typeof data === 'object' ? data?.category : '';

            let friendlyErr = 'TRINETRA couldn\'t respond right now. Please try again.';
            if (category === 'RATE_LIMIT_EXCEEDED' || rawErr?.toLowerCase().includes('rate limit')) {
              friendlyErr = 'TRINETRA rate limit reached. Please wait a moment before asking again.';
            } else if (category === 'PROMPT_BLOCKED' || category === 'SAFETY_VIOLATION') {
              friendlyErr = rawErr || 'TRINETRA provides fitness guidance only. High-risk requests are restricted for safety.';
            } else if (rawErr) {
              friendlyErr = rawErr;
            }

            setErrorMessage(friendlyErr);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: msg.content || friendlyErr,
                      status: 'error',
                      toolActivity: null,
                    }
                  : msg
              )
            );
            setIsGenerating(false);
            setActiveToolActivity(null);
          }
        }
      );
    } catch (err: any) {
      console.error('[useTrinetraCoach] Stream error:', err);
      if (isSubscriptionRequiredError(err)) {
        setIsSubscriptionRequired(true);
      }
      const friendlyMsg = isSubscriptionRequiredError(err)
        ? 'Your subscription or trial has expired. An active subscription is required to use TRINETRA Coach.'
        : err?.message?.includes('429')
        ? 'TRINETRA rate limit reached. Please wait a moment before trying again.'
        : 'TRINETRA couldn\'t respond right now. Please check your connection and try again.';

      setErrorMessage(friendlyMsg);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: msg.content || friendlyMsg,
                status: 'error',
                toolActivity: null,
              }
            : msg
        )
      );
      setIsGenerating(false);
      setActiveToolActivity(null);
    }
  }, [isGenerating, loadConversations]);

  // Rename conversation
  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      try {
        const res: any = await coachApi.renameConversation(conversationId, title);
        if (res?.success) {
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
          );
        }
      } catch (err: any) {
        console.error('[useTrinetraCoach] Failed to rename conversation:', err);
      }
    },
    []
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const res: any = await coachApi.deleteConversation(conversationId);
        if (res?.success) {
          setConversations((prev) => prev.filter((c) => c.id !== conversationId));
          if (activeConversationId === conversationId) {
            startNewConversation();
          }
        }
      } catch (err: any) {
        console.error('[useTrinetraCoach] Failed to delete conversation:', err);
      }
    },
    [activeConversationId, startNewConversation]
  );

  return {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingHistory,
    isGenerating,
    activeToolActivity,
    errorMessage,
    sendMessage,
    selectConversation,
    startNewConversation,
    renameConversation,
    deleteConversation,
    refreshConversations: loadConversations,
    isSubscriptionRequired,
  };
};
