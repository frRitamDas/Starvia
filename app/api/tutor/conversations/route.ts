import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { createConversation, listConversations } from "@/lib/data/tutor";

/** List the student's tutor conversations. */
export async function GET() {
  return guard("tutor.conversations.list", async () => {
    const context = await requireUser();
    const conversations = await listConversations(context);
    return ok({ conversations });
  });
}

/** Start a new conversation (used by "New chat"). */
export async function POST(request: Request) {
  return guard("tutor.conversations.create", async () => {
    const context = await requireUser();
    const body = (await readJson(request)) as {
      title?: string;
      subject?: string;
      topic?: string;
      difficulty?: string;
    };

    const conversation = await createConversation(context, {
      title: body.title?.slice(0, 120) || "New chat",
      subject: body.subject ?? null,
      topic: body.topic ?? null,
      difficulty: body.difficulty ?? null,
    });

    return ok({ conversation });
  });
}
