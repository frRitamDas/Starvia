import type { Difficulty } from "@/lib/curriculum";
import type { ExamPlanPayload, FlashcardPayload, QuizPayload, TutorialContentPayload } from "@/lib/ai/schemas";

/**
 * Demo-mode content generator.
 *
 * This is ONLY used when `demoMode()` is true — i.e. the deployment has no
 * Supabase/Gemini keys and is explicitly running the clickable demo
 * (NEXT_PUBLIC_DEMO_MODE=true) or a local dev server without keys.
 *
 * Production never falls back to this: every AI route throws NOT_CONFIGURED
 * instead, so real users always get real model output.
 */

export const DEMO_NOTICE =
  "Demo mode: this is placeholder study content. Add GEMINI_API_KEY to generate real AI answers.";

export function demoTutorAnswer(question: string, context: { classLevel?: string | null; subject?: string | null; topic?: string | null }) {
  const subject = context.subject ?? "this subject";
  const classLevel = context.classLevel ?? "your class";
  return `## Short answer
Starvia's AI is running in **demo mode** on this deployment, so I can't generate a real explanation for *"${question}"* yet.

## What to do
1. Add \`GEMINI_API_KEY\` to your Vercel environment variables and redeploy.
2. Also set \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` so your progress and conversations are stored.

## What will happen then
Once the key is in place, I'll explain this ${subject} question at Class ${classLevel} level, with:
- the concept explained step by step,
- a worked example,
- an exam tip and a common mistake,
- one practice question for you to try.

_${DEMO_NOTICE}_`;
}

export function demoTutorial(input: {
  classLevel: string;
  board: string;
  subject: string;
  chapter?: string | null;
  topic: string;
  difficulty: Difficulty | string;
}): TutorialContentPayload {
  const title = `${input.topic} — Class ${input.classLevel} ${input.subject} (demo)`;
  return {
    title,
    learningObjectives: [
      `Understand what ${input.topic} means in the ${input.board} Class ${input.classLevel} syllabus`,
      `Recall the definitions and formulas linked to ${input.topic}`,
      `Solve typical ${input.difficulty} level questions on ${input.topic}`,
    ],
    introduction: `This is placeholder demo content for **${input.topic}** so you can see how a Starvia tutorial is structured. Connect a Gemini API key and generate again to receive a full, syllabus-accurate explanation written for Class ${input.classLevel} (${input.board}).`,
    sections: [
      {
        heading: `What is ${input.topic}?`,
        body: `A real Starvia tutorial opens by connecting ${input.topic} to something you already know, then builds the formal definition.\n\n**Demo mode** replaces that explanation with this placeholder.\n\n$$\\text{example formula} = \\frac{\\text{concept}}{\\text{application}}$$`,
        keyPoints: [
          "Explanations adapt to your class and board",
          "Formulas render with proper maths notation",
          "Each section ends with a takeaway",
        ],
      },
      {
        heading: `Where ${input.topic} is used`,
        body: `In the ${input.board} syllabus, ${input.topic} typically appears in ${input.chapter ?? "the current chapter"} and is tested through both direct and application-based questions.`,
        keyPoints: ["Board-style framing", "Exam-relevant focus"],
      },
    ],
    examples: [
      {
        title: "Worked example (placeholder)",
        problem: `A typical ${input.difficulty} question on ${input.topic}.`,
        solution:
          "1. Identify what is given.\n2. Choose the right relation for the topic.\n3. Substitute carefully with units.\n4. State the final answer clearly.",
        takeaway: "Structure your answer in steps — most marks are given for method.",
      },
    ],
    importantTerms: [
      { term: input.topic, meaning: "The main idea of this tutorial (demo placeholder)." },
      { term: "Application", meaning: "Using the concept in a new situation." },
    ],
    examTips: [
      "Write the formula before substituting values.",
      "Always include units in the final answer.",
    ],
    commonMistakes: [
      "Using the formula without checking the conditions it applies to.",
      "Skipping the working and writing only the final answer.",
    ],
    practiceQuestions: [
      {
        question: `Explain ${input.topic} in your own words in three lines.`,
        answer: "Any correct explanation covering the definition and one example.",
        hint: "Start with the definition, then give one real-life example.",
      },
    ],
    summary: `Demo summary: with a Gemini key configured, this section recaps ${input.topic} in 4–6 exam-ready sentences. ${DEMO_NOTICE}`,
  };
}

export function demoQuiz(input: { subject: string; topic?: string | null; classLevel: string; count: number }): QuizPayload {
  const topic = input.topic || input.subject;
  const count = Math.max(3, Math.min(input.count, 10));
  const questions: QuizPayload["questions"] = [];

  for (let index = 0; index < count; index += 1) {
    const position = index + 1;
    if (index % 3 === 2) {
      questions.push({
        type: "short_answer",
        question: `Demo placeholder ${position}: Write one sentence defining ${topic}.`,
        options: null,
        correctAnswer: `${topic} is the concept covered in this chapter of Class ${input.classLevel} ${input.subject}.`,
        explanation: "Demo explanations appear here once a Gemini key is configured.",
        topic,
        difficulty: "easy",
        marks: 1,
      });
    } else if (index % 3 === 1) {
      questions.push({
        type: "true_false",
        question: `Demo placeholder ${position}: ${topic} is part of the Class ${input.classLevel} syllabus.`,
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: "True — this chapter appears in the syllabus for your class and board.",
        topic,
        difficulty: "easy",
        marks: 1,
      });
    } else {
      questions.push({
        type: "mcq",
        question: `Demo placeholder ${position}: Which option best describes ${topic}?`,
        options: [
          `The correct definition of ${topic}`,
          "An unrelated concept",
          "A common misconception",
          "None of these",
        ],
        correctAnswer: `The correct definition of ${topic}`,
        explanation: "Real AI quizzes explain why the correct option is right and the distractor is wrong.",
        topic,
        difficulty: "easy",
        marks: 1,
      });
    }
  }

  return { title: `${topic} — demo quiz`, questions };
}

export function demoFlashcards(input: { subject: string; topic: string; count: number }): FlashcardPayload {
  const count = Math.max(5, Math.min(input.count, 12));
  const cards = Array.from({ length: count }, (_, index) => ({
    front: `Demo card ${index + 1}: key idea #${index + 1} from ${input.topic}`,
    back: `With a Gemini API key set, this card will hold a real exam-ready definition or formula for ${input.subject}: ${input.topic}.`,
    hint: "Add GEMINI_API_KEY to generate real cards.",
  }));
  return { title: `${input.topic} — demo deck`, cards };
}

export function demoExamPlan(input: {
  board: string;
  classLevel: string;
  subject: string;
  chapter?: string | null;
  examType: string;
  plannedDays: number;
}): ExamPlanPayload {
  const days = Math.max(1, Math.min(input.plannedDays, 30));
  return {
    title: `${input.subject} revision plan — Class ${input.classLevel} ${input.board} (demo)`,
    overview: `Demo revision plan for the ${input.examType} exam. Add a Gemini API key to receive a plan tailored to high-weightage chapters, your weak topics and the exact number of days you have.`,
    totalStudyHours: days * 1.5,
    importantTopics: [
      { name: input.chapter ?? input.subject, why: "Frequently asked in board papers.", weightage: "high", estimatedMinutes: 90 },
      { name: "Formula revision", why: "Fast marks if formulas are memorised.", weightage: "medium", estimatedMinutes: 45 },
    ],
    plan: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      focus: index % 2 === 0 ? "Concept revision" : "Practice questions",
      tasks: [
        index % 2 === 0 ? "Read and rewrite the key definitions" : "Solve 10 mixed questions with a timer",
        "Review flashcards for 10 minutes",
      ],
      minutes: 90,
    })),
    keyFormulas: [{ name: "Demo formula", formula: "y = f(x)" }],
    practiceQuestions: [
      {
        question: `Write a short note on ${input.chapter ?? input.subject}.`,
        answer: "Model answer generated in the full version.",
        marks: 3,
        difficulty: "medium",
      },
    ],
    mcqs: [
      {
        question: `Demo MCQ: which chapter does this plan focus on?`,
        options: [input.chapter ?? input.subject, "An unrelated chapter", "A future chapter", "None"],
        correctAnswer: input.chapter ?? input.subject,
        explanation: "Real MCQs include board-style distractors and explanations.",
      },
    ],
    mockTestBlueprint: [
      { section: "Section A — MCQs", questionCount: 10, marks: 10, guidance: "Attempt in 15 minutes." },
      { section: "Section B — Short answers", questionCount: 5, marks: 15, guidance: "Two marks per question." },
    ],
    weakAreaStrategy: ["Revisit any quiz topic below 70%.", "Redo incorrect questions after 48 hours."],
    examDayTips: ["Sleep well — recall matters more than last-minute cramming.", "Write formulas before substituting values."],
  };
}
