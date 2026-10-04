import { handleError } from "@/lib/http";

/**
 * Wraps a route handler so every failure becomes a clean JSON envelope
 * (never a stack trace), with request-scoped logging.
 */
export async function guard(
  name: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return handleError(error, name);
  }
}

/** Reads a JSON body defensively — malformed JSON never throws downstream. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export const ONBOARDED_COOKIE = "starvia_onboarded";
