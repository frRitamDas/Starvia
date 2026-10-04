import { guard, readJson } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { deleteConversation, getConversation, updateConversation } from "@/lib/data/tutor";
import { conversationPatchSchema } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertId(id: string) {
  if (!UUID.test(id)) throw new ApiError("BAD_REQUEST", "That conversation id is not valid.");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutor.conversation.get", async () => {
    const context = await requireUser();
    const { id } = await params;
    assertId(id);

    const result = await getConversation(context, id);
    if (!result) throw new ApiError("NOT_FOUND", "That conversation doesn't exist.");

    return ok(result);
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutor.conversation.patch", async () => {
    const context = await requireUser();
    const { id } = await params;
    assertId(id);

    const parsed = conversationPatchSchema.parse(await readJson(request));
    await updateConversation(context, id, parsed);
    return ok({ updated: true });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("tutor.conversation.delete", async () => {
    const context = await requireUser();
    const { id } = await params;
    assertId(id);

    await deleteConversation(context, id);
    return ok({ deleted: true });
  });
}
