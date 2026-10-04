/**
 * Domain types used by the demo store (structurally compatible with the
 * Supabase rows in lib/supabase/types.ts, with friendlier field types).
 */

import type {
  Conversation as DomainConversation,
  ChatMessage as DomainMessage,
  Flashcard as DomainFlashcard,
  FlashcardDeck as DomainDeck,
  FlashcardProgress as DomainCardProgress,
  Payment,
  Profile,
  QuizAttempt,
  QuizQuestion,
  Quiz as DomainQuiz,
  StudyProgress,
  Subscription,
  Tutorial as DomainTutorial,
  Achievement,
} from "@/lib/types";

export type {
  Profile,
  Subscription,
  Payment,
  QuizAttempt,
  QuizQuestion,
  StudyProgress,
  Achievement,
};

export type Conversation = DomainConversation;
export type ChatMessage = DomainMessage;
export type Tutorial = DomainTutorial;
export type Quiz = DomainQuiz;
export type Flashcard = DomainFlashcard;
export type FlashcardDeck = DomainDeck;
export type FlashcardProgress = DomainCardProgress;
