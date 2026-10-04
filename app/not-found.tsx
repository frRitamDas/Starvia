import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { StarviaLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <StarviaLogo />
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">This page wandered off</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The link may be broken or the page may have moved. Let&apos;s get you back to studying.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="gradient">
          <Link href="/dashboard">
            Go to dashboard
            <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
