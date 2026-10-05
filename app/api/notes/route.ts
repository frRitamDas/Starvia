import { guard, readJson } from "@/lib/api/helpers";
import { ok } from "@/lib/http";
import { createStudyNote, listStudyNotes } from "@/lib/data/notes";
import { requireOnboarded } from "@/lib/session";
import { studyNoteCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  return guard("notes.list", async () => {
    const context = await requireOnboarded();
    const notes = await listStudyNotes(context);
    return ok({ notes });
  });
}

export async function POST(request: Request) {
  return guard("notes.create", async () => {
    const context = await requireOnboarded();
    const input = studyNoteCreateSchema.parse(await readJson(request));
    const note = await createStudyNote(context, input);
    return ok({ note });
  });
}
