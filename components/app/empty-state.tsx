import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-[15px] font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-[13px] leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? (
        "href" in action ? (
          <Button asChild size="sm" variant="gradient">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="gradient" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please refresh the page or try again in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.05] px-6 py-10 text-center">
      <p className="font-display text-[15px] font-semibold">{title}</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
