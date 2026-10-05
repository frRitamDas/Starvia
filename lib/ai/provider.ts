import "server-only";

import { serverEnv } from "@/lib/env";
import { AiError } from "@/lib/ai/types";
import type {
  AiContent,
  GenerateOptions,
  GenerateResult,
  ModelAlias,
  StreamChunk,
  StreamResult,
} from "@/lib/ai/types";

/**
 * Gemini provider abstraction.
 *
 * The whole app talks to Gemini through this file only. Swapping to a paid tier,
 * a different model, or (later) another provider is a change in ONE place.
 * The REST API is used directly — no vendor SDK — to keep the bundle small and
 * the surface area auditable.
 *
 * Docs: https://ai.google.dev/api/generate-content
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export {
  AiError,
} from "@/lib/ai/types";
export type {
  AiContent,
  GenerateOptions,
  GenerateResult,
  ModelAlias,
  StreamChunk,
  StreamResult,
} from "@/lib/ai/types";

export function resolveModel(alias: ModelAlias = "default"): string {
  switch (alias) {
    case "fast":
      return serverEnv.geminiModelFast;
    case "vision":
      return serverEnv.geminiModelVision;
    case "pro":
      return serverEnv.geminiModelPro;
    default:
      return serverEnv.geminiModelDefault;
  }
}

export function aiConfigured() {
  try {
    return Boolean(serverEnv.geminiApiKey);
  } catch {
    return false;
  }
}

function endpoint(model: string, stream: boolean) {
  const method = stream ? "streamGenerateContent" : "generateContent";
  const query = stream ? "?alt=sse" : "";
  return `${API_BASE}/models/${encodeURIComponent(model)}:${method}${query}`;
}

interface GeminiResponseShape {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { code?: number; message?: string; status?: string };
}

function buildBody(options: GenerateOptions) {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.6,
    topP: options.topP ?? 0.95,
    maxOutputTokens: options.maxOutputTokens ?? 4096,
  };
  if (options.responseMimeType === "application/json") {
    generationConfig.responseMimeType = "application/json";
  }
  return {
    contents: options.messages,
    ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
    generationConfig,
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };
}

function mapHttpError(status: number, body: string): AiError {
  if (status === 429) {
    return new AiError("quota", "AI is busy right now. Please try again in a moment.", body);
  }
  if (status === 401 || status === 403) {
    return new AiError(
      "not_configured",
      "AI is not configured correctly. Please contact support.",
      body,
    );
  }
  if (status === 400 && /API key not valid/i.test(body)) {
    return new AiError("not_configured", "AI is not configured correctly.", body);
  }
  if (status >= 500) {
    return new AiError("unavailable", "AI is temporarily unavailable. Please try again.", body);
  }
  return new AiError("bad_response", "AI could not complete that request. Please try again.", body);
}

async function requestWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  attempts = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 429 || response.status >= 500) {
        if (attempt < attempts - 1) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const aborted = error instanceof Error && error.name === "AbortError";
      if (attempt < attempts - 1) {
        await sleep(aborted ? 200 : 600 * Math.pow(2, attempt));
        continue;
      }
      if (aborted) {
        throw new AiError("timeout", "AI took too long to respond. Please try again.");
      }
      throw new AiError("unavailable", "AI is temporarily unavailable. Please try again.");
    }
  }
  throw lastError instanceof AiError
    ? lastError
    : new AiError("unavailable", "AI is temporarily unavailable. Please try again.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Non-streaming generation. Returns plain text plus token accounting. */
export async function generateText(options: GenerateOptions): Promise<GenerateResult> {
  if (!aiConfigured()) {
    throw new AiError("not_configured", "AI is not configured for this deployment yet.");
  }
  const model = resolveModel(options.model);
  const started = Date.now();
  const response = await requestWithRetry(
    endpoint(model, false),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": serverEnv.geminiApiKey,
      },
      body: JSON.stringify(buildBody(options)),
      cache: "no-store",
    },
    options.timeoutMs ?? serverEnv.aiTimeoutMs,
  );

  const raw = await response.text();
  if (!response.ok) {
    console.error(`[ai:${options.label ?? "text"}] ${response.status}`, raw.slice(0, 500));
    throw mapHttpError(response.status, raw);
  }

  let parsed: GeminiResponseShape;
  try {
    parsed = JSON.parse(raw) as GeminiResponseShape;
  } catch {
    throw new AiError("bad_response", "AI returned an unreadable response. Please try again.");
  }

  if (parsed.promptFeedback?.blockReason) {
    throw new AiError(
      "blocked",
      "That request couldn't be processed. Try rephrasing your question.",
    );
  }

  const text =
    parsed.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    const finishReason = parsed.candidates?.[0]?.finishReason;
    if (finishReason && ["SAFETY", "PROHIBITED_CONTENT", "RECITATION"].includes(finishReason)) {
      throw new AiError("blocked", "That response was filtered. Try rephrasing your question.");
    }
    throw new AiError("bad_response", "AI didn't return an answer. Please try again.");
  }

  return {
    text,
    model,
    promptTokens: parsed.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: parsed.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: parsed.usageMetadata?.totalTokenCount ?? 0,
    finishReason: parsed.candidates?.[0]?.finishReason ?? null,
    latencyMs: Date.now() - started,
  };
}

export interface StreamChunk {
  text: string;
}

export interface StreamResult {
  model: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

/**
 * Streaming generation over SSE. Emits plain text deltas.
 * The caller is responsible for persisting the final message.
 */
export async function* streamText(
  options: GenerateOptions,
): AsyncGenerator<StreamChunk, StreamResult, void> {
  if (!aiConfigured()) {
    throw new AiError("not_configured", "AI is not configured for this deployment yet.");
  }
  const model = resolveModel(options.model);
  const started = Date.now();
  const response = await requestWithRetry(
    endpoint(model, true),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": serverEnv.geminiApiKey,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(buildBody(options)),
      cache: "no-store",
    },
    options.timeoutMs ?? serverEnv.aiTimeoutMs,
    2,
  );

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    console.error(`[ai:stream:${options.label ?? "text"}] ${response.status}`, raw.slice(0, 500));
    throw mapHttpError(response.status, raw);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let sawText = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let parsed: GeminiResponseShape;
        try {
          parsed = JSON.parse(payload) as GeminiResponseShape;
        } catch {
          continue;
        }
        if (parsed.promptFeedback?.blockReason) {
          throw new AiError(
            "blocked",
            "That request couldn't be processed. Try rephrasing your question.",
          );
        }
        const delta =
          parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
        if (delta) {
          sawText = true;
          yield { text: delta };
        }
        if (parsed.usageMetadata) {
          promptTokens = parsed.usageMetadata.promptTokenCount ?? promptTokens;
          completionTokens = parsed.usageMetadata.candidatesTokenCount ?? completionTokens;
          totalTokens = parsed.usageMetadata.totalTokenCount ?? totalTokens;
        }
      }
    }
  }

  if (!sawText) {
    throw new AiError("bad_response", "AI didn't return an answer. Please try again.");
  }

  return {
    model,
    totalTokens,
    promptTokens,
    completionTokens,
    latencyMs: Date.now() - started,
  };
}

/**
 * JSON-mode generation with a defensive parse.
 * Models occasionally wrap JSON in prose or code fences — we recover where possible.
 */
export async function generateJson<T>(
  options: Omit<GenerateOptions, "responseMimeType">,
): Promise<{ data: T; result: GenerateResult }> {
  const result = await generateText({
    ...options,
    responseMimeType: "application/json",
    temperature: options.temperature ?? 0.4,
  });
  return { data: parseJsonLoose<T>(result.text), result };
}

export function parseJsonLoose<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/```json/gi, "```")
    .trim();
  const candidates: string[] = [cleaned];

  const fenced = cleaned.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(cleaned.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }
  throw new AiError("bad_response", "AI returned an unexpected format. Please try again.");
}

/** Rough token estimate used when Gemini does not report usage (cached content). */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
