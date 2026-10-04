import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { deleteTutorial, getTutorial, incrementTutorialViews, setTutorialCompleted } from "@/lib/data/tutorials";
import { upsertTopicStatus } from "@/lib/data/progress";
import { awardXp, checkAchievements } from "@/lib/gamification";
import { getAchievementStats } from "@/lib/data/stats";
import { touchActivity } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutorials.get", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const tutorial = await getTutorial(context, id);
    if (!tutorial) throw new ApiError("NOT_FOUND", "That tutorial doesn't exist.");

    await incrementTutorialViews(context, id).catch(() => undefined);
    return ok({ tutorial });
  });
}

/** Mark complete / incomplete. Completing awards XP and updates topic mastery. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutorials.patch", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    const body = (await readJson(request)) as { completed?: boolean };

    const tutorial = await getTutorial(context, id);
    if (!tutorial) throw new ApiError("NOT_FOUND", "That tutorial doesn't exist.");

    const completed = body.completed !== false;
    await setTutorialCompleted(context, id, completed);

    let xpGained = 0;
    let unlocked: string[] = [];

    if (completed) {
      await upsertTopicStatus(context, {
        subject: tutorial.subject,
        chapter: tutorial.chapter,
        topic: tutorial.topic,
        status: "practiced",
        minutesSpent: 10,
      }).catch(() => undefined);

      await touchActivity(context, 10);
      const xp = await awardXp(context, "tutorial_complete");
      xpGained = xp?.gained ?? 0;
      const stats = await getAchievementStats(context);
      unlocked = (await checkAchievements(context, stats)).map((achievement) => achievement.title);
    }

    return ok({ completed, xpGained, achievements: unlocked });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutorials.delete", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    await deleteTutorial(context, id);
    return ok({ deleted: true });
  });
}
