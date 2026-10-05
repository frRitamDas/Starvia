/**
 * SINGLE SOURCE OF TRUTH for plans, quotas and capabilities.
 *
 * Nothing in the app hard-codes a limit. Server routes read from here
 * (optionally overridden per-plan by the `plan_limits` table so limits can be
 * changed without a redeploy). The UI reads the same values through
 * `/api/usage` and `PLANS` for display only — the server always re-checks.
 *
 * This module is imported by client components, so it must never read
 * non-public environment variables. Razorpay recurring plan ids live in
 * `lib/payments/plan-ids.ts` (server-only).
 */

export type PlanId = "free" | "pro" | "ultra";

/** Every metered AI capability. Add a key here and it is enforced everywhere. */
export const AI_FEATURES = [
  "tutor",
  "tutorial",
  "quiz",
  "image",
  "solver",
  "flashcards",
  "exam_prep",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

export type PlanLimits = Record<AiFeature, number>;

export interface PlanCapabilities {
  /** Full mock tests + long-form revision plans. */
  advancedExamPrep: boolean;
  /** Deep analytics: mastery, weak areas, learning-time breakdown. */
  advancedProgress: boolean;
  /** Generate flashcard decks with AI (manual decks are always free). */
  flashcardGeneration: boolean;
  /** Larger context / more questions per generation request. */
  priorityAi: boolean;
  /** Max questions in a single quiz generation. */
  maxQuizQuestions: number;
  /** Max flashcard cards per generation. */
  maxFlashcards: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in INR. 0 = free. */
  priceInr: number;
  /** Price shown when billed yearly (INR/month equivalent) — optional. */
  yearlyPriceInr: number | null;
  limits: PlanLimits;
  capabilities: PlanCapabilities;
  marketing: {
    badge?: string;
    highlights: string[];
  };
}

export const FEATURE_LABELS: Record<AiFeature, string> = {
  tutor: "AI tutor messages",
  tutorial: "AI tutorials",
  quiz: "AI quizzes",
  image: "Image questions",
  solver: "Question solving",
  flashcards: "AI flashcard decks",
  exam_prep: "Exam prep plans",
};

export const FEATURE_EMPTY_MESSAGE: Record<AiFeature, string> = {
  tutor: "You've used all of today's tutor messages.",
  tutorial: "You've reached today's tutorial limit.",
  quiz: "You've reached today's quiz limit.",
  image: "You've used today's image question.",
  solver: "You've reached today's question-solving limit.",
  flashcards: "You've reached today's flashcard generation limit.",
  exam_prep: "You've reached today's exam prep limit.",
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    tagline: "Everything you need to build the habit.",
    priceInr: 0,
    yearlyPriceInr: null,
    limits: {
      tutor: 5,
      tutorial: 2,
      quiz: 3,
      image: 1,
      solver: 3,
      flashcards: 0,
      exam_prep: 1,
    },
    capabilities: {
      advancedExamPrep: false,
      advancedProgress: false,
      flashcardGeneration: false,
      priorityAi: false,
      maxQuizQuestions: 10,
      maxFlashcards: 0,
    },
    marketing: {
      highlights: [
        "5 AI tutor messages per day",
        "2 AI tutorials per day",
        "3 AI quizzes per day",
        "1 image question per day",
        "Private notes, mind maps and mistake review",
        "Streaks, XP and basic progress",
      ],
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For students who study every single day.",
    priceInr: 99,
    yearlyPriceInr: 79,
    limits: {
      tutor: 30,
      tutorial: 5,
      quiz: 10,
      image: 5,
      solver: 15,
      flashcards: 10,
      exam_prep: 5,
    },
    capabilities: {
      advancedExamPrep: true,
      advancedProgress: true,
      flashcardGeneration: true,
      priorityAi: false,
      maxQuizQuestions: 20,
      maxFlashcards: 20,
    },
    marketing: {
      badge: "Most popular",
      highlights: [
        "30 AI tutor messages per day",
        "5 AI tutorials per day",
        "10 AI quizzes per day",
        "5 image questions per day",
        "AI flashcard generation",
        "Advanced exam prep & analytics",
      ],
    },
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    tagline: "Board exams, competitive prep, zero limits in the way.",
    priceInr: 249,
    yearlyPriceInr: 199,
    limits: {
      tutor: 100,
      tutorial: 15,
      quiz: 30,
      image: 15,
      solver: 50,
      flashcards: 30,
      exam_prep: 15,
    },
    capabilities: {
      advancedExamPrep: true,
      advancedProgress: true,
      flashcardGeneration: true,
      priorityAi: true,
      maxQuizQuestions: 30,
      maxFlashcards: 40,
    },
    marketing: {
      badge: "Best value",
      highlights: [
        "100 AI tutor messages per day",
        "15 AI tutorials per day",
        "30 AI quizzes per day",
        "15 image questions per day",
        "Priority AI access",
        "Full mock tests + deep analytics",
      ],
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "ultra"];
export const PAID_PLAN_ORDER: PlanId[] = ["pro", "ultra"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_ORDER as string[]).includes(value);
}

export function getPlan(planId: string | null | undefined): Plan {
  return isPlanId(planId) ? PLANS[planId] : PLANS.free;
}

export function getLimits(planId: string | null | undefined): PlanLimits {
  return getPlan(planId).limits;
}

export function getCapabilities(planId: string | null | undefined): PlanCapabilities {
  return getPlan(planId).capabilities;
}

export function planRank(planId: PlanId) {
  return PLAN_ORDER.indexOf(planId);
}

export function isUpgrade(from: PlanId, to: PlanId) {
  return planRank(to) > planRank(from);
}

/** Free-tier copy used in upgrade nudges. */
export function upgradeSuggestion(planId: PlanId): PlanId {
  return planId === "free" ? "pro" : "ultra";
}

/* ------------------------------------------------------------------ */
/* Subscription lifecycle                                              */
/* ------------------------------------------------------------------ */

export type SubscriptionStatus =
  | "active"
  | "created"
  | "authenticated"
  | "pending"
  | "halted"
  | "paused"
  | "cancelled"
  | "completed"
  | "expired";
export type SubscriptionProvider = "free" | "razorpay" | "mock";

/** A subscription currently grants its plan when it is active/pending-paid and unexpired. */
export function subscriptionGrantsAccess(sub: {
  status: SubscriptionStatus | string;
  current_period_end: string | null;
} | null): boolean {
  if (!sub) return true; // no row => free tier
  if (!["active", "authenticated", "created", "pending"].includes(sub.status)) return false;
  if (!sub.current_period_end) return true;
  return new Date(sub.current_period_end).getTime() > Date.now();
}

/** Days remaining until renewal / expiry, or null for the free plan. */
export function daysRemaining(currentPeriodEnd: string | null): number | null {
  if (!currentPeriodEnd) return null;
  const ms = new Date(currentPeriodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/* ------------------------------------------------------------------ */
/* Gamification: XP → level and badges                                 */
/* ------------------------------------------------------------------ */

export const XP_REWARDS = {
  tutorial_complete: 40,
  quiz_complete: 30,
  quiz_perfect: 25,
  tutor_message: 2,
  question_solved: 10,
  card_reviewed: 1,
  streak_day: 15,
  exam_topic_mastered: 20,
} as const;

export type XpEvent = keyof typeof XP_REWARDS;

/** Level curve: level n requires 120 * n^1.35 XP cumulative (rounded). */
export function levelFromXp(xp: number) {
  let level = 1;
  let spent = 0;
  while (level < 99) {
    const needed = Math.round(120 * Math.pow(level, 1.35));
    if (xp < spent + needed) break;
    spent += needed;
    level += 1;
  }
  const nextRequirement = Math.round(120 * Math.pow(level, 1.35));
  return {
    level,
    xpIntoLevel: Math.max(0, xp - spent),
    xpForNextLevel: nextRequirement,
    progress: Math.min(100, Math.round(((xp - spent) / nextRequirement) * 100)),
  };
}
