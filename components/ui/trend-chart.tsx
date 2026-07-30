export interface TrendSeries {
  id: string;
  label: string;
  color: string; // CSS var reference, e.g. "var(--chart-1)"
  points: { x: string; y: number }[];
}

// Small hand-rolled multi-series SVG chart, no charting library — extends
// the same technique as RevenueSparkline (path + circle markers with a
// <title> tooltip) to support several series and axis labels. Returns null
// below 2 total points, same empty-state guard as RevenueSparkline, since a
// single point can't draw a meaningful line.
export function TrendChart({
  series,
  height = 220,
  formatValue = (value: number) => String(value),
}: {
  series: TrendSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const totalPoints = series.reduce((sum, s) => sum + s.points.length, 0);
  if (totalPoints < 2 || series.every((s) => s.points.length < 2)) return null;

  const width = 720;
  const paddingX = 12;
  const paddingY = 16;
  const labelGutter = 28;

  const allValues = series.flatMap((s) => s.points.map((p) => p.y));
  const max = Math.max(...allValues, 0);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const labels = series.find((s) => s.points.length > 1)?.points.map((p) => p.x) ?? [];

  function coordsFor(s: TrendSeries) {
    return s.points.map((p, i) => {
      const x =
        paddingX + (s.points.length > 1 ? (i / (s.points.length - 1)) * (width - paddingX * 2) : 0);
      const y =
        height -
        labelGutter -
        paddingY -
        ((p.y - min) / range) * (height - labelGutter - paddingY * 2);
      return { x, y, point: p };
    });
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => height - labelGutter - paddingY - t * (height - labelGutter - paddingY * 2));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`trend-fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {gridLines.map((y, i) => (
          <line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
        ))}
        {series.map((s) => {
          if (s.points.length < 2) return null;
          const coords = coordsFor(s);
          const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
          const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - labelGutter} L${coords[0].x},${height - labelGutter} Z`;
          return (
            <g key={s.id}>
              <path d={areaPath} fill={`url(#trend-fill-${s.id})`} stroke="none" />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={s.color}>
                  <title>
                    {c.point.x} — {formatValue(c.point.y)} ({s.label})
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        {labels.length > 0 && (
          <>
            <text x={paddingX} y={height - 6} className="fill-muted-foreground" fontSize={10}>
              {labels[0]}
            </text>
            <text x={width - paddingX} y={height - 6} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
              {labels[labels.length - 1]}
            </text>
          </>
        )}
      </svg>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
