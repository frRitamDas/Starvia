"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  BookOpenCheck,
  Check,
  Copy,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/learn/markdown";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, apiStream, ApiClientError } from "@/lib/client/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/lib/types";

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hindi", label: "Hindi" },
] as const;

const STARTERS = [
  "Explain this topic at my class level",
  "Teach me with a simple example",
  "Give me 3 exam-style practice questions",
  "Give me a hint, not the full answer",
];

interface Props {
  conversations: Conversation[];
  conversation: Conversation | null;
  messages: ChatMessage[];
  subjects: string[];
  classLevel: string | null;
  board: string | null;
  remaining: number;
  limit: number;
  streak: number;
  studyMinutes: number;
  xp: number;
  aiReady: boolean;
  demo: boolean;
}

export function TutorChat({
  conversations: initialConversations,
  conversation: initialConversation,
  messages: initialMessages,
  subjects,
  classLevel,
  board,
  remaining,
  limit,
  streak,
  studyMinutes,
  xp,
  aiReady,
  demo,
}: Props) {
  const router = useRouter();

  const [conversations, setConversations] = React.useState(initialConversations);
  const [activeId, setActiveId] = React.useState<string | null>(initialConversation?.id ?? null);
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [subject, setSubject] = React.useState<string>(subjects[0] ?? "General");
  const [language, setLanguage] = React.useState<string>("english");
  const [streaming, setStreaming] = React.useState(false);
  const [streamedText, setStreamedText] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = React.useState<string | null>(null);
  const [remainingLeft, setRemainingLeft] = React.useState(remaining);
  const [focusMode, setFocusMode] = React.useState(false);
  const [showLatest, setShowLatest] = React.useState(false);
  const atBottomRef = React.useRef(true);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const scrollToLatest = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    atBottomRef.current = true;
    setShowLatest(false);
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  React.useEffect(() => {
    if (atBottomRef.current) scrollToLatest("smooth");
  }, [messages, scrollToLatest]);

  React.useEffect(() => {
    if (!streaming || !atBottomRef.current) return;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [streamedText, streaming]);

  React.useEffect(() => {
    if (!focusMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.chatFocus = "true";
    requestAnimationFrame(() => textareaRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.body.dataset.chatFocus;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focusMode]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setInput(query);
  }, []);

  const exhausted = remainingLeft <= 0;

  async function loadConversation(id: string) {
    if (id === activeId || streaming) return;
    atBottomRef.current = true;
    setShowLatest(false);
    try {
      const data = await apiFetch<{ conversation: Conversation; messages: ChatMessage[] }>(
        `/api/tutor/conversations/${id}`,
      );
      setActiveId(id);
      setMessages(data.messages);
      setConversations((current) =>
        current.map((item) => (item.id === id ? data.conversation : item)),
      );
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not open that chat.");
    }
  }

  async function startNewChat() {
    if (streaming) return;
    try {
      const data = await apiFetch<{ conversation: Conversation }>("/api/tutor/conversations", {
        method: "POST",
        json: { subject, difficulty: "medium" },
      });
      setConversations((current) => [data.conversation, ...current]);
      setActiveId(data.conversation.id);
      setMessages([]);
      setStreamedText("");
      atBottomRef.current = true;
      setShowLatest(false);
      textareaRef.current?.focus();
      router.replace(`/tutor?c=${data.conversation.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not start a new chat.");
    }
  }

  async function deleteConversation(id: string) {
    try {
      await apiFetch(`/api/tutor/conversations/${id}`, { method: "DELETE" });
      setConversations((current) => current.filter((item) => item.id !== id));
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not delete that chat.");
    }
  }

  async function send(options: { regenerateMessageId?: string; prompt?: string } = {}) {
    const prompt = (options.prompt ?? input).trim();
    if (!prompt || streaming) return;

    if (exhausted) {
      toast.error("You've reached today's AI limit. Upgrade to continue learning.");
      router.push("/upgrade");
      return;
    }

    setStreaming(true);
    setNotice(null);
    setErrorMessage(null);
    setLastFailedPrompt(null);
    setStreamedText("");
    setInput("");

    const tempUserMessage: ChatMessage | null = options.regenerateMessageId
      ? null
      : {
          id: `temp-${Date.now()}`,
          conversation_id: activeId ?? "pending",
          user_id: "me",
          role: "user",
          content: prompt,
          model: null,
          tokens: null,
          rating: null,
          latency_ms: null,
          created_at: new Date().toISOString(),
        };

    if (tempUserMessage) {
      atBottomRef.current = true;
      setShowLatest(false);
      setMessages((current) => [...current, tempUserMessage]);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await apiStream("/api/tutor", {
        method: "POST",
        signal: controller.signal,
        json: {
          conversationId: activeId,
          message: prompt,
          subject,
          language,
          difficulty: "medium",
          regenerateMessageId: options.regenerateMessageId ?? null,
        },
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("no stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let conversationId = activeId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (payload.type === "meta" && typeof payload.conversationId === "string") {
            conversationId = payload.conversationId;
            if (!activeId) {
              setActiveId(conversationId);
              router.replace(`/tutor?c=${conversationId}`);
            }
          } else if (payload.type === "delta" && typeof payload.text === "string") {
            assistantText += payload.text;
            setStreamedText(assistantText);
          } else if (payload.type === "notice" && typeof payload.message === "string") {
            setNotice(payload.message);
          } else if (payload.type === "done") {
            setMessages((current) => [
              ...current,
              {
                id: String(payload.assistantMessageId ?? `assistant-${Date.now()}`),
                conversation_id: conversationId ?? "pending",
                user_id: "assistant",
                role: "assistant",
                content: assistantText,
                model: (payload.model as string) ?? null,
                tokens: (payload.tokens as number) ?? 0,
                rating: null,
                latency_ms: (payload.latencyMs as number) ?? null,
                created_at: new Date().toISOString(),
              },
            ]);
            setStreamedText("");
            setErrorMessage(null);
            setLastFailedPrompt(null);
            setRemainingLeft((value) => Math.max(0, value - 1));
            const achievements = (payload.achievements as { title: string }[] | undefined) ?? [];
            achievements.forEach((achievement) =>
              toast.success(`Achievement unlocked: ${achievement.title}`),
            );
            if (payload.leveledUp) toast.success(`Level up! You're now level ${payload.level}.`);
          } else if (payload.type === "error") {
            throw new ApiClientError(
              String(payload.message ?? "AI is temporarily unavailable. Please try again."),
              String(payload.code ?? "SERVER_ERROR"),
              500,
              { refunded: Boolean(payload.refunded) },
            );
          }
        }
      }

      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice("Response stopped. You can continue the conversation whenever you are ready.");
        return;
      }
      const message =
        error instanceof ApiClientError
          ? error.message
          : "AI is temporarily unavailable. Please try again.";
      setErrorMessage(message);
      setLastFailedPrompt(prompt);
      toast.error(message);
      if (error instanceof ApiClientError && error.code === "LIMIT_REACHED") {
        setRemainingLeft(0);
      } else if (error instanceof ApiClientError && Boolean(error.meta.refunded)) {
        setRemainingLeft((value) => Math.min(limit, value + 1));
        toast.info("No AI credit was used — your message credit has been restored.");
      }
      // Roll back the optimistic user message if nothing came back.
      if (tempUserMessage) {
        setMessages((current) => current.filter((item) => item.id !== tempUserMessage.id));
        setInput(prompt);
      }
    } finally {
      setStreaming(false);
      setStreamedText("");
      abortRef.current = null;
    }
  }

  async function rate(messageId: string, rating: 1 | -1) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, rating } : message)),
    );
    try {
      await apiFetch(`/api/tutor/messages/${messageId}/feedback`, {
        method: "POST",
        json: { rating },
      });
      toast.success(rating === 1 ? "Thanks — glad it helped!" : "Thanks, we'll improve this.");
    } catch {
      toast.error("Could not save your feedback.");
    }
  }

  return (
    <div
      className={cn(
        "grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]",
        focusMode && "fixed inset-0 z-[60] h-dvh w-full grid-cols-1 gap-0 bg-background p-0 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]",
      )}
    >
      {/* Conversation list (desktop) */}
      <div className="hidden lg:block">
        <Card
          className={cn(
            "interactive-card flex flex-col p-3",
            focusMode ? "h-dvh rounded-none border-y-0 border-l-0" : "h-[min(720px,calc(100svh-12.5rem))] min-h-[560px]",
          )}
        >
          <Button variant="gradient" size="sm" className="w-full" onClick={startNewChat}>
            <MessageSquarePlus className="size-4" />
            New chat
          </Button>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                Your conversations will appear here.
              </p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-xl px-2 py-1.5",
                    conversation.id === activeId ? "bg-accent/70" : "hover:bg-accent/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => loadConversation(conversation.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[13px] font-medium">{conversation.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {conversation.subject ?? "General"} ·{" "}
                      {formatRelativeTime(conversation.last_message_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={() => deleteConversation(conversation.id)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick study tools */}
      <div className={cn("col-span-full flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:hidden", focusMode && "hidden")}>
        {[
          { label: "Teach me", prompt: "Teach me this topic step by step with a simple example." },
          { label: "Exam mode", prompt: "Explain this topic for an exam, then give me 2 exam-style questions." },
          { label: "Hint only", prompt: "Give me a hint for the problem without revealing the final answer." },
          { label: "5-min revision", prompt: "Give me a 5-minute revision of this chapter with only the highest-value points." },
        ].map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => void send({ prompt: tool.prompt })}
            disabled={streaming || exhausted}
            className="shrink-0 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Chat */}
      <Card
        className={cn(
          "flex min-w-0 flex-col overflow-hidden",
          focusMode
            ? "h-dvh rounded-none border-0 shadow-none"
            : "h-[min(720px,calc(100svh-var(--starvia-mobile-topbar)-var(--starvia-mobile-bottomnav)-5.75rem))] min-h-[500px] lg:min-h-[560px]",
        )}
      >
        {demo ? (
          <p className="border-b border-warning/30 bg-warning/[0.08] px-4 py-2 text-[11.5px] text-muted-foreground">
            Demo mode — replies are placeholders until a production AI provider is configured. History, quotas
            and the full flow still work.
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {conversations.find((item) => item.id === activeId)?.title ?? "New conversation"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {board ?? "CBSE"} · Class {classLevel ?? "—"} ·{" "}
                {demo ? "Demo mode" : aiReady ? "AI tutor ready" : "AI provider needs a key"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={exhausted ? "destructive" : "secondary"} className="shrink-0 text-[11px]">
              {remainingLeft}/{limit} left
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={focusMode ? "Exit full-screen chat" : "Open full-screen chat"}
              title={focusMode ? "Exit full-screen chat" : "Full-screen chat"}
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="New chat"
              onClick={startNewChat}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
            const nearBottom = distance < 72;
            atBottomRef.current = nearBottom;
            setShowLatest(!nearBottom);
          }}
          className="relative flex-1 space-y-4 overscroll-contain overflow-y-auto px-4 py-4 pb-5 sm:px-5"
          aria-live={streaming ? "polite" : undefined}
        >
          {notice ? (
            <p className="rounded-xl border border-warning/30 bg-warning/[0.08] px-3 py-2 text-xs">
              {notice}
            </p>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-destructive">We couldn't finish that answer.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{errorMessage}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  const retryPrompt = lastFailedPrompt;
                  setErrorMessage(null);
                  setLastFailedPrompt(null);
                  if (retryPrompt) void send({ prompt: retryPrompt });
                }}
                disabled={streaming || !lastFailedPrompt}
              >
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          ) : null}

          {showLatest ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="sticky bottom-2 left-1/2 z-10 -ml-1 -translate-x-1/2 gap-1.5 shadow-lg"
              onClick={() => scrollToLatest("smooth")}
            >
              <ArrowDown className="size-3.5" />
              Jump to latest
            </Button>
          ) : null}

          {messages.length === 0 && !streaming ? (
            <EmptyState
              icon={Sparkles}
              title="Ask anything from your syllabus"
              description="Starvia explains at your class level — with examples, exam tips and a practice question."
              className="border-none bg-transparent py-10 sm:py-14"
            />
          ) : null}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRate={rate}
              onRegenerate={() => send({ regenerateMessageId: message.id })}
              disabled={streaming}
            />
          ))}

          {streaming ? (
            <div className="page-enter flex gap-2.5">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border/70 bg-background/70 p-4">
                {streamedText ? (
                  <Markdown>{streamedText}</Markdown>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <p className="pt-1 text-xs text-muted-foreground">Thinking…</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Composer */}
        <div className="border-t border-border/70 bg-card/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          {messages.length === 0 && !streaming ? (
            <div className="mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => send({ prompt: starter })}
                  className="rounded-full border border-border/70 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {starter}
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={
                exhausted
                  ? "Daily limit reached — upgrade or come back tomorrow"
                  : "Ask a doubt, or paste a question…"
              }
              disabled={streaming || exhausted}
              className="max-h-40 min-h-[46px] resize-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Your question"
            />
            <Button
              variant="gradient"
              size="icon"
              className="size-[46px] shrink-0"
              onClick={() => {
                if (streaming) {
                  abortRef.current?.abort();
                } else {
                  void send();
                }
              }}
              disabled={exhausted || (!streaming && !input.trim())}
              aria-label={streaming ? "Stop response" : "Send message"}
              title={streaming ? "Stop response" : "Send message"}
            >
              {streaming ? <Square className="size-4 fill-current" /> : <Send className="size-4" />}
            </Button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...subjects, "General"])].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
            {exhausted ? (
              <Link href="/upgrade" className="font-medium text-primary underline">
                Upgrade for more
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Study cockpit */}
      <aside className={cn("hidden min-w-0 flex-col gap-3 xl:flex xl:max-h-[calc(100svh-10.5rem)]", focusMode && "xl:hidden")}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card">
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Study cockpit</p>
            <p className="mt-1 text-sm font-semibold">Your learning pulse</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Small, focused sessions beat long distracted ones.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-border/70 bg-border/70">
            <div className="bg-card p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Streak</p>
              <p className="mt-1 text-lg font-semibold">{streak} <span className="text-xs text-muted-foreground">{streak === 1 ? "day" : "days"}</span></p>
            </div>
            <div className="bg-card p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">XP</p>
              <p className="mt-1 text-lg font-semibold">{xp}</p>
            </div>
            <div className="bg-card p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Studied</p>
              <p className="mt-1 text-lg font-semibold">{studyMinutes}<span className="text-xs text-muted-foreground">m</span></p>
            </div>
            <div className="bg-card p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">AI left</p>
              <p className={cn("mt-1 text-lg font-semibold", exhausted && "text-destructive")}>{remaining}/{limit}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold">What Starvia is good at</p>
            <div className="mt-3 space-y-2">
              {[
                "Explain hard ideas in class-level steps",
                "Turn chapters into exam practice",
                "Give hints before the final answer",
                "Keep the conversation context",
              ].map((item) => (
                <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2 p-3">
            <p className="px-1 text-xs font-semibold">Jump to a tool</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/tutorials" className="rounded-xl border border-border/70 px-2.5 py-2.5 text-[11px] font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                Tutorial
              </Link>
              <Link href="/quiz" className="rounded-xl border border-border/70 px-2.5 py-2.5 text-[11px] font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                Quiz
              </Link>
              <Link href="/solve" className="rounded-xl border border-border/70 px-2.5 py-2.5 text-[11px] font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                Solve
              </Link>
              <Link href="/exam-prep" className="rounded-xl border border-border/70 px-2.5 py-2.5 text-[11px] font-medium transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                Exam prep
              </Link>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function MessageBubble({
  message,
  onRate,
  onRegenerate,
  disabled,
}: {
  message: ChatMessage;
  onRate: (id: string, rating: 1 | -1) => void;
  onRegenerate: () => void;
  disabled: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[14px] leading-6 text-primary-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
        <Sparkles className="size-3.5" />
      </div>
      <div className="group min-w-0 flex-1 space-y-1">
        <div className="rounded-2xl rounded-tl-md border border-border/70 bg-background/70 p-4">
          <Markdown>{message.content}</Markdown>
        </div>
        <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy answer"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.content);
                setCopied(true);
                toast.success("Copied to clipboard");
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error("Could not copy this answer. Please try again.");
              }
            }}
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Regenerate answer"
            onClick={onRegenerate}
            disabled={disabled}
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Helpful"
            onClick={() => onRate(message.id, 1)}
            className={cn(message.rating === 1 && "text-success")}
          >
            <ThumbsUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Not helpful"
            onClick={() => onRate(message.id, -1)}
            className={cn(message.rating === -1 && "text-destructive")}
          >
            <ThumbsDown className="size-3.5" />
          </Button>
          {message.model === "demo" ? (
            <Badge variant="outline" className="ml-1 gap-1 text-[10px]">
              <BookOpenCheck className="size-3" />
              demo content
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
