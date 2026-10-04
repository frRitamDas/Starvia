"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { formatRelativeTime } from "@/lib/utils";
import type { FlashcardDeck } from "@/lib/types";

interface DraftCard {
  front: string;
  back: string;
  hint: string;
}

const EMPTY_CARD: DraftCard = { front: "", back: "", hint: "" };

export function FlashcardManager({
  decks: initialDecks,
  subjects,
  stats,
  aiEnabled,
  remaining,
  limit,
  defaultClass,
  defaultBoard,
}: {
  decks: FlashcardDeck[];
  subjects: string[];
  stats: { decks: number; cards: number; mastered: number; reviewsToday: number };
  aiEnabled: boolean;
  remaining: number;
  limit: number;
  defaultClass: string;
  defaultBoard: string;
}) {
  const router = useRouter();

  const [decks, setDecks] = React.useState(initialDecks);
  const [subject, setSubject] = React.useState(subjects[0] ?? "Science");
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState(12);
  const [pending, setPending] = React.useState(false);

  // manual deck state
  const [title, setTitle] = React.useState("");
  const [cards, setCards] = React.useState<DraftCard[]>([{ ...EMPTY_CARD }]);

  const exhausted = remaining <= 0;

  async function generateDeck() {
    if (!topic.trim()) {
      toast.error("Which topic should the deck cover?");
      return;
    }
    if (!aiEnabled) {
      toast.error("AI flashcard generation is part of Pro and Ultra.");
      router.push("/upgrade");
      return;
    }
    if (exhausted) {
      toast.error("You've reached today's flashcard limit.");
      router.push("/upgrade");
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ deck: FlashcardDeck | null; cards: DraftCard[]; saved: boolean }>(
        "/api/flashcards/generate",
        {
          method: "POST",
          json: {
            subject,
            topic: topic.trim(),
            classLevel: defaultClass,
            board: defaultBoard,
            count,
            save: true,
          },
        },
      );
      if (data.deck) {
        setDecks((current) => [data.deck as FlashcardDeck, ...current]);
        toast.success(`Deck created · ${data.deck.card_count} cards`);
      }
      setTopic("");
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

  async function saveManualDeck() {
    const filled = cards.filter((card) => card.front.trim() && card.back.trim());
    if (!title.trim()) {
      toast.error("Give your deck a title.");
      return;
    }
    if (filled.length === 0) {
      toast.error("Add at least one complete card (front and back).");
      return;
    }

    setPending(true);
    try {
      const data = await apiFetch<{ deck: FlashcardDeck }>("/api/flashcards", {
        method: "POST",
        json: {
          title: title.trim(),
          subject,
          topic: topic.trim() || null,
          classLevel: defaultClass,
          board: defaultBoard,
          source: "manual" as const,
          cards: filled.map((card) => ({
            front: card.front.trim(),
            back: card.back.trim(),
            hint: card.hint.trim() || null,
          })),
        },
      });
      setDecks((current) => [data.deck, ...current]);
      toast.success("Deck saved");
      setTitle("");
      setCards([{ ...EMPTY_CARD }]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not save that deck.");
    } finally {
      setPending(false);
    }
  }

  async function deleteDeck(id: string) {
    try {
      await apiFetch(`/api/flashcards/${id}`, { method: "DELETE" });
      setDecks((current) => current.filter((deck) => deck.id !== id));
      toast.success("Deck deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete that deck.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Decks", value: stats.decks },
          { label: "Cards", value: stats.cards },
          { label: "Mastered", value: stats.mastered },
          { label: "Reviewed today", value: stats.reviewsToday },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="font-display text-xl font-semibold">{item.value}</p>
            <p className="text-[11.5px] text-muted-foreground">{item.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create a deck</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ai">
            <TabsList>
              <TabsTrigger value="ai" className="gap-1.5">
                <Sparkles className="size-3.5" />
                Generate with AI
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5">
                <Plus className="size-3.5" />
                Build manually
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={exhausted ? "destructive" : "secondary"}>
                  {remaining}/{limit} generations left today
                </Badge>
                {!aiEnabled ? (
                  <Badge variant="outline">Included in Pro & Ultra</Badge>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fc-subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="fc-subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fc-topic">Topic</Label>
                  <Input
                    id="fc-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="e.g. Human eye"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fc-count">Cards</Label>
                  <Input
                    id="fc-count"
                    type="number"
                    min={5}
                    max={40}
                    value={count}
                    onChange={(event) =>
                      setCount(Math.max(5, Math.min(40, Number(event.target.value) || 12)))
                    }
                  />
                </div>
              </div>
              <Button variant="gradient" onClick={generateDeck} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {pending ? "Creating cards…" : "Generate deck"}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fc-title">Deck title</Label>
                <Input
                  id="fc-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Trigonometry identities"
                />
              </div>

              <div className="space-y-3">
                {cards.map((card, index) => (
                  <div key={index} className="space-y-2 rounded-xl border border-border/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Card {index + 1}</p>
                      {cards.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove card"
                          onClick={() => setCards((current) => current.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <Input
                      value={card.front}
                      onChange={(event) =>
                        setCards((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, front: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Front — question or term"
                    />
                    <Textarea
                      value={card.back}
                      onChange={(event) =>
                        setCards((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, back: event.target.value } : item,
                          ),
                        )
                      }
                      rows={2}
                      placeholder="Back — the answer"
                    />
                    <Input
                      value={card.hint}
                      onChange={(event) =>
                        setCards((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, hint: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Hint (optional)"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCards((current) => [...current, { ...EMPTY_CARD }])}
                >
                  <Plus className="size-4" />
                  Add card
                </Button>
                <Button variant="gradient" onClick={saveManualDeck} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save deck
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4 text-primary" />
            Your decks
            <Badge variant="secondary" className="ml-auto">
              {decks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {decks.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted-foreground">
              No decks yet — generate one with AI or build your own above.
            </p>
          ) : (
            decks.map((deck) => (
              <div
                key={deck.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3.5 py-3"
              >
                <Link href={`/flashcards/${deck.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{deck.title}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {deck.subject}
                    {deck.topic ? ` · ${deck.topic}` : ""} · {deck.card_count} cards ·{" "}
                    {formatRelativeTime(deck.created_at)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  {deck.source === "ai" ? (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="size-3" />
                      AI
                    </Badge>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/flashcards/${deck.id}`}>Study</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete deck"
                    onClick={() => deleteDeck(deck.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
