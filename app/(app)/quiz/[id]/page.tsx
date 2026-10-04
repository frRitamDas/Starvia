import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuizRunner } from "@/components/learn/quiz-runner";
import { getQuiz } from "@/lib/data/quizzes";
import { requireOnboarded } from "@/lib/session";

export const metadata: Metadata = {
  title: "Quiz",
  robots: { index: false, follow: false },
};

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireOnboarded();
  const { id } = await params;

  const quiz = await getQuiz(context, id);
  if (!quiz) notFound();

  return <QuizRunner quiz={quiz.quiz} questions={quiz.questions} />;
}
