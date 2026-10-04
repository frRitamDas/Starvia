"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { CLASSES, EXAM_TARGETS, LEARNING_LEVELS, subjectsForClass } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

export interface ProfileFormValues {
  full_name: string;
  class_level: string;
  board: string;
  subjects: string[];
  learning_level: string;
  exam_target: string;
}

export function ProfileForm({
  boards,
  initial,
  mode,
}: {
  boards: { id: string; name: string }[];
  initial: ProfileFormValues;
  mode: "onboarding" | "profile";
}) {
  const router = useRouter();
  const onboarding = mode === "onboarding";

  const [values, setValues] = React.useState<ProfileFormValues>(initial);
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);

  const subjectOptions = React.useMemo(
    () => [...new Set([...subjectsForClass(values.class_level), ...initial.subjects])],
    [values.class_level, initial.subjects],
  );

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleSubject(subject: string) {
    setValues((current) => ({
      ...current,
      subjects: current.subjects.includes(subject)
        ? current.subjects.filter((item) => item !== subject)
        : [...current.subjects, subject],
    }));
  }

  function validateStep(current: number): boolean {
    if (current === 0 && values.full_name.trim().length < 2) {
      toast.error("Please enter your name.");
      return false;
    }
    if (current === 1 && values.subjects.length === 0) {
      toast.error("Pick at least one subject.");
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep(0) || !validateStep(1)) {
      setStep(values.full_name.trim().length < 2 ? 0 : 1);
      return;
    }

    setPending(true);
    try {
      await apiFetch<{ profile: unknown }>("/api/profile", {
        method: "POST",
        json: {
          full_name: values.full_name.trim(),
          class_level: values.class_level,
          board: values.board,
          subjects: values.subjects,
          learning_level: values.learning_level,
          exam_target: values.exam_target || null,
          markOnboarded: true,
          ...(onboarding ? {} : { __updateOnly: true }),
        },
      });

      if (onboarding) {
        toast.success("You're all set — welcome to Starvia!");
        router.push("/dashboard");
      } else {
        toast.success("Profile updated");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not save your details.");
    } finally {
      setPending(false);
    }
  }

  const steps = [
    { title: "About you", description: "So Starvia knows who it's teaching." },
    { title: "Your syllabus", description: "Class, board and subjects." },
    { title: "How you learn", description: "Level, goal and preferences." },
  ];
  const lastStep = step === steps.length - 1;

  return (
    <div className="space-y-5">
      {onboarding ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-medium">
              Step {step + 1} of {steps.length} · {steps[step]!.title}
            </span>
            <span className="text-muted-foreground">{steps[step]!.description}</span>
          </div>
          <Progress value={((step + 1) / steps.length) * 100} className="h-1.5" />
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Your name</Label>
                <Input
                  id="pf-name"
                  value={values.full_name}
                  onChange={(event) => set("full_name", event.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-class">Class</Label>
                <Select value={values.class_level} onValueChange={(value) => set("class_level", value)}>
                  <SelectTrigger id="pf-class">
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
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-board">Board</Label>
                <Select value={values.board} onValueChange={(value) => set("board", value)}>
                  <SelectTrigger id="pf-board">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subjects you want help with</Label>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.map((subject) => {
                    const active = values.subjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                        )}
                      >
                        {active ? <Check className="size-3" /> : null}
                        {subject}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pick as many as you like — you can change this later.
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Where are you right now?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LEARNING_LEVELS.map((level) => {
                    const active = values.learning_level === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => set("learning_level", level.id)}
                        className={cn(
                          "rounded-xl border p-3.5 text-left transition-colors",
                          active
                            ? "border-primary/45 bg-primary/[0.06]"
                            : "border-border/70 hover:border-primary/30",
                        )}
                      >
                        <p className="text-[13px] font-semibold">{level.name}</p>
                        <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">
                          {level.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-exam">Exam you're preparing for</Label>
                <Select
                  value={values.exam_target || "__none"}
                  onValueChange={(value) => set("exam_target", value === "__none" ? "" : value)}
                >
                  <SelectTrigger id="pf-exam">
                    <SelectValue placeholder="Not sure yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not sure yet</SelectItem>
                    {EXAM_TARGETS.map((target) => (
                      <SelectItem key={target} value={target}>
                        {target}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {onboarding ? (
                <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    What happens next
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                    <li>• Every answer is pitched at {`Class ${values.class_level}`} level</li>
                    <li>• Tutorials and quizzes use your board&apos;s exam style</li>
                    <li>• You get a free daily AI allowance — no card needed</li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        {onboarding ? (
          <Button
            variant="outline"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0 || pending}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {!lastStep ? (
          <Button
            variant="gradient"
            onClick={() => {
              if (validateStep(step)) setStep((value) => value + 1);
            }}
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {pending ? "Saving…" : onboarding ? "Start learning" : "Save changes"}
          </Button>
        )}
      </div>

      {!onboarding ? (
        <p className="text-xs text-muted-foreground">
          <Badge variant="secondary" className="mr-2">
            Tip
          </Badge>
          Changing your class or board updates the difficulty of every AI answer from your next question
          onwards.
        </p>
      ) : null}
    </div>
  );
}
