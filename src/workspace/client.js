export const CLASSES = [
  "Acute industrial fire",
  "Routine gas flare",
  "Persistent process heat",
  "Wildfire / natural fire",
  "Agricultural burning",
  "Uncertain / Other",
];
export const PRESETS = [
  { id: "india", name: "India extent", bbox: [68, 6, 98, 37] },
  { id: "gujarat", name: "Gujarat belt", bbox: [68, 20, 75, 25] },
  { id: "east", name: "Eastern industrial belt", bbox: [80, 20, 88, 25] },
  { id: "punjab", name: "Punjab region", bbox: [73.8, 29.4, 77, 32.7] },
  { id: "southasia", name: "South Asia", bbox: [60, 0, 105, 40] },
];
export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === "true";
export const colors = {
  Elevated: "#ff9559",
  Standard: "#c5f277",
  Routine: "#70bec7",
};
export function formatUTC(value) {
  return value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }) + " UTC"
    : "Not available";
}
export function age(value) {
  if (!value) return "No observation";
  const hours = Math.max(0, (Date.now() - Date.parse(value)) / 3600000);
  return hours < 1
    ? `${Math.floor(hours * 60)}m ago`
    : `${hours.toFixed(1)}h ago`;
}
export async function api(path, options = {}) {
  if (STATIC_DEMO)
    return (await import("./staticApi.js")).staticApi(path, options);
  const token = sessionStorage.getItem("tg_workspace_token") || "";
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      "The API server is unavailable. Start the app with npm run dev or npm start.",
    );
  }
  if (!response.ok)
    throw Object.assign(new Error(value.error || "Request failed."), {
      status: response.status,
    });
  return value;
}
export function download(events, format, meta) {
  const properties = (e) => ({
    id: e.id,
    latitude: e.lat,
    longitude: e.lon,
    max_frp_mw: e.maxFrp,
    mean_frp_mw: e.meanFrp,
    detections: e.detections.length,
    first_seen_utc: e.firstSeen,
    last_seen_utc: e.lastSeen,
    sensor_confidence: e.confidence,
    review_priority: e.priority,
    source_class: e.review?.classification || e.classification,
    review_status: e.review?.status || "unreviewed",
    analyst: e.review?.analyst || "",
    rationale: e.review?.note || "",
    source: e.source,
    mode: meta?.mode,
    fetched_at: meta?.fetchedAt,
    source_url: meta?.sourceUrl,
    processing_version: e.model,
  });
  let content, type;
  if (format === "geojson") {
    content = JSON.stringify(
      {
        type: "FeatureCollection",
        metadata: meta,
        features: events.map((e) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon, e.lat] },
          properties: properties(e),
        })),
      },
      null,
      2,
    );
    type = "application/geo+json";
  } else {
    const rows = events.map(properties),
      keys = Object.keys(
        rows[0] ||
          properties({ id: "", lat: 0, lon: 0, detections: [], review: null }),
      );
    const cell = (value) => {
      let s = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    content = [
      keys.join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n");
    type = "text/csv";
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `thermalguard-${meta?.mode || "data"}-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
