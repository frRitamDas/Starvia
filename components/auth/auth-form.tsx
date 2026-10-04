"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/(auth)/actions";

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
  notice,
  footer,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  fields: AuthField[];
  submitLabel: string;
  hidden?: Record<string, string>;
  notice?: string;
  footer?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {} as AuthState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      {notice ? (
        <Alert variant="info">
          <AlertDescription className="text-foreground/90">{notice}</AlertDescription>
        </Alert>
      ) : null}

      {state?.error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-foreground">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state?.message ? (
        <Alert variant="success">
          <CheckCircle2 className="size-4" />
          <AlertDescription className="text-foreground">{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.hint ? <span className="text-xs text-muted-foreground">{field.hint}</span> : null}
          </div>
          <Input
            id={field.name}
            name={field.name}
            type={field.type ?? "text"}
            placeholder={field.placeholder}
            autoComplete={field.autoComplete}
            required={field.required}
            minLength={field.minLength}
          />
        </div>
      ))}

      <SubmitButton label={submitLabel} />

      {footer ? <div className="pt-1 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </form>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/70" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

export function GoogleButton({ next }: { next?: string }) {
  const href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";
  return (
    <Button asChild variant="outline" size="lg" className="w-full gap-2.5">
      <a href={href}>
        <GoogleGlyph />
        Continue with Google
      </a>
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3 0-5.6-2-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.5a7.2 7.2 0 0 1 0-4.9V6.5H1.4a12 12 0 0 0 0 11l4-3Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.4 6.5l4 3.1C6.4 6.8 9 4.8 12 4.8Z"
      />
    </svg>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
