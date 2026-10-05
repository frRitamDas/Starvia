/**
 * Typed schema for Supabase — mirrors sql/schema.sql.
 *
 * Hand-maintained (no codegen step required). When you change the SQL, update
 * the matching Row type here; the compiler then flags anything you missed.
 * You can also regenerate with:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/**
 * Insert = every column optional (the database supplies defaults) except the
 * ones the caller must supply. Mirrors how `supabase gen types` emits columns
 * that have defaults.
 */
type Table<Row, RequiredInsertKeys extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
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
  role: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  provider: string;
  provider_subscription_id: string | null;
  provider_payment_id: string | null;
  provider_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  amount_inr: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  amount_inr: number;
  currency: string;
  status: string;
  provider: string;
  order_id: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  signature_verified: boolean;
  notes: Json;
  created_at: string;
  updated_at: string;
};

export type PlanLimitRow = {
  plan: string;
  feature: string;
  daily_limit: number;
  updated_at: string;
};

export type AiUsageRow = {
  id: string;
  user_id: string;
  usage_date: string;
  feature: string;
  used: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
};

export type AiEventRow = {
  id: number;
  user_id: string | null;
  feature: string;
  status: string;
  model: string | null;
  latency_ms: number | null;
  tokens_used: number;
  error_code: string | null;
  created_at: string;
};

export type AiCacheRow = {
  cache_key: string;
  kind: string;
  payload: Json;
  model: string | null;
  tokens_used: number;
  hit_count: number;
  created_at: string;
};

export type ConversationRow = {
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
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  content: string;
  model: string | null;
  tokens: number | null;
  rating: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type TutorialRow = {
  id: string;
  user_id: string;
  class_level: string;
  board: string;
  subject: string;
  chapter: string | null;
  topic: string;
  difficulty: string;
  title: string;
  content: Json;
  cache_key: string;
  model: string | null;
  is_public: boolean;
  completed: boolean;
  completed_at: string | null;
  times_viewed: number;
  created_at: string;
  updated_at: string;
};

export type QuizRow = {
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
  cache_key: string | null;
  created_at: string;
};

export type QuizQuestionRow = {
  id: string;
  quiz_id: string;
  user_id: string;
  position: number;
  type: string;
  question: string;
  options: Json | null;
  correct_answer: string;
  explanation: string;
  topic: string | null;
  difficulty: string | null;
  marks: number;
  created_at: string;
};

export type QuizAttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  answers: Json;
  weak_topics: string[] | null;
  duration_seconds: number | null;
  created_at: string;
};

export type FlashcardDeckRow = {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  topic: string | null;
  class_level: string | null;
  board: string | null;
  source: string;
  card_count: number;
  created_at: string;
  updated_at: string;
};

export type FlashcardRow = {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  subject: string | null;
  topic: string | null;
  created_at: string;
};

export type FlashcardProgressRow = {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string;
  known_count: number;
  unknown_count: number;
  streak: number;
  mastered: boolean;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
};

export type StudyProgressRow = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  topic: string;
  status: string;
  confidence: number;
  minutes_spent: number;
  last_studied_at: string | null;
  created_at: string;
};

export type ExamPlanRow = {
  id: string;
  user_id: string;
  board: string;
  class_level: string;
  subject: string;
  chapter: string | null;
  exam_type: string;
  planned_days: number;
  title: string;
  content: Json;
  cache_key: string | null;
  model: string | null;
  created_at: string;
};

export type AchievementRow = {
  id: string;
  user_id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xp_awarded: number;
  unlocked_at: string;
};

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  category: string;
  rating: number | null;
  message: string;
  page: string | null;
  status: string;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      subscriptions: Table<SubscriptionRow, "user_id">;
      payments: Table<PaymentRow, "user_id" | "amount_inr">;
      plan_limits: Table<PlanLimitRow, "plan" | "feature" | "daily_limit">;
      ai_usage: Table<AiUsageRow, "user_id" | "feature">;
      ai_events: Table<AiEventRow, "feature" | "status">;
      ai_cache: Table<AiCacheRow, "cache_key" | "kind" | "payload">;
      conversations: Table<ConversationRow, "user_id">;
      messages: Table<MessageRow, "conversation_id" | "user_id" | "role" | "content">;
      tutorials: Table<TutorialRow, "user_id" | "class_level" | "board" | "subject" | "topic" | "title" | "content" | "cache_key">;
      quizzes: Table<QuizRow, "user_id" | "title" | "subject">;
      quiz_questions: Table<QuizQuestionRow, "quiz_id" | "user_id" | "question" | "correct_answer">;
      quiz_attempts: Table<QuizAttemptRow, "user_id" | "quiz_id">;
      flashcard_decks: Table<FlashcardDeckRow, "user_id" | "title" | "subject">;
      flashcards: Table<FlashcardRow, "user_id" | "deck_id" | "front" | "back">;
      flashcard_progress: Table<FlashcardProgressRow, "user_id" | "card_id" | "deck_id">;
      study_progress: Table<StudyProgressRow, "user_id" | "subject" | "topic">;
      exam_plans: Table<ExamPlanRow, "user_id" | "board" | "class_level" | "subject" | "exam_type" | "title" | "content">;
      achievements: Table<AchievementRow, "user_id" | "code" | "title">;
      feedback: Table<FeedbackRow, "message">;
    };
    Views: Record<string, never>;
    Functions: {
      consume_ai_quota: {
        Args: { p_user_id: string; p_feature: string; p_limit: number; p_amount?: number };
        Returns: { allowed: boolean; used: number; remaining: number }[];
      };
      refund_ai_quota: {
        Args: { p_user_id: string; p_feature: string; p_limit: number; p_amount?: number };
        Returns: { refunded: number; used: number; remaining: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
