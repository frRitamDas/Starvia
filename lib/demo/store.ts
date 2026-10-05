import type {
  Achievement,
  ChatMessage,
  Conversation,
  Flashcard,
  FlashcardDeck,
  FlashcardProgress,
  Payment,
  Profile,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  StudyProgress,
  StudyNote,
  Subscription,
  Tutorial,
} from "@/lib/demo/types";

/**
 * In-memory data store used ONLY when the app runs in demo mode
 * (NEXT_PUBLIC_DEMO_MODE=true, or local development without Supabase keys).
 *
 * It exists so the whole product is clickable before any keys are added.
 * Production always talks to Supabase — see lib/db.ts.
 */

export interface DemoState {
  profile: Profile;
  subscription: Subscription;
  usage: Map<string, number>;
  conversations: Conversation[];
  messages: ChatMessage[];
  tutorials: Tutorial[];
  quizzes: Quiz[];
  quizQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  decks: (FlashcardDeck & { cards: Flashcard[] })[];
  cardProgress: Map<string, FlashcardProgress>;
  progress: StudyProgress[];
  notes: StudyNote[];
  achievements: Achievement[];
  payments: Payment[];
  events: { feature: string; status: string; latencyMs: number; createdAt: string }[];
  session: { email: string | null; fullName: string | null } | null;
}

const globalForDemo = globalThis as unknown as { __starviaDemo?: DemoState };

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function seedState(): DemoState {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: DEMO_USER_ID,
    email: "demo@starvia.study",
    full_name: "Demo Student",
    class_level: "10",
    board: "CBSE",
    subjects: ["Science", "Mathematics", "English"],
    learning_level: "developing",
    exam_target: "Board Exams",
    avatar_url: null,
    onboarded_at: now,
    xp: 780,
    level: 3,
    streak_count: 4,
    longest_streak: 9,
    last_active_date: todayIso(),
    study_minutes: 415,
    role: "student",
    created_at: isoDaysAgo(21),
    updated_at: now,
  };

  const subscription: Subscription = {
    id: "00000000-0000-4000-8000-000000000002",
    user_id: DEMO_USER_ID,
    plan: "free",
    status: "active",
    provider: "free",
    provider_subscription_id: null,
    provider_payment_id: null,
    provider_customer_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    cancelled_at: null,
    amount_inr: 0,
    currency: "INR",
    created_at: isoDaysAgo(21),
    updated_at: now,
  };

  const conversationId = "10000000-0000-4000-8000-000000000001";
  const conversation: Conversation = {
    id: conversationId,
    user_id: DEMO_USER_ID,
    title: "Ohm's law basics",
    subject: "Science",
    topic: "Electricity",
    class_level: "10",
    board: "CBSE",
    difficulty: "medium",
    pinned: false,
    message_count: 2,
    last_message_at: isoDaysAgo(1),
    created_at: isoDaysAgo(1),
  };

  const messages: ChatMessage[] = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      conversation_id: conversationId,
      user_id: DEMO_USER_ID,
      role: "user",
      content: "Why does the current decrease when I add another bulb in series?",
      model: null,
      tokens: null,
      rating: null,
      latency_ms: null,
      created_at: isoDaysAgo(1),
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      conversation_id: conversationId,
      user_id: DEMO_USER_ID,
      role: "assistant",
      content:
        "Great question — this is one of the most common doubts in Class 10 Electricity.\n\n## The idea\nIn a series circuit the bulbs share **one path**, so the same current flows through each of them. Adding a bulb adds resistance, and the total resistance becomes\n\n$$R_{total} = R_1 + R_2 + R_3$$\n\n## Why the current drops\nFrom Ohm's law $I = V / R$, the battery voltage stays the same but $R$ increases, so $I$ must fall.\n\n## Exam tip\nIf a question says \"bulbs of equal resistance\", you can shortcut: total resistance is $nR$ and current is $I/n$.\n\n**Try this:** A 6 V battery is connected to three identical 2 Ω bulbs in series. What is the current?",
      model: "demo",
      tokens: 210,
      rating: 1,
      latency_ms: 900,
      created_at: isoDaysAgo(1),
    },
  ];

  const tutorial: Tutorial = {
    id: "30000000-0000-4000-8000-000000000001",
    user_id: DEMO_USER_ID,
    class_level: "10",
    board: "CBSE",
    subject: "Science",
    chapter: "Electricity",
    topic: "Ohm's Law",
    difficulty: "medium",
    title: "Ohm's Law — the relationship that runs every circuit",
    content: {
      title: "Ohm's Law — the relationship that runs every circuit",
      learningObjectives: [
        "State Ohm's law and the conditions under which it holds",
        "Use V = IR to solve numerical problems",
        "Interpret V–I graphs for ohmic and non-ohmic conductors",
      ],
      introduction:
        "Every phone charger, fan regulator and LED strip you have used follows one simple relationship discovered by Georg Ohm. This tutorial builds that relationship from experiment to formula, then shows you exactly how board papers ask it.",
      sections: [
        {
          heading: "What Ohm's law says",
          body: "At constant temperature, the current through a conductor is directly proportional to the potential difference across its ends.\n\n$$V \\propto I \\quad \\Rightarrow \\quad V = IR$$\n\nHere $R$ is resistance — the opposition a material offers to the flow of charge.",
          keyPoints: ["$V = IR$ holds at constant temperature", "Resistance is measured in ohms (Ω)"],
        },
        {
          heading: "Reading a V–I graph",
          body: "Plot $V$ on the y-axis and $I$ on the x-axis. For an ohmic conductor you get a straight line through the origin, and the slope equals resistance. A curve means the conductor is non-ohmic (like a filament bulb or a diode).",
          keyPoints: ["Straight line ⇒ ohmic", "Slope = resistance"],
        },
      ],
      examples: [
        {
          title: "Simple numerical",
          problem: "A resistor of 5 Ω carries a current of 0.4 A. Find the potential difference.",
          solution:
            "1. Write the given data: $R = 5\\,\\Omega$, $I = 0.4\\,\\text{A}$.\n2. Use $V = IR$.\n3. Substitute: $V = 0.4 \\times 5 = 2\\,\\text{V}$.",
          takeaway: "Always write the given data first — examiners award step marks.",
        },
      ],
      importantTerms: [
        { term: "Resistance", meaning: "Opposition to the flow of electric current; unit ohm (Ω)." },
      ],
      examTips: ["State the constant-temperature condition whenever you write V = IR."],
      commonMistakes: ["Using $V = IR$ for a filament bulb without noting it heats up (non-ohmic)."],
      practiceQuestions: [
        { question: "A 12 V battery drives 3 A through a resistor. Find its resistance.", answer: "4 Ω", hint: "Rearrange V = IR." },
      ],
      summary:
        "Ohm's law links voltage, current and resistance through $V = IR$. It applies to conductors at constant temperature, gives a straight V–I line, and converts numerical questions into simple substitutions.",
    },
    cache_key: "demo-tutorial-ohms-law",
    model: "demo",
    is_public: false,
    completed: false,
    completed_at: null,
    times_viewed: 1,
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(3),
  };

  const quiz: Quiz = {
    id: "40000000-0000-4000-8000-000000000001",
    user_id: DEMO_USER_ID,
    title: "Electricity — quick check",
    class_level: "10",
    board: "CBSE",
    subject: "Science",
    chapter: "Electricity",
    topic: "Ohm's Law",
    difficulty: "medium",
    question_count: 3,
    cache_key: "demo-quiz-electricity",
    created_at: isoDaysAgo(2),
  };

  const quizQuestions: QuizQuestion[] = [
    {
      id: "41000000-0000-4000-8000-000000000001",
      quiz_id: quiz.id,
      user_id: DEMO_USER_ID,
      position: 0,
      type: "mcq",
      question: "The SI unit of resistance is:",
      options: ["Volt", "Ampere", "Ohm", "Watt"],
      correct_answer: "Ohm",
      explanation: "Resistance is measured in ohms (Ω), named after Georg Simon Ohm.",
      topic: "Resistance",
      difficulty: "easy",
      marks: 1,
    },
    {
      id: "41000000-0000-4000-8000-000000000002",
      quiz_id: quiz.id,
      user_id: DEMO_USER_ID,
      position: 1,
      type: "true_false",
      question: "Resistance of a conductor doubles when its length is doubled (same material and thickness).",
      options: ["True", "False"],
      correct_answer: "True",
      explanation: "$R \\propto l$, so doubling length doubles resistance.",
      topic: "Factors affecting resistance",
      difficulty: "medium",
      marks: 1,
    },
    {
      id: "41000000-0000-4000-8000-000000000003",
      quiz_id: quiz.id,
      user_id: DEMO_USER_ID,
      position: 2,
      type: "short_answer",
      question: "State Ohm's law in one sentence.",
      options: null,
      correct_answer: "At constant temperature, current through a conductor is directly proportional to the potential difference across its ends.",
      explanation: "Mention the constant-temperature condition for full marks.",
      topic: "Ohm's Law",
      difficulty: "easy",
      marks: 1,
    },
  ];

  const attempt: QuizAttempt = {
    id: "42000000-0000-4000-8000-000000000001",
    user_id: DEMO_USER_ID,
    quiz_id: quiz.id,
    score: 2,
    total: 3,
    percentage: 66.67,
    answers: [
      { questionId: quizQuestions[0].id, answer: "Ohm", correct: true },
      { questionId: quizQuestions[1].id, answer: "True", correct: true },
      { questionId: quizQuestions[2].id, answer: "Current is proportional to voltage.", correct: false },
    ],
    weak_topics: ["Ohm's Law"],
    duration_seconds: 214,
    created_at: isoDaysAgo(2),
  };

  const deck: FlashcardDeck & { cards: Flashcard[] } = {
    id: "50000000-0000-4000-8000-000000000001",
    user_id: DEMO_USER_ID,
    title: "Electricity — formulas & definitions",
    subject: "Science",
    topic: "Electricity",
    class_level: "10",
    board: "CBSE",
    source: "manual",
    card_count: 3,
    created_at: isoDaysAgo(5),
    cards: [
      {
        id: "51000000-0000-4000-8000-000000000001",
        user_id: DEMO_USER_ID,
        deck_id: "50000000-0000-4000-8000-000000000001",
        front: "State Ohm's law.",
        back: "At constant temperature, V = IR — current is directly proportional to potential difference.",
        hint: "Temperature constant!",
        subject: "Science",
        topic: "Electricity",
        created_at: isoDaysAgo(5),
      },
      {
        id: "51000000-0000-4000-8000-000000000002",
        user_id: DEMO_USER_ID,
        deck_id: "50000000-0000-4000-8000-000000000001",
        front: "Formula for resistors in parallel?",
        back: "$1/R = 1/R_1 + 1/R_2$",
        hint: "Reciprocals add",
        subject: "Science",
        topic: "Electricity",
        created_at: isoDaysAgo(5),
      },
      {
        id: "51000000-0000-4000-8000-000000000003",
        user_id: DEMO_USER_ID,
        deck_id: "50000000-0000-4000-8000-000000000001",
        front: "SI unit of electric power?",
        back: "Watt (W); power P = VI.",
        hint: "Same as mechanical power",
        subject: "Science",
        topic: "Electricity",
        created_at: isoDaysAgo(5),
      },
    ],
  };

  const progress: StudyProgress[] = [
    {
      id: "60000000-0000-4000-8000-000000000001",
      user_id: DEMO_USER_ID,
      subject: "Science",
      chapter: "Electricity",
      topic: "Ohm's Law",
      status: "practiced",
      confidence: 4,
      minutes_spent: 65,
      last_studied_at: isoDaysAgo(1),
      created_at: isoDaysAgo(6),
    },
    {
      id: "60000000-0000-4000-8000-000000000002",
      user_id: DEMO_USER_ID,
      subject: "Science",
      chapter: "Chemical Reactions",
      topic: "Balancing equations",
      status: "learning",
      confidence: 3,
      minutes_spent: 40,
      last_studied_at: isoDaysAgo(4),
      created_at: isoDaysAgo(8),
    },
    {
      id: "60000000-0000-4000-8000-000000000003",
      user_id: DEMO_USER_ID,
      subject: "Mathematics",
      chapter: "Trigonometry",
      topic: "Heights and distances",
      status: "not_started",
      confidence: 1,
      minutes_spent: 0,
      last_studied_at: null,
      created_at: isoDaysAgo(8),
    },
  ];

  const achievements: Achievement[] = [
    {
      id: "70000000-0000-4000-8000-000000000001",
      user_id: DEMO_USER_ID,
      code: "first_steps",
      title: "First Steps",
      description: "Asked your first question to the AI tutor.",
      icon: "sparkles",
      xp_awarded: 20,
      unlocked_at: isoDaysAgo(18),
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      user_id: DEMO_USER_ID,
      code: "streak_3",
      title: "Three in a Row",
      description: "Studied 3 days in a row.",
      icon: "flame",
      xp_awarded: 30,
      unlocked_at: isoDaysAgo(2),
    },
  ];

  const state: DemoState = {
    profile,
    subscription,
    usage: new Map(),
    conversations: [conversation],
    messages,
    tutorials: [tutorial],
    quizzes: [quiz],
    quizQuestions,
    quizAttempts: [attempt],
    decks: [deck],
    cardProgress: new Map(),
    progress,
    notes: [
      {
        id: "90000000-0000-4000-8000-000000000001",
        user_id: DEMO_USER_ID,
        title: "Electricity — the essentials",
        subject: "Science",
        topic: "Electricity",
        content:
          "# Electricity — the essentials\n\n## Ohm's law\nAt constant temperature, potential difference is directly proportional to current: V = IR. Resistance is measured in ohms (Ω).\n\n## Series circuits\n- Current is the same at every point.\n- Total resistance is the sum of each resistor.\n- Adding a bulb increases resistance and reduces current.\n\n## Parallel circuits\n- Each branch gets the same potential difference.\n- Total resistance decreases when a branch is added.",
        mind_map: {
          root: "Electricity",
          branches: [
            { title: "Ohm's law", details: ["V = IR", "Valid at constant temperature", "Resistance is measured in ohms"] },
            { title: "Series circuits", details: ["Same current throughout", "Resistances add", "Adding a bulb lowers current"] },
            { title: "Parallel circuits", details: ["Same voltage across branches", "Total resistance falls as branches are added"] },
          ],
        },
        created_at: isoDaysAgo(4),
        updated_at: isoDaysAgo(1),
      },
      {
        id: "90000000-0000-4000-8000-000000000002",
        user_id: DEMO_USER_ID,
        title: "Quadratic equations — quick recap",
        subject: "Mathematics",
        topic: "Quadratic Equations",
        content:
          "# Quadratic equations\n\nA quadratic equation has the form ax² + bx + c = 0, where a ≠ 0.\n\n## Factorisation\nFind two numbers whose product is ac and whose sum is b. Split the middle term, factor by grouping, then set each factor to zero.\n\n## Formula\nFor ax² + bx + c = 0, x = (-b ± √(b² - 4ac)) / 2a. The discriminant b² - 4ac tells you how many real roots exist.",
        mind_map: null,
        created_at: isoDaysAgo(2),
        updated_at: isoDaysAgo(2),
      },
    ],
    achievements,
    payments: [],
    events: [],
    session: null,
  };

  return state;
}

export function demoStore(): DemoState {
  if (!globalForDemo.__starviaDemo) {
    globalForDemo.__starviaDemo = seedState();
  } else if (!Array.isArray(globalForDemo.__starviaDemo.notes)) {
    // Preserve existing in-memory demo activity during hot reloads after the
    // DemoState shape grows; only initialise the newly-added collection.
    globalForDemo.__starviaDemo.notes = seedState().notes;
  }
  return globalForDemo.__starviaDemo;
}

export function resetDemoStore() {
  globalForDemo.__starviaDemo = seedState();
}

export function demoUsageKey(feature: string, date = todayIso()) {
  return `${feature}:${date}`;
}

export function demoToday() {
  return todayIso();
}

export function demoIsoDaysAgo(days: number) {
  return isoDaysAgo(days);
}

/** UUID-ish id generator good enough for the in-memory demo store. */
export function demoId(prefix = "9") {
  const random = Math.floor(Math.random() * 1e12).toString(16).padStart(12, "0");
  return `${prefix}${random.slice(0, 7)}-0000-4000-8000-${random.padStart(12, "0").slice(0, 12)}`;
}
