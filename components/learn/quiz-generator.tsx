"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASSES, DIFFICULTIES, DIFFICULTY_LABELS, chaptersFor, subjectsForClass } from "@/lib/curriculum";
import { apiFetch, ApiClientError } from "@/lib/client/api";

const TYPE_OPTIONS = [
  { value: "mcq", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
];

export function QuizGenerator({
  defaultClass,
  defaultBoard,
  defaultSubjects,
  defaultSubject,
  defaultTopic,
  maxQuestions,
  remaining,
  limit,
}: {
  defaultClass: string;
  defaultBoard: string;
  defaultSubjects: string[];
  defaultSubject?: string;
  defaultTopic?: string;
  maxQuestions: number;
  remaining: number;
  limit: number;
}) {
  const router = useRouter();

  const [classLevel, setClassLevel] = React.useState(defaultClass);
  const subjects = React.useMemo(
    () => [...new Set([...subjectsForClass(classLevel), ...defaultSubjects])],
    [classLevel, defaultSubjects],
  );
  const [subject, setSubject] = React.useState(defaultSubject ?? defaultSubjects[0] ?? "Science");
  const [chapter, setChapter] = React.useState("");
  const [topic, setTopic] = React.useState(defaultTopic ?? "");
  const [difficulty, setDifficulty] = React.useState("medium");
  const [count, setCount] = React.useState(Math.min(10, maxQuestions));
  const [types, setTypes] = React.useState<string[]>(["mcq", "true_false", "short_answer"]);
  const [pending, setPending] = React.useState(false);

  const chapters = chaptersFor(classLevel, subject);
  const exhausted = remaining <= 0;

  async function generate() {
    if (types.length === 0) {
      toast.error("Pick at least one question type.");
      return;
    }
    if (exhausted) {
      toast.error("You've reached today's quiz limit. Upgrade for more.");
      router.push("/upgrade");
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ quiz: { id: string }; questionCount: number }>("/api/quizzes", {
        method: "POST",
        json: {
          classLevel,
          board: defaultBoard,
          subject,
          chapter: chapter || null,
          topic: topic.trim() || null,
          difficulty,
          count,
          types,
        },
      });
      toast.success(`Quiz ready · ${data.questionCount} questions`);
      router.push(`/quiz/${data.quiz.id}`);
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
            <ClipboardList className="size-4 text-primary" />
            Generate a quiz
          </span>
          <Badge variant={exhausted ? "destructive" : "secondary"}>
            {remaining}/{limit} left today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="quiz-class">Class</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger id="quiz-class">
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
            <Label htmlFor="quiz-subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="quiz-subject">
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
            <Label htmlFor="quiz-difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="quiz-difficulty">
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

          <div className="space-y-1.5">
            <Label htmlFor="quiz-count">Questions (max {maxQuestions})</Label>
            <Input
              id="quiz-count"
              type="number"
              min={3}
              max={maxQuestions}
              value={count}
              onChange={(event) =>
                setCount(Math.max(3, Math.min(maxQuestions, Number(event.target.value) || 3)))
              }
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="quiz-chapter">Chapter (optional)</Label>
            <Select
              value={chapter || "__none"}
              onValueChange={(value) => setChapter(value === "__none" ? "" : value)}
            >
              <SelectTrigger id="quiz-chapter">
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
            <Label htmlFor="quiz-topic">Topic (optional)</Label>
            <Input
              id="quiz-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Electric circuits"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question types</Label>
          <div className="flex flex-wrap gap-4">
            {TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={types.includes(option.value)}
                  onCheckedChange={(checked) =>
                    setTypes((current) =>
                      checked
                        ? [...new Set([...current, option.value])]
                        : current.filter((value) => value !== option.value),
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <Button variant="gradient" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
          {pending ? "Building your quiz…" : "Generate quiz"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Answers stay on the server — you&apos;ll see them with explanations only after submitting.
        </p>
      </CardContent>
    </Card>
  );
}
