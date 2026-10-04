"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for monitoring without leaking details to the student.
    console.error("[app] route error:", error.message, error.digest);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-warning/12 text-warning">
          <TriangleAlert className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-lg font-semibold">Something went wrong. Please try again.</h1>
          <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
            Your work is saved. If this keeps happening, refreshing the page usually fixes it — or head
            back to your dashboard.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="gradient" onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
        {error.digest ? (
          <p className="text-[11px] text-muted-foreground/70">Reference: {error.digest}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
