import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Starvia brand marks.
 *
 * The preferred production mark is the supplied Starvia PNG. The inline SVG (a four-point study star inside a soft
 * orbit) so the app has a crisp, dependency-free identity. If you prefer the
 * PNG logo, either:
 *   - set NEXT_PUBLIC_BRAND_LOGO="/starvia-logo.png" (and MARK for the symbol), or
 *   - drop files at public/starvia-logo.png / public/starvia-mark.png.
 * See README → "Brand assets".
 */

const LOGO_SRC = process.env.NEXT_PUBLIC_BRAND_LOGO || "https://i.ibb.co/67wrxnqc/file-000000001990820baea60f97f4c99390.png";
const MARK_SRC = process.env.NEXT_PUBLIC_BRAND_MARK || "https://i.ibb.co/YTtrtK6W/file-0000000060d481fa9b38f3126e338bc6.png";

export function StarviaMark({ className, size = 32 }: { className?: string; size?: number }) {
  if (MARK_SRC) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={MARK_SRC}
        alt="Starvia"
        width={size}
        height={size}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Starvia"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="starvia-mark-a" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="52%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="starvia-mark-b" x1="14" y1="10" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {/* Orbit plate */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#starvia-mark-a)" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="14"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      {/* Four-point study star */}
      <path
        d="M24 8.5c.9 6.2 3.4 9.9 8.6 11.4-5.2 1.5-7.7 5.2-8.6 11.4-.9-6.2-3.4-9.9-8.6-11.4 5.2-1.5 7.7-5.2 8.6-11.4Z"
        fill="url(#starvia-mark-b)"
      />
      {/* Spark / pencil nib */}
      <circle cx="24" cy="35.5" r="3.1" fill="#ffffff" fillOpacity="0.92" />
      <path
        d="M34.6 12.4l1.1 2.6 2.6 1.1-2.6 1.1-1.1 2.6-1.1-2.6-2.6-1.1 2.6-1.1 1.1-2.6Z"
        fill="#ffffff"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function StarviaLogo({
  className,
  markSize = 30,
  href = "/",
  showText = true,
  textClassName,
}: {
  className?: string;
  markSize?: number;
  href?: string | null;
  showText?: boolean;
  textClassName?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {LOGO_SRC ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_SRC} alt="Starvia" height={markSize + 6} className="h-8 w-auto object-contain" />
      ) : (
        <>
          <StarviaMark size={markSize} />
          {showText && (
            <span
              className={cn(
                "font-display text-[19px] font-semibold leading-none tracking-tight",
                textClassName,
              )}
            >
              Star<span className="text-gradient">via</span>
            </span>
          )}
        </>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="rounded-lg transition-opacity hover:opacity-90" aria-label="Starvia home">
      {content}
    </Link>
  );
}
