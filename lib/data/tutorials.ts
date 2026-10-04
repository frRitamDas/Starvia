import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { Tutorial, TutorialContent } from "@/lib/types";
import type { TutorialContentPayload } from "@/lib/ai/schemas";

/** Tutorial persistence. Cached generations are reused instead of regenerated. */

export async function listTutorials(
  context: SessionContext,
  options: { limit?: number; subject?: string | null; includeCompleted?: boolean } = {},
): Promise<Tutorial[]> {
  if (!context.user) return [];
  const limit = options.limit ?? 30;

  if (context.demo) {
    return demoStore()
      .tutorials.filter((tutorial) => !options.subject || tutorial.subject === options.subject)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  let query = context.db!
    .from("tutorials")
    .select("*")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.subject) query = query.eq("subject", options.subject);

  const { data, error } = await query;
  if (error) {
    console.error("[tutorials] list:", error.message);
    return [];
  }
  return (data ?? []).map(mapTutorial);
}

/** Reuses an existing tutorial for this student instead of generating (and charging) again. */
export async function findTutorialByCacheKey(
  context: SessionContext,
  cacheKey: string,
): Promise<Tutorial | null> {
  if (!context.user) return null;
  if (context.demo) {
    return demoStore().tutorials.find((tutorial) => tutorial.cache_key === cacheKey) ?? null;
  }
  const { data, error } = await context.db!
    .from("tutorials")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;
  return mapTutorial(data);
}

export async function getTutorial(
  context: SessionContext,
  tutorialId: string,
): Promise<Tutorial | null> {
  if (!context.user) return null;
  if (context.demo) {
    return demoStore().tutorials.find((tutorial) => tutorial.id === tutorialId) ?? null;
  }
  const { data, error } = await context.db!
    .from("tutorials")
    .select("*")
    .eq("id", tutorialId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapTutorial(data);
}

export async function saveTutorial(
  context: SessionContext,
  input: {
    classLevel: string;
    board: string;
    subject: string;
    chapter?: string | null;
    topic: string;
    difficulty: string;
    content: TutorialContentPayload;
    model: string | null;
    cacheKey: string;
  },
): Promise<Tutorial> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    user_id: context.user.id,
    class_level: input.classLevel,
    board: input.board,
    subject: input.subject,
    chapter: input.chapter ?? null,
    topic: input.topic,
    difficulty: input.difficulty,
    title: input.content.title,
    content: input.content as unknown as never,
    cache_key: input.cacheKey,
    model: input.model,
  };

  if (context.demo) {
    const store = demoStore();
    const existing = store.tutorials.find((tutorial) => tutorial.cache_key === input.cacheKey);
    if (existing) return existing;
    const now = new Date().toISOString();
    const tutorial: Tutorial = {
      id: demoId("3"),
      ...payload,
      content: input.content,
      is_public: false,
      completed: false,
      completed_at: null,
      times_viewed: 0,
      created_at: now,
      updated_at: now,
    };
    store.tutorials.unshift(tutorial);
    return tutorial;
  }

  const { data, error } = await context.db!
    .from("tutorials")
    .upsert(payload, { onConflict: "user_id,cache_key" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[tutorials] save:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save that tutorial. Please try again.");
  }
  return mapTutorial(data);
}

export async function setTutorialCompleted(
  context: SessionContext,
  tutorialId: string,
  completed: boolean,
): Promise<void> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  const patch = {
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  };

  if (context.demo) {
    const tutorial = demoStore().tutorials.find((item) => item.id === tutorialId);
    if (!tutorial) throw new ApiError("NOT_FOUND");
    Object.assign(tutorial, patch);
    return;
  }

  const { error } = await context.db!.from("tutorials")
    .update(patch)
    .eq("id", tutorialId)
    .eq("user_id", context.user.id);
  if (error) throw new ApiError("SERVER_ERROR", "Could not update that tutorial.");
}

export async function incrementTutorialViews(context: SessionContext, tutorialId: string) {
  if (!context.user) return;
  if (context.demo) {
    const tutorial = demoStore().tutorials.find((item) => item.id === tutorialId);
    if (tutorial) tutorial.times_viewed += 1;
    return;
  }
  const { data } = await context.db!
    .from("tutorials")
    .select("times_viewed")
    .eq("id", tutorialId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!data) return;
  await context.db!.from("tutorials")
    .update({ times_viewed: ((data as { times_viewed: number }).times_viewed ?? 0) + 1 })
    .eq("id", tutorialId)
    .eq("user_id", context.user.id);
}

export async function deleteTutorial(context: SessionContext, tutorialId: string) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (context.demo) {
    const store = demoStore();
    store.tutorials = store.tutorials.filter((tutorial) => tutorial.id !== tutorialId);
    return;
  }
  const { error } = await context.db!.from("tutorials")
    .delete()
    .eq("id", tutorialId)
    .eq("user_id", context.user.id);
  if (error) throw new ApiError("SERVER_ERROR", "Could not delete that tutorial.");
}

/** "Continue learning" — the most recent tutorial the student has not finished. */
export async function getContinueLearning(context: SessionContext): Promise<Tutorial | null> {
  if (!context.user) return null;
  if (context.demo) {
    return (
      demoStore()
        .tutorials.filter((tutorial) => !tutorial.completed)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
    );
  }
  const { data } = await context.db!
    .from("tutorials")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("completed", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapTutorial(data) : null;
}

type TutorialRowLike = {
  content: unknown;
  [key: string]: unknown;
};

function mapTutorial(row: TutorialRowLike | null): Tutorial {
  const typed = row as unknown as Tutorial;
  return {
    ...typed,
    content: (row?.content ?? {}) as TutorialContent,
  };
}
