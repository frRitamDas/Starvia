import { z } from "zod";
import { BOARD_IDS, CLASSES, DIFFICULTIES, EXAM_TYPE_IDS, LEARNING_LEVEL_IDS } from "@/lib/curriculum";

/** Small helpers shared by every schema. */
const trimmed = (max: number) => z.string().trim().max(max);
export const classLevelSchema = z.enum(CLASSES);
export const boardSchema = z.enum(BOARD_IDS as unknown as [string, ...string[]]);
export const difficultySchema = z.enum(DIFFICULTIES);
export const learningLevelSchema = z.enum(LEARNING_LEVEL_IDS as unknown as [string, ...string[]]);
export const examTypeSchema = z.enum(EXAM_TYPE_IDS as unknown as [string, ...string[]]);

/* ------------------------------- auth ------------------------------- */

export const signUpSchema = z.object({
  fullName: trimmed(80).min(2, "Please enter your full name."),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
  next: z.string().max(200).optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160),
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(200).optional(),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160),
});

export const passwordUpdateSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

/* ---------------------------- onboarding ---------------------------- */

export const profileSchema = z.object({
  full_name: trimmed(80).min(2, "Please enter your name."),
  class_level: classLevelSchema,
  board: boardSchema,
  subjects: z
    .array(trimmed(60).min(2))
    .min(1, "Pick at least one subject.")
    .max(10, "Pick up to 10 subjects."),
  learning_level: learningLevelSchema,
  exam_target: trimmed(60).optional().nullable(),
  markOnboarded: z.boolean().optional().default(true),
});

export const profileUpdateSchema = profileSchema.partial().extend({
  avatar_url: z.string().url().max(400).optional().nullable(),
});

/* ------------------------------ AI tutor ---------------------------- */

export const tutorChatSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  message: trimmed(4000).min(1, "Type a question first."),
  subject: trimmed(60).optional().nullable(),
  topic: trimmed(120).optional().nullable(),
  difficulty: difficultySchema.optional().default("medium"),
  /** Context override so a student can ask about another class without changing profile. */
  classLevel: classLevelSchema.optional().nullable(),
  board: boardSchema.optional().nullable(),
  regenerate: z.boolean().optional().default(false),
  /** Assistant message id whose answer should be regenerated. */
  regenerateMessageId: z.string().uuid().optional().nullable(),
  /** Response language hint for regional-medium students. */
  language: z.enum(["english", "hinglish", "hindi"]).optional().default("english"),
});

export const conversationPatchSchema = z.object({
  title: trimmed(120).min(1).optional(),
  pinned: z.boolean().optional(),
});

/* ----------------------------- tutorials ---------------------------- */

export const tutorialGenerateSchema = z.object({
  classLevel: classLevelSchema,
  board: boardSchema,
  subject: trimmed(60).min(2, "Choose a subject."),
  chapter: trimmed(120).optional().nullable(),
  topic: trimmed(160).min(2, "What topic should we teach?"),
  difficulty: difficultySchema.default("medium"),
  /** Set to false to force a fresh generation even if a cached one exists. */
  allowCache: z.boolean().optional().default(true),
});

/* -------------------------------- quiz ------------------------------ */

export const quizGenerateSchema = z.object({
  classLevel: classLevelSchema,
  board: boardSchema,
  subject: trimmed(60).min(2, "Choose a subject."),
  chapter: trimmed(120).optional().nullable(),
  topic: trimmed(160).optional().nullable(),
  difficulty: difficultySchema.default("medium"),
  count: z.coerce.number().int().min(3).max(30).default(10),
  types: z
    .array(z.enum(["mcq", "true_false", "short_answer"]))
    .min(1)
    .default(["mcq", "true_false", "short_answer"]),
});

export const quizSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: trimmed(400),
        timeTakenSeconds: z.coerce.number().int().min(0).max(3600).optional(),
      }),
    )
    .max(60),
  durationSeconds: z.coerce.number().int().min(0).max(24 * 3600).optional(),
});

/* ------------------------------ solver ------------------------------ */

export const solveSchema = z
  .object({
    question: trimmed(4000).optional().nullable(),
    imageBase64: z
      .string()
      .max(6_000_000, "That image is too large. Try a smaller photo.")
      .optional()
      .nullable(),
    imageMimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/heic"]).optional(),
    subject: trimmed(60).optional().nullable(),
    mode: z.enum(["explain", "hint"]).optional().default("explain"),
    language: z.enum(["english", "hinglish", "hindi"]).optional().default("english"),
  })
  .refine((data) => Boolean(data.question?.trim()) || Boolean(data.imageBase64), {
    message: "Type a question or upload a photo of it.",
    path: ["question"],
  });

/* ----------------------------- exam prep ---------------------------- */

export const examPlanSchema = z.object({
  board: boardSchema,
  classLevel: classLevelSchema,
  subject: trimmed(60).min(2, "Choose a subject."),
  chapter: trimmed(120).optional().nullable(),
  examType: examTypeSchema,
  plannedDays: z.coerce.number().int().min(1).max(60).optional().default(7),
});

export const topicStatusSchema = z.object({
  subject: trimmed(60).min(2),
  chapter: trimmed(120).optional().nullable(),
  topic: trimmed(160).min(2),
  status: z.enum(["not_started", "learning", "practiced", "mastered"]),
  minutesSpent: z.coerce.number().int().min(0).max(600).optional(),
});

/* ---------------------------- flashcards ---------------------------- */

export const flashcardDeckSchema = z.object({
  title: trimmed(120).min(2, "Give your deck a title."),
  subject: trimmed(60).min(2, "Choose a subject."),
  topic: trimmed(160).optional().nullable(),
  classLevel: classLevelSchema.optional().nullable(),
  board: boardSchema.optional().nullable(),
  source: z.enum(["manual", "ai", "tutorial"]).default("manual"),
  cards: z
    .array(
      z.object({
        front: trimmed(600).min(1, "A card needs a question."),
        back: trimmed(1500).min(1, "A card needs an answer."),
        hint: trimmed(300).optional().nullable(),
      }),
    )
    .max(60)
    .optional(),
});

export const flashcardGenerateSchema = z.object({
  subject: trimmed(60).min(2, "Choose a subject."),
  topic: trimmed(160).min(2, "Which topic should the deck cover?"),
  chapter: trimmed(120).optional().nullable(),
  classLevel: classLevelSchema.optional().nullable(),
  board: boardSchema.optional().nullable(),
  count: z.coerce.number().int().min(5).max(40).default(12),
  save: z.boolean().optional().default(true),
});

export const flashcardReviewSchema = z.object({
  cardId: z.string().uuid(),
  deckId: z.string().uuid(),
  result: z.enum(["known", "unknown"]),
});

/* ------------------------------- notes ------------------------------ */

export const studyNoteCreateSchema = z.object({
  title: trimmed(120).min(1, "Give your note a title."),
  subject: trimmed(60).min(1).default("General"),
  topic: trimmed(160).optional().nullable(),
  content: z.string().max(20000, "Notes can be up to 20,000 characters."),
});

export const studyNoteUpdateSchema = studyNoteCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Change at least one field.");

/* ------------------------------ payments ---------------------------- */

export const checkoutSchema = z.object({
  plan: z.enum(["pro", "ultra"]),
  billing: z.enum(["monthly", "yearly"]).optional().default("monthly"),
});

export const mockCheckoutSchema = z.object({
  plan: z.enum(["pro", "ultra", "free"]),
  action: z.enum(["activate", "cancel"]).default("activate"),
});

/* ------------------------------ feedback ---------------------------- */

export const feedbackSchema = z.object({
  category: z.enum(["bug", "idea", "content", "billing", "other"]).default("other"),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  message: trimmed(2000).min(5, "Tell us a little more."),
  page: trimmed(200).optional().nullable(),
});

export const messageFeedbackSchema = z.object({
  messageId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const contactSchema = z.object({
  name: trimmed(80).min(2, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  subject: trimmed(140).min(3, "Add a short subject."),
  message: trimmed(2000).min(10, "Tell us a little more."),
});

export type TutorChatInput = z.infer<typeof tutorChatSchema>;
export type TutorialGenerateInput = z.infer<typeof tutorialGenerateSchema>;
export type QuizGenerateInput = z.infer<typeof quizGenerateSchema>;
export type SolveInput = z.infer<typeof solveSchema>;
export type ExamPlanInput = z.infer<typeof examPlanSchema>;
export type FlashcardGenerateInput = z.infer<typeof flashcardGenerateSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
