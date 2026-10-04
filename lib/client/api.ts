/**
 * Small typed fetch wrapper used by every client component.
 * Turns the API envelope into either data or a friendly error message.
 */

export class ApiClientError extends Error {
  code: string;
  status: number;
  meta: Record<string, unknown>;

  constructor(message: string, code: string, status: number, meta: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }

  get isLimitReached() {
    return this.code === "LIMIT_REACHED" || this.code === "PAYMENT_REQUIRED";
  }

  get needsOnboarding() {
    return Boolean(this.meta.needsOnboarding);
  }

  get upgradeHint() {
    return Boolean(this.meta.upgrade);
  }
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string } & Record<string, unknown>;
}

export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(input, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(rest.headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiClientError(
      "Something went wrong. Please check your connection and try again.",
      "NETWORK",
      0,
    );
  }

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (!response.ok || !envelope?.ok) {
    const error = envelope?.error;
    const { code = "SERVER_ERROR", message = "Something went wrong. Please try again.", ...meta } =
      error ?? {};
    throw new ApiClientError(message, code, response.status, meta);
  }

  return envelope.data as T;
}

/** Convenience for streaming endpoints — returns the raw Response. */
export async function apiStream(input: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const response = await fetch(input, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!response.ok) {
    let message = "AI is temporarily unavailable. Please try again.";
    let code = "AI_UNAVAILABLE";
    let meta: Record<string, unknown> = {};
    try {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (payload?.error) {
        message = payload.error.message ?? message;
        code = payload.error.code ?? code;
        const { code: _c, message: _m, ...rest_meta } = payload.error;
        meta = rest_meta;
      }
    } catch {
      /* keep defaults */
    }
    throw new ApiClientError(message, code, response.status, meta);
  }
  return response;
}
