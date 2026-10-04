import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { StudyProgress, TopicStatus } from "@/lib/types";
import type { ExamPlanPayload } from "@/lib/ai/schemas";

/** Topic-level study tracking (used by /progress and /exam-prep). */

export async function listStudyProgress(
  context: SessionContext,
  limit = 200,
): Promise<StudyProgress[]> {
  if (!context.user) return [];
  if (context.demo) {
    return [...demoStore().progress]
      .sort((a, b) => (b.last_studied_at ?? "").localeCompare(a.last_studied_at ?? ""))
      .slice(0, limit);
  }
  const { data, error } = await context.db!
    .from("study_progress")
    .select("*")
    .eq("user_id", context.user.id)
    .order("last_studied_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as StudyProgress[];
}

export async function upsertTopicStatus(
  context: SessionContext,
  input: {
    subject: string;
    chapter?: string | null;
    topic: string;
    status: TopicStatus;
    minutesSpent?: number;
  },
): Promise<StudyProgress> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const confidenceByStatus: Record<TopicStatus, number> = {
    not_started: 0,
    learning: 2,
    practiced: 4,
    mastered: 5,
  };

  const payload = {
    user_id: context.user.id,
    subject: input.subject,
    chapter: input.chapter ?? null,
    topic: input.topic,
    status: input.status,
    confidence: confidenceByStatus[input.status],
    minutes_spent: input.minutesSpent ?? 0,
    last_studied_at: new Date().toISOString(),
  };

  if (context.demo) {
    const store = demoStore();
    const existing = store.progress.find(
      (row) => row.subject === input.subject && row.topic === input.topic,
    );
    if (existing) {
      Object.assign(existing, {
        ...payload,
        minutes_spent: existing.minutes_spent + (input.minutesSpent ?? 0),
      });
      return existing;
    }
    const created: StudyProgress = { id: demoId("6"), ...payload, created_at: new Date().toISOString() };
    store.progress.unshift(created);
    return created;
  }

  const { data: existing } = await context.db!
    .from("study_progress")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("subject", input.subject)
    .eq("topic", input.topic)
    .maybeSingle();

  const minutes = ((existing as unknown as StudyProgress | null)?.minutes_spent ?? 0) + (input.minutesSpent ?? 0);

  const { data, error } = await context.db!
    .from("study_progress")
    .upsert({ ...payload, minutes_spent: minutes }, { onConflict: "user_id,subject,topic" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[progress] upsertTopicStatus:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save your progress.");
  }
  return data as unknown as StudyProgress;
}

/* ------------------------------ exam plans --------------------------- */

export interface SavedExamPlan {
  id: string;
  board: string;
  class_level: string;
  subject: string;
  chapter: string | null;
  exam_type: string;
  planned_days: number;
  title: string;
  content: ExamPlanPayload;
  created_at: string;
}

export async function saveExamPlan(
  context: SessionContext,
  input: {
    board: string;
    classLevel: string;
    subject: string;
    chapter?: string | null;
    examType: string;
    plannedDays: number;
    payload: ExamPlanPayload;
    model: string | null;
    cacheKey: string;
  },
): Promise<SavedExamPlan> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    user_id: context.user.id,
    board: input.board,
    class_level: input.classLevel,
    subject: input.subject,
    chapter: input.chapter ?? null,
    exam_type: input.examType,
    planned_days: input.plannedDays,
    title: input.payload.title,
    content: input.payload as unknown as never,
    cache_key: input.cacheKey,
    model: input.model,
  };

  if (context.demo) {
    const plan: SavedExamPlan = {
      id: demoId("8"),
      ...payload,
      content: input.payload,
      created_at: new Date().toISOString(),
    };
    const store = demoStore() as unknown as { examPlans?: SavedExamPlan[] };
    store.examPlans = store.examPlans ?? [];
    store.examPlans.unshift(plan);
    return plan;
  }

  const { data, error } = await context.db!.from("exam_plans").insert(payload).select("*").single();
  if (error || !data) {
    console.error("[exam] saveExamPlan:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save that revision plan.");
  }
  return data as unknown as SavedExamPlan;
}

export async function listExamPlans(context: SessionContext, limit = 12): Promise<SavedExamPlan[]> {
  if (!context.user) return [];
  if (context.demo) {
    const store = demoStore() as unknown as { examPlans?: SavedExamPlan[] };
    return (store.examPlans ?? []).slice(0, limit);
  }
  const { data, error } = await context.db!
    .from("exam_plans")
    .select("*")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as SavedExamPlan[];
}

export async function getExamPlan(
  context: SessionContext,
  planId: string,
): Promise<SavedExamPlan | null> {
  if (!context.user) return null;
  if (context.demo) {
    const store = demoStore() as unknown as { examPlans?: SavedExamPlan[] };
    return (store.examPlans ?? []).find((plan) => plan.id === planId) ?? null;
  }
  const { data } = await context.db!
    .from("exam_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  return (data as unknown as SavedExamPlan | null) ?? null;
}
