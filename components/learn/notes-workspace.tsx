"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  Check,
  Download,
  FilePlus2,
  GitBranch,
  Loader2,
  Map,
  NotebookPen,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/learn/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { StudyMindMap, StudyNote } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface NoteDraft {
  title: string;
  subject: string;
  topic: string;
  content: string;
  mind_map: StudyMindMap | null;
}

function toDraft(note: StudyNote): NoteDraft {
  return {
    title: note.title,
    subject: note.subject,
    topic: note.topic ?? "",
    content: note.content,
    mind_map: note.mind_map,
  };
}

function emptyDraft(subject: string): NoteDraft {
  return { title: "", subject, topic: "", content: "", mind_map: null };
}

export function NotesWorkspace({
  initialNotes,
  subjects,
  mapCreditsRemaining,
  mapCreditsLimit,
}: {
  initialNotes: StudyNote[];
  subjects: string[];
  mapCreditsRemaining: number;
  mapCreditsLimit: number;
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialNotes);
  const [activeId, setActiveId] = React.useState<string | null>(initialNotes[0]?.id ?? null);
  const [draft, setDraft] = React.useState<NoteDraft>(
    initialNotes[0] ? toDraft(initialNotes[0]) : emptyDraft(subjects[0] ?? "General"),
  );
  const [query, setQuery] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [mapping, setMapping] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const activeNote = notes.find((note) => note.id === activeId) ?? null;
  const filteredNotes = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return notes;
    return notes.filter((note) =>
      [note.title, note.subject, note.topic ?? "", note.content].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }, [notes, query]);

  function selectNote(note: StudyNote) {
    if (dirty && !window.confirm("Discard your unsaved changes and open another note?")) return;
    setActiveId(note.id);
    setDraft(toDraft(note));
    setDirty(false);
  }

  function startNewNote() {
    if (dirty && !window.confirm("Discard your unsaved changes and start a new note?")) return;
    setActiveId(null);
    setDraft(emptyDraft(subjects[0] ?? "General"));
    setDirty(false);
  }

  function updateDraft<K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" || key === "content" ? { mind_map: null } : {}),
    }));
    setDirty(true);
  }

  async function persistDraft(): Promise<StudyNote> {
    if (!draft.title.trim()) throw new Error("Give your note a title before saving.");

    const input = {
      title: draft.title.trim(),
      subject: draft.subject,
      topic: draft.topic.trim() || null,
      content: draft.content,
    };
    let savedNote: StudyNote;

    if (activeId && activeNote) {
      const patch: Partial<typeof input> = {};
      if (input.title !== activeNote.title) patch.title = input.title;
      if (input.subject !== activeNote.subject) patch.subject = input.subject;
      if (input.topic !== activeNote.topic) patch.topic = input.topic;
      if (input.content !== activeNote.content) patch.content = input.content;

      if (Object.keys(patch).length === 0) {
        savedNote = activeNote;
      } else {
        const result = await apiFetch<{ note: StudyNote }>(`/api/notes/${activeId}`, {
          method: "PATCH",
          json: patch,
        });
        savedNote = result.note;
      }
    } else {
      const result = await apiFetch<{ note: StudyNote }>("/api/notes", {
        method: "POST",
        json: input,
      });
      savedNote = result.note;
    }

    setNotes((current) => {
      const remaining = current.filter((note) => note.id !== savedNote.id);
      return [savedNote, ...remaining];
    });
    setActiveId(savedNote.id);
    setDraft(toDraft(savedNote));
    setDirty(false);
    return savedNote;
  }

  async function saveNote() {
    setSaving(true);
    try {
      await persistDraft();
      toast.success("Note saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : "Could not save that note.");
    } finally {
      setSaving(false);
    }
  }

  async function createMindMap() {
    if (mapCreditsRemaining <= 0) {
      toast.error("You've used today's AI study credits. Come back tomorrow or upgrade your plan.");
      router.push("/upgrade");
      return;
    }
    setMapping(true);
    try {
      const saved = dirty || !activeId ? await persistDraft() : activeNote;
      if (!saved) throw new Error("Save your note before creating a mind map.");
      if (!saved.content.trim()) throw new Error("Add some notes before creating a mind map.");

      const result = await apiFetch<{ note: StudyNote; model: string }>(
        `/api/notes/${saved.id}/mind-map`,
        { method: "POST" },
      );
      setNotes((current) => [result.note, ...current.filter((note) => note.id !== result.note.id)]);
      setActiveId(result.note.id);
      setDraft(toDraft(result.note));
      setDirty(false);
      toast.success(result.model === "demo" ? "Demo mind map created from your note" : "Mind map ready");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        if (error.upgradeHint) router.push("/upgrade");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create that mind map.");
      }
    } finally {
      setMapping(false);
    }
  }

  async function deleteNote() {
    if (!activeId) {
      startNewNote();
      return;
    }
    if (!window.confirm(`Delete “${draft.title || "Untitled note"}”? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await apiFetch(`/api/notes/${activeId}`, { method: "DELETE" });
      const nextNotes = notes.filter((note) => note.id !== activeId);
      setNotes(nextNotes);
      setActiveId(nextNotes[0]?.id ?? null);
      setDraft(nextNotes[0] ? toDraft(nextNotes[0]) : emptyDraft(subjects[0] ?? "General"));
      setDirty(false);
      toast.success("Note deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete that note.");
    } finally {
      setDeleting(false);
    }
  }

  function exportNote() {
    if (!draft.title.trim()) {
      toast.error("Add a title before exporting this note.");
      return;
    }
    const text = `# ${draft.title}\n\nSubject: ${draft.subject}${draft.topic.trim() ? ` · ${draft.topic.trim()}` : ""}\n\n${draft.content}`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "starvia-note"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown note downloaded");
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <CardHeader className="space-y-3 border-b border-border/70 pb-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="size-4 text-primary" />
              Your notes
            </CardTitle>
            <Badge variant="secondary">{notes.length}</Badge>
          </div>
          <Button variant="gradient" className="w-full" onClick={startNewNote} disabled={saving || mapping || deleting}>
            <FilePlus2 className="size-4" />
            New note
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your notebook"
              className="pl-9"
              aria-label="Search notes"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[36rem] space-y-1 overflow-y-auto p-2">
          {filteredNotes.length ? (
            filteredNotes.map((note) => {
              const active = note.id === activeId;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => selectNote(note)}
                  disabled={saving || mapping || deleting}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-primary/30 bg-primary/[0.07]"
                      : "border-transparent hover:border-border/70 hover:bg-muted/50"
                  }`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="block truncate text-sm font-semibold">{note.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{note.subject}{note.topic ? ` · ${note.topic}` : ""}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{formatRelativeTime(note.updated_at)}</span>
                  </span>
                  <span className="mt-2 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                    {note.content.replace(/^#+\s*/gm, "").replace(/[*_`>#-]/g, "").slice(0, 120) || "No note content yet"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <BookOpenText className="mx-auto size-6 text-muted-foreground/70" />
              <p className="mt-2 text-sm font-medium">{query ? "No matching notes" : "Your notebook is empty"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {query ? "Try another title, topic or phrase." : "Capture an idea, a worked example or a tricky formula."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">{activeNote ? "Edit note" : "Create a note"}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {dirty ? "Unsaved changes" : activeNote ? `Saved ${formatRelativeTime(activeNote.updated_at)}` : "Your notes are private to your account."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeId ? (
                <Button variant="ghost" size="icon-sm" onClick={deleteNote} disabled={deleting || saving || mapping} aria-label="Delete note" title="Delete note">
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={exportNote}>
                <Download className="size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="gradient" size="sm" onClick={saveNote} disabled={saving || mapping || (!dirty && Boolean(activeId))}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Save note
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  disabled={saving || mapping || deleting}
                  maxLength={120}
                  placeholder="e.g. Electricity — exam recap"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-subject">Subject</Label>
                <Select value={draft.subject} onValueChange={(value) => updateDraft("subject", value)} disabled={saving || mapping || deleting}>
                  <SelectTrigger id="note-subject"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                    {!subjects.includes("General") ? <SelectItem value="General">General</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-topic">Topic <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  id="note-topic"
                  value={draft.topic}
                  onChange={(event) => updateDraft("topic", event.target.value)}
                  disabled={saving || mapping || deleting}
                  maxLength={160}
                  placeholder="e.g. Ohm's law"
                />
              </div>
            </div>

            <Tabs defaultValue="write">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <span className="text-[11px] text-muted-foreground">Markdown supported · {draft.content.length.toLocaleString()}/20,000</span>
              </div>
              <TabsContent value="write" className="mt-3">
                <Textarea
                  value={draft.content}
                  onChange={(event) => updateDraft("content", event.target.value)}
                  disabled={saving || mapping || deleting}
                  rows={15}
                  maxLength={20000}
                  placeholder={`# Key idea\n\nWrite a quick explanation in your own words.\n\n## Remember\n- Formula, example or question to revisit`}
                  className="min-h-[320px] resize-y font-mono text-[13px] leading-6"
                  aria-label="Note content in Markdown"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-3 min-h-[320px] rounded-xl border border-border/70 bg-background p-4 sm:p-5">
                {draft.content.trim() ? <Markdown>{draft.content}</Markdown> : <p className="text-sm text-muted-foreground">Your note preview will appear here.</p>}
              </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GitBranch className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Turn this note into a mind map</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Organise the ideas into a visual outline. Uses one daily tutorial AI credit; your original note stays unchanged.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={mapCreditsRemaining > 0 ? "secondary" : "destructive"}>
                  {mapCreditsRemaining}/{mapCreditsLimit} AI credits
                </Badge>
                <Button variant="outline" size="sm" onClick={createMindMap} disabled={mapping || saving || deleting || !draft.content.trim()}>
                  {mapping ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {mapping ? "Mapping…" : draft.mind_map ? "Refresh map" : "Create map"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {draft.mind_map ? <MindMapView mindMap={draft.mind_map} /> : null}
      </div>
    </div>
  );
}

function MindMapView({ mindMap }: { mindMap: StudyMindMap }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="size-4 text-primary" />
            Mind map
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">A visual revision outline from your saved note.</p>
        </div>
        <Badge variant="outline">{mindMap.branches.length} branches</Badge>
      </CardHeader>
      <CardContent className="overflow-x-auto p-4 sm:p-6">
        <div className="mx-auto min-w-[280px] max-w-4xl">
          <div className="flex justify-center">
            <div className="rounded-full bg-brand-gradient px-6 py-3 text-center text-sm font-semibold text-white shadow-soft">
              {mindMap.root}
            </div>
          </div>
          <div className="mx-auto h-7 w-px bg-primary/35" />
          <div className="relative border-t border-primary/30 pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mindMap.branches.map((branch, index) => (
                <div key={`${branch.title}-${index}`} className="relative rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                  <span className="mb-3 inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GitBranch className="size-3.5" />
                  </span>
                  <h3 className="text-sm font-semibold">{branch.title}</h3>
                  <ul className="mt-2 space-y-2">
                    {branch.details.map((detail) => (
                      <li key={detail} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/70" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
