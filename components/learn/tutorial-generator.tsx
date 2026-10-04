"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOARDS, CHAPTER_SEEDS, CLASSES, DIFFICULTIES, DIFFICULTY_LABELS, chaptersFor, subjectsForClass } from "@/lib/curriculum";
import { apiFetch, ApiClientError } from "@/lib/client/api";

export function TutorialGenerator({
  defaultClass,
  defaultBoard,
  defaultSubjects,
  defaultTopic,
  remaining,
  limit,
  demo,
}: {
  defaultClass: string;
  defaultBoard: string;
  defaultSubjects: string[];
  defaultTopic?: string;
  remaining: number;
  limit: number;
  demo: boolean;
}) {
  const router = useRouter();

  const [classLevel, setClassLevel] = React.useState(defaultClass);
  const subjects = React.useMemo(() => {
    const fromBoard = subjectsForClass(classLevel);
    return [...new Set([...fromBoard, ...defaultSubjects])];
  }, [classLevel, defaultSubjects]);
  const [subject, setSubject] = React.useState(defaultSubjects[0] ?? subjects[0] ?? "Science");
  const [chapter, setChapter] = React.useState("");
  const [topic, setTopic] = React.useState(defaultTopic ?? "");
  const [difficulty, setDifficulty] = React.useState("medium");
  const [pending, setPending] = React.useState(false);

  const chapters = React.useMemo(() => chaptersFor(classLevel, subject), [classLevel, subject]);
  const suggestions = React.useMemo(() => {
    const seeded = CHAPTER_SEEDS[`${classLevel}:${subject}`];
    return (seeded ?? chapters).slice(0, 6);
  }, [classLevel, subject, chapters]);

  const exhausted = remaining <= 0;

  async function generate() {
    if (!topic.trim()) {
      toast.error("Tell Starvia which topic to teach.");
      return;
    }
    if (exhausted) {
      toast.error("You've reached today's tutorial limit. Upgrade for more.");
      router.push("/upgrade");
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ tutorial: { id: string }; cached: boolean }>("/api/tutorials", {
        method: "POST",
        json: {
          classLevel,
          board: defaultBoard,
          subject,
          chapter: chapter || null,
          topic: topic.trim(),
          difficulty,
        },
      });
      toast.success(data.cached ? "Loaded your saved tutorial" : "Tutorial ready!");
      router.push(`/tutorials/${data.tutorial.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        if (error.upgradeHint) router.push("/upgrade");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Generate a tutorial
          </span>
          <Badge variant={exhausted ? "destructive" : "secondary"}>
            {remaining}/{limit} left today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tut-class">Class</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger id="tut-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    Class {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tut-subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="tut-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tut-chapter">Chapter (optional)</Label>
            <Select value={chapter || "__none"} onValueChange={(value) => setChapter(value === "__none" ? "" : value)}>
              <SelectTrigger id="tut-chapter">
                <SelectValue placeholder="Any chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Any chapter</SelectItem>
                {chapters.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tut-difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="tut-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DIFFICULTY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tut-topic">Topic or chapter name</Label>
          <Input
            id="tut-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Ohm's Law, Quadratic Equations, Photosynthesis"
          />
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTopic(suggestion)}
                  className="rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Button variant="gradient" className="w-full sm:w-auto" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? "Writing your tutorial…" : "Generate tutorial"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Board: {defaultBoard} ·{" "}
          {demo
            ? "Demo mode returns placeholder content until GEMINI_API_KEY is configured."
            : "Written for your board's syllabus scope. Reopening a saved topic costs no quota."}
        </p>
      </CardContent>
    </Card>
  );
}

export const BOARD_OPTIONS = BOARDS;
