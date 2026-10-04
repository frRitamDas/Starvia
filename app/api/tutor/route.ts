import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, handleError, rateLimit } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { consumeQuota, addTokenUsage, logAiEvent } from "@/lib/usage";
import { awardXp, checkAchievements } from "@/lib/gamification";
import { getAchievementStats } from "@/lib/data/stats";
import {
  appendMessage,
  createConversation,
  getConversation,
  touchConversation,
  truncateAfterMessage,
} from "@/lib/data/tutor";
import { upsertTopicStatus } from "@/lib/data/progress";
import { AiError, generateTutorResponse } from "@/lib/ai";
import { demoMode } from "@/lib/env";
import { demoTutorAnswer } from "@/lib/ai/demo-generator";
import { tutorChatSchema } from "@/lib/validation";
import { touchActivity } from "@/lib/session";
import type { SessionContext } from "@/lib/session";
import type { Conversation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Streaming AI tutor endpoint.
 *
 * Order of operations (never reordered):
 *   auth → rate limit → validate → quota → persist → model → persist → reward.
 * The browser cannot skip any of these steps.
 */

interface StreamEvent {
  type: "meta" | "delta" | "done" | "error" | "notice";
  [key: string]: unknown;
}

function sse(event: StreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  // We stream, so errors are reported inside the stream rather than as JSON.
  let audit: SessionContext | null = null;

  try {
    const ctx = await requireOnboarded();
    audit = ctx;

    const rl = rateLimit(`tutor:${ctx.user.id}`, 20, 60_000);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "That's a lot of questions at once — take a breath and try again in a minute.");
    }

    const parsed = tutorChatSchema.parse(await readJson(request));

    await consumeQuota(ctx, "tutor");

    const profile = ctx.profile;
    const classLevel = parsed.classLevel ?? profile.class_level ?? "10";
    const board = parsed.board ?? profile.board ?? "CBSE";

    /* ------------------------- resolve conversation ------------------------ */
    let conversation: Conversation | null = null;
    let prompt = parsed.message;

    if (parsed.conversationId) {
      const existing = await getConversation(ctx, parsed.conversationId);
      if (!existing) throw new ApiError("NOT_FOUND", "That conversation no longer exists.");
      conversation = existing.conversation;

      if (parsed.regenerateMessageId) {
        await truncateAfterMessage(ctx, conversation.id, parsed.regenerateMessageId);
        const refreshed = await getConversation(ctx, conversation.id);
        const lastUser = [...(refreshed?.messages ?? [])]
          .reverse()
          .find((message) => message.role === "user");
        if (!lastUser) {
          throw new ApiError("BAD_REQUEST", "There's nothing to regenerate in this chat.");
        }
        prompt = lastUser.content;
      }
    } else {
      conversation = await createConversation(ctx, {
        title: parsed.message.slice(0, 80),
        subject: parsed.subject ?? null,
        topic: parsed.topic ?? null,
        difficulty: parsed.difficulty ?? null,
      });
    }

    /* ------------------------------ persist prompt ------------------------- */
    if (!parsed.regenerateMessageId) {
      await appendMessage(ctx, {
        conversationId: conversation.id,
        role: "user",
        content: parsed.message,
      });
    }

    const history = (await getConversation(ctx, conversation.id))?.messages.map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: message.content,
    })) ?? [];

    const studentContext = {
      classLevel,
      board,
      subject: parsed.subject ?? conversation.subject ?? null,
      topic: parsed.topic ?? conversation.topic ?? null,
      difficulty: parsed.difficulty ?? "medium",
      learningLevel: profile.learning_level,
      examTarget: profile.exam_target,
      language: parsed.language,
    };

    const conversationId = conversation.id;

    /* ------------------------------ stream setup --------------------------- */
    const encoder = new TextEncoder();

    /**
     * A student can close the tab or navigate away mid-answer. When that
     * happens the controller is already closed, so `enqueue` must never throw
     * (and we stop generating to save the AI budget).
     */
    let clientGone = false;
    const onAbort = () => {
      clientGone = true;
    };
    request.signal.addEventListener("abort", onAbort);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: StreamEvent) => {
          if (clientGone) return false;
          try {
            controller.enqueue(encoder.encode(sse(event)));
            return true;
          } catch {
            clientGone = true;
            return false;
          }
        };

        try {
          send({ type: "meta", conversationId });

          let answer = "";
          let model: string | null = null;
          let tokens = 0;
          const startedAt = Date.now();

          if (demoMode()) {
            // Demo mode: clearly-labelled placeholder text, never presented as real AI.
            answer = demoTutorAnswer(prompt, {
              classLevel,
              subject: studentContext.subject,
              topic: studentContext.topic,
            });
            send({ type: "notice", message: "Running in demo mode — configure GEMINI_API_KEY for real answers." });
            for (const chunk of answer.match(/[\s\S]{1,140}/g) ?? []) {
              if (!send({ type: "delta", text: chunk })) break;
              await new Promise((resolve) => setTimeout(resolve, 12));
            }
            model = "demo";
          } else {
            const generator = generateTutorResponse({
              context: studentContext,
              history,
              message: prompt,
            });

            while (!clientGone) {
              const next = await generator.next();
              if (next.done) {
                model = next.value.model;
                tokens = next.value.totalTokens;
                answer = next.value.text;
                break;
              }
              if (!send({ type: "delta", text: next.value.delta })) break;
            }
          }

          const latencyMs = Date.now() - startedAt;

          const assistantMessage = await appendMessage(ctx, {
            conversationId,
            role: "assistant",
            content: answer,
            model,
            tokens,
            latencyMs,
          });

          await touchConversation(ctx, conversationId, {
            title: parsed.message.slice(0, 80),
            subject: studentContext.subject,
            topic: studentContext.topic,
          });

          if (studentContext.subject) {
            await upsertTopicStatus(ctx, {
              subject: studentContext.subject,
              topic: studentContext.topic ?? "General doubts",
              status: "learning",
              minutesSpent: 2,
            }).catch(() => undefined);
          }

          await touchActivity(ctx, 2);
          await addTokenUsage(ctx, "tutor", tokens);
          await logAiEvent(ctx, {
            feature: "tutor",
            status: "success",
            model,
            latencyMs,
            tokens,
          });

          const xp = await awardXp(ctx, "tutor_message");
          const stats = await getAchievementStats(ctx);
          const unlocked = await checkAchievements(ctx, stats);

          send({
            type: "done",
            assistantMessageId: assistantMessage.id,
            model,
            tokens,
            latencyMs,
            xp: xp?.gained ?? 0,
            level: xp?.level ?? 1,
            leveledUp: xp?.leveledUp ?? false,
            achievements: unlocked.map((achievement) => ({
              code: achievement.code,
              title: achievement.title,
              description: achievement.description,
            })),
          });
        } catch (error) {
          const response = handleError(error, "tutor.stream");
          const payload = (await response.json()) as {
            error?: { code?: string; message?: string };
          };
          await logAiEvent(audit, {
            feature: "tutor",
            status: error instanceof AiError && error.code === "blocked" ? "blocked" : "error",
            errorCode: payload.error?.code ?? "SERVER_ERROR",
          });
          send({
            type: "error",
            code: payload.error?.code ?? "SERVER_ERROR",
            message: payload.error?.message ?? "Something went wrong. Please try again.",
          });
        } finally {
          request.signal.removeEventListener("abort", onAbort);
          try {
            controller.close();
          } catch {
            /* already closed by the client */
          }
        }
      },
      cancel() {
        clientGone = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return guard("tutor", async () => {
      throw error;
    });
  }
}
