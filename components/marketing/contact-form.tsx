"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/lib/client/api";

const SUBJECTS = [
  "General question",
  "Report a bug",
  "Feature request",
  "Content correction",
  "Billing or payments",
  "School / bulk enquiry",
];

export function ContactForm() {
  const [pending, setPending] = React.useState(false);
  const [subject, setSubject] = React.useState(SUBJECTS[0]!);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      subject: `${subject}: ${String(form.get("headline") ?? "").trim()}`.slice(0, 140),
      message: String(form.get("message") ?? "").trim(),
    };

    if (payload.name.length < 2 || !payload.email || payload.message.length < 10) {
      toast.error("Please fill in your name, email and a short message.");
      return;
    }

    setPending(true);
    try {
      await apiFetch("/api/contact", { method: "POST", json: payload });
      setSent(true);
      toast.success("Message sent — we'll get back to you soon.");
      event.currentTarget.reset();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/[0.06] p-6 text-sm">
        <p className="font-medium text-foreground">Thanks — your message is with us.</p>
        <p className="mt-1.5 text-muted-foreground">
          We usually reply within one working day. You can also DM us on Instagram at @vxritam.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" placeholder="Aarav Sharma" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject">Topic</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Choose a topic" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="headline">Short subject</Label>
          <Input id="headline" name="headline" placeholder="Quiz answer looked wrong" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Tell us what happened, which class and board you're studying, and what you expected."
          required
        />
      </div>

      <Button type="submit" variant="gradient" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-muted-foreground">
        We only use your message to reply to you — see our privacy policy for details.
      </p>
    </form>
  );
}
