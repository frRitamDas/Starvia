"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Keeps route transitions local to the app's only scroll container. */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={cn("page-enter min-w-0 space-y-6", className)}>
      {children}
    </div>
  );
}
