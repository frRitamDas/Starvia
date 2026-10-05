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
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  siteUrl: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  razorpayKeyId: read("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
  /** Explicit opt-in only. Never turns on by itself in production. */
  demoMode: bool("NEXT_PUBLIC_DEMO_MODE"),
  appVersion: read("NEXT_PUBLIC_APP_VERSION", "1.0.0"),
};

export const serverEnv = {
  get aiProvider() {
    const provider = read("AI_PROVIDER", "nararouter").toLowerCase();
    return provider === "nararouter" ? "nararouter" : "gemini";
  },
  get naraRouterApiKey() {
    assertServer("naraRouterApiKey");
    return read("NARAROUTER_API_KEY");
  },
  get naraRouterBaseUrl() {
    assertServer("naraRouterBaseUrl");
    return read("NARAROUTER_BASE_URL", "https://router.bynara.id/v1");
  },
  get naraRouterModelDefault() {
    assertServer("naraRouterModelDefault");
    return read("NARAROUTER_MODEL_DEFAULT", "auto/bynara");
  },
  get naraRouterModelFast() {
    assertServer("naraRouterModelFast");
    return read("NARAROUTER_MODEL_FAST") || read("NARAROUTER_MODEL_DEFAULT", "auto/bynara");
  },
  get naraRouterModelPro() {
    assertServer("naraRouterModelPro");
    return read("NARAROUTER_MODEL_PRO") || read("NARAROUTER_MODEL_DEFAULT", "auto/bynara");
  },
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
    return read("SUPABASE_SECRET_KEY") || read("SUPABASE_SERVICE_ROLE_KEY");
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
export const naraRouterConfigured = () => Boolean(serverEnv.naraRouterApiKey);

export const razorpayConfigured = () =>
  Boolean(serverEnv.razorpayKeyId && serverEnv.razorpayKeySecret);

/** Public-safe status: booleans only, never the plan ids themselves. */
export const razorpayRecurringPlanStatus = () => ({
  proMonthly: Boolean(read("RAZORPAY_PLAN_PRO_MONTHLY") || read("RAZORPAY_PLAN_PRO")),
  proYearly: Boolean(read("RAZORPAY_PLAN_PRO_YEARLY")),
  ultraMonthly: Boolean(read("RAZORPAY_PLAN_ULTRA_MONTHLY") || read("RAZORPAY_PLAN_ULTRA")),
  ultraYearly: Boolean(read("RAZORPAY_PLAN_ULTRA_YEARLY")),
});

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
    aiProvider: serverEnv.aiProvider,
    naraRouter: naraRouterConfigured(),
    gemini: geminiConfigured(),
    razorpay: razorpayConfigured(),
    razorpayWebhook: Boolean(serverEnv.razorpayWebhookSecret),
    serviceRole: Boolean(serverEnv.supabaseServiceRoleKey),
    googleOAuth: read("NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED").toLowerCase() === "true",
    demo: demoMode(),
    mockCheckout: serverEnv.allowMockCheckout,
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
