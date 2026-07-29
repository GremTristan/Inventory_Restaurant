import type { HealthStatus } from "@/lib/inventory";
import { STATUS_COLOR_VAR } from "@/lib/status-styles";

export function ProgressRing({
  value,
  status,
  size = 132,
  strokeWidth = 12,
  label,
  sublabel,
}: {
  value: number;
  status: HealthStatus;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const color = STATUS_COLOR_VAR[status];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.15}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-foreground">{Math.round(clamped)}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {sublabel && <span className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
