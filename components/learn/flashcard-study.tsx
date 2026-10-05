"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Lightbulb, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { DeckWithCards } from "@/lib/types";

export function FlashcardStudy({ deck }: { deck: DeckWithCards }) {
  const router = useRouter();

  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [results, setResults] = React.useState<Record<string, "known" | "unknown">>({});
  const [pending, setPending] = React.useState(false);
  const reviewPendingRef = React.useRef(false);

  const now = Date.now();
  const studyCards = deck.cards.filter((item) => {
    const nextReview = item.progress?.next_review_at;
    return !nextReview || new Date(nextReview).getTime() <= now;
  });
  const nextDue = deck.cards
    .map((item) => item.progress?.next_review_at)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))[0] ?? null;
  const card = studyCards[index];
  const masteredCount = deck.cards.filter((item) => item.progress?.mastered).length;

  async function review(result: "known" | "unknown") {
    if (!card || pending || reviewPendingRef.current || results[card.id]) return;
    reviewPendingRef.current = true;
    setPending(true);

    try {
      await apiFetch("/api/flashcards/review", {
        method: "POST",
        json: { cardId: card.id, deckId: deck.id, result },
      });
      const updatedResults = { ...results, [card.id]: result };
      setResults(updatedResults);
      if (index < studyCards.length - 1) {
        setIndex(index + 1);
        setFlipped(false);
        setShowHint(false);
      } else {
        const knownNow = Object.values(updatedResults).filter((value) => value === "known").length;
        toast.success(`Due review complete · ${knownNow}/${studyCards.length} recalled`);
        router.refresh();
      }
    } catch {
      toast.error("Could not save that review. Please try again.");
    } finally {
      reviewPendingRef.current = false;
      setPending(false);
    }
  }

  if (studyCards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <Check className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">You&apos;re all caught up</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              This deck has no cards due right now. Come back for the next spaced review, or keep learning with another tool.
            </p>
          </div>
          {nextDue ? (
            <Badge variant="outline">
              Next review {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(nextDue))}
            </Badge>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button asChild variant="outline" size="sm"><Link href="/flashcards">All decks</Link></Button>
            <Button asChild variant="gradient" size="sm"><Link href="/quiz">Take a quiz</Link></Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!card) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          This deck has no cards yet.
        </CardContent>
      </Card>
    );
  }

  const knownSoFar = Object.values(results).filter((value) => value === "known").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Due card {index + 1} of {studyCards.length}
          </Badge>
          <Badge variant="outline">{deck.subject}</Badge>
          {masteredCount > 0 ? (
            <Badge variant="success">{masteredCount} mastered</Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {knownSoFar} known · {Object.values(results).filter((value) => value === "unknown").length}{" "}
          to review
        </p>
      </div>

      <Progress value={((index + 1) / studyCards.length) * 100} className="h-1.5" />
      {results[card.id] ? (
        <p role="status" className="text-center text-xs text-muted-foreground">
          You marked this card as {results[card.id] === "known" ? "known" : "still learning"} in this session.
        </p>
      ) : null}

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="w-full text-left"
        aria-label="Flip card"
        disabled={pending}
      >
        <Card
          className={cn(
            "min-h-[260px] transition-colors sm:min-h-[300px]",
            flipped ? "border-primary/35 bg-primary/[0.03]" : "hover:border-primary/25",
          )}
        >
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[300px]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {flipped ? "Answer" : "Question"}
            </span>
            <p className="text-lg font-medium leading-relaxed sm:text-xl">
              {flipped ? card.back : card.front}
            </p>
            {showHint && card.hint && !flipped ? (
              <p className="rounded-lg bg-warning/[0.08] px-3 py-2 text-[12.5px] text-muted-foreground">
                💡 {card.hint}
              </p>
            ) : null}
            <span className="text-[11.5px] text-muted-foreground">
              {flipped ? "Tap to see the question again" : "Tap the card to reveal the answer"}
            </span>
          </CardContent>
        </Card>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIndex((value) => Math.max(0, value - 1));
              setFlipped(false);
              setShowHint(false);
            }}
            disabled={index === 0 || pending}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIndex((value) => Math.min(studyCards.length - 1, value + 1));
              setFlipped(false);
              setShowHint(false);
            }}
            disabled={index === studyCards.length - 1 || pending}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
          {card.hint ? (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} disabled={pending}>
              <Lightbulb className="size-4" />
              Hint
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => review("unknown")}
            disabled={pending || Boolean(results[card.id])}
            className="border-destructive/40 text-destructive hover:bg-destructive/[0.06] hover:text-destructive"
          >
            <X className="size-4" />
            Still learning
          </Button>
          <Button variant="gradient" onClick={() => review("known")} disabled={pending || Boolean(results[card.id])}>
            <Check className="size-4" />
            I knew it
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/flashcards">
            <RotateCcw className="size-4" />
            All decks
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/quiz?subject=${encodeURIComponent(deck.subject)}`}>Quiz me on this</Link>
        </Button>
      </div>
    </div>
  );
}
