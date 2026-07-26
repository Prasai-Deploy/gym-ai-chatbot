import React from 'react';
import { CoachCardProps } from '../types/coach.types';
import { Check, X, HelpCircle, Save } from 'lucide-react';

export const CoachCard: React.FC<CoachCardProps> = ({
  type, title, reason, confidence, suggestedAction, onAccept, onDismiss
}) => {
  const getIconAndColor = () => {
    switch (type) {
      case 'WorkoutRecommendation': return { icon: '🏋️', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'MealRecommendation': return { icon: '🥗', color: 'bg-green-50 text-green-800 border-green-200' };
      case 'RecoveryRecommendation': return { icon: '🛌', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'HydrationReminder': return { icon: '💧', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'Milestone': return { icon: '🏆', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
      default: return { icon: '💡', color: 'bg-gray-50 text-gray-800 border-gray-200' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div className={`rounded-xl border p-4 my-2 shadow-sm ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h4 className="font-bold text-sm m-0">{title}</h4>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${confidence === 'High' ? 'bg-white/50' : 'bg-white/30'}`}>
          {confidence} Confidence
        </span>
      </div>
      
      <div className="text-xs space-y-2 mb-4 opacity-90">
        <p><strong>Reason:</strong> {reason}</p>
        <p><strong>Action:</strong> {suggestedAction}</p>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-black/10">
        <button 
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-1 bg-white/80 hover:bg-white text-xs font-bold py-1.5 rounded-md transition-colors"
        >
          <Check size={14} /> Accept
        </button>
        <button 
          onClick={onDismiss}
          className="flex items-center justify-center gap-1 bg-black/5 hover:bg-black/10 text-xs font-bold py-1.5 px-3 rounded-md transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
        <button 
          className="flex items-center justify-center gap-1 bg-black/5 hover:bg-black/10 text-xs font-bold py-1.5 px-3 rounded-md transition-colors"
          title="Ask Why"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
};
