import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { gradeAttempt, recordAttempt, weakTopicsFrom } from "@/lib/data/quizzes";
import { getQuiz } from "@/lib/data/quizzes";
import { upsertTopicStatus } from "@/lib/data/progress";
import { awardXp, checkAchievements } from "@/lib/gamification";
import { getAchievementStats } from "@/lib/data/stats";
import { quizSubmitSchema } from "@/lib/validation";
import { touchActivity } from "@/lib/session";

/** Server-side grading. Answers are checked here, never in the browser. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("quizzes.submit", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const quiz = await getQuiz(context, id);
    if (!quiz) throw new ApiError("NOT_FOUND", "That quiz doesn't exist.");

    const input = quizSubmitSchema.parse(await readJson(request));

    const graded = await gradeAttempt(context, id, input.answers);
    const weakTopics = weakTopicsFrom(graded.details);

    const attempt = await recordAttempt(context, {
      quizId: id,
      score: graded.score,
      total: graded.total,
      percentage: graded.percentage,
      records: graded.records,
      weakTopics,
      durationSeconds: input.durationSeconds ?? null,
    });

    // Update topic mastery from the result.
    const correctTopics = new Set(
      graded.details.filter((detail) => detail.correct).map((detail) => detail.topic ?? quiz.quiz.topic ?? "Mixed practice"),
    );
    for (const topic of correctTopics) {
      if (!topic) continue;
      await upsertTopicStatus(context, {
        subject: quiz.quiz.subject,
        chapter: quiz.quiz.chapter,
        topic,
        status: graded.percentage >= 80 ? "practiced" : "learning",
        minutesSpent: 0,
      }).catch(() => undefined);
    }

    await touchActivity(context, Math.round((input.durationSeconds ?? 180) / 60));

    const xp = await awardXp(context, "quiz_complete");
    if (graded.percentage >= 100) await awardXp(context, "quiz_perfect");

    const stats = await getAchievementStats(context);
    const unlocked = await checkAchievements(context, stats);

    return ok({
      attempt,
      review: graded.details.map((detail) => ({
        questionId: detail.id,
        question: detail.question,
        type: detail.type,
        options: detail.options,
        given: detail.given,
        correctAnswer: detail.correct_answer,
        explanation: detail.explanation,
        correct: detail.correct,
        topic: detail.topic,
      })),
      weakTopics,
      xpGained: xp?.gained ?? 0,
      achievements: unlocked.map((achievement) => achievement.title),
    });
  });
}
