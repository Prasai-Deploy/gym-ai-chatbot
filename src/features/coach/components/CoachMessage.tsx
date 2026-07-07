import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CoachMessageData } from '../types/coach.types';
import { CoachCard } from './CoachCard';

export const CoachMessage: React.FC<{ message: CoachMessageData }> = ({ message }) => {
  const isUser = message.role === 'user';

  // Custom renderer for markdown code blocks to detect structured Coach Cards
  const renderers = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const isJson = match && match[1] === 'json';
      const content = String(children).replace(/\n$/, '');

      if (!inline && isJson) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && parsed.type && ['WorkoutRecommendation', 'MealRecommendation', 'RecoveryRecommendation', 'HydrationReminder', 'Milestone'].includes(parsed.type)) {
            return (
              <CoachCard 
                type={parsed.type}
                title={parsed.title}
                reason={parsed.reason}
                confidence={parsed.confidence}
                suggestedAction={parsed.suggestedAction}
                data={parsed.data}
                onAccept={() => console.log('Accepted', parsed)}
                onDismiss={() => console.log('Dismissed', parsed)}
              />
            );
          }
        } catch (e) {
          // Fallback to standard code block if JSON parsing fails or isn't a Coach Card
        }
      }

      return !inline ? (
        <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto my-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-gray-100 text-[#1D9E75] px-1.5 py-0.5 rounded text-xs" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-[#1D9E75] text-white rounded-tr-sm' : 'bg-white border-[0.5px] border-gray-200 text-gray-900 rounded-tl-sm'}`}>
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'text-gray-800'} 
          prose-p:leading-snug prose-p:my-1 prose-headings:my-2 prose-ul:my-1`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap m-0">{message.content}</p>
          ) : (
            <ReactMarkdown components={renderers as any}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        
        <div className={`text-[9px] mt-1.5 font-semibold ${isUser ? 'text-[#A0E2CB] text-right' : 'text-gray-400 text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
