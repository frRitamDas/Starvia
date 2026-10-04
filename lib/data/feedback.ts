import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";

/** Contact form + in-app feedback (bug reports, ideas, content issues). */

export interface FeedbackInput {
  category: "bug" | "idea" | "content" | "billing" | "contact" | "other";
  message: string;
  rating?: number | null;
  page?: string | null;
  email?: string | null;
  /** Present only for the public contact form when no user is signed in. */
  name?: string | null;
}

export async function saveFeedback(context: SessionContext | null, input: FeedbackInput) {
  const payload = {
    user_id: context?.user?.id ?? null,
    email: input.email ?? context?.user?.email ?? null,
    category: input.category,
    rating: input.rating ?? null,
    message: input.message.slice(0, 2000),
    page: input.page ?? null,
    status: "new" as const,
  };

  if (context?.demo) {
    const store = demoStore() as unknown as {
      feedback?: { id: string; created_at: string }[];
    };
    store.feedback = store.feedback ?? [];
    store.feedback.unshift({ id: demoId("9"), created_at: new Date().toISOString() });
    return { id: store.feedback[0]!.id };
  }

  const client = context?.admin ?? context?.db ?? null;
  if (!client) {
    throw new ApiError("NOT_CONFIGURED", "Feedback storage isn't configured yet.");
  }

  const { data, error } = await client.from("feedback").insert(payload).select("id").single();
  if (error || !data) {
    console.error("[feedback] save:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not send your message. Please try again.");
  }
  return { id: (data as { id: string }).id };
}
