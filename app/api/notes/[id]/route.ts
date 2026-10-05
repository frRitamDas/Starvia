import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { deleteStudyNote, updateStudyNote } from "@/lib/data/notes";
import { requireOnboarded } from "@/lib/session";
import { studyNoteUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard("notes.update", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    const patch = studyNoteUpdateSchema.parse(await readJson(request));
    const note = await updateStudyNote(context, id, patch);
    return ok({ note });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard("notes.delete", async () => {
    const context = await requireOnboarded();
    const { id } = await params;
    await deleteStudyNote(context, id);
    return ok({ deleted: true });
  });
}
