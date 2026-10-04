import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { consumeQuota, addTokenUsage, logAiEvent } from "@/lib/usage";
import { checkAchievements } from "@/lib/gamification";
import { getAchievementStats } from "@/lib/data/stats";
import { findTutorialByCacheKey, listTutorials, saveTutorial } from "@/lib/data/tutorials";
import { upsertTopicStatus } from "@/lib/data/progress";
import { generateTutorial } from "@/lib/ai";
import { demoTutorial } from "@/lib/ai/demo-generator";
import { demoMode } from "@/lib/env";
import { tutorialGenerateSchema } from "@/lib/validation";
import { touchActivity } from "@/lib/session";
import { getCapabilities } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

/** List saved tutorials for the student. */
export async function GET(request: Request) {
  return guard("tutorials.list", async () => {
    const context = await requireOnboarded();
    const url = new URL(request.url);
    const subject = url.searchParams.get("subject");
    const tutorials = await listTutorials(context, { subject });
    return ok({ tutorials });
  });
}

/**
 * Generate (or reuse) a tutorial.
 * Reuses an identical cached tutorial instead of regenerating — this saves both
 * the student's quota and our AI budget.
 */
export async function POST(request: Request) {
  return guard("tutorials.generate", async () => {
    const context = await requireOnboarded();
    const input = tutorialGenerateSchema.parse(await readJson(request));

    const profile = context.profile;
    const capabilities = getCapabilities(context.plan);

    // Look for an existing identical tutorial first (no quota consumed).
    const cacheClient = context.admin ?? context.db;
    const existingCheck = await generateTutorialCacheKey(input);
    const reused = await findTutorialByCacheKey(context, existingCheck);
    if (reused && input.allowCache) {
      await logAiEvent(context, { feature: "cache", status: "cached" });
      return ok({ tutorial: reused, cached: true, quotaConsumed: false });
    }

    await consumeQuota(context, "tutorial");

    let content;
    let model: string | null = null;
    let cached = false;
    let cacheKey = existingCheck;

    if (demoMode()) {
      content = demoTutorial(input);
      model = "demo";
    } else {
      const result = await generateTutorial(
        {
          classLevel: input.classLevel,
          board: input.board,
          subject: input.subject,
          chapter: input.chapter,
          topic: input.topic,
          difficulty: input.difficulty,
          learningLevel: profile.learning_level,
        },
        cacheClient,
      );
      content = result.content;
      model = result.model;
      cached = result.cached;
      cacheKey = result.cacheKey;
      await addTokenUsage(context, "tutorial", result.tokens);
    }

    const tutorial = await saveTutorial(context, {
      classLevel: input.classLevel,
      board: input.board,
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      difficulty: input.difficulty,
      content,
      model,
      cacheKey,
    });

    await upsertTopicStatus(context, {
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      status: "learning",
      minutesSpent: 5,
    }).catch(() => undefined);

    await touchActivity(context, 5);
    await logAiEvent(context, {
      feature: "tutorial",
      status: cached ? "cached" : "success",
      model,
    });

    const stats = await getAchievementStats(context);
    const unlocked = await checkAchievements(context, stats);

    return ok({
      tutorial,
      cached,
      quotaConsumed: true,
      maxQuizQuestions: capabilities.maxQuizQuestions,
      achievements: unlocked.map((achievement) => achievement.title),
    });
  });
}

async function generateTutorialCacheKey(input: {
  classLevel: string;
  board: string;
  subject: string;
  chapter?: string | null;
  topic: string;
  difficulty: string;
}) {
  const { contentKey } = await import("@/lib/ai/cache");
  return contentKey("tutorial:v1", {
    class: input.classLevel,
    board: input.board,
    subject: input.subject,
    chapter: input.chapter ?? "",
    topic: input.topic,
    difficulty: input.difficulty,
  });
}
