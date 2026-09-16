import { useEffect, useMemo, useState } from "react";
import { api, STATIC_DEMO } from "./client";
const cache = new Map();
export function feedFingerprint(feed, query) {
  if (!feed?.events?.length || feed.meta?.mode !== "live" || feed.meta?.stale)
    return null;
  const text =
    JSON.stringify(query) +
    feed.events
      .flatMap((e) =>
        e.detections.map((d) =>
          [
            d.id,
            d.frp,
            d.brightness,
            d.brightnessI5,
            d.scan,
            d.track,
            d.daynight,
          ].join(":"),
        ),
      )
      .sort()
      .join("|");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${query.source}:${query.days}:${query.bbox.join(",")}:${text.length}:${hash >>> 0}`;
}
function start(key, query) {
  if (cache.has(key)) return cache.get(key);
  const entry = {
    value: { status: "running", stage: "Starting automatic XGBoost" },
    listeners: new Set(),
  };
  cache.set(key, entry);
  const publish = (value) => {
    entry.value = value;
    for (const cb of entry.listeners) cb(value);
  };
  (async () => {
    try {
      const job = await api("/analysis/jobs", {
        method: "POST",
        body: JSON.stringify(query),
      });
      let state = job;
      publish(state);
      while (["running", "queued"].includes(state.status)) {
        await new Promise((r) => setTimeout(r, 1000));
        state = await api(`/analysis/jobs/${job.id}`);
        publish(state);
      }
    } catch (error) {
      publish({
        status: "failed",
        stage: "Automatic analysis paused",
        error: error.message,
      });
    }
  })();
  if (cache.size > 20)
    for (const [id, item] of cache) {
      if (!["running", "queued"].includes(item.value.status) && id !== key) {
        cache.delete(id);
        break;
      }
    }
  return entry;
}
export default function useAutoAnalysis(feed, { source, days, bbox, mode }) {
  const [enabled, setEnabledState] = useState(() => {
    try {
      return localStorage.getItem("tg_auto_analysis") !== "false";
    } catch {
      return true;
    }
  });
  const [state, setState] = useState({
      status: "idle",
      stage: "Waiting for live observations",
    }),
    [retry, setRetry] = useState(0);
  const bboxKey = bbox.join(",");
  const key = useMemo(
    () =>
      feedFingerprint(feed, {
        source,
        days,
        bbox: bboxKey.split(",").map(Number),
      }),
    [feed, source, days, bboxKey],
  );
  useEffect(() => {
    if (!enabled || STATIC_DEMO || mode !== "live" || !key) {
      // This effect subscribes to an external shared job and resets its snapshot.
      // eslint-disable-next-line react/set-state-in-effect
      setState({
        status: "idle",
        stage: !enabled
          ? "Automatic analysis paused"
          : "Waiting for live observations",
      });
      return;
    }
    const entry = start(`${key}:${retry}`, {
      source,
      days: Number(days),
      bbox: bboxKey.split(",").map(Number),
    });
    setState(entry.value);
    entry.listeners.add(setState);
    return () => entry.listeners.delete(setState);
  }, [key, retry, enabled, mode, source, days, bboxKey]);
  return {
    ...state,
    enabled,
    setEnabled(value) {
      setEnabledState(value);
      try {
        localStorage.setItem("tg_auto_analysis", String(value));
      } catch {
        /* Restricted browser storage. */
      }
    },
    retry: () => setRetry((n) => n + 1),
  };
}
