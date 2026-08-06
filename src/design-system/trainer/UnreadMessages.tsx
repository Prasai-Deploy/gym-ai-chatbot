import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { MessageSquare, ArrowRight } from '../icons';

export interface UnreadMsg {
  id: string;
  clientName: string;
  avatarUrl?: string;
  lastMsg: string;
  time: string;
}

export interface UnreadMessagesProps {
  messages?: UnreadMsg[];
  onOpenChat?: (id: string) => void;
  className?: string;
}

export const UnreadMessages: React.FC<UnreadMessagesProps> = React.memo(({
  messages = [
    { id: '1', clientName: 'Sarah Jenkins', lastMsg: 'Coach Elena, should I increase my squat weight by 2.5kg today?', time: '12 mins ago' },
    { id: '2', clientName: 'Samantha Reed', lastMsg: 'I finished my post-workout meal. Felt super energized!', time: '1 hour ago' },
  ],
  onOpenChat,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Unread Client Messages</span>
        </div>
        <Badge variant="primary" size="sm">{messages.length} Unread</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {messages.map((m) => (
          <div key={m.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.clientName} src={m.avatarUrl} size="sm" />
              <div className="flex flex-col gap-0.5 max-w-xs">
                <span className="text-xs font-bold text-white">{m.clientName}</span>
                <p className="text-[11px] text-slate-300 truncate">{m.lastMsg}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onOpenChat?.(m.id)}
            >
              Reply
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

UnreadMessages.displayName = 'UnreadMessages';
