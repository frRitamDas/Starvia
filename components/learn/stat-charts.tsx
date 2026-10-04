import { cn } from "@/lib/utils";

/**
 * Lightweight, dependency-free charts.
 * Rendered on the server as plain SVG — no client JS, instant paint.
 */

export function BarChart({
  data,
  height = 160,
  className,
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  valueSuffix?: string;
}) {
  if (data.length === 0) {
    return (
      <p className={cn("py-8 text-center text-[13px] text-muted-foreground", className)}>
        Not enough data yet.
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height }}>
      {data.map((item) => {
        const percent = Math.max(4, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10.5px] font-medium text-muted-foreground">
              {item.value}
              {valueSuffix}
            </span>
            <div
              className="w-full rounded-t-lg bg-brand-gradient"
              style={{ height: `${percent}%` }}
              role="img"
              aria-label={`${item.label}: ${item.value}${valueSuffix}`}
            />
            <span className="truncate text-[10.5px] text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 108,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${clamped}%`}>
        <defs>
          <linearGradient id={`ring-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={`url(#ring-${size})`}
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-foreground font-semibold"
          style={{ fontSize: size * 0.24 }}
        >
          {clamped}%
        </text>
      </svg>
      {label ? <p className="text-[12.5px] font-medium">{label}</p> : null}
      {sublabel ? <p className="text-[11px] text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}

export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-8 w-full", className)} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}
