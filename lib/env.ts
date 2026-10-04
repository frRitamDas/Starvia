/**
 * Central environment access.
 *
 * Rules:
 *  - Secret keys are ONLY ever read through `serverEnv()` which throws if called in the browser.
 *  - Public keys are read through `publicEnv()`.
 *  - Nothing here is hard-coded; every integration is optional and reports `configured: false`
 *    so the product degrades gracefully instead of crashing.
 */

const isServer = typeof window === "undefined";

function read(name: string, fallback = ""): string {
  const value = process.env[name];
  return (value ?? "").trim() || fallback;
}

function bool(name: string, fallback = false): boolean {
  const value = read(name).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

export const publicEnv = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  razorpayKeyId: read("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
  firebaseApiKey: read("NEXT_PUBLIC_FIREBASE_API_KEY"),
  firebaseAuthDomain: read("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: read("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  firebaseAppId: read("NEXT_PUBLIC_FIREBASE_APP_ID"),
  firebaseMessagingSenderId: read("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  /** Explicit opt-in only. Never turns on by itself in production. */
  demoMode: bool("NEXT_PUBLIC_DEMO_MODE"),
  appVersion: read("NEXT_PUBLIC_APP_VERSION", "1.0.0"),
};

export const serverEnv = {
  get geminiApiKey() {
    assertServer("geminiApiKey");
    return read("GEMINI_API_KEY") || read("GOOGLE_GENERATIVE_AI_API_KEY");
  },
  get geminiModelDefault() {
    assertServer("geminiModelDefault");
    return read("GEMINI_MODEL_DEFAULT", "gemini-2.5-flash");
  },
  get geminiModelFast() {
    return read("GEMINI_MODEL_FAST", "gemini-2.5-flash-lite");
  },
  get geminiModelVision() {
    return read("GEMINI_MODEL_VISION", "gemini-2.5-flash");
  },
  get geminiModelPro() {
    return read("GEMINI_MODEL_PRO", "gemini-2.5-pro");
  },
  get supabaseServiceRoleKey() {
    assertServer("supabaseServiceRoleKey");
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get razorpayKeyId() {
    return read("RAZORPAY_KEY_ID") || read("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  },
  get razorpayKeySecret() {
    assertServer("razorpayKeySecret");
    return read("RAZORPAY_KEY_SECRET");
  },
  get razorpayWebhookSecret() {
    assertServer("razorpayWebhookSecret");
    return read("RAZORPAY_WEBHOOK_SECRET");
  },
  get tutorSystemPromptOverride() {
    return read("AI_TUTOR_SYSTEM_PROMPT");
  },
  get allowMockCheckout() {
    return bool("ALLOW_MOCK_CHECKOUT", false);
  },
  get adminEmails() {
    return read("ADMIN_EMAILS")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
  get aiTimeoutMs() {
    const value = Number(read("AI_TIMEOUT_MS", "45000"));
    return Number.isFinite(value) && value > 1000 ? value : 45000;
  },
};

function assertServer(field: string) {
  if (!isServer) {
    throw new Error(
      `Server-only environment variable "${field}" was accessed in the browser. ` +
        "This is a bug — check that no client component imports serverEnv.",
    );
  }
}

export const supabaseConfigured = () =>
  Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

export const geminiConfigured = () => Boolean(serverEnv.geminiApiKey);

export const firebaseConfigured = () =>
  Boolean(
    publicEnv.firebaseApiKey &&
      publicEnv.firebaseAuthDomain &&
      publicEnv.firebaseProjectId &&
      publicEnv.firebaseAppId,
  );

export const razorpayConfigured = () =>
  Boolean(serverEnv.razorpayKeyId && serverEnv.razorpayKeySecret);

/**
 * Demo mode gives a fully clickable product when no backend keys exist yet.
 * It is OFF unless explicitly requested, and it is hard-disabled in production
 * builds unless someone deliberately sets NEXT_PUBLIC_DEMO_MODE=true.
 */
export const demoMode = () => {
  if (publicEnv.demoMode) return true;
  if (process.env.NODE_ENV === "production") return false;
  return !supabaseConfigured();
};

export function integrationStatus() {
  return {
    supabase: supabaseConfigured(),
    gemini: geminiConfigured(),
    razorpay: razorpayConfigured(),
    razorpayWebhook: Boolean(serverEnv.razorpayWebhookSecret),
    serviceRole: Boolean(serverEnv.supabaseServiceRoleKey),
    firebaseAuth: firebaseConfigured(),
    googleOAuth: read("NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED").toLowerCase() === "true",
    demo: demoMode(),
    mockCheckout: serverEnv.allowMockCheckout,
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
