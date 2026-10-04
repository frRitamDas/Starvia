"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";
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
import { BOARDS, CLASSES, EXAM_TYPES, chaptersFor, subjectsForClass } from "@/lib/curriculum";
import { apiFetch, ApiClientError } from "@/lib/client/api";

export function ExamPrepGenerator({
  defaultClass,
  defaultBoard,
  defaultSubjects,
  advanced,
  remaining,
  limit,
}: {
  defaultClass: string;
  defaultBoard: string;
  defaultSubjects: string[];
  advanced: boolean;
  remaining: number;
  limit: number;
}) {
  const router = useRouter();

  const [board, setBoard] = React.useState(defaultBoard);
  const [classLevel, setClassLevel] = React.useState(defaultClass);
  const subjects = React.useMemo(
    () => [...new Set([...subjectsForClass(classLevel), ...defaultSubjects])],
    [classLevel, defaultSubjects],
  );
  const [subject, setSubject] = React.useState(defaultSubjects[0] ?? subjects[0] ?? "Science");
  const [chapter, setChapter] = React.useState("");
  const [examType, setExamType] = React.useState(EXAM_TYPES[2].id as string);
  const [days, setDays] = React.useState(advanced ? 7 : 3);
  const [pending, setPending] = React.useState(false);

  const chapters = chaptersFor(classLevel, subject);
  const maxDays = advanced ? 45 : 3;
  const exhausted = remaining <= 0;

  async function generate() {
    if (exhausted) {
      toast.error("You've reached today's exam prep limit. Upgrade for more.");
      router.push("/upgrade");
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ plan: { id: string } }>("/api/exam-prep", {
        method: "POST",
        json: {
          board,
          classLevel,
          subject,
          chapter: chapter || null,
          examType,
          plannedDays: days,
        },
      });
      toast.success("Revision plan ready");
      router.push(`/exam-prep/${data.plan.id}`);
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
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Build a revision plan
          </span>
          <Badge variant={exhausted ? "destructive" : "secondary"}>
            {remaining}/{limit} left today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ep-board">Board</Label>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger id="ep-board">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOARDS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-class">Class</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger id="ep-class">
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
            <Label htmlFor="ep-subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="ep-subject">
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
            <Label htmlFor="ep-exam">Exam type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger id="ep-exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-chapter">Chapter (optional)</Label>
            <Select
              value={chapter || "__none"}
              onValueChange={(value) => setChapter(value === "__none" ? "" : value)}
            >
              <SelectTrigger id="ep-chapter">
                <SelectValue placeholder="Whole syllabus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Whole syllabus</SelectItem>
                {chapters.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ep-days">
              Days available {advanced ? `(max ${maxDays})` : "(3 on free plan)"}
            </Label>
            <Input
              id="ep-days"
              type="number"
              min={1}
              max={maxDays}
              value={days}
              onChange={(event) => setDays(Math.max(1, Math.min(maxDays, Number(event.target.value) || 1)))}
            />
          </div>
        </div>

        <Button variant="gradient" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {pending ? "Planning your revision…" : "Generate revision plan"}
        </Button>

        {!advanced ? (
          <p className="text-xs text-muted-foreground">
            The free plan builds short 1–3 day plans.{" "}
            <button
              type="button"
              onClick={() => router.push("/upgrade")}
              className="font-medium text-primary underline"
            >
              Upgrade
            </button>{" "}
            for multi-day plans, full mock tests and deeper analytics.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
