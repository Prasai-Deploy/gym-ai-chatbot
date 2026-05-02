/**
 * services/gamification.service.ts
 * Streak tracking + badge awarding logic.
 */
import pool from "../db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Badge catalogue
// ─────────────────────────────────────────────────────────────────────────────
export const BADGE_CATALOGUE = [
  { key: "first_chat",      name: "First Steps",       icon: "💬", description: "Sent your first message to the AI coach" },
  { key: "first_workout",   name: "Gym Rookie",         icon: "🏋️", description: "Logged your very first workout" },
  { key: "streak_3",        name: "Hat-Trick",          icon: "🔥", description: "Maintained a 3-day activity streak" },
  { key: "streak_7",        name: "Week Warrior",       icon: "⚡", description: "Maintained a 7-day activity streak" },
  { key: "streak_30",       name: "Iron Will",          icon: "💎", description: "Maintained a 30-day activity streak" },
  { key: "workout_10",      name: "Consistent",         icon: "💪", description: "Logged 10 total workouts" },
  { key: "workout_50",      name: "Grinder",            icon: "🏆", description: "Logged 50 total workouts" },
  { key: "nutrition_week",  name: "Fuel Master",        icon: "🥗", description: "Logged nutrition for 7 consecutive days" },
  { key: "goal_setter",     name: "Goal Setter",        icon: "🎯", description: "Completed the onboarding flow" },
  { key: "early_bird",      name: "Early Bird",         icon: "🌅", description: "Logged a workout before 8 AM" },
];

async function dbGet(sql: string, params: any[] = []): Promise<any> {
  const [rows] = await pool.execute(sql, params);
  return (rows as any[])[0] ?? null;
}
async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Streak logic
// ─────────────────────────────────────────────────────────────────────────────
export async function touchStreak(userId: number): Promise<{
  current_streak: number;
  longest_streak: number;
  milestone: number | null;
}> {
  const todayStr = new Date().toISOString().split("T")[0];

  const row = await dbGet(
    "SELECT * FROM user_streaks WHERE user_id = ?",
    [userId]
  );

  if (!row) {
    // First time — create with streak = 1
    await pool.execute(
      `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
       VALUES (?, 1, 1, ?)`,
      [userId, todayStr]
    );
    return { current_streak: 1, longest_streak: 1, milestone: 1 };
  }

  const lastDate = row.last_active_date
    ? new Date(row.last_active_date).toISOString().split("T")[0]
    : null;

  if (lastDate === todayStr) {
    // Already touched today — just return
    return {
      current_streak: row.current_streak,
      longest_streak: row.longest_streak,
      milestone: null,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak: number;
  if (lastDate === yesterdayStr) {
    newStreak = row.current_streak + 1;
  } else {
    newStreak = 1; // Missed a day — reset
  }

  const newLongest = Math.max(newStreak, row.longest_streak ?? 0);

  await pool.execute(
    `UPDATE user_streaks
     SET current_streak = ?, longest_streak = ?, last_active_date = ?
     WHERE user_id = ?`,
    [newStreak, newLongest, todayStr, userId]
  );

  // Determine milestone
  let milestone: number | null = null;
  const prev = row.current_streak;
  if (newStreak === 3 && prev < 3) milestone = 3;
  else if (newStreak === 7 && prev < 7) milestone = 7;
  else if (newStreak === 30 && prev < 30) milestone = 30;

  return { current_streak: newStreak, longest_streak: newLongest, milestone };
}

export async function getStreak(userId: number): Promise<{
  current_streak: number;
  longest_streak: number;
}> {
  const row = await dbGet(
    "SELECT current_streak, longest_streak FROM user_streaks WHERE user_id = ?",
    [userId]
  );
  return { current_streak: row?.current_streak ?? 0, longest_streak: row?.longest_streak ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge logic
// ─────────────────────────────────────────────────────────────────────────────
export async function awardBadge(
  userId: number,
  badgeKey: string
): Promise<boolean> {
  // Idempotent — ignore if already earned
  try {
    await pool.execute(
      `INSERT IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)`,
      [userId, badgeKey]
    );
    const result = await dbGet(
      `SELECT id FROM user_badges WHERE user_id = ? AND badge_key = ? AND earned_at >= NOW() - INTERVAL 3 SECOND`,
      [userId, badgeKey]
    );
    return !!result;
  } catch {
    return false;
  }
}

export async function getUserBadges(userId: number): Promise<{ badge_key: string; earned_at: string }[]> {
  return dbAll(
    "SELECT badge_key, DATE_FORMAT(earned_at, '%b %d, %Y') AS earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at ASC",
    [userId]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Check and award badge conditions
// Returns list of newly awarded badge keys
// ─────────────────────────────────────────────────────────────────────────────
export async function checkAndAwardBadges(
  userId: number,
  triggers: {
    firstChat?: boolean;
    firstWorkout?: boolean;
    streak?: number;
    workoutCount?: number;
    nutritionConsecutiveDays?: number;
    goalSetter?: boolean;
    earlyBird?: boolean;
  }
): Promise<string[]> {
  const newlyAwarded: string[] = [];

  const tryAward = async (key: string) => {
    const awarded = await awardBadge(userId, key);
    if (awarded) newlyAwarded.push(key);
  };

  if (triggers.firstChat) await tryAward("first_chat");
  if (triggers.firstWorkout) await tryAward("first_workout");
  if (triggers.goalSetter) await tryAward("goal_setter");
  if (triggers.earlyBird) await tryAward("early_bird");

  if (triggers.streak) {
    if (triggers.streak >= 3) await tryAward("streak_3");
    if (triggers.streak >= 7) await tryAward("streak_7");
    if (triggers.streak >= 30) await tryAward("streak_30");
  }

  if (triggers.workoutCount) {
    if (triggers.workoutCount >= 10) await tryAward("workout_10");
    if (triggers.workoutCount >= 50) await tryAward("workout_50");
  }

  if (triggers.nutritionConsecutiveDays && triggers.nutritionConsecutiveDays >= 7) {
    await tryAward("nutrition_week");
  }

  return newlyAwarded;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────────────────────────────────────
export async function getStreakLeaderboard(): Promise<{
  rank: number;
  user_id: number;
  name: string;
  avatar: string;
  current_streak: number;
}[]> {
  const rows = await dbAll(
    `SELECT us.user_id, u.name, u.avatar, us.current_streak
     FROM user_streaks us
     JOIN users u ON u.id = us.user_id
     ORDER BY us.current_streak DESC
     LIMIT 5`
  );
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}
