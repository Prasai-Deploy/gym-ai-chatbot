import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, User } from '../icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export interface SubscriptionRequiredProps {
  featureName?: string;
  className?: string;
}

export const SubscriptionRequired: React.FC<SubscriptionRequiredProps> = ({
  featureName,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`w-full max-w-2xl mx-auto py-12 px-4 sm:px-6 flex flex-col items-center text-center animate-fade-in ${className}`}
    >
      <Card
        variant="glass"
        className="w-full p-8 sm:p-12 flex flex-col items-center gap-6 border-slate-800/80 bg-[#0C0E14]/90 backdrop-blur-xl rounded-3xl shadow-2xl"
      >
        {/* Subtle Calm Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>

        {/* Messaging */}
        <div className="space-y-3 max-w-md">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Your STRIVA trial has ended
          </h2>
          <p className="text-sm text-slate-400 font-sans leading-relaxed">
            {featureName ? (
              <>
                Access to <span className="text-slate-200 font-medium">{featureName}</span> requires an active subscription. Start your STRIVA subscription to continue using Coach, Workout, Nutrition, and Progress.
              </>
            ) : (
              'Start your STRIVA subscription to continue using Coach, Workout, Nutrition, and Progress.'
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/pricing')}
            className="w-full sm:w-auto gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            <span>View plans</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/v3/profile')}
            className="w-full sm:w-auto gap-2 border-slate-800 hover:bg-slate-800/50 text-slate-300"
          >
            <User className="w-4 h-4" aria-hidden="true" />
            <span>Go to Profile</span>
          </Button>
        </div>

        {/* Quiet assurance note */}
        <p className="text-[11px] text-slate-500 font-sans">
          Your profile, workout history, and billing records remain fully accessible in your account.
        </p>
      </Card>
    </div>
  );
};
