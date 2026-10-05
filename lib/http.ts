import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiError } from "@/lib/ai/types";

/**
 * Uniform API envelope. The client only ever renders `error.message`,
 * which is always a safe, human sentence — never a stack trace.
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "LIMIT_REACHED"
  | "PAYMENT_REQUIRED"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "CONFLICT"
  | "SERVER_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LIMIT_REACHED: 429,
  PAYMENT_REQUIRED: 402,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  NOT_CONFIGURED: 501,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  BAD_REQUEST: "That request didn't look right. Please check and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have access to this.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  LIMIT_REACHED: "You've reached today's limit. Upgrade to continue learning.",
  PAYMENT_REQUIRED: "This feature is part of a paid plan.",
  RATE_LIMITED: "Too many requests. Please slow down for a moment.",
  AI_UNAVAILABLE: "AI is temporarily unavailable. Please try again.",
  NOT_CONFIGURED: "This integration isn't configured yet.",
  CONFLICT: "That action was already completed.",
  SERVER_ERROR: "Something went wrong. Please try again.",
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  meta?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message?: string, meta?: Record<string, unknown>) {
    super(message || DEFAULT_MESSAGE[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.meta = meta;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function fail(code: ApiErrorCode, message?: string, meta?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: { code, message: message || DEFAULT_MESSAGE[code], ...(meta ?? {}) } },
    { status: STATUS_BY_CODE[code] },
  );
}

/** Convert any thrown value into a safe API response. Never leaks internals. */
export function handleError(error: unknown, context?: string) {
  if (error instanceof AiError) {
    const code: ApiErrorCode =
      error.code === "not_configured"
        ? "NOT_CONFIGURED"
        : error.code === "blocked" || error.code === "bad_response"
          ? "BAD_REQUEST"
          : error.code === "quota"
            ? "AI_UNAVAILABLE"
            : "AI_UNAVAILABLE";

    // Keep provider diagnostics server-side only. The student receives a
    // stable, actionable message while logs retain the provider detail.
    return fail(code, error.message);
  }
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.meta);
  }
  if (error instanceof ZodError) {
    return fail("BAD_REQUEST", error.issues[0]?.message || DEFAULT_MESSAGE.BAD_REQUEST, {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  console.error(`[api${context ? `:${context}` : ""}]`, error);
  return fail("SERVER_ERROR");
}

/* ------------------------------------------------------------------ */
/* Best-effort in-memory rate limiter                                  */
/* ------------------------------------------------------------------ */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Per-instance sliding window limiter. Good enough to blunt obvious abuse
 * (the authoritative limits are the DB-backed daily quotas). Swap for
 * Upstash/Redis by replacing this function if you need global limits.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new ApiError("RATE_LIMITED", undefined, { retryAfterMs: result.resetAt - Date.now() });
  }
}

/** Cheap client fingerprint for rate limiting (never used for security decisions). */
export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return ip;
}
