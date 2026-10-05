import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type {
  MistakeReviewItem,
  Quiz,
  QuizAnswerRecord,
  QuizAttempt,
  QuizQuestion,
  SafeQuizQuestion,
} from "@/lib/types";
import type { QuizPayload } from "@/lib/ai/schemas";

/** Quiz persistence, grading and analytics. Answers are never sent to the client early. */

export async function saveQuiz(
  context: SessionContext,
  input: {
    classLevel: string;
    board: string;
    subject: string;
    chapter?: string | null;
    topic?: string | null;
    difficulty: string;
    payload: QuizPayload;
    model: string | null;
    cacheKey: string;
  },
): Promise<Quiz> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const quizPayload = {
    user_id: context.user.id,
    title: input.payload.title || `${input.subject} quiz`,
    class_level: input.classLevel,
    board: input.board,
    subject: input.subject,
    chapter: input.chapter ?? null,
    topic: input.topic ?? null,
    difficulty: input.difficulty,
    question_count: input.payload.questions.length,
    cache_key: input.cacheKey,
  };

  if (context.demo) {
    const store = demoStore();
    const now = new Date().toISOString();
    const quiz: Quiz = { id: demoId("4"), ...quizPayload, created_at: now };
    store.quizzes.unshift(quiz);
    input.payload.questions.forEach((question, index) => {
      store.quizQuestions.push({
        id: demoId("4"),
        quiz_id: quiz.id,
        user_id: context.user!.id,
        position: index,
        type: question.type,
        question: question.question,
        options: question.options,
        correct_answer: question.correctAnswer,
        explanation: question.explanation,
        topic: question.topic || null,
        difficulty: question.difficulty,
        marks: question.marks,
      });
    });
    return quiz;
  }

  const { data: quiz, error } = await context.db!.from("quizzes").insert(quizPayload).select("*").single();
  if (error || !quiz) {
    console.error("[quizzes] save:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save that quiz. Please try again.");
  }

  const rows = input.payload.questions.map((question, index) => ({
    quiz_id: (quiz as { id: string }).id,
    user_id: context.user!.id,
    position: index,
    type: question.type,
    question: question.question,
    options: question.options as unknown as never,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    topic: question.topic || null,
    difficulty: question.difficulty,
    marks: question.marks,
  }));

  const { error: questionsError } = await context.db!.from("quiz_questions").insert(rows);
  if (questionsError) {
    console.error("[quizzes] save questions:", questionsError.message);
    throw new ApiError("SERVER_ERROR", "Could not save the quiz questions.");
  }

  return quiz as unknown as Quiz;
}

export async function listQuizzes(context: SessionContext, limit = 20): Promise<Quiz[]> {
  if (!context.user) return [];
  if (context.demo) {
    return [...demoStore().quizzes]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const { data, error } = await context.db!
    .from("quizzes")
    .select("*")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as Quiz[];
}

export async function getQuiz(
  context: SessionContext,
  quizId: string,
): Promise<{ quiz: Quiz; questions: SafeQuizQuestion[] } | null> {
  if (!context.user) return null;

  if (context.demo) {
    const store = demoStore();
    const quiz = store.quizzes.find((item) => item.id === quizId);
    if (!quiz) return null;
    const questions = store.quizQuestions
      .filter((question) => question.quiz_id === quizId)
      .sort((a, b) => a.position - b.position)
      .map(stripAnswer);
    return { quiz, questions };
  }

  const { data: quiz, error } = await context.db!
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !quiz) return null;

  const { data: questions } = await context.db!
    .from("quiz_questions")
    .select("id, quiz_id, user_id, position, type, question, options, topic, difficulty, marks")
    .eq("quiz_id", quizId)
    .eq("user_id", context.user.id)
    .order("position", { ascending: true });

  return {
    quiz: quiz as unknown as Quiz,
    questions: ((questions ?? []) as unknown as SafeQuizQuestion[]).map((question) => ({
      ...question,
      options: (question.options as unknown as string[] | null) ?? null,
    })),
  };
}

/** Server-side grading. The client never sees the answer key before submitting. */
export async function gradeAttempt(
  context: SessionContext,
  quizId: string,
  answers: { questionId: string; answer: string }[],
): Promise<{
  score: number;
  total: number;
  percentage: number;
  records: QuizAnswerRecord[];
  details: (QuizQuestion & { given: string; correct: boolean })[];
}> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const questions = await getFullQuestions(context, quizId);
  if (questions.length === 0) throw new ApiError("NOT_FOUND", "That quiz is no longer available.");

  const byId = new Map(questions.map((question) => [question.id, question]));
  const records: QuizAnswerRecord[] = [];
  const details: (QuizQuestion & { given: string; correct: boolean })[] = [];
  let score = 0;

  for (const submission of answers) {
    const question = byId.get(submission.questionId);
    if (!question) continue;
    const correct = isCorrect(question, submission.answer);
    if (correct) score += question.marks;
    records.push({ questionId: question.id, answer: submission.answer, correct });
    details.push({ ...question, given: submission.answer, correct });
  }

  // Unanswered questions are recorded as incorrect so the score is honest.
  for (const question of questions) {
    if (records.some((record) => record.questionId === question.id)) continue;
    records.push({ questionId: question.id, answer: "", correct: false });
    details.push({ ...question, given: "", correct: false });
  }

  const total = questions.reduce((sum, question) => sum + question.marks, 0);
  return {
    score,
    total,
    percentage: total ? Math.round((score / total) * 10000) / 100 : 0,
    records,
    details,
  };
}

export async function recordAttempt(
  context: SessionContext,
  input: {
    quizId: string;
    score: number;
    total: number;
    percentage: number;
    records: QuizAnswerRecord[];
    weakTopics: string[];
    durationSeconds?: number | null;
  },
): Promise<QuizAttempt> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    user_id: context.user.id,
    quiz_id: input.quizId,
    score: input.score,
    total: input.total,
    percentage: input.percentage,
    answers: input.records as unknown as never,
    weak_topics: input.weakTopics,
    duration_seconds: input.durationSeconds ?? null,
  };

  if (context.demo) {
    const attempt: QuizAttempt = {
      id: demoId("4"),
      ...payload,
      answers: input.records,
      weak_topics: input.weakTopics,
      duration_seconds: input.durationSeconds ?? null,
      created_at: new Date().toISOString(),
    };
    demoStore().quizAttempts.unshift(attempt);
    return attempt;
  }

  const { data, error } = await context.db!.from("quiz_attempts").insert(payload).select("*").single();
  if (error || !data) {
    console.error("[quizzes] recordAttempt:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save your attempt.");
  }
  return mapAttempt(data);
}

export async function listAttempts(context: SessionContext, limit = 20): Promise<QuizAttempt[]> {
  if (!context.user) return [];
  if (context.demo) {
    return [...demoStore().quizAttempts]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const { data, error } = await context.db!
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapAttempt);
}

export async function getAttempt(
  context: SessionContext,
  attemptId: string,
): Promise<{ attempt: QuizAttempt; quiz: Quiz | null; details: QuizQuestion[] } | null> {
  if (!context.user) return null;

  if (context.demo) {
    const store = demoStore();
    const attempt = store.quizAttempts.find((item) => item.id === attemptId);
    if (!attempt) return null;
    const quiz = store.quizzes.find((item) => item.id === attempt.quiz_id) ?? null;
    const details = store.quizQuestions
      .filter((question) => question.quiz_id === attempt.quiz_id)
      .sort((a, b) => a.position - b.position);
    return { attempt, quiz, details };
  }

  const { data: attempt } = await context.db!
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!attempt) return null;

  const mapped = mapAttempt(attempt);
  const { data: quiz } = await context.db!
    .from("quizzes")
    .select("*")
    .eq("id", mapped.quiz_id)
    .eq("user_id", context.user.id)
    .maybeSingle();

  const { data: details } = await context.db!
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", mapped.quiz_id)
    .eq("user_id", context.user.id)
    .order("position", { ascending: true });

  return {
    attempt: mapped,
    quiz: (quiz as unknown as Quiz | null) ?? null,
    details: (details ?? []) as unknown as QuizQuestion[],
  };
}

export async function deleteAttempt(context: SessionContext, attemptId: string) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");
  if (context.demo) {
    const store = demoStore();
    store.quizAttempts = store.quizAttempts.filter((attempt) => attempt.id !== attemptId);
    return;
  }
  await context.db!.from("quiz_attempts").delete().eq("id", attemptId).eq("user_id", context.user.id);
}

/** Weak areas are topics where the student answered incorrectly or skipped. */
export function weakTopicsFrom(
  details: { topic: string | null; given: string; correct: boolean }[],
): string[] {
  const counter = new Map<string, number>();
  for (const detail of details) {
    if (detail.correct || !detail.topic) continue;
    counter.set(detail.topic, (counter.get(detail.topic) ?? 0) + 1);
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * A lightweight mistake bank derived from the latest 100 server-graded quiz
 * attempts. A question leaves the active bank once its latest attempt is right.
 */
export async function listMistakeBank(context: SessionContext, limit = 120): Promise<MistakeReviewItem[]> {
  if (!context.user) return [];

  const attempts = await listAttempts(context, 100);
  const byQuestion = new Map<
    string,
    { latestCorrect: boolean; latestAnswer: string; latestAt: string; quizId: string; misses: number }
  >();

  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      const item = byQuestion.get(answer.questionId);
      if (!item) {
        byQuestion.set(answer.questionId, {
          latestCorrect: answer.correct,
          latestAnswer: answer.answer,
          latestAt: attempt.created_at,
          quizId: attempt.quiz_id,
          misses: answer.correct ? 0 : 1,
        });
      } else if (!answer.correct) {
        item.misses += 1;
      }
    }
  }

  const active = [...byQuestion.entries()]
    .filter(([, item]) => !item.latestCorrect)
    .sort((left, right) => right[1].latestAt.localeCompare(left[1].latestAt))
    .slice(0, limit);
  if (active.length === 0) return [];

  const questionIds = active.map(([id]) => id);
  const quizIds = [...new Set(active.map(([, item]) => item.quizId))];
  let questions: QuizQuestion[] = [];
  let quizzes: Pick<Quiz, "id" | "title" | "subject" | "chapter">[] = [];

  if (context.demo) {
    const store = demoStore();
    questions = store.quizQuestions.filter((question) => questionIds.includes(question.id));
    quizzes = store.quizzes.filter((quiz) => quizIds.includes(quiz.id));
  } else {
    const [questionResult, quizResult] = await Promise.all([
      context.db!
        .from("quiz_questions")
        .select("*")
        .eq("user_id", context.user.id)
        .in("id", questionIds),
      context.db!
        .from("quizzes")
        .select("id, title, subject, chapter")
        .eq("user_id", context.user.id)
        .in("id", quizIds),
    ]);
    if (questionResult.error || quizResult.error) {
      console.error("[quizzes] listMistakeBank:", questionResult.error?.message ?? quizResult.error?.message);
      return [];
    }
    questions = (questionResult.data ?? []) as unknown as QuizQuestion[];
    quizzes = (quizResult.data ?? []) as unknown as Pick<Quiz, "id" | "title" | "subject" | "chapter">[];
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  return active.flatMap(([questionId, attempt]) => {
    const question = questionById.get(questionId);
    const quiz = question ? quizById.get(question.quiz_id) : undefined;
    if (!question || !quiz) return [];
    return [{
      questionId,
      question: question.question,
      options: (question.options as unknown as string[] | null) ?? null,
      given: attempt.latestAnswer,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      subject: quiz.subject,
      chapter: quiz.chapter,
      topic: question.topic ?? null,
      quizId: question.quiz_id,
      quizTitle: quiz.title,
      timesMissed: attempt.misses,
      lastMissedAt: attempt.latestAt,
    }];
  });
}

/* ------------------------------ internals ---------------------------- */

async function getFullQuestions(context: SessionContext, quizId: string): Promise<QuizQuestion[]> {
  if (context.demo) {
    return demoStore().quizQuestions.filter((question) => question.quiz_id === quizId);
  }
  const { data } = await context.db!
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("user_id", context.user!.id)
    .order("position", { ascending: true });
  return ((data ?? []) as unknown as QuizQuestion[]).map((question) => ({
    ...question,
    options: (question.options as unknown as string[] | null) ?? null,
  }));
}

function isCorrect(question: QuizQuestion, answer: string) {
  const given = (answer ?? "").trim().toLowerCase();
  const expected = (question.correct_answer ?? "").trim().toLowerCase();
  if (!given) return false;
  if (question.type === "short_answer") {
    // Self-marked style: accept if the key facts match closely enough.
    if (given === expected) return true;
    const keywords = expected
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);
    if (keywords.length === 0) return false;
    const hits = keywords.filter((word) => given.includes(word)).length;
    return hits / keywords.length >= 0.6;
  }
  if (given === expected) return true;
  return given.replace(/\s+/g, "") === expected.replace(/\s+/g, "");
}

function stripAnswer(question: QuizQuestion): SafeQuizQuestion {
  const { correct_answer: _answer, explanation: _explanation, ...safe } = question;
  return {
    ...safe,
    options: (question.options as unknown as string[] | null) ?? null,
  } as SafeQuizQuestion;
}

function mapAttempt(row: unknown): QuizAttempt {
  const attempt = row as unknown as QuizAttempt;
  return {
    ...attempt,
    answers: (attempt.answers as unknown as QuizAnswerRecord[]) ?? [],
    weak_topics: (attempt.weak_topics as unknown as string[]) ?? [],
  };
}
