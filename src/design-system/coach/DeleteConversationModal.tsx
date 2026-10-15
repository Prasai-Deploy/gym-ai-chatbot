import React from 'react';
import { Button } from '../components/Button';
import { Trash2, AlertTriangle, X } from '../icons';
import { cn } from '../tokens';

export interface DeleteConversationModalProps {
  isOpen: boolean;
  conversationTitle?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConversationModal: React.FC<DeleteConversationModalProps> = ({
  isOpen,
  conversationTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#0F131E] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-bold text-white font-sans">Delete Conversation?</h3>
            <p className="text-xs text-slate-400 font-sans">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {conversationTitle && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300 font-semibold truncate font-sans">
            "{conversationTitle}"
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
            className="bg-red-600 hover:bg-red-500 text-white border-none gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
