import { StarviaLogo } from "@/components/brand/logo";

export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-center">
          <StarviaLogo showText />
        </div>
        <div className="surface-card shimmer h-24 p-4">
          <div className="h-3 w-28 rounded-full bg-muted" />
          <div className="mt-3 h-3 w-3/4 rounded-full bg-muted" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-muted" />
        </div>
        <p className="text-center text-xs text-muted-foreground">Preparing your study space…</p>
      </div>
    </main>
  );
}
