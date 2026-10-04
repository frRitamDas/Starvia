import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("aurora-field pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <span className="aurora-orb aurora-orb-one" />
      <span className="aurora-orb aurora-orb-two" />
      <span className="aurora-orb aurora-orb-three" />
      <span className="noise-overlay absolute inset-0 opacity-[0.035]" />
    </div>
  );
}

export function Marquee({
  children,
  className,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
}) {
  return (
    <div className={cn("marquee-mask overflow-hidden", className)}>
      <div className={cn("marquee-track flex w-max items-center", reverse && "marquee-reverse")}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
