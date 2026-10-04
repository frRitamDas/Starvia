import type { LucideIcon } from "lucide-react";

import { Aurora } from "@/components/motion/aurora";
import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/marketing/section";
import { cn } from "@/lib/utils";

/** Shared premium hero for every marketing inner page. */
export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  align = "center",
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  icon?: LucideIcon;
  align?: "center" | "left";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden border-b border-border/50 py-16 sm:py-20 lg:py-24", className)}>
      <Aurora className="opacity-80" />
      <div className="container">
        <Reveal
          className={cn(
            "flex max-w-3xl flex-col gap-5",
            align === "center" ? "mx-auto items-center text-center" : "items-start text-left",
          )}
        >
          <Eyebrow>
            {Icon ? <Icon className="size-3.5" /> : null}
            {eyebrow}
          </Eyebrow>
          <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
          {children ? <div className="pt-1">{children}</div> : null}
        </Reveal>
      </div>
    </section>
  );
}
