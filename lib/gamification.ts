import "server-only";

import { demoStore, demoId } from "@/lib/demo/store";
import { levelFromXp, XP_REWARDS, type XpEvent } from "@/lib/plans";
import type { Achievement } from "@/lib/types";
import type { SessionContext } from "@/lib/session";

/**
 * Lightweight, premium-feeling gamification: XP, levels, streaks and badges.
 * Nothing here is required for the core product to work — failures are logged
 * and swallowed so a badge can never break a study session.
 */

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  /** Evaluated against the user's current stats. */
  test: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  questionsAsked: number;
  tutorialsCompleted: number;
  tutorialsCreated: number;
  quizzesCompleted: number;
  bestQuizPercentage: number;
  perfectQuizzes: number;
  streak: number;
  longestStreak: number;
  cardsKnown: number;
  topicsMastered: number;
  xp: number;
  studyMinutes: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: "first_steps",
    title: "First Steps",
    description: "Ask the AI tutor your first question.",
    icon: "sparkles",
    xp: 20,
    test: (s) => s.questionsAsked >= 1,
  },
  {
    code: "curious_mind",
    title: "Curious Mind",
    description: "Ask 25 questions to the AI tutor.",
    icon: "brain",
    xp: 60,
    test: (s) => s.questionsAsked >= 25,
  },
  {
    code: "streak_3",
    title: "Three in a Row",
    description: "Study 3 days in a row.",
    icon: "flame",
    xp: 30,
    test: (s) => s.streak >= 3,
  },
  {
    code: "streak_7",
    title: "Week Warrior",
    description: "Keep a 7-day study streak.",
    icon: "flame",
    xp: 80,
    test: (s) => s.streak >= 7 || s.longestStreak >= 7,
  },
  {
    code: "streak_30",
    title: "Unstoppable",
    description: "Keep a 30-day study streak.",
    icon: "trophy",
    xp: 250,
    test: (s) => s.longestStreak >= 30,
  },
  {
    code: "first_tutorial",
    title: "Deep Dive",
    description: "Complete your first AI tutorial.",
    icon: "book-open",
    xp: 40,
    test: (s) => s.tutorialsCompleted >= 1,
  },
  {
    code: "tutorial_five",
    title: "Self-Taught",
    description: "Complete 5 AI tutorials.",
    icon: "library",
    xp: 90,
    test: (s) => s.tutorialsCompleted >= 5,
  },
  {
    code: "quiz_rookie",
    title: "Quiz Rookie",
    description: "Finish your first AI quiz.",
    icon: "clipboard-check",
    xp: 30,
    test: (s) => s.quizzesCompleted >= 1,
  },
  {
    code: "quiz_ace",
    title: "Perfect Score",
    description: "Score 100% in an AI quiz.",
    icon: "target",
    xp: 70,
    test: (s) => s.perfectQuizzes >= 1,
  },
  {
    code: "quiz_ten",
    title: "Test Ready",
    description: "Finish 10 AI quizzes.",
    icon: "clipboard-list",
    xp: 120,
    test: (s) => s.quizzesCompleted >= 10,
  },
  {
    code: "high_scorer",
    title: "High Scorer",
    description: "Score above 85% in any quiz.",
    icon: "medal",
    xp: 80,
    test: (s) => s.bestQuizPercentage >= 85,
  },
  {
    code: "card_sharp",
    title: "Card Sharp",
    description: "Mark 25 flashcards as known.",
    icon: "layers",
    xp: 60,
    test: (s) => s.cardsKnown >= 25,
  },
  {
    code: "mastery_5",
    title: "Topic Master",
    description: "Master 5 topics.",
    icon: "graduation-cap",
    xp: 100,
    test: (s) => s.topicsMastered >= 5,
  },
  {
    code: "deep_work",
    title: "Deep Work",
    description: "Study for 10 hours on Starvia.",
    icon: "clock",
    xp: 120,
    test: (s) => s.studyMinutes >= 600,
  },
  {
    code: "level_5",
    title: "Level 5",
    description: "Reach level 5.",
    icon: "star",
    xp: 150,
    test: (s) => levelFromXp(s.xp).level >= 5,
  },
];

/**
 * Award XP for an action. Returns the new XP/level so the UI can show a toast.
 */
export async function awardXp(
  context: SessionContext,
  event: XpEvent,
  overrideAmount?: number,
): Promise<{ xp: number; level: number; leveledUp: boolean; gained: number } | null> {
  if (!context.user) return null;
  const gained = overrideAmount ?? XP_REWARDS[event] ?? 0;
  if (gained <= 0) return null;

  const currentXp = context.profile?.xp ?? 0;
  const nextXp = currentXp + gained;
  const before = levelFromXp(currentXp).level;
  const after = levelFromXp(nextXp).level;

  if (context.demo) {
    const store = demoStore();
    store.profile.xp = nextXp;
    store.profile.level = after;
    return { xp: nextXp, level: after, leveledUp: after > before, gained };
  }

  const client = context.admin ?? context.db;
  if (!client) return null;

  try {
    const { error } = await client
      .from("profiles")
      .update({ xp: nextXp, level: after })
      .eq("id", context.user.id);
    if (error) throw error;
    if (context.profile) {
      context.profile.xp = nextXp;
      context.profile.level = after;
    }
    return { xp: nextXp, level: after, leveledUp: after > before, gained };
  } catch (error) {
    console.error("[gamification] awardXp failed:", error);
    return null;
  }
}

/** Unlock any achievements whose criteria are now met. Idempotent. */
export async function checkAchievements(
  context: SessionContext,
  stats: AchievementStats,
): Promise<Achievement[]> {
  if (!context.user) return [];

  const earned = new Set<string>();
  const unlocked: Achievement[] = [];

  if (context.demo) {
    const store = demoStore();
    store.achievements.forEach((achievement) => earned.add(achievement.code));
    for (const definition of ACHIEVEMENTS) {
      if (earned.has(definition.code)) continue;
      if (!definition.test({ ...stats, xp: store.profile.xp })) continue;
      const record: Achievement = {
        id: demoId("7"),
        user_id: store.profile.id,
        code: definition.code,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        xp_awarded: definition.xp,
        unlocked_at: new Date().toISOString(),
      };
      store.achievements.unshift(record);
      store.profile.xp += definition.xp;
      store.profile.level = levelFromXp(store.profile.xp).level;
      unlocked.push(record);
    }
    return unlocked;
  }

  const client = context.admin ?? context.db;
  if (!client) return [];

  try {
    const { data } = await client
      .from("achievements")
      .select("code")
      .eq("user_id", context.user.id);
    (data ?? []).forEach((row) => earned.add((row as { code: string }).code));

    const toUnlock = ACHIEVEMENTS.filter(
      (definition) => !earned.has(definition.code) && definition.test(stats),
    );
    if (toUnlock.length === 0) return [];

    const { data: inserted, error } = await client
      .from("achievements")
      .insert(
        toUnlock.map((definition) => ({
          user_id: context.user!.id,
          code: definition.code,
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          xp_awarded: definition.xp,
        })),
      )
      .select("*");

    if (error) throw error;

    const bonus = toUnlock.reduce((sum, definition) => sum + definition.xp, 0);
    if (bonus > 0) {
      const nextXp = (context.profile?.xp ?? 0) + bonus;
      await client
        .from("profiles")
        .update({ xp: nextXp, level: levelFromXp(nextXp).level })
        .eq("id", context.user.id);
      if (context.profile) {
        context.profile.xp = nextXp;
        context.profile.level = levelFromXp(nextXp).level;
      }
    }

    return (inserted ?? []) as Achievement[];
  } catch (error) {
    console.error("[gamification] checkAchievements failed:", error);
    return [];
  }
}
