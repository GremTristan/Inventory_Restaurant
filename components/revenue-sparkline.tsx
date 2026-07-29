import type { DailySalesEntry } from "@/types";
import { formatCHF } from "@/lib/inventory";

// Small inline SVG line chart, no charting library — consistent with the
// rest of the app's hand-rolled SVG (see ProgressRing). `history` is
// expected newest-first (as returned by getDailySalesBySite); the chart
// itself reads oldest-to-newest left-to-right for a natural timeline.
export function RevenueSparkline({ history }: { history: DailySalesEntry[] }) {
  const points = [...history].reverse();
  if (points.length < 2) return null;

  const width = 600;
  const height = 80;
  const padding = 8;

  const values = points.map((p) => p.netRevenue);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.netRevenue - min) / range) * (height - padding * 2);
    return { x, y, entry: p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - padding} L${coords[0].x},${height - padding} Z`;

  const last = points[points.length - 1];

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">Évolution du CA</span>
        <span className="text-xs text-muted-foreground">
          {formatCHF(min)} – {formatCHF(max)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full overflow-visible">
        <path d={areaPath} fill="var(--accent)" fillOpacity={0.08} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c) => (
          <circle key={c.entry.id} cx={c.x} cy={c.y} r={2.5} fill="var(--accent)">
            <title>
              {c.entry.date} — {formatCHF(c.entry.netRevenue)}
            </title>
          </circle>
        ))}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Dernier jour ({last.date}) : <span className="font-medium text-foreground">{formatCHF(last.netRevenue)}</span>
      </p>
    </div>
  );
}
