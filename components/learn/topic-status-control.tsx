"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { apiFetch, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "practiced", label: "Practised" },
  { value: "mastered", label: "Mastered" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

export function TopicStatusControl({
  subject,
  chapter,
  topic,
  initialStatus,
}: {
  subject: string;
  chapter?: string | null;
  topic: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [pending, setPending] = React.useState(false);

  async function update(next: Status) {
    if (next === status) return;
    setPending(true);
    setStatus(next);
    try {
      await apiFetch("/api/progress", {
        method: "POST",
        json: { subject, chapter: chapter ?? null, topic, status: next },
      });
      if (next === "mastered") {
        toast.success(`${topic} marked as mastered · +20 XP`);
      }
      router.refresh();
    } catch (error) {
      setStatus(initialStatus);
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not update that topic.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", pending && "opacity-70")}
      role="group"
      aria-label={`Status for ${topic}`}
    >
      {STATUSES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => update(option.value)}
          disabled={pending}
          aria-pressed={status === option.value}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            status === option.value
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
          )}
        >
          {status === option.value ? <Check className="size-3" /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}
