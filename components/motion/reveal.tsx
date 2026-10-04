"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RevealProps = React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  as?: "div" | "section" | "li";
  once?: boolean;
};

/**
 * Tiny IntersectionObserver-powered entrance motion. Elements remain visible
 * when JavaScript is unavailable, and reduced-motion is handled globally.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  style,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("reveal", visible && "reveal-visible", className)}
      style={{ ...style, "--reveal-delay": `${Math.max(0, delay)}ms` } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

export function RevealGroup({
  children,
  className,
  step = 80,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <Reveal delay={index * step}>{child}</Reveal>
      ))}
    </div>
  );
}
