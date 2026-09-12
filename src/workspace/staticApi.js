import { CLASSES } from "./client";

const CENTERS = [
  [22.36, 69.87],
  [23.03, 72.58],
  [21.71, 73.02],
  [30.91, 75.85],
  [23.78, 86.42],
  [21.25, 81.63],
  [19.99, 73.79],
  [22.81, 86.2],
  [25.42, 81.85],
  [17.68, 83.21],
  [26.82, 80.91],
  [21.14, 79.08],
];
const reviewKey = "tg_pages_reviews",
  areaKey = "tg_pages_areas";
const get = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function bad(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function buildEvents(source = "NOAA20") {
  const reviews = get(reviewKey);
  return CENTERS.map(([lat, lon], i) => {
    const detections = [0, 1, 2].map((j) => ({
      id: `synthetic-${i}-${j}`,
      lat: lat + j * 0.0004,
      lon: lon + j * 0.0002,
      frp: Number((4 + ((i * 37 + j * 13) % 155)).toFixed(1)),
      acquiredAt: `2026-09-12T${String(4 + j * 6).padStart(2, "0")}:30:00Z`,
      confidence: i % 3 ? "nominal" : "high",
      satellite: source,
      sensor: "VIIRS",
      source,
      brightness: 340 + i,
      scan: 0.4,
      track: 0.38,
      daynight: j ? "D" : "N",
      version: "SYNTHETIC",
    }));
    const maxFrp = Math.max(...detections.map((d) => d.frp)),
      confidence = detections[0].confidence;
    const priority =
        maxFrp >= 50 ? "Elevated" : maxFrp >= 10 ? "Standard" : "Routine",
      id = `replay-pages-${String(i + 1).padStart(3, "0")}`;
    return {
      id,
      lat: detections.reduce((n, d) => n + d.lat, 0) / 3,
      lon: detections.reduce((n, d) => n + d.lon, 0) / 3,
      firstSeen: detections[0].acquiredAt,
      lastSeen: detections.at(-1).acquiredAt,
      maxFrp,
      meanFrp: detections.reduce((n, d) => n + d.frp, 0) / 3,
      confidence,
      priority,
      reasons: [
        `Peak observed FRP: ${maxFrp.toFixed(1)} MW.`,
        "3 synthetic detections in this approximate 1 km grid cell and UTC day.",
        `Scenario confidence label: ${confidence}.`,
        "Source class requires facility context and human corroboration.",
      ],
      source,
      classification: "Uncertain / Other",
      detections,
      model: "rules-1.0.0",
      review: reviews.find((r) => r.event_id === id) || null,
    };
  }).sort((a, b) => b.maxFrp - a.maxFrp);
}
export async function staticApi(path, options = {}) {
  await new Promise((r) => setTimeout(r, 80));
  if (path === "/health")
    return {
      ok: true,
      keyConfigured: false,
      authRequired: false,
      model: "rules-1.0.0",
      staticDemo: true,
      providers: {},
    };
  if (path.startsWith("/events?")) {
    const query = new URLSearchParams(path.split("?")[1]),
      source = query.get("source") || "NOAA20",
      all = buildEvents(source);
    const bbox = (query.get("bbox") || "68,6,98,37").split(",").map(Number),
      events = all.filter(
        (e) =>
          e.lon >= bbox[0] &&
          e.lon <= bbox[2] &&
          e.lat >= bbox[1] &&
          e.lat <= bbox[3],
      );
    return {
      events,
      meta: {
        mode: "replay",
        provider: "Synthetic GitHub Pages scenario",
        source,
        sourceUrl: null,
        fetchedAt: null,
        latestAcquisition: "2026-09-12T16:30:00Z",
        cached: false,
        stale: false,
        detectionCount: events.length * 3,
        rejectedRows: 0,
        duplicates: 0,
        processing: "rules-1.0.0",
        coverage: "Fixed synthetic India scenario",
        bbox,
        days: Number(query.get("days") || 1),
        warning:
          "Hosted GitHub Pages demo: synthetic data dated 12 September 2026. Live NASA ingestion requires the Node API deployment.",
      },
    };
  }
  const review = /^\/events\/([a-zA-Z0-9-]+)\/reviews$/.exec(path);
  if (review) {
    const id = review[1],
      rows = get(reviewKey).filter((r) => r.event_id === id);
    if (!buildEvents().some((e) => e.id === id)) bad("Event not found.", 404);
    if (!options.body) return { reviews: rows };
    const value = JSON.parse(options.body);
    if (
      !["confirmed", "rejected", "deferred"].includes(value.status) ||
      !CLASSES.includes(value.classification) ||
      String(value.note).trim().length < 3 ||
      String(value.analyst).trim().length < 1
    )
      bad("Complete the decision, classification, analyst and rationale.");
    const next = {
      id: Date.now(),
      event_id: id,
      status: value.status,
      classification: value.classification,
      note: String(value.note).trim().slice(0, 2000),
      analyst: String(value.analyst).trim().slice(0, 80),
      created_at: new Date().toISOString(),
    };
    put(reviewKey, [next, ...get(reviewKey)]);
    return { reviews: [next, ...rows] };
  }
  if (path === "/areas") {
    if (!options.body) return { areas: get(areaKey) };
    const value = JSON.parse(options.body),
      bbox = (value.bbox || []).map(Number);
    if (
      String(value.name).trim().length < 2 ||
      bbox.length !== 4 ||
      !bbox.every(Number.isFinite) ||
      bbox[0] >= bbox[2] ||
      bbox[1] >= bbox[3]
    )
      bad("Enter a name and ordered west, south, east, north coordinates.");
    const area = {
      id: `pages-${Date.now()}`,
      name: String(value.name).trim().slice(0, 60),
      bbox,
      created_at: new Date().toISOString(),
    };
    put(areaKey, [area, ...get(areaKey)]);
    return { area };
  }
  if (path.startsWith("/areas/") && options.method === "DELETE") {
    put(
      areaKey,
      get(areaKey).filter((a) => a.id !== path.split("/").at(-1)),
    );
    return null;
  }
  if (path.startsWith("/context?"))
    bad(
      "Facility context requires the ThermalGuard Node API. GitHub Pages is running the browser-only presentation build.",
      503,
    );
  bad("Static demo route not found.", 404);
}
