export type AiRole = "user" | "model";

export interface AiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface AiContent {
  role: AiRole;
  parts: AiPart[];
}

export interface GenerateOptions {
  system?: string;
  messages: AiContent[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
  model?: ModelAlias;
  timeoutMs?: number;
  label?: string;
}

export type ModelAlias = "default" | "fast" | "vision" | "pro";

export interface GenerateResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string | null;
  latencyMs: number;
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

export class AiError extends Error {
  code: "not_configured" | "unavailable" | "quota" | "blocked" | "timeout" | "bad_response";
  detail?: string;

  constructor(code: AiError["code"], message: string, detail?: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.detail = detail;
  }
}
