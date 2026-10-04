import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { consumeQuota, addTokenUsage, logAiEvent } from "@/lib/usage";
import { listQuizzes, saveQuiz } from "@/lib/data/quizzes";
import { upsertTopicStatus } from "@/lib/data/progress";
import { generateQuiz } from "@/lib/ai";
import { demoQuiz } from "@/lib/ai/demo-generator";
import { demoMode } from "@/lib/env";
import { quizGenerateSchema } from "@/lib/validation";
import { touchActivity } from "@/lib/session";
import { ApiError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return guard("quizzes.list", async () => {
    const context = await requireOnboarded();
    const quizzes = await listQuizzes(context);
    return ok({ quizzes });
  });
}

/** Generate a quiz and persist the answer key server-side. */
export async function POST(request: Request) {
  return guard("quizzes.generate", async () => {
    const context = await requireOnboarded();
    const input = quizGenerateSchema.parse(await readJson(request));

    const maxQuestions = context.capabilities.maxQuizQuestions;
    if (input.count > maxQuestions) {
      throw new ApiError(
        "PAYMENT_REQUIRED",
        `Your plan allows up to ${maxQuestions} questions per quiz. Upgrade for longer tests.`,
        { upgrade: true },
      );
    }

    await consumeQuota(context, "quiz");

    const payload = demoMode()
      ? demoQuiz({
          subject: input.subject,
          topic: input.topic,
          classLevel: input.classLevel,
          count: input.count,
        })
      : (
          await generateQuiz({
            classLevel: input.classLevel,
            board: input.board,
            subject: input.subject,
            chapter: input.chapter,
            topic: input.topic,
            difficulty: input.difficulty,
            count: input.count,
            types: input.types,
          })
        ).payload;

    const model = demoMode() ? "demo" : "gemini";
    const cacheKey = `${input.subject}:${input.topic ?? input.chapter ?? "mixed"}:${Date.now()}`;

    const quiz = await saveQuiz(context, {
      classLevel: input.classLevel,
      board: input.board,
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic,
      difficulty: input.difficulty,
      payload,
      model,
      cacheKey,
    });

    await upsertTopicStatus(context, {
      subject: input.subject,
      chapter: input.chapter,
      topic: input.topic ?? input.chapter ?? "Mixed practice",
      status: "learning",
      minutesSpent: 3,
    }).catch(() => undefined);

    await touchActivity(context, 3);
    await logAiEvent(context, { feature: "quiz", status: "success", model });

    void addTokenUsage(context, "quiz", 0);

    return ok({ quiz, questionCount: payload.questions.length });
  });
}
