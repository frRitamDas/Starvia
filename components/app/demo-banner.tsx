import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown whenever the app is running without Supabase/Gemini keys so nobody
 * mistakes placeholder content for real AI output or permanent storage.
 */
export function DemoBanner() {
  return (
    <Alert variant="info">
      <Info className="size-4" />
      <div>
        <AlertTitle>Demo mode</AlertTitle>
        <AlertDescription>
          This deployment has no Supabase or Gemini keys yet. You can explore every screen, and
          placeholder content is clearly marked — progress lives in memory only. Add the environment
          variables from <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code> to
          go live.
        </AlertDescription>
      </div>
    </Alert>
  );
}
