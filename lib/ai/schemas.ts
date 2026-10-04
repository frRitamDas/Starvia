import { z } from "zod";

/**
 * Validation for AI-generated JSON.
 *
 * Models are instructed to return exact shapes, but we always validate and
 * normalise before writing to the database or rendering. Anything invalid is
 * repaired where safe, otherwise the request fails with a friendly error.
 */

const str = (max = 4000) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0 && value.length <= max, "text length");

const strArray = (max = 30, itemMax = 400) => z.array(str(itemMax)).max(max).default([]);

/* ------------------------------ tutorial ---------------------------- */

export const tutorialContentSchema = z.object({
  title: str(200),
  learningObjectives: strArray(10, 300),
  introduction: str(6000),
  sections: z
    .array(
      z.object({
        heading: str(200),
        body: str(8000),
        keyPoints: strArray(8, 300).optional().default([]),
      }),
    )
    .min(1)
    .max(12),
  examples: z
    .array(
      z.object({
        title: str(200).optional().default("Worked example"),
        problem: str(4000),
        solution: str(8000),
        takeaway: str(600).optional().default(""),
      }),
    )
    .max(8)
    .default([]),
  importantTerms: z
    .array(z.object({ term: str(120), meaning: str(600) }))
    .max(20)
    .default([]),
  examTips: strArray(10, 500),
  commonMistakes: strArray(10, 500),
  practiceQuestions: z
    .array(
      z.object({
        question: str(2000),
        answer: str(2000),
        hint: str(500).optional().default(""),
      }),
    )
    .max(12)
    .default([]),
  summary: str(4000),
});

export type TutorialContentPayload = z.infer<typeof tutorialContentSchema>;

/* -------------------------------- quiz ------------------------------ */

export const quizPayloadSchema = z.object({
  title: str(200).optional().default("Practice quiz"),
  questions: z
    .array(
      z.object({
        type: z.enum(["mcq", "true_false", "short_answer"]).catch("mcq"),
        question: str(2500),
        options: z
          .union([z.array(str(400)).max(6), z.null()])
          .optional()
          .transform((value) => {
            if (!value) return null;
            const unique = [...new Set(value)];
            return unique.length >= 2 ? unique.slice(0, 6) : null;
          }),
        correctAnswer: str(600),
        explanation: str(2500).optional().default(""),
        topic: str(200).optional().default(""),
        difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
        marks: z.coerce.number().int().min(1).max(10).catch(1),
      }),
    )
    .min(1)
    .max(40),
});

export type QuizPayload = z.infer<typeof quizPayloadSchema>;

/** Ensure an mcq has real options and a correct answer that exists in them. */
export function normaliseQuiz(payload: QuizPayload): QuizPayload {
  const questions = payload.questions
    .map((question) => {
      if (question.type === "true_false") {
        const options = ["True", "False"];
        const answer = /^true$/i.test(question.correctAnswer)
          ? "True"
          : /^false$/i.test(question.correctAnswer)
            ? "False"
            : (options.find((option) => option.toLowerCase() === question.correctAnswer.toLowerCase()) ??
              "True");
        return { ...question, options, correctAnswer: answer };
      }
      if (question.type === "mcq") {
        const options = question.options ?? [];
        if (options.length < 2) return null; // drop malformed mcq
        const match =
          options.find((option) => option.trim() === question.correctAnswer.trim()) ??
          options.find(
            (option) =>
              option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase() ||
              option.trim().toLowerCase().startsWith(question.correctAnswer.trim().toLowerCase()),
          ) ??
          options.find((option) => option.trim().toLowerCase().includes(question.correctAnswer.trim().toLowerCase()));
        if (!match) return null; // answer must be one of the options
        return { ...question, options, correctAnswer: match };
      }
      return { ...question, options: null };
    })
    .filter((question): question is QuizPayload["questions"][number] => question !== null);

  return { ...payload, questions };
}

/* ------------------------------- solver ----------------------------- */

export const solutionSchema = z.object({
  subject: str(120).optional().default("General"),
  topic: str(200).optional().default(""),
  markdown: str(12000),
  finalAnswer: str(2000).optional().default(""),
  practiceQuestion: str(2000).optional().default(""),
});

export type SolutionPayload = z.infer<typeof solutionSchema>;

/* ----------------------------- flashcards --------------------------- */

export const flashcardPayloadSchema = z.object({
  title: str(200).optional().default("Flashcards"),
  cards: z
    .array(
      z.object({
        front: str(600),
        back: str(1500),
        hint: str(400).optional().default(""),
      }),
    )
    .min(1)
    .max(60),
});

export type FlashcardPayload = z.infer<typeof flashcardPayloadSchema>;

/* ----------------------------- exam prep ---------------------------- */

export const examPlanPayloadSchema = z.object({
  title: str(200),
  overview: str(2000),
  totalStudyHours: z.coerce.number().min(0).max(400).catch(0),
  importantTopics: z
    .array(
      z.object({
        name: str(200),
        why: str(600).optional().default(""),
        weightage: z.enum(["high", "medium", "low"]).catch("medium"),
        estimatedMinutes: z.coerce.number().int().min(0).max(600).catch(30),
      }),
    )
    .max(30)
    .default([]),
  plan: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1).max(90),
        focus: str(200),
        tasks: strArray(8, 300),
        minutes: z.coerce.number().int().min(0).max(600).catch(45),
      }),
    )
    .max(30)
    .default([]),
  keyFormulas: z
    .array(z.object({ name: str(200), formula: str(600) }))
    .max(40)
    .default([]),
  practiceQuestions: z
    .array(
      z.object({
        question: str(2000),
        answer: str(2000),
        marks: z.coerce.number().int().min(1).max(20).catch(2),
        difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
      }),
    )
    .max(30)
    .default([]),
  mcqs: z
    .array(
      z.object({
        question: str(2000),
        options: z.array(str(400)).min(2).max(6),
        correctAnswer: str(600),
        explanation: str(2000).optional().default(""),
      }),
    )
    .max(30)
    .default([]),
  mockTestBlueprint: z
    .array(
      z.object({
        section: str(200),
        questionCount: z.coerce.number().int().min(0).max(100).catch(0),
        marks: z.coerce.number().int().min(0).max(200).catch(0),
        guidance: str(600).optional().default(""),
      }),
    )
    .max(12)
    .default([]),
  weakAreaStrategy: strArray(12, 600),
  examDayTips: strArray(12, 600),
});

export type ExamPlanPayload = z.infer<typeof examPlanPayloadSchema>;
