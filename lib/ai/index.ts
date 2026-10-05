import {
  AiError,
  generateJson,
  generateText,
  streamText,
  type AiContent,
  type StreamResult,
} from "@/lib/ai/provider";
import {
  examPrepSystemPrompt,
  examPrepUserPrompt,
  flashcardSystemPrompt,
  flashcardUserPrompt,
  quizSystemPrompt,
  quizUserPrompt,
  solverSystemPrompt,
  solverUserPrompt,
  tutorialSystemPrompt,
  tutorialUserPrompt,
  tutorSystemPrompt,
  type StudentContext,
} from "@/lib/ai/prompts";
import {
  examPlanPayloadSchema,
  flashcardPayloadSchema,
  normaliseQuiz,
  quizPayloadSchema,
  tutorialContentSchema,
  type ExamPlanPayload,
  type FlashcardPayload,
  type QuizPayload,
  type TutorialContentPayload,
} from "@/lib/ai/schemas";
import { contentKey, withContentCache } from "@/lib/ai/cache";
import type { Difficulty } from "@/lib/curriculum";

/**
 * Starvia AI service layer.
 *
 * Every feature calls one of these functions. Nothing else in the codebase
 * talks to Gemini. Cached generations skip the model entirely.
 */

type CacheClient = Parameters<typeof withContentCache>[0]["supabase"];

export interface TutorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TutorRequest {
  context: StudentContext;
  history: TutorTurn[];
  message: string;
  regenerate?: boolean;
  signal?: AbortSignal;
}

/** Builds the Gemini conversation for the tutor. Keeps only useful history (cost control). */
function buildTutorMessages(request: TutorRequest): AiContent[] {
  const history = request.history.filter((turn) => turn.content.trim().length > 0).slice(-10);
  const messages: AiContent[] = history.map((turn) => ({
    role: turn.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: turn.content }],
  }));
  const last = history[history.length - 1];
  const alreadyHasMessage =
    last?.role === "user" && last.content.trim() === request.message.trim();

  if (!alreadyHasMessage || request.regenerate) {
    messages.push({ role: "user", parts: [{ text: request.message }] });
  }
  if (messages.length === 0) {
    messages.push({ role: "user", parts: [{ text: request.message }] });
  }
  return messages;
}

/** Streaming tutor answer. Yields text deltas and resolves with accounting info. */
export async function* generateTutorResponse(
  request: TutorRequest,
): AsyncGenerator<{ delta: string; full: string }, { text: string } & StreamResult, void> {
  const messages = buildTutorMessages({ ...request, regenerate: false });
  const stream = streamText({
    system: tutorSystemPrompt(request.context),
    messages,
    model: "default",
    temperature: 0.65,
    maxOutputTokens: 2048,
    label: "tutor",
  });

  let full = "";
  let meta: StreamResult | null = null;
  while (true) {
    const next = await stream.next();
    if (next.done) {
      meta = next.value;
      break;
    }
    full += next.value.text;
    yield { delta: next.value.text, full };
  }
  return { text: full, ...(meta as StreamResult) };
}

/* ----------------------------- tutorials ---------------------------- */

export interface TutorialResult {
  content: TutorialContentPayload;
  model: string | null;
  cached: boolean;
  tokens: number;
  cacheKey: string;
}

export async function generateTutorial(
  input: {
    classLevel: string;
    board: string;
    subject: string;
    chapter?: string | null;
    topic: string;
    difficulty: Difficulty | string;
    learningLevel?: string | null;
  },
  supabase?: CacheClient,
): Promise<TutorialResult> {
  const cacheKey = contentKey("tutorial:v1", {
    class: input.classLevel,
    board: input.board,
    subject: input.subject,
    chapter: input.chapter ?? "",
    topic: input.topic,
    difficulty: input.difficulty,
  });

  const { payload, model, cached, tokens } = await withContentCache<TutorialContentPayload>({
    key: cacheKey,
    kind: "tutorial",
    supabase,
    fetcher: async () => {
      const { data, result } = await generateJson<unknown>({
        system: tutorialSystemPrompt(),
        messages: [{ role: "user", parts: [{ text: tutorialUserPrompt(input) }] }],
        model: "default",
        temperature: 0.45,
        maxOutputTokens: 8192,
        label: "tutorial",
      });
      const parsed = tutorialContentSchema.safeParse(data);
      if (!parsed.success) {
        throw new AiError(
          "bad_response",
          "AI returned an incomplete tutorial. Please try again.",
          parsed.error.issues[0]?.message,
        );
      }
      return { payload: parsed.data, model: result.model, tokens: result.totalTokens };
    },
  });

  return { content: payload, model, cached, tokens: tokens ?? 0, cacheKey };
}

/* -------------------------------- quiz ------------------------------ */

export interface QuizResult {
  payload: QuizPayload;
  model: string | null;
  cached: boolean;
  cacheKey: string;
}

export async function generateQuiz(
  input: {
    classLevel: string;
    board: string;
    subject: string;
    chapter?: string | null;
    topic?: string | null;
    difficulty: Difficulty | string;
    count: number;
    types: string[];
  },
  supabase?: CacheClient,
): Promise<QuizResult> {
  // Quiz content is randomised per generation, so it is never cached — a student
  // asking for a quiz twice should get different questions.
  const cacheKey = contentKey("quiz:v1", {
    ...input,
    nonce: Math.floor(Date.now() / 1000 / 60),
  });

  const { data, result } = await generateJson<unknown>({
    system: quizSystemPrompt(),
    messages: [{ role: "user", parts: [{ text: quizUserPrompt(input) }] }],
    model: "default",
    temperature: 0.7,
    maxOutputTokens: 8192,
    label: "quiz",
  });

  const parsed = quizPayloadSchema.safeParse(data);
  if (!parsed.success) {
    throw new AiError(
      "bad_response",
      "AI returned an incomplete quiz. Please try again.",
      parsed.error.issues[0]?.message,
    );
  }
  const normalised = normaliseQuiz(parsed.data);
  if (normalised.questions.length === 0) {
    throw new AiError("bad_response", "AI could not build a valid quiz. Please try again.");
  }
  void supabase;
  return { payload: normalised, model: result.model, cached: false, cacheKey };
}

/* ------------------------------- solver ----------------------------- */

export interface SolveResult {
  markdown: string;
  subject: string | null;
  topic: string | null;
  model: string;
  tokens: number;
}

export async function solveQuestion(
  input: {
    question?: string | null;
    imageBase64?: string | null;
    imageMimeType?: string | null;
    subject?: string | null;
    mode?: "explain" | "hint";
    context: StudentContext;
  },
  supabase?: CacheClient,
): Promise<SolveResult> {
  const hasImage = Boolean(input.imageBase64);
  const vision = hasImage;

  const parts: AiContent["parts"] = [];
  if (hasImage && input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.imageMimeType || "image/jpeg",
        data: input.imageBase64,
      },
    });
  }
  const typedQuestion = input.question?.trim();
  parts.push({
    text: typedQuestion
      ? solverUserPrompt(typedQuestion, input.context)
      : `${solverUserPrompt(
          "Please solve the question shown in the image.",
          input.context,
        )}\n\nRead the image carefully. If any part is illegible, list exactly what is unclear.`,
  });

  const system = solverSystemPrompt({ ...input.context, hasImage, mode: input.mode ?? "explain" });

  const result = await generateText({
    system,
    messages: [{ role: "user", parts }],
    model: vision ? "vision" : "default",
    temperature: 0.35,
    maxOutputTokens: 4096,
    label: vision ? "solver:vision" : "solver",
  });
  void supabase;

  const subjectMatch = result.text.match(/^#{0,3}\s*Subject[^\n]*?—?\s*(.+)$/im);
  return {
    markdown: result.text,
    subject: input.subject ?? subjectMatch?.[1]?.split(/[—–-]/)[0]?.trim() ?? null,
    topic: null,
    model: result.model,
    tokens: result.totalTokens,
  };
}

/* ----------------------------- flashcards --------------------------- */

export async function generateFlashcards(
  input: {
    subject: string;
    topic: string;
    chapter?: string | null;
    classLevel?: string | null;
    board?: string | null;
    count: number;
  },
  supabase?: CacheClient,
): Promise<{ payload: FlashcardPayload; model: string | null; cached: boolean }> {
  const cacheKey = contentKey("flashcards:v1", {
    class: input.classLevel ?? "",
    board: input.board ?? "",
    subject: input.subject,
    chapter: input.chapter ?? "",
    topic: input.topic,
    count: input.count,
  });

  const { payload, model, cached } = await withContentCache<FlashcardPayload>({
    key: cacheKey,
    kind: "flashcards",
    supabase,
    fetcher: async () => {
      const { data, result } = await generateJson<unknown>({
        system: flashcardSystemPrompt(),
        messages: [{ role: "user", parts: [{ text: flashcardUserPrompt(input) }] }],
        model: "fast",
        temperature: 0.5,
        maxOutputTokens: 4096,
        label: "flashcards",
      });
      const parsed = flashcardPayloadSchema.safeParse(data);
      if (!parsed.success) {
        throw new AiError(
          "bad_response",
          "AI returned an incomplete deck. Please try again.",
          parsed.error.issues[0]?.message,
        );
      }
      return { payload: parsed.data, model: result.model, tokens: result.totalTokens };
    },
  });

  return { payload, model, cached };
}

/* ----------------------------- exam prep ---------------------------- */

export async function generateExamPlan(
  input: {
    board: string;
    classLevel: string;
    subject: string;
    chapter?: string | null;
    examType: string;
    plannedDays: number;
  },
  supabase?: CacheClient,
): Promise<{ payload: ExamPlanPayload; model: string | null; cached: boolean }> {
  const cacheKey = contentKey("examplan:v1", {
    board: input.board,
    class: input.classLevel,
    subject: input.subject,
    chapter: input.chapter ?? "",
    examType: input.examType,
    days: input.plannedDays,
  });

  const { payload, model, cached } = await withContentCache<ExamPlanPayload>({
    key: cacheKey,
    kind: "exam_plan",
    supabase,
    ttlSeconds: 60 * 60 * 24 * 30,
    fetcher: async () => {
      const { data, result } = await generateJson<unknown>({
        system: examPrepSystemPrompt(),
        messages: [{ role: "user", parts: [{ text: examPrepUserPrompt(input) }] }],
        model: "default",
        temperature: 0.5,
        maxOutputTokens: 8192,
        label: "exam_prep",
      });
      const parsed = examPlanPayloadSchema.safeParse(data);
      if (!parsed.success) {
        throw new AiError(
          "bad_response",
          "AI returned an incomplete revision plan. Please try again.",
          parsed.error.issues[0]?.message,
        );
      }
      return { payload: parsed.data, model: result.model, tokens: result.totalTokens };
    },
  });

  return { payload, model, cached };
}

export { AiError };
