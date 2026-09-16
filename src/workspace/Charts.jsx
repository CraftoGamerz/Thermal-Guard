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
export function Timeline({ events, onDrill }) {
  const buckets = new Map();
  for (const e of events)
    for (const d of e.detections) {
      const key = d.acquiredAt.slice(0, 13);
      const bucket = buckets.get(key) || { count: 0, eventIds: new Set() };
      bucket.count += 1;
      bucket.eventIds.add(e.id);
      buckets.set(key, bucket);
    }
  const rows = [...buckets].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...rows.map(([, value]) => value.count));
  return (
    <div className="timeline">
      <div
        className="timeline-bars"
        role="img"
        aria-label={`${rows.length} observed hourly buckets. Highest count ${max}.`}
      >
        {rows.map(([date, bucket]) => (
          <button
            key={date}
            className="time-column"
            aria-label={`Inspect ${date.replace("T", " ")}:00 UTC: ${bucket.count} detections across ${bucket.eventIds.size} events`}
            title={`${date.replace("T", " ")}:00 UTC: ${bucket.count} detections · select for details`}
            onClick={() =>
              onDrill?.({
                kind: "hour",
                value: date,
                label: `${date.replace("T", " ")}:00 UTC`,
                detectionCount: bucket.count,
                eventIds: [...bucket.eventIds],
              })
            }
          >
            <span
              style={{ height: `${Math.max(3, (bucket.count / max) * 100)}%` }}
            />
          </button>
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
export function PriorityBars({ events, onDrill }) {
  return (
    <div className="breakdown">
      {Object.keys(colors).map((p) => {
        const n = events.filter((e) => e.priority === p).length;
        return (
          <button
            key={p}
            className="priority-bar"
            onClick={() =>
              onDrill?.({
                kind: "priority",
                value: p,
                label: `${p} review priority`,
                eventIds: events.filter((e) => e.priority === p).map((e) => e.id),
              })
            }
            aria-label={`Inspect ${n} ${p} priority events`}
          >
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
          </button>
        );
      })}
    </div>
  );
}
