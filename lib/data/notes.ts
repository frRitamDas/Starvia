import "server-only";

import { demoId, demoStore } from "@/lib/demo/store";
import { ApiError } from "@/lib/http";
import type { SessionContext } from "@/lib/session";
import type { StudyMindMap, StudyNote } from "@/lib/types";

export type StudyNoteInput = Pick<StudyNote, "title" | "subject" | "content"> & {
  topic?: string | null;
};

export type StudyNotePatch = Partial<StudyNoteInput>;

/** Private notes are always filtered by the authenticated owner. */
export async function listStudyNotes(context: SessionContext, limit = 100): Promise<StudyNote[]> {
  if (!context.user) return [];

  if (context.demo) {
    return [...demoStore().notes]
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, limit);
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .select("*")
    .eq("user_id", context.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notes] listStudyNotes:", error.message);
    return [];
  }
  return (data ?? []) as unknown as StudyNote[];
}

export async function getStudyNote(
  context: SessionContext,
  noteId: string,
): Promise<StudyNote | null> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    return demoStore().notes.find((note) => note.id === noteId) ?? null;
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    console.error("[notes] getStudyNote:", error.message);
    throw new ApiError("SERVER_ERROR", "Could not open that note.");
  }
  return (data as unknown as StudyNote | null) ?? null;
}

export async function createStudyNote(
  context: SessionContext,
  input: StudyNoteInput,
): Promise<StudyNote> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload = {
    title: input.title.trim().slice(0, 120),
    subject: input.subject.trim().slice(0, 60) || "General",
    topic: input.topic?.trim().slice(0, 160) || null,
    content: input.content,
  };

  if (context.demo) {
    const now = new Date().toISOString();
    const note: StudyNote = {
      id: demoId("9"),
      user_id: context.user.id,
      ...payload,
      mind_map: null,
      created_at: now,
      updated_at: now,
    };
    demoStore().notes.unshift(note);
    return note;
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .insert({ user_id: context.user.id, ...payload })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[notes] createStudyNote:", error?.message);
    throw new ApiError("SERVER_ERROR", "Could not save that note.");
  }
  return data as unknown as StudyNote;
}

export async function updateStudyNote(
  context: SessionContext,
  noteId: string,
  patch: StudyNotePatch,
): Promise<StudyNote> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  const payload: StudyNotePatch & { mind_map?: null } = {
    ...(patch.title !== undefined ? { title: patch.title.trim().slice(0, 120) } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject.trim().slice(0, 60) || "General" } : {}),
    ...(patch.topic !== undefined ? { topic: patch.topic?.trim().slice(0, 160) || null } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
  };

  // A generated map belongs to the exact title/content it was created from.
  if (patch.title !== undefined || patch.content !== undefined) payload.mind_map = null;

  if (context.demo) {
    const note = demoStore().notes.find((item) => item.id === noteId);
    if (!note) throw new ApiError("NOT_FOUND", "That note no longer exists.");
    Object.assign(note, payload, { updated_at: new Date().toISOString() });
    return note;
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .update(payload)
    .eq("id", noteId)
    .eq("user_id", context.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[notes] updateStudyNote:", error.message);
    throw new ApiError("SERVER_ERROR", "Could not update that note.");
  }
  if (!data) throw new ApiError("NOT_FOUND", "That note no longer exists.");
  return data as unknown as StudyNote;
}

export async function saveStudyNoteMindMap(
  context: SessionContext,
  noteId: string,
  mindMap: StudyMindMap,
): Promise<StudyNote> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    const note = demoStore().notes.find((item) => item.id === noteId);
    if (!note) throw new ApiError("NOT_FOUND", "That note no longer exists.");
    note.mind_map = mindMap;
    note.updated_at = new Date().toISOString();
    return note;
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .update({ mind_map: mindMap as unknown as never })
    .eq("id", noteId)
    .eq("user_id", context.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[notes] saveStudyNoteMindMap:", error.message);
    throw new ApiError("SERVER_ERROR", "Could not save the mind map.");
  }
  if (!data) throw new ApiError("NOT_FOUND", "That note no longer exists.");
  return data as unknown as StudyNote;
}

export async function deleteStudyNote(context: SessionContext, noteId: string): Promise<void> {
  if (!context.user) throw new ApiError("UNAUTHORIZED");

  if (context.demo) {
    const store = demoStore();
    const index = store.notes.findIndex((note) => note.id === noteId);
    if (index < 0) throw new ApiError("NOT_FOUND", "That note no longer exists.");
    store.notes.splice(index, 1);
    return;
  }

  const { data, error } = await context.db!
    .from("study_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[notes] deleteStudyNote:", error.message);
    throw new ApiError("SERVER_ERROR", "Could not delete that note.");
  }
  if (!data) throw new ApiError("NOT_FOUND", "That note no longer exists.");
}
