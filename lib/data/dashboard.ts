import "server-only";

import { chaptersFor, subjectsForClass } from "@/lib/curriculum";
import { demoStore } from "@/lib/demo/store";
import { listConversations } from "@/lib/data/tutor";
import { getContinueLearning, listTutorials } from "@/lib/data/tutorials";
import { listAttempts, listQuizzes } from "@/lib/data/quizzes";
import { listStudyProgress } from "@/lib/data/progress";
import { getUsageSummary } from "@/lib/usage";
import { levelFromXp, type AiFeature } from "@/lib/plans";
import type { SessionContext } from "@/lib/session";
import type { AiUsageSummary, QuizAttempt, StudyProgress, Tutorial } from "@/lib/types";

/**
 * One aggregated read for the dashboard. Keeps the dashboard to a single
 * server render with parallel queries instead of a chatty client.
 */
export interface DashboardSnapshot {
  firstName: string;
  plan: string;
  usage: AiUsageSummary;
  streak: number;
  longestStreak: number;
  xp: number;
  level: { level: number; progress: number; xpIntoLevel: number; xpForNextLevel: number };
  studyMinutes: number;
  todayMinutes: number;
  completedToday: number;
  tutorials: Tutorial[];
  continueTutorial: Tutorial | null;
  quizzes: { id: string; title: string; subject: string; question_count: number; created_at: string }[];
  attempts: QuizAttempt[];
  weakTopics: { topic: string; subject: string; reason: string }[];
  recommended: { subject: string; topic: string; reason: string }[];
  recentConversations: { id: string; title: string; subject: string | null; last_message_at: string }[];
  achievements: { code: string; title: string; description: string; icon: string; unlocked_at: string }[];
  topicsTracked: StudyProgress[];
}

export async function getDashboardSnapshot(context: SessionContext): Promise<DashboardSnapshot> {
  const profile = context.profile;
  const firstName = (profile?.full_name || context.user?.name || "Student").split(" ")[0]!;

  const [usage, tutorials, continueTutorial, quizzes, attempts, progress, conversations] =
    await Promise.all([
      getUsageSummary(context),
      listTutorials(context, { limit: 6 }),
      getContinueLearning(context),
      listQuizzes(context, 5),
      listAttempts(context, 5),
      listStudyProgress(context, 60),
      listConversations(context, 4),
    ]);

  const achievements = await listAchievements(context);

  const todayIso = new Date().toISOString().slice(0, 10);
  const completedToday = tutorials.filter(
    (tutorial) => tutorial.completed_at && tutorial.completed_at.slice(0, 10) === todayIso,
  ).length;

  const xp = profile?.xp ?? 0;

  return {
    firstName,
    plan: context.plan,
    usage,
    streak: profile?.streak_count ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    xp,
    level: levelFromXp(xp),
    studyMinutes: profile?.study_minutes ?? 0,
    todayMinutes: estimateTodayMinutes(progress, attempts),
    completedToday,
    tutorials,
    continueTutorial,
    quizzes: quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject,
      question_count: quiz.question_count,
      created_at: quiz.created_at,
    })),
    attempts,
    weakTopics: deriveWeakTopics(progress, attempts),
    recommended: recommendTopics(context, progress, attempts),
    recentConversations: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      subject: conversation.subject,
      last_message_at: conversation.last_message_at,
    })),
    achievements: achievements.map((achievement) => ({
      code: achievement.code,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      unlocked_at: achievement.unlocked_at,
    })),
    topicsTracked: progress,
  };
}

async function listAchievements(context: SessionContext) {
  if (!context.user) return [];
  if (context.demo) {
    return [...demoStore().achievements].sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at));
  }
  const { data } = await context.db!
    .from("achievements")
    .select("*")
    .eq("user_id", context.user.id)
    .order("unlocked_at", { ascending: false })
    .limit(12);
  return (data ?? []) as unknown as {
    code: string;
    title: string;
    description: string;
    icon: string;
    unlocked_at: string;
  }[];
}

function estimateTodayMinutes(progress: StudyProgress[], attempts: QuizAttempt[]) {
  const today = new Date().toISOString().slice(0, 10);
  const quizMinutes = attempts
    .filter((attempt) => attempt.created_at.slice(0, 10) === today)
    .reduce((sum, attempt) => sum + Math.round((attempt.duration_seconds ?? 0) / 60), 0);
  const studiedMinutes = progress
    .filter((row) => (row.last_studied_at ?? "").slice(0, 10) === today)
    .reduce((sum, row) => sum + Math.min(row.minutes_spent, 120), 0);
  return quizMinutes + Math.min(studiedMinutes, 240);
}

/** Weak topics = low quiz scores by topic + topics marked as not started. */
function deriveWeakTopics(progress: StudyProgress[], attempts: QuizAttempt[]) {
  const weak = new Map<string, { topic: string; subject: string; reason: string }>();

  for (const attempt of attempts) {
    for (const topic of attempt.weak_topics ?? []) {
      if (!weak.has(topic)) {
        weak.set(topic, {
          topic,
          subject: "Revision needed",
          reason: `Missed questions in a recent quiz (${Math.round(attempt.percentage)}%)`,
        });
      }
    }
  }

  for (const row of progress) {
    if (row.status === "not_started") {
      weak.set(row.topic, {
        topic: row.topic,
        subject: row.subject,
        reason: "Not started yet",
      });
    } else if (row.confidence <= 2 && row.status !== "mastered" && !weak.has(row.topic)) {
      weak.set(row.topic, {
        topic: row.topic,
        subject: row.subject,
        reason: "Low confidence — keep practising",
      });
    }
  }

  return [...weak.values()].slice(0, 5);
}

/** Recommended next topics: curriculum chapters for the student's class/subject mix. */
function recommendTopics(
  context: SessionContext,
  progress: StudyProgress[],
  attempts: QuizAttempt[],
) {
  const profile = context.profile;
  const subjects = profile?.subjects?.length
    ? profile.subjects
    : subjectsForClass(profile?.class_level ?? "10");
  const touched = new Set(progress.map((row) => row.topic.toLowerCase()));
  for (const attempt of attempts) {
    for (const topic of attempt.weak_topics ?? []) touched.add(topic.toLowerCase());
  }

  const recommendations: { subject: string; topic: string; reason: string }[] = [];

  const weakAttempt = attempts.find((attempt) => (attempt.weak_topics ?? []).length > 0);
  for (const topic of weakAttempt?.weak_topics ?? []) {
    if (recommendations.length >= 2) break;
    recommendations.push({
      subject: suggestionsSubject(topic, subjects),
      topic,
      reason: "You lost marks here recently — a quick revision will fix it.",
    });
  }

  for (const subject of subjects) {
    if (recommendations.length >= 5) break;
    const chapters = chaptersFor(profile?.class_level ?? "10", subject);
    const next = chapters.find((chapter) => !touched.has(chapter.toLowerCase()));
    if (next) {
      recommendations.push({
        subject,
        topic: next,
        reason: `Next up in ${subject} for Class ${profile?.class_level ?? "10"}`,
      });
    }
  }

  return recommendations.slice(0, 5);
}

function suggestionsSubject(topic: string, subjects: string[]) {
  const lower = topic.toLowerCase();
  const scienceish = ["electric", "light", "atom", "cell", "acid", "reaction", "force", "motion", "life", "genetic"];
  if (scienceish.some((keyword) => lower.includes(keyword))) {
    return subjects.find((subject) => /science|physics|chemistry|biology/i.test(subject)) ?? "Science";
  }
  const mathish = ["equation", "trigonometry", "algebra", "geometry", "probability", "statistics", "number"];
  if (mathish.some((keyword) => lower.includes(keyword))) {
    return subjects.find((subject) => /math/i.test(subject)) ?? "Mathematics";
  }
  return subjects[0] ?? "General";
}

/** Small helper used by the dashboard UI to show quota chips. */
export function quotaChips(usage: AiUsageSummary, features: AiFeature[]) {
  return features.map((feature) => ({
    feature,
    ...usage.usage[feature],
    resetsInMs: usage.resetsInMs,
  }));
}
