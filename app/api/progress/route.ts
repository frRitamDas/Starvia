import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { listStudyProgress, upsertTopicStatus } from "@/lib/data/progress";
import { listAttempts } from "@/lib/data/quizzes";
import { listTutorials } from "@/lib/data/tutorials";
import { getAchievementStats } from "@/lib/data/stats";
import { topicStatusSchema } from "@/lib/validation";
import { awardXp } from "@/lib/gamification";

/** Progress data for /progress — one read for the whole page. */
export async function GET() {
  return guard("progress.get", async () => {
    const context = await requireOnboarded();

    const [topics, attempts, tutorials, stats] = await Promise.all([
      listStudyProgress(context, 400),
      listAttempts(context, 30),
      listTutorials(context, { limit: 100 }),
      getAchievementStats(context),
    ]);

    return ok({
      topics,
      attempts,
      stats,
      tutorials: tutorials.map((tutorial) => ({
        id: tutorial.id,
        title: tutorial.title,
        subject: tutorial.subject,
        topic: tutorial.topic,
        completed: tutorial.completed,
        completed_at: tutorial.completed_at,
        created_at: tutorial.created_at,
      })),
    });
  });
}

/** Update a topic's status from any page (exam prep, progress, tutorial). */
export async function POST(request: Request) {
  return guard("progress.post", async () => {
    const context = await requireOnboarded();
    const input = topicStatusSchema.parse(await readJson(request));

    const topic = await upsertTopicStatus(context, {
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      status: input.status,
      minutesSpent: input.minutesSpent ?? 0,
    });

    if (input.status === "mastered") {
      await awardXp(context, "exam_topic_mastered");
    }

    return ok({ topic });
  });
}
