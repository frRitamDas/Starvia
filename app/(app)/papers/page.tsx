import type { Metadata } from "next";
import { FileText, Sparkles } from "lucide-react";

import { PaperFinder } from "@/components/learn/paper-finder";
import { requireOnboarded } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Past papers",
  description: "Find official board and specimen papers, save them and solve questions with Starvia.",
  robots: { index: false, follow: false },
};

export default async function PapersPage() {
  const context = await requireOnboarded();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="gradient" className="gap-1.5"><FileText className="size-3.5" /> Past papers</Badge>
          <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Practice from the real exam pattern.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Find official board and specimen papers for your board, class and subject. Save the ones you want, open the source, and bring difficult questions into Starvia&apos;s AI solver.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-4 text-primary" /> {context.profile.board ?? "CBSE"} · Class {context.profile.class_level ?? "10"}
        </div>
      </div>

      <PaperFinder initialBoard={context.profile.board} initialClass={context.profile.class_level} />
    </div>
  );
}
