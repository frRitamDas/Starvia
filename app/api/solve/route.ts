import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded, touchActivity } from "@/lib/session";
import { consumeQuota, addTokenUsage, logAiEvent } from "@/lib/usage";
import { awardXp, checkAchievements } from "@/lib/gamification";
import { getAchievementStats } from "@/lib/data/stats";
import { upsertTopicStatus } from "@/lib/data/progress";
import { solveQuestion } from "@/lib/ai";
import { demoMode } from "@/lib/env";
import { solveSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_SOLUTION = `## Subject & Topic
Demo mode — the AI solver needs a \`GEMINI_API_KEY\` to read your question.

## Concept
Once configured, Starvia identifies the concept, explains it at your class level and solves the question step by step.

## Step-by-step solution
1. Given data is listed first.
2. The relevant formula is stated.
3. Values are substituted with units.
4. The final answer is highlighted.

## Final answer
**Add GEMINI_API_KEY in your environment to get a real solution.**

## Watch out for
Skipping steps — board examiners award method marks.

## Practice
Try a similar question from the same exercise and check your answer against the textbook.`;

/**
 * Question solver (typed or photographed).
 * Images use the vision model and are never stored — they are processed
 * in-memory for this request only.
 */
export async function POST(request: Request) {
  return guard("solve", async () => {
    const context = await requireOnboarded();
    const body = solveSchema.parse(await readJson(request));

    const isImage = Boolean(body.imageBase64);
    const feature = isImage ? "image" : "solver";

    if (isImage) {
      const bytes = Math.floor((body.imageBase64?.length ?? 0) * 0.75);
      if (bytes > 5 * 1024 * 1024) {
        throw new ApiError("BAD_REQUEST", "That image is too large. Please upload one under 5 MB.");
      }
    }

    await consumeQuota(context, feature);

    const profile = context.profile;

    let solution;
    let model: string | null = null;
    let tokens = 0;

    if (demoMode()) {
      solution = { markdown: DEMO_SOLUTION, subject: body.subject ?? null, topic: null };
      model = "demo";
    } else {
      const result = await solveQuestion(
        {
          question: body.question,
          imageBase64: body.imageBase64,
          imageMimeType: body.imageMimeType,
          subject: body.subject,
          mode: body.mode,
          context: {
            classLevel: profile.class_level,
            board: profile.board,
            subject: body.subject ?? profile.subjects?.[0] ?? null,
            learningLevel: profile.learning_level,
            examTarget: profile.exam_target,
          },
        },
        context.admin ?? context.db,
      );
      solution = { markdown: result.markdown, subject: result.subject, topic: result.topic };
      model = result.model;
      tokens = result.tokens;
    }

    const subject = solution.subject ?? body.subject ?? "General";
    await upsertTopicStatus(context, {
      subject,
      topic: solution.topic ?? "Solved questions",
      status: "learning",
      minutesSpent: 3,
    }).catch(() => undefined);

    await touchActivity(context, 3);
    await addTokenUsage(context, feature, tokens);
    await logAiEvent(context, {
      feature,
      status: "success",
      model,
      tokens,
    });

    const xp = await awardXp(context, "question_solved");
    const stats = await getAchievementStats(context);
    const unlocked = await checkAchievements(context, stats);

    return ok({
      solution,
      feature,
      xpGained: xp?.gained ?? 0,
      achievements: unlocked.map((achievement) => achievement.title),
    });
  });
}
