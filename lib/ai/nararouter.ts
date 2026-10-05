import { serverEnv } from "@/lib/env";
import { AiError } from "@/lib/ai/provider";
import type {
  AiContent,
  GenerateOptions,
  GenerateResult,
  ModelAlias,
  StreamChunk,
  StreamResult,
} from "@/lib/ai/provider";

/**
 * NaraRouter adapter.
 *
 * NaraRouter exposes an OpenAI-compatible Chat Completions API. This adapter
 * deliberately uses fetch instead of adding another SDK dependency.
 *
 * Docs: https://router.bynara.id/docs
 */

const DEFAULT_BASE_URL = "https://router.bynara.id/v1";

interface ChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

interface ChatCompletionStreamChunk {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function timeoutError() {
  return new AiError("timeout", "AI took too long to respond. Please try again.");
}

function mapError(status: number, body: string): AiError {
  if (status === 401 || status === 403) {
    return new AiError(
      "not_configured",
      "The AI provider is not configured correctly. Please try again later.",
      body,
    );
  }
  if (status === 429) {
    return new AiError(
      "quota",
      "The AI service is busy right now. Please try again in a moment.",
      body,
    );
  }
  if (status >= 500) {
    return new AiError(
      "unavailable",
      "The AI service is temporarily unavailable. Please try again.",
      body,
    );
  }
  return new AiError(
    "bad_response",
    "The AI provider could not complete that request. Please try again.",
    body,
  );
}

function modelFor(alias: ModelAlias) {
  switch (alias) {
    case "fast":
      return serverEnv.naraRouterModelFast;
    case "pro":
      return serverEnv.naraRouterModelPro;
    case "vision":
      return serverEnv.naraRouterModelVision;
    default:
      return serverEnv.naraRouterModelDefault;
  }
}

function baseUrl() {
  return serverEnv.naraRouterBaseUrl.replace(/\/$/, "") || DEFAULT_BASE_URL;
}

function textFromParts(content: AiContent["parts"]) {
  return content
    .map((part) => part.text ?? "")
    .filter(Boolean)
    .join("\n");
}

function buildMessages(options: GenerateOptions) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (options.system?.trim()) {
    messages.push({ role: "system", content: options.system.trim() });
  }

  for (const message of options.messages) {
    const content = textFromParts(message.parts);
    if (!content) continue;
    messages.push({
      role: message.role === "model" ? "assistant" : "user",
      content,
    });
  }

  return messages;
}

function hasInlineImage(options: GenerateOptions) {
  return options.messages.some((message) =>
    message.parts.some((part) => Boolean(part.inlineData)),
  );
}

function buildBody(options: GenerateOptions, stream: boolean) {
  const body: Record<string, unknown> = {
    model: modelFor(options.model ?? "default"),
    messages: buildMessages(options),
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxOutputTokens ?? 4096,
    stream,
  };

  if (options.topP !== undefined) body.top_p = options.topP;
  return body;
}

async function fetchWithTimeout(
  body: Record<string, unknown>,
  options: GenerateOptions,
  stream: boolean,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? serverEnv.aiTimeoutMs,
  );

  try {
    return await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.naraRouterApiKey}`,
        "Content-Type": "application/json",
        Accept: stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw timeoutError();
    }
    throw new AiError(
      "unavailable",
      "The AI service is temporarily unavailable. Please try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function naraRouterConfigured() {
  try {
    return Boolean(serverEnv.naraRouterApiKey);
  } catch {
    return false;
  }
}

export function naraRouterSupportsRequest(options: GenerateOptions) {
  // The current Starvia image/vision payload uses Gemini's inlineData format.
  // Keep image solving on the Gemini path until NaraRouter vision support is
  // explicitly configured and tested; text workloads use NaraRouter.
  return naraRouterConfigured() && !hasInlineImage(options);
}

export async function generateTextNaraRouter(
  options: GenerateOptions,
): Promise<GenerateResult> {
  if (!naraRouterConfigured()) {
    throw new AiError("not_configured", "NaraRouter is not configured for this deployment.");
  }

  const started = Date.now();
  const response = await fetchWithTimeout(buildBody(options, false), options, false);
  const raw = await response.text();

  if (!response.ok) {
    console.error(
      `[ai:nararouter:${options.label ?? "text"}] ${response.status}`,
      raw.slice(0, 500),
    );
    throw mapError(response.status, raw);
  }

  let parsed: ChatCompletionResponse;
  try {
    parsed = JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    throw new AiError("bad_response", "AI returned an unreadable response. Please try again.");
  }

  const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new AiError("bad_response", "AI didn't return an answer. Please try again.");
  }

  return {
    text,
    model: parsed.model ?? modelFor(options.model ?? "default"),
    promptTokens: parsed.usage?.prompt_tokens ?? 0,
    completionTokens: parsed.usage?.completion_tokens ?? 0,
    totalTokens: parsed.usage?.total_tokens ?? 0,
    finishReason: parsed.choices?.[0]?.finish_reason ?? null,
    latencyMs: Date.now() - started,
  };
}

export async function* streamTextNaraRouter(
  options: GenerateOptions,
): AsyncGenerator<StreamChunk, StreamResult, void> {
  if (!naraRouterConfigured()) {
    throw new AiError("not_configured", "NaraRouter is not configured for this deployment.");
  }

  const started = Date.now();
  const response = await fetchWithTimeout(buildBody(options, true), options, true);

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    console.error(
      `[ai:nararouter:stream:${options.label ?? "text"}] ${response.status}`,
      raw.slice(0, 500),
    );
    throw mapError(response.status, raw);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let sawText = false;
  let model = modelFor(options.model ?? "default");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let parsed: ChatCompletionStreamChunk;
        try {
          parsed = JSON.parse(payload) as ChatCompletionStreamChunk;
        } catch {
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          sawText = true;
          yield { text: delta };
        }

        if (parsed.usage) {
          promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
          completionTokens = parsed.usage.completion_tokens ?? completionTokens;
          totalTokens = parsed.usage.total_tokens ?? totalTokens;
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
