import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { ChatMessage, Conversation } from "@/lib/types";

/** Conversations + messages for the AI tutor. */

export async function listConversations(
  context: SessionContext,
  limit = 50,
): Promise<Conversation[]> {
  if (!context.user) return [];

  if (context.demo) {
    return [...demoStore().conversations]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.last_message_at.localeCompare(a.last_message_at))
      .slice(0, limit);
  }

  const { data, error } = await context.db!
    .from("conversations")
    .select("*")
    .eq("user_id", context.user.id)
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[tutor] listConversations:", error.message);
    return [];
  }
  return (data ?? []) as unknown as Conversation[];
}

export async function getConversation(
  context: SessionContext,
  conversationId: string,
): Promise<{ conversation: Conversation; messages: ChatMessage[] } | null> {
  if (!context.user) return null;

  if (context.demo) {
    const store = demoStore();
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (!conversation) return null;
    const messages = store.messages
      .filter((message) => message.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { conversation, messages };
  }

  const { data: conversation, error } = await context.db!
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error || !conversation) return null;

  const { data: messages, error: messagesError } = await context.db!
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[tutor] getConversation messages:", messagesError.message);
    return { conversation: conversation as unknown as Conversation, messages: [] };
  }

  return {
    conversation: conversation as unknown as Conversation,
    messages: (messages ?? []) as unknown as ChatMessage[],
  };
}

export async function createConversation(
  context: SessionContext,
  input: {
    title?: string;
    subject?: string | null;
    topic?: string | null;
    classLevel?: string | null;
    board?: string | null;
    difficulty?: string | null;
  },
): Promise<Conversation> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    user_id: context.user.id,
    title: (input.title || "New chat").slice(0, 120),
    subject: input.subject ?? null,
    topic: input.topic ?? null,
    class_level: input.classLevel ?? context.profile?.class_level ?? null,
    board: input.board ?? context.profile?.board ?? null,
    difficulty: input.difficulty ?? null,
  };

  if (context.demo) {
    const store = demoStore();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: demoId("1"),
      ...payload,
      pinned: false,
      message_count: 0,
      last_message_at: now,
      created_at: now,
    };
    store.conversations.unshift(conversation);
    return conversation;
  }

  const { data, error } = await context.db!
    .from("conversations")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[tutor] createConversation:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not start a new chat. Please try again.");
  }
  return data as unknown as Conversation;
}

export async function appendMessage(
  context: SessionContext,
  input: {
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    model?: string | null;
    tokens?: number | null;
    latencyMs?: number | null;
  },
): Promise<ChatMessage> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    conversation_id: input.conversationId,
    user_id: context.user.id,
    role: input.role,
    content: input.content,
    model: input.model ?? null,
    tokens: input.tokens ?? null,
    latency_ms: input.latencyMs ?? null,
    rating: null,
  };

  if (context.demo) {
    const store = demoStore();
    const message: ChatMessage = {
      id: demoId("2"),
      ...payload,
      created_at: new Date().toISOString(),
    };
    store.messages.push(message);
    const conversation = store.conversations.find((item) => item.id === input.conversationId);
    if (conversation) {
      conversation.message_count += 1;
      conversation.last_message_at = message.created_at;
    }
    return message;
  }

  const { data, error } = await context.db!.from("messages").insert(payload).select("*").single();
  if (error || !data) {
    console.error("[tutor] appendMessage:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save that message.");
  }

  if (input.role === "user") {
    await context.db!.from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", input.conversationId)
      .eq("user_id", context.user.id);
  }

  return data as unknown as ChatMessage;
}

/** Bump message count + last activity after a completed exchange. */
export async function touchConversation(
  context: SessionContext,
  conversationId: string,
  patch: { title?: string; subject?: string | null; topic?: string | null } = {},
) {
  if (!context.user) return;
  if (context.demo) {
    const conversation = demoStore().conversations.find((item) => item.id === conversationId);
    if (conversation) {
      conversation.last_message_at = new Date().toISOString();
      if (patch.title) conversation.title = patch.title.slice(0, 120);
      if (patch.subject) conversation.subject = patch.subject;
      if (patch.topic) conversation.topic = patch.topic;
    }
    return;
  }
  await context.db!.from("conversations")
    .update({ last_message_at: new Date().toISOString(), ...patch })
    .eq("id", conversationId)
    .eq("user_id", context.user.id);
}

export async function updateConversation(
  context: SessionContext,
  conversationId: string,
  patch: { title?: string; pinned?: boolean },
): Promise<void> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    const conversation = demoStore().conversations.find((item) => item.id === conversationId);
    if (!conversation) throw new ApiError("NOT_FOUND");
    if (patch.title !== undefined) conversation.title = patch.title.slice(0, 120);
    if (patch.pinned !== undefined) conversation.pinned = patch.pinned;
    return;
  }

  const { error } = await context.db!.from("conversations")
    .update(patch)
    .eq("id", conversationId)
    .eq("user_id", context.user.id);
  if (error) throw new ApiError("SERVER_ERROR", "Could not update that chat.");
}

export async function deleteConversation(context: SessionContext, conversationId: string) {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    const store = demoStore();
    store.conversations = store.conversations.filter((item) => item.id !== conversationId);
    store.messages = store.messages.filter((message) => message.conversation_id !== conversationId);
    return;
  }

  const { error } = await context.db!.from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", context.user.id);
  if (error) throw new ApiError("SERVER_ERROR", "Could not delete that chat.");
}

export async function rateMessage(
  context: SessionContext,
  messageId: string,
  rating: 1 | -1 | 0,
): Promise<void> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    const message = demoStore().messages.find((item) => item.id === messageId);
    if (message) message.rating = rating;
    return;
  }

  const { error } = await context.db!.from("messages")
    .update({ rating })
    .eq("id", messageId)
    .eq("user_id", context.user.id)
    .eq("role", "assistant");
  if (error) throw new ApiError("SERVER_ERROR", "Could not record your feedback.");
}

/**
 * Trim the conversation so the assistant's answer to a message can be regenerated:
 * removes every message created after (and including) the given assistant message.
 */
export async function truncateAfterMessage(
  context: SessionContext,
  conversationId: string,
  messageId: string,
) {
  if (!context.user) return;

  if (context.demo) {
    const store = demoStore();
    const index = store.messages.findIndex((item) => item.id === messageId);
    if (index === -1) return;
    store.messages = store.messages.slice(0, index);
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (conversation) {
      conversation.message_count = store.messages.filter(
        (item) => item.conversation_id === conversationId,
      ).length;
    }
    return;
  }

  const { data: target } = await context.db!
    .from("messages")
    .select("created_at")
    .eq("id", messageId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!target) return;

  await context.db!.from("messages")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", context.user.id)
    .gte("created_at", (target as { created_at: string }).created_at);
}

/** Total messages the student has sent (used for achievement stats). */
export async function countUserMessages(context: SessionContext): Promise<number> {
  if (!context.user) return 0;
  if (context.demo) {
    return demoStore().messages.filter((message) => message.role === "user").length;
  }
  const { count, error } = await context.db!
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.user.id)
    .eq("role", "user");
  if (error) return 0;
  return count ?? 0;
}
