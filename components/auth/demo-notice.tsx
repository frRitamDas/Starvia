"use client";

import Link from "next/link";
import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shown on auth screens when the deployment has no Supabase keys yet
 * (demo mode). Explains exactly what to configure — no fake sign-in.
 */
export function DemoNotice() {
  return (
    <Alert variant="info" className="mt-5">
      <Info className="size-4" />
      <div className="space-y-2">
        <AlertTitle>Running in demo mode</AlertTitle>
        <AlertDescription>
          No Supabase keys are set, so accounts are disabled. You can still explore the full product
          with a local demo profile — nothing is stored permanently.
        </AlertDescription>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard">Continue to demo dashboard</Link>
        </Button>
      </div>
    </Alert>
  );
}
