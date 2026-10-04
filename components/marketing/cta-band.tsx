import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBand({
  title = "Start learning with Starvia today",
  description = "Free to begin. No card required. Build a streak you're proud of.",
  primaryHref = "/signup",
  primaryLabel = "Start learning free",
  secondaryHref = "/pricing",
  secondaryLabel = "See plans",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-brand-gradient p-8 text-white sm:p-12">
      <div className="absolute inset-0 opacity-20 surface-grid" aria-hidden />
      <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          <p className="text-sm leading-relaxed text-white/85 sm:text-base">{description}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
            <Link href={primaryHref}>
              <Sparkles className="size-4" />
              {primaryLabel}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href={secondaryHref}>
              {secondaryLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
