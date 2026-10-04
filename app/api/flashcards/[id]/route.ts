import { guard } from "@/lib/api/helpers";
import { ApiError, ok } from "@/lib/http";
import { requireOnboarded } from "@/lib/session";
import { deleteDeck, getDeck } from "@/lib/data/flashcards";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("flashcards.get", async () => {
    const context = await requireOnboarded();
    const { id } = await params;

    const deck = await getDeck(context, id);
    if (!deck) throw new ApiError("NOT_FOUND", "That deck doesn't exist.");

    return ok({ deck });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guard("flashcards.delete", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    await deleteDeck(context, id);
    return ok({ deleted: true });
  });
}
