import { createHash } from "node:crypto";

export const VERSION = "rules-1.0.0";
export const CLASSES = [
  "Acute industrial fire",
  "Routine gas flare",
  "Persistent process heat",
  "Wildfire / natural fire",
  "Agricultural burning",
  "Uncertain / Other",
];
export const SOURCES = {
  NOAA20: {
    name: "NOAA-20 / VIIRS",
    folder: "noaa-20-viirs-c2",
    file: "J1_VIIRS_C2",
    api: "VIIRS_NOAA20_NRT",
  },
  NOAA21: {
    name: "NOAA-21 / VIIRS",
    folder: "noaa-21-viirs-c2",
    file: "J2_VIIRS_C2",
    api: "VIIRS_NOAA21_NRT",
  },
  SNPP: {
    name: "Suomi NPP / VIIRS",
    folder: "suomi-npp-viirs-c2",
    file: "SUOMI_VIIRS_C2",
    api: "VIIRS_SNPP_NRT",
  },
};
export function fail(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export function bboxValue(input = "68,6,98,37") {
  const values = Array.isArray(input) ? input : String(input).split(",");
  const b = values.map((v) => (String(v).trim() === "" ? NaN : Number(v)));
  if (
    b.length !== 4 ||
    !b.every(Number.isFinite) ||
    b[0] < -180 ||
    b[2] > 180 ||
    b[1] < -90 ||
    b[3] > 90 ||
    b[0] >= b[2] ||
    b[1] >= b[3]
  )
    throw fail(
      "Use west, south, east, north coordinates with ordered corners.",
    );
  return b;
}
export function inBox(d, b) {
  return d.lon >= b[0] && d.lon <= b[2] && d.lat >= b[1] && d.lat <= b[3];
}
export function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw fail("NASA returned an incomplete CSV file.", 502);
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows.shift()?.map((x) => x.trim().replace(/^\uFEFF/, ""));
  if (
    !header?.includes("latitude") ||
    !header.includes("acq_date") ||
    !header.includes("frp")
  )
    throw fail("NASA response is not the expected FIRMS CSV.", 502);
  return rows.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i]?.trim() ?? ""])),
  );
}
const hash = (x) => createHash("sha256").update(x).digest("hex").slice(0, 16);
export function normalize(rows, source) {
  const seen = new Set();
  let rejectedRows = 0,
    duplicates = 0;
  const detections = [];
  for (const r of rows) {
    const lat = Number(r.latitude),
      lon = Number(r.longitude),
      frp = Number(r.frp);
    const time = String(r.acq_time || "").padStart(4, "0");
    const stamp = `${r.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    if (
      !r.latitude ||
      !r.longitude ||
      !r.frp ||
      !r.acq_time ||
      ![lat, lon, frp].every(Number.isFinite) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      frp < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.acq_date) ||
      !/^([01]\d|2[0-3])[0-5]\d$/.test(time) ||
      !Number.isFinite(Date.parse(stamp)) ||
      new Date(stamp).toISOString().slice(0, 10) !== r.acq_date
    ) {
      rejectedRows++;
      continue;
    }
    const id = hash(`${source}:${lat}:${lon}:${stamp}`);
    if (seen.has(id)) {
      duplicates++;
      continue;
    }
    seen.add(id);
    const confidence =
      {
        h: "high",
        n: "nominal",
        l: "low",
        high: "high",
        nominal: "nominal",
        low: "low",
      }[r.confidence?.toLowerCase()] || "unknown";
    const nullable = (v) =>
      v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
    detections.push({
      id,
      lat,
      lon,
      frp,
      acquiredAt: stamp,
      confidence,
      satellite: r.satellite || source,
      sensor: "VIIRS",
      source,
      brightness: nullable(r.bright_ti4),
      brightnessI5: nullable(r.bright_ti5),
      scan: nullable(r.scan),
      track: nullable(r.track),
      daynight: r.daynight,
      version: r.version,
    });
  }
  return { detections, rejectedRows, duplicates };
}
export function cluster(detections, mode = "live") {
  const buckets = new Map();
  for (const d of detections) {
    const y = Math.floor(d.lat * 111.32),
      x = Math.floor(d.lon * 111.32 * Math.cos(((y / 111.32) * Math.PI) / 180));
    const key = `${d.source}:${x}:${y}:${d.acquiredAt.slice(0, 10)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(d);
  }
  return [...buckets]
    .map(([key, points]) => {
      points.sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
      const maxFrp = Math.max(...points.map((p) => p.frp));
      const confidence = points.some((p) => p.confidence === "high")
        ? "high"
        : points.some((p) => p.confidence === "nominal")
          ? "nominal"
          : points[0].confidence;
      const priority =
        maxFrp >= 50 && confidence !== "low" && confidence !== "unknown"
          ? "Elevated"
          : maxFrp >= 10
            ? "Standard"
            : "Routine";
      const reasons = [
        `Peak observed FRP: ${maxFrp.toFixed(1)} MW.`,
        `${points.length} detection${points.length === 1 ? "" : "s"} in this approximate 1 km grid cell and UTC day.`,
        `Highest source detection confidence: ${confidence}.`,
        "Source class requires facility context and human corroboration.",
      ];
      return {
        id: `${mode}-${hash(key)}`,
        lat: points.reduce((n, p) => n + p.lat, 0) / points.length,
        lon: points.reduce((n, p) => n + p.lon, 0) / points.length,
        firstSeen: points[0].acquiredAt,
        lastSeen: points.at(-1).acquiredAt,
        maxFrp,
        meanFrp: points.reduce((n, p) => n + p.frp, 0) / points.length,
        confidence,
        priority,
        reasons,
        source: points[0].source,
        classification: "Uncertain / Other",
        detections: points,
        model: VERSION,
      };
    })
    .sort((a, b) => b.maxFrp - a.maxFrp);
}
export function replay(source = "NOAA20") {
  const centers = [
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
  return centers.flatMap(([lat, lon], i) =>
    [0, 1, 2].map((j) => ({
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
    })),
  );
}
