"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, ScanLine, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/learn/markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, ApiClientError } from "@/lib/client/api";

const MAX_BYTES = 5 * 1024 * 1024;

export function QuestionSolver({
  subjects,
  imageRemaining,
  imageLimit,
  solverRemaining,
  solverLimit,
}: {
  subjects: string[];
  imageRemaining: number;
  imageLimit: number;
  solverRemaining: number;
  solverLimit: number;
}) {
  const router = useRouter();

  const [mode, setMode] = React.useState<"text" | "image">("text");
  const [question, setQuestion] = React.useState("");
  const [subject, setSubject] = React.useState("Auto-detect");
  const [style, setStyle] = React.useState<"explain" | "hint">("explain");
  const [image, setImage] = React.useState<{ dataUrl: string; base64: string; mime: string } | null>(
    null,
  );
  const [pending, setPending] = React.useState(false);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [feature, setFeature] = React.useState<"image" | "solver">("solver");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const exhausted = mode === "image" ? imageRemaining <= 0 : solverRemaining <= 0;

  function pickImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is larger than 5 MB. Please choose a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      setImage({ dataUrl, base64, mime: file.type });
      setMode("image");
    };
    reader.onerror = () => toast.error("Could not read that image. Please try another.");
    reader.readAsDataURL(file);
  }

  async function solve() {
    if (mode === "text" && !question.trim()) {
      toast.error("Type or paste your question first.");
      return;
    }
    if (mode === "image" && !image) {
      toast.error("Upload a photo of the question first.");
      return;
    }
    if (exhausted) {
      toast.error("You've reached today's limit for this. Upgrade to continue.");
      router.push("/upgrade");
      return;
    }

    setPending(true);
    setAnswer(null);
    try {
      const data = await apiFetch<{
        solution: { markdown: string; subject: string | null };
        feature: "image" | "solver";
        xpGained: number;
        achievements: string[];
      }>("/api/solve", {
        method: "POST",
        json: {
          question: mode === "text" ? question.trim() : null,
          imageBase64: mode === "image" ? image?.base64 : null,
          imageMimeType: mode === "image" ? image?.mime : null,
          subject: subject === "Auto-detect" ? null : subject,
          mode: style,
        },
      });
      setAnswer(data.solution.markdown);
      setFeature(data.feature);
      if (data.xpGained > 0) toast.success(`+${data.xpGained} XP`);
      (data.achievements ?? []).forEach((title) => toast.success(`Achievement: ${title}`));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        if (error.upgradeHint) router.push("/upgrade");
      } else {
        toast.error("AI is temporarily unavailable. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <ScanLine className="size-4 text-primary" />
              Solve a question
            </span>
            <span className="flex gap-2">
              <Badge variant={solverRemaining <= 0 ? "destructive" : "secondary"}>
                Text {solverRemaining}/{solverLimit}
              </Badge>
              <Badge variant={imageRemaining <= 0 ? "destructive" : "secondary"}>
                Photos {imageRemaining}/{imageLimit}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as "text" | "image")}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="text">Type or paste</TabsTrigger>
              <TabsTrigger value="image">Upload a photo</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "text" ? (
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              placeholder="Paste the question exactly as it appears, e.g. “A 6 V battery is connected to a 2 Ω resistor. Find the current.”"
            />
          ) : (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) pickImage(file);
                }}
              />
              {image ? (
                <div className="relative overflow-hidden rounded-xl border border-border/70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.dataUrl} alt="Your question" className="max-h-80 w-full object-contain" />
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="absolute right-2 top-2"
                    aria-label="Remove image"
                    onClick={() => setImage(null)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] px-6 py-10 text-center transition-colors hover:bg-primary/[0.07]"
                >
                  <ImagePlus className="size-7 text-primary" />
                  <span className="text-sm font-medium">Upload or photograph the question</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG or WebP · up to 5 MB</span>
                </button>
              )}
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder="Optional: add context or specify what you're stuck on"
              />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1.5 sm:w-48">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="solver-subject">
                Subject
              </label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="solver-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Auto-detect">Auto-detect</SelectItem>
                  {subjects.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full space-y-1.5 sm:w-56">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="solver-style">
                Answer style
              </label>
              <Select value={style} onValueChange={(value) => setStyle(value as "explain" | "hint")}>
                <SelectTrigger id="solver-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explain">Full explanation</SelectItem>
                  <SelectItem value="hint">Hint only (no answer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="gradient" onClick={solve} disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              {pending ? "Solving…" : "Solve it"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Photos are processed by the AI vision model for this request only — Starvia does not store
            your image.
          </p>
        </CardContent>
      </Card>

      {answer ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Solution
            </CardTitle>
            <div className="flex items-center gap-2">
              {feature === "image" ? <Badge variant="outline">from photo</Badge> : null}
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/tutor?q=${encodeURIComponent("Can you explain this differently?")}`}>
                  Ask a follow-up
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Markdown>{answer}</Markdown>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info">
          <AlertDescription>
            Starvia explains the subject, the concept, every step, the final answer with units and a
            similar practice question — so you can solve the next one yourself.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
