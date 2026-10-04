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
import type { DeckWithCards } from "@/lib/data/flashcards";

export function FlashcardStudy({ deck }: { deck: DeckWithCards }) {
  const router = useRouter();

  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [results, setResults] = React.useState<Record<string, "known" | "unknown">>(
    Object.fromEntries(
      deck.cards
        .filter((card) => card.progress?.mastered)
        .map((card) => [card.id, "known" as const]),
    ),
  );
  const [pending, setPending] = React.useState(false);

  const card = deck.cards[index];
  const masteredCount = deck.cards.filter((item) => item.progress?.mastered).length;

  async function review(result: "known" | "unknown") {
    if (!card || pending) return;
    setPending(true);
    setResults((current) => ({ ...current, [card.id]: result }));

    try {
      await apiFetch("/api/flashcards/review", {
        method: "POST",
        json: { cardId: card.id, deckId: deck.id, result },
      });
      if (index < deck.cards.length - 1) {
        setIndex(index + 1);
        setFlipped(false);
        setShowHint(false);
      } else {
        const knownNow = Object.values({ ...results, [card.id]: result }).filter(
          (value) => value === "known",
        ).length;
        toast.success(`Deck finished · ${knownNow}/${deck.cards.length} recalled`);
        router.refresh();
      }
    } catch {
      toast.error("Could not save that review. Please try again.");
    } finally {
      setPending(false);
    }
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
            Card {index + 1} of {deck.cards.length}
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

      <Progress value={((index + 1) / deck.cards.length) * 100} className="h-1.5" />

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="w-full text-left"
        aria-label="Flip card"
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
            disabled={index === 0}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIndex((value) => Math.min(deck.cards.length - 1, value + 1));
              setFlipped(false);
              setShowHint(false);
            }}
            disabled={index === deck.cards.length - 1}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
          {card.hint ? (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              <Lightbulb className="size-4" />
              Hint
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => review("unknown")}
            disabled={pending}
            className="border-destructive/40 text-destructive hover:bg-destructive/[0.06] hover:text-destructive"
          >
            <X className="size-4" />
            Still learning
          </Button>
          <Button variant="gradient" onClick={() => review("known")} disabled={pending}>
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
