"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function RollingDigit({ digit }: { digit: number }) {
  return (
    <span className="odometer-window" aria-hidden>
      <span
        className="odometer-ribbon"
        style={{ transform: `translateY(-${digit * 10}%)` }}
      >
        {Array.from({ length: 10 }, (_, value) => (
          <span key={value} className="odometer-digit">
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Mechanical per-digit price animation used for every monthly/yearly amount. */
export function Odometer({
  value,
  prefix = "₹",
  suffix,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: React.ReactNode;
  className?: string;
}) {
  const formatted = Math.max(0, Math.round(value)).toLocaleString("en-IN");

  return (
    <span
      className={cn("inline-flex items-baseline tabular-nums", className)}
      aria-label={`${prefix}${formatted}`}
    >
      {prefix ? <span aria-hidden>{prefix}</span> : null}
      {formatted.split("").map((character, index) =>
        /\d/.test(character) ? (
          <RollingDigit key={index} digit={Number(character)} />
        ) : (
          <span key={index} aria-hidden>
            {character}
          </span>
        ),
      )}
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}
