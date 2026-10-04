import { guard } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { getQuiz } from "@/lib/data/quizzes";

/**
 * Returns the quiz WITHOUT correct answers or explanations.
 * The answer key stays on the server until the attempt is submitted.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("quizzes.get", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const quiz = await getQuiz(context, id);
    if (!quiz) throw new ApiError("NOT_FOUND", "That quiz doesn't exist.");

    return ok({ quiz: quiz.quiz, questions: quiz.questions });
  });
}
