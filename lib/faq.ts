/** FAQ content — shared by the landing page and /faq. */

export interface FaqItem {
  question: string;
  answer: string;
  category: "Getting started" | "AI & subjects" | "Plans & payments" | "Privacy & safety";
}

export const FAQS: FaqItem[] = [
  {
    category: "Getting started",
    question: "What is Starvia?",
    answer:
      "Starvia is an AI study workspace for Indian school students. You get an AI tutor that explains at your class level, auto-generated tutorials and quizzes, a step-by-step question solver (type it or photograph it), exam revision plans, flashcards and progress tracking — all in one place.",
  },
  {
    category: "Getting started",
    question: "Which classes and boards are supported?",
    answer:
      "Classes 6 to 12, with CBSE, ICSE/ISC and State Board syllabi. During onboarding you pick your class, board, subjects and optional exam target, and every explanation, quiz and revision plan is written for that context. You can change these at any time from your profile.",
  },
  {
    category: "Getting started",
    question: "Is Starvia free to use?",
    answer:
      "Yes. The Starter plan is free forever and includes daily AI tutor messages, tutorials, quizzes and one image question per day. Pro (₹99/month) and Ultra (₹249/month) raise the daily limits and unlock AI flashcards, full mock tests and deeper analytics.",
  },
  {
    category: "AI & subjects",
    question: "How does the AI know my level?",
    answer:
      "Your class, board, subjects and practice history are sent with every question, so a Class 8 question gets a Class 8 explanation. The tutor is instructed to stay inside your syllabus and to avoid advanced terminology that would confuse rather than help.",
  },
  {
    category: "AI & subjects",
    question: "Can I ask questions from a photo of my textbook?",
    answer:
      "Yes. On the Question Solver page you can upload or photograph a question. The AI reads the image, identifies the subject and topic, explains the concept, solves it step by step and gives you a similar practice question.",
  },
  {
    category: "AI & subjects",
    question: "Will the AI just give me answers?",
    answer:
      "No — Starvia is built to teach. For homework questions the tutor is designed to explain the method and ask you a checkpoint question first, and every solved question includes the concept, the steps, an exam tip and a common mistake to avoid.",
  },
  {
    category: "AI & subjects",
    question: "Does the AI make mistakes?",
    answer:
      "AI can occasionally be wrong. Starvia constrains answers to your syllabus, labels uncertainty where it exists and always shows the reasoning so you can check each step. If something looks off, use the thumbs-down button and we review it.",
  },
  {
    category: "Plans & payments",
    question: "How do the daily limits work?",
    answer:
      "Limits reset every day at midnight IST and are counted on our servers, so they cannot be bypassed by refreshing or opening new tabs. Your dashboard always shows exactly how many requests remain for each feature.",
  },
  {
    category: "Plans & payments",
    question: "How do I pay for Pro or Ultra?",
    answer:
      "Payments are handled by Razorpay with UPI, cards, net banking and wallets. The upgrade button on the pricing page opens a secure Razorpay checkout. Your plan activates within seconds of a verified payment and you can cancel anytime from your account.",
  },
  {
    category: "Plans & payments",
    question: "Can I cancel or get a refund?",
    answer:
      "Yes. Cancelling stops future renewals and you keep the plan until the current billing period ends. See the Refunds section in our Terms of Service for full details on refund eligibility.",
  },
  {
    category: "Privacy & safety",
    question: "Is my data private?",
    answer:
      "Your conversations, quizzes and progress are protected by database row-level security — only your account can read them. We never sell your data, and we do not use your study content to train third-party models.",
  },
  {
    category: "Privacy & safety",
    question: "Is Starvia safe for younger students?",
    answer:
      "Yes. Requests run through content-safety filters, the workspace has no public profiles or direct messaging between students, and we only collect the academic details needed to teach you well (class, board, subjects).",
  },
];

export const FAQ_CATEGORIES = [
  "Getting started",
  "AI & subjects",
  "Plans & payments",
  "Privacy & safety",
] as const;

/** Structured data for Google's FAQ rich results. */
export function faqJsonLd(items: FaqItem[] = FAQS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
