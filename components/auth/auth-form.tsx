"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function GoogleButton({ next }: { next?: string }) {
  const href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";
  return (
    <Button asChild variant="outline" size="lg" className="w-full gap-2.5">
      <a href={href} aria-label="Continue with Google">
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

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
