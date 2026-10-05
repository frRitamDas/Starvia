import type { PlanId, SubscriptionProvider, SubscriptionStatus } from "@/lib/plans";
import type { AiFeature } from "@/lib/plans";

export type { PlanId, SubscriptionStatus, SubscriptionProvider, AiFeature };

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  class_level: string | null;
  board: string | null;
  subjects: string[] | null;
  learning_level: string | null;
  exam_target: string | null;
  avatar_url: string | null;
  onboarded_at: string | null;
  xp: number;
  level: number;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
  study_minutes: number;
  role: "student" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  provider_subscription_id: string | null;
  provider_plan_id: string | null;
  provider_payment_id: string | null;
  billing_interval: "monthly" | "yearly" | null;
  provider_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  amount_inr: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount_inr: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  provider: "razorpay" | "mock";
  order_id: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  signature_verified: boolean;
  notes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRow {
  id: string;
  user_id: string;
  usage_date: string;
  feature: AiFeature;
  used: number;
  tokens_used: number;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  class_level: string | null;
  board: string | null;
  difficulty: string | null;
  pinned: boolean;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  tokens: number | null;
  rating: -1 | 0 | 1 | null;
  latency_ms: number | null;
  created_at: string;
}

export interface TutorialSection {
  heading: string;
  body: string;
  keyPoints?: string[];
}

export interface TutorialExample {
  title: string;
  problem: string;
  solution: string;
  takeaway?: string;
}

export interface PracticeQuestion {
  question: string;
  answer: string;
  hint?: string;
}

export interface TutorialContent {
  title: string;
  learningObjectives: string[];
  introduction: string;
  sections: TutorialSection[];
  examples: TutorialExample[];
  importantTerms: { term: string; meaning: string }[];
  examTips: string[];
  commonMistakes: string[];
  practiceQuestions: PracticeQuestion[];
  summary: string;
}

export interface Tutorial {
  id: string;
  user_id: string;
  class_level: string;
  board: string;
  subject: string;
  chapter: string | null;
  topic: string;
  difficulty: string;
  title: string;
  content: TutorialContent;
  cache_key: string;
  model: string | null;
  is_public: boolean;
  completed: boolean;
  completed_at: string | null;
  times_viewed: number;
  created_at: string;
  updated_at: string;
}

export type QuestionType = "mcq" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  user_id: string;
  position: number;
  type: QuestionType;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  topic: string | null;
  difficulty: string | null;
  marks: number;
}

/** Public projection of a question — never includes the answer. */
export type SafeQuizQuestion = Omit<QuizQuestion, "correct_answer" | "explanation">;

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  class_level: string | null;
  board: string | null;
  subject: string;
  chapter: string | null;
  topic: string | null;
  difficulty: string;
  question_count: number;
  cache_key: string;
  created_at: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  answer: string;
  correct: boolean;
  timeTakenSeconds?: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  answers: QuizAnswerRecord[];
  weak_topics: string[];
  duration_seconds: number | null;
  created_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  subject: string | null;
  topic: string | null;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  topic: string | null;
  class_level: string | null;
  board: string | null;
  source: "manual" | "ai" | "tutorial";
  card_count: number;
  created_at: string;
  cards?: Flashcard[];
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string;
  known_count: number;
  unknown_count: number;
  streak: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  mastered: boolean;
}

export type TopicStatus = "not_started" | "learning" | "practiced" | "mastered";

export interface StudyProgress {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  topic: string;
  status: TopicStatus;
  confidence: number;
  minutes_spent: number;
  last_studied_at: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xp_awarded: number;
  unlocked_at: string;
}

export interface FeedbackRow {
  id: string;
  user_id: string | null;
  email: string | null;
  category: string;
  rating: number | null;
  message: string;
  page: string | null;
  status: "new" | "reviewed" | "resolved";
  created_at: string;
}

export interface AiUsageSummary {
  plan: PlanId;
  planName: string;
  date: string;
  usage: Record<AiFeature, { used: number; limit: number; remaining: number }>;
  /** Shortest time until any quota resets (ms). */
  resetsInMs: number;
}
