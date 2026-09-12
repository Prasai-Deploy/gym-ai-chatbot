import React from 'react';
import { cn } from '../tokens';

export interface TrinityQuickQuestionsProps {
  questions?: string[];
  onSelectQuestion: (question: string) => void;
  className?: string;
}

export const TrinityQuickQuestions: React.FC<TrinityQuickQuestionsProps> = React.memo(({
  questions = [
    'My workout plan',
    'My nutrition & protein',
    'My recovery readiness',
    'My strength progress',
    'What should I improve today?',
    'Explain my health score',
  ],
  onSelectQuestion,
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col gap-2.5 select-none', className)}>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] px-1 font-sans">
        Quick Questions
      </span>

      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="px-3.5 py-2 rounded-xl bg-[#11141D] hover:bg-[#181C28] border border-white/[0.07] hover:border-indigo-500/30 text-xs font-medium text-slate-300 hover:text-white transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});

TrinityQuickQuestions.displayName = 'TrinityQuickQuestions';
