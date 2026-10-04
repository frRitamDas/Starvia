"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Shows a friendly message and never leaks a stack
 * trace — the digest is only useful in logs.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[route-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We hit an unexpected problem loading this page. Your study data is safe — please try again.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="gradient" onClick={reset}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
