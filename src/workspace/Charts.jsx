import { colors } from "./client";
export function Sparkline({ values, color = "#c5f277", height = 44 }) {
  const max = Math.max(1, ...values),
    min = Math.min(0, ...values);
  const points = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * 160},${height - 4 - ((v - min) / (max - min || 1)) * (height - 8)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 160 ${height}`} className="sparkline" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
export function Timeline({ events }) {
  const buckets = new Map();
  for (const e of events)
    for (const d of e.detections) {
      const key = d.acquiredAt.slice(0, 13);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  const rows = [...buckets].sort(([a], [b]) => a.localeCompare(b)),
    max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className="timeline">
      <div
        className="timeline-bars"
        role="img"
        aria-label={`${rows.length} observed hourly buckets. Highest count ${max}.`}
      >
        {rows.map(([date, count]) => (
          <div
            key={date}
            className="time-column"
            title={`${date.replace("T", " ")}:00 UTC: ${count} detections`}
          >
            <span style={{ height: `${Math.max(3, (count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="axis-labels">
        <span>{rows[0]?.[0].replace("T", " ") || "No observations"}</span>
        <span>Acquisition time (UTC)</span>
        <span>{rows.at(-1)?.[0].replace("T", " ")}</span>
      </div>
    </div>
  );
}
export function PriorityBars({ events }) {
  return (
    <div className="breakdown">
      {Object.keys(colors).map((p) => {
        const n = events.filter((e) => e.priority === p).length;
        return (
          <div key={p}>
            <div>
              <span>
                <i style={{ background: colors[p] }} />
                {p}
              </span>
              <strong>{n}</strong>
            </div>
            <div className="bar-track">
              <span
                style={{
                  width: `${(n / (events.length || 1)) * 100}%`,
                  background: colors[p],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
