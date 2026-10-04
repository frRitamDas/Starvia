import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {Icon ? (
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-3.5" />
              </span>
            ) : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
