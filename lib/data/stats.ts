import "server-only";

import { demoStore } from "@/lib/demo/store";
import type { SessionContext } from "@/lib/session";
import type { AchievementStats } from "@/lib/gamification";

/** Aggregated counters used for achievements and the progress page. */

export async function getAchievementStats(context: SessionContext): Promise<AchievementStats> {
  const profile = context.profile;

  if (context.demo) {
    const store = demoStore();
    const attempts = store.quizAttempts;
    const cardsKnown = [...store.cardProgress.values()].reduce((sum, row) => sum + row.known_count, 0);
    return {
      questionsAsked: store.messages.filter((message) => message.role === "user").length,
      tutorialsCompleted: store.tutorials.filter((tutorial) => tutorial.completed).length,
      tutorialsCreated: store.tutorials.length,
      quizzesCompleted: attempts.length,
      bestQuizPercentage: attempts.reduce((max, attempt) => Math.max(max, attempt.percentage), 0),
      perfectQuizzes: attempts.filter((attempt) => attempt.percentage >= 100).length,
      streak: profile?.streak_count ?? 0,
      longestStreak: profile?.longest_streak ?? 0,
      cardsKnown,
      topicsMastered: store.progress.filter((row) => row.status === "mastered").length,
      xp: profile?.xp ?? 0,
      studyMinutes: profile?.study_minutes ?? 0,
    };
  }

  const userId = context.user?.id;
  if (!userId || !context.db) {
    return {
      questionsAsked: 0,
      tutorialsCompleted: 0,
      tutorialsCreated: 0,
      quizzesCompleted: 0,
      bestQuizPercentage: 0,
      perfectQuizzes: 0,
      streak: profile?.streak_count ?? 0,
      longestStreak: profile?.longest_streak ?? 0,
      cardsKnown: 0,
      topicsMastered: 0,
      xp: profile?.xp ?? 0,
      studyMinutes: profile?.study_minutes ?? 0,
    };
  }

  const [messages, tutorials, attempts, cardProgress, mastered] = await Promise.all([
    context.db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user"),
    context.db.from("tutorials").select("id, completed").eq("user_id", userId),
    context.db.from("quiz_attempts").select("percentage").eq("user_id", userId),
    context.db.from("flashcard_progress").select("known_count").eq("user_id", userId),
    context.db.from("study_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "mastered"),
  ]);

  const tutorialRows = (tutorials.data ?? []) as { completed: boolean }[];
  const attemptRows = (attempts.data ?? []) as { percentage: number }[];
  const cardRows = (cardProgress.data ?? []) as { known_count: number }[];

  return {
    questionsAsked: messages.count ?? 0,
    tutorialsCompleted: tutorialRows.filter((row) => row.completed).length,
    tutorialsCreated: tutorialRows.length,
    quizzesCompleted: attemptRows.length,
    bestQuizPercentage: attemptRows.reduce((max, row) => Math.max(max, Number(row.percentage) || 0), 0),
    perfectQuizzes: attemptRows.filter((row) => Number(row.percentage) >= 100).length,
    streak: profile?.streak_count ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    cardsKnown: cardRows.reduce((sum, row) => sum + (row.known_count ?? 0), 0),
    topicsMastered: mastered.count ?? 0,
    xp: profile?.xp ?? 0,
    studyMinutes: profile?.study_minutes ?? 0,
  };
}
