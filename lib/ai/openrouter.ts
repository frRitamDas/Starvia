import { serverEnv } from "@/lib/env";
import { AiError } from "@/lib/ai/types";
import type { AiContent, GenerateOptions, GenerateResult, ModelAlias, StreamChunk, StreamResult } from "@/lib/ai/types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface ChatCompletionStreamChunk {
  model?: string;
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function modelFor(_alias: ModelAlias) {
  return serverEnv.openRouterModelDefault;
}

function baseUrl() {
  return (serverEnv.openRouterBaseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function hasInlineImage(options: GenerateOptions) {
  return options.messages.some((message) => message.parts.some((part) => Boolean(part.inlineData)));
}

function textFromParts(parts: AiContent["parts"]) {
  return parts.map((part) => part.text ?? "").filter(Boolean).join("\n");
}

function buildMessages(options: GenerateOptions) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  const systemParts = [options.system?.trim() ?? ""];
  if (options.responseMimeType === "application/json") {
    systemParts.push("Return only valid JSON. Do not wrap JSON in Markdown fences or add explanatory text.");
  }
  const system = systemParts.filter(Boolean).join("\n\n");
  if (system) messages.push({ role: "system", content: system });

  for (const message of options.messages) {
    const content = textFromParts(message.parts);
    if (!content) continue;
    messages.push({ role: message.role === "model" ? "assistant" : "user", content });
  }
  return messages;
}

function requestBody(options: GenerateOptions, stream: boolean) {
  return {
    model: modelFor(options.model ?? "default"),
    messages: buildMessages(options),
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxOutputTokens ?? 4096,
    ...(options.topP !== undefined ? { top_p: options.topP } : {}),
    stream,
  };
}

function mapError(status: number, body: string) {
  if (status === 401 || status === 403) return new AiError("not_configured", "The OpenRouter provider is not configured correctly.", body);
  if (status === 429) return new AiError("quota", "The free AI route is busy right now. Please try again in a moment.", body);
  if (status >= 500) return new AiError("unavailable", "The AI service is temporarily unavailable. Please try again.", body);
  return new AiError("bad_response", "The AI provider could not complete that request. Please try again.", body);
}

async function request(options: GenerateOptions, stream: boolean) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? serverEnv.aiTimeoutMs);
  try {
    return await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.openRouterApiKey}`,
        "Content-Type": "application/json",
        Accept: stream ? "text/event-stream" : "application/json",
        "HTTP-Referer": serverEnv.siteUrl,
        "X-Title": "Starvia",
      },
      body: JSON.stringify(requestBody(options, stream)),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiError("timeout", "AI took too long to respond. Please try again.");
    }
    throw new AiError("unavailable", "The AI service is temporarily unavailable. Please try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export function openRouterConfigured() {
  try {
    return Boolean(serverEnv.openRouterApiKey);
  } catch {
    return false;
  }
}

export function openRouterSupportsRequest(options: GenerateOptions) {
  return openRouterConfigured() && !hasInlineImage(options);
}

export async function generateTextOpenRouter(options: GenerateOptions): Promise<GenerateResult> {
  if (!openRouterConfigured()) throw new AiError("not_configured", "OpenRouter is not configured for this deployment.");

  const started = Date.now();
  const response = await request(options, false);
  const raw = await response.text();
  if (!response.ok) {
    console.error(`[ai:openrouter:${options.label ?? "text"}] ${response.status}`, raw.slice(0, 500));
    throw mapError(response.status, raw);
  }

  let parsed: ChatCompletionResponse;
  try {
    parsed = JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    throw new AiError("bad_response", "AI returned an unreadable response. Please try again.");
  }

  const text = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new AiError("bad_response", "AI didn't return an answer. Please try again.");

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

export async function* streamTextOpenRouter(options: GenerateOptions): AsyncGenerator<StreamChunk, StreamResult, void> {
  if (!openRouterSupportsRequest(options)) {
    throw new AiError("not_configured", "OpenRouter is not configured for this deployment.");
  }

  const started = Date.now();
  const response = await request(options, true);
  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    throw mapError(response.status, raw);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let model = modelFor(options.model ?? "default");
  let sawText = false;

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
        model = parsed.model ?? model;
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

  if (!sawText) throw new AiError("bad_response", "AI didn't return an answer. Please try again.");

  return {
    model,
    totalTokens,
    promptTokens,
    completionTokens,
    latencyMs: Date.now() - started,
  };
}
