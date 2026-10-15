import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContainer } from '../../design-system/shell/PageContainer';
import { useTrinetraCoach } from '../../features/coach/hooks/useTrinetraCoach';
import { useEntitlement } from '../../hooks/useEntitlement';
import { SubscriptionRequired } from '../../design-system/billing/SubscriptionRequired';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import {
  TrinetraCoachLayout,
  TrinetraConversationList,
  TrinetraEmptyState,
  TrinetraMessageList,
  TrinetraComposer,
  DeleteConversationModal,
} from '../../design-system/coach';
import { AlertCircle, RefreshCw, Clock } from '../../design-system/icons';

export const V3CoachPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess, state, daysRemaining, loading: isEntitlementLoading } = useEntitlement();
  const {
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
    isSubscriptionRequired,
  } = useTrinetraCoach();

  // Handle incoming initial prompt from cross-page navigation
  const initialPromptProcessed = useRef(false);
  useEffect(() => {
    const prompt = (location.state as any)?.initialPrompt;
    if (prompt && !initialPromptProcessed.current && !isLoadingConversations && !isGenerating) {
      initialPromptProcessed.current = true;
      sendMessage(prompt);
      // Clean up location state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, isLoadingConversations, isGenerating, sendMessage, navigate, location.pathname]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // If entitlement is loading, show loading skeleton rather than flashing locked UI
  if (isEntitlementLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-[#07090E]">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <LoadingSkeleton height="80px" variant="card" />
          <LoadingSkeleton height="420px" variant="card" />
        </div>
      </div>
    );
  }

  // If user has no access (EXPIRED or post-period CANCELLED) or server returned 403 SUBSCRIPTION_REQUIRED:
  if ((!hasAccess && (state === 'EXPIRED' || state === 'CANCELLED')) || isSubscriptionRequired) {
    return (
      <div className="w-full h-full p-6 flex items-center justify-center bg-[#07090E]">
        <SubscriptionRequired featureName="TRINETRA AI Coach" />
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeTitle = activeConversation?.title || (messages.length > 0 ? messages[0].content.substring(0, 30) : 'New Guidance Session');

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteConversation(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      <TrinetraCoachLayout
        activeTitle={activeTitle}
        onStartNewConversation={startNewConversation}
        sidebar={
          <TrinetraConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onStartNewConversation={startNewConversation}
            onRenameConversation={renameConversation}
            onRequestDeleteConversation={(id, title) => setDeleteTarget({ id, title })}
            isLoading={isLoadingConversations}
          />
        }
        composer={
          <TrinetraComposer
            onSendMessage={sendMessage}
            isGenerating={isGenerating}
          />
        }
      >
        {/* Subtle Trial Approaching Expiration Reminder (<= 3 days) */}
        {state === 'TRIAL' && hasAccess && daysRemaining <= 3 && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Your STRIVA trial ends in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/v3/billing')}
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 shrink-0"
            >
              Continue with STRIVA
            </button>
          </div>
        )}

        {/* Grace Period Warning */}
        {state === 'GRACE_PERIOD' && hasAccess && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Your payment needs attention. Your STRIVA access remains active during this grace period.</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/v3/billing')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold transition-colors shrink-0"
            >
              Update billing
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => sendMessage(messages[messages.length - 2]?.content || 'Hello')}
              className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Main Content: History Loading, Empty State, or Message List */}
        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs font-medium">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Loading conversation history...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
            <TrinetraEmptyState onSelectPrompt={(promptText) => sendMessage(promptText)} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TrinetraMessageList
              messages={messages}
              isGenerating={isGenerating}
              activeToolActivity={activeToolActivity}
            />
          </div>
        )}
      </TrinetraCoachLayout>

      {/* Delete Confirmation Modal */}
      <DeleteConversationModal
        isOpen={!!deleteTarget}
        conversationTitle={deleteTarget?.title}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
