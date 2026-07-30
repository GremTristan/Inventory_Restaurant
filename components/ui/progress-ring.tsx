import type { HealthStatus } from "@/lib/inventory";
import { STATUS_COLOR_VAR } from "@/lib/status-styles";
import { useId } from "react";

// Extra concentric ring, for a future stacked-ring (Move/Exercise/Stand
// style) hero — not used anywhere yet on purpose (a 3-ring hero from day
// one risks reading as cluttered rather than the "lots of white space"
// look this redesign otherwise targets). Kept dormant for later reuse.
type RingSpec = { value: number; status: HealthStatus; strokeWidth?: number };

export function ProgressRing({
  value,
  status,
  size = 132,
  strokeWidth = 12,
  label,
  sublabel,
  rings,
}: {
  value: number;
  status: HealthStatus;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  rings?: RingSpec[];
}) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const allRings: RingSpec[] = [{ value: clamped, status, strokeWidth }, ...(rings ?? [])];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {allRings.map((r, i) => {
            const color = STATUS_COLOR_VAR[r.status];
            return (
              <linearGradient key={i} id={`${gradientId}-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity={0.75} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            );
          })}
        </defs>
        {allRings.map((r, i) => {
          const sw = r.strokeWidth ?? strokeWidth * 0.7;
          const gap = 4;
          const radius = size / 2 - sw / 2 - i * (sw + gap);
          const circumference = 2 * Math.PI * radius;
          const ringClamped = Math.max(0, Math.min(100, r.value));
          const offset = circumference - (ringClamped / 100) * circumference;
          return (
            <g key={i}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.12}
                strokeWidth={sw}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`url(#${gradientId}-${i})`}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-foreground sm:text-4xl">{Math.round(clamped)}</span>
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
        {sublabel && <span className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
