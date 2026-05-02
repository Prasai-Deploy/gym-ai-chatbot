/**
 * src/hooks/useGamification.ts
 * Central hook — manages streak, badges, toast queue, and badge unlock overlay.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface GamificationState {
  currentStreak: number;
  longestStreak: number;
  toasts: StreakToast[];
  pendingBadges: BadgeUnlock[];
  dismissToast: (id: string) => void;
  dismissBadge: () => void;
  triggerBadge: (trigger: string) => Promise<void>;
}

export interface StreakToast {
  id: string;
  message: string;
  milestone: number;
}

export interface BadgeUnlock {
  key: string;
  name: string;
  icon: string;
  description: string;
}

const BADGE_CATALOGUE: Record<string, { name: string; icon: string; description: string }> = {
  first_chat:      { name: "First Steps",    icon: "💬", description: "Sent your first message to the AI coach" },
  first_workout:   { name: "Gym Rookie",     icon: "🏋️", description: "Logged your very first workout" },
  streak_3:        { name: "Hat-Trick",      icon: "🔥", description: "Maintained a 3-day activity streak" },
  streak_7:        { name: "Week Warrior",   icon: "⚡", description: "Maintained a 7-day activity streak" },
  streak_30:       { name: "Iron Will",      icon: "💎", description: "Maintained a 30-day activity streak" },
  workout_10:      { name: "Consistent",     icon: "💪", description: "Logged 10 total workouts" },
  workout_50:      { name: "Grinder",        icon: "🏆", description: "Logged 50 total workouts" },
  nutrition_week:  { name: "Fuel Master",    icon: "🥗", description: "Logged nutrition for 7 consecutive days" },
  goal_setter:     { name: "Goal Setter",    icon: "🎯", description: "Completed the onboarding flow" },
  early_bird:      { name: "Early Bird",     icon: "🌅", description: "Logged a workout before 8 AM" },
};

const MILESTONE_MESSAGES: Record<number, string> = {
  3:  "3-day streak! Keep going! 🔥",
  7:  "One week strong! ⚡",
  30: "30 days — you're unstoppable! 💎",
};

export function useGamification(isLoggedIn: boolean): GamificationState {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [toasts, setToasts] = useState<StreakToast[]>([]);
  const [pendingBadges, setPendingBadges] = useState<BadgeUnlock[]>([]);
  const touchedRef = useRef(false);

  const processBadgeKeys = useCallback((keys: string[]) => {
    if (!keys.length) return;
    const unlocks = keys
      .map((k) => {
        const meta = BADGE_CATALOGUE[k];
        return meta ? { key: k, ...meta } : null;
      })
      .filter(Boolean) as BadgeUnlock[];
    if (unlocks.length) {
      setPendingBadges((prev) => [...prev, ...unlocks]);
    }
  }, []);

  // Touch streak on login
  useEffect(() => {
    if (!isLoggedIn || touchedRef.current) return;
    touchedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/gamification/touch', { method: 'POST' });
        if (!res.ok) return;
        const data = await res.json();

        setCurrentStreak(data.current_streak ?? 0);
        setLongestStreak(data.longest_streak ?? 0);

        if (data.milestone && MILESTONE_MESSAGES[data.milestone]) {
          setToasts((prev) => [
            ...prev,
            { id: Date.now().toString(), message: MILESTONE_MESSAGES[data.milestone], milestone: data.milestone },
          ]);
        }

        if (data.newBadges?.length) {
          processBadgeKeys(data.newBadges);
        }
      } catch (e) {
        console.error('Gamification touch failed:', e);
      }
    })();
  }, [isLoggedIn, processBadgeKeys]);

  const triggerBadge = useCallback(async (trigger: string) => {
    try {
      const res = await fetch('/api/gamification/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.newBadges?.length) {
        processBadgeKeys(data.newBadges);
      }
    } catch (e) {
      console.error('Badge award failed:', e);
    }
  }, [processBadgeKeys]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissBadge = useCallback(() => {
    setPendingBadges((prev) => prev.slice(1));
  }, []);

  return { currentStreak, longestStreak, toasts, pendingBadges, dismissToast, dismissBadge, triggerBadge };
}
