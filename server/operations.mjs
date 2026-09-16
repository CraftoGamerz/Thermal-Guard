import { randomUUID } from "node:crypto";
import {
  fail,
  bboxValue,
  SOURCES,
  normalize,
  parseCSV,
} from "./processing.mjs";

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};
const str = (value, label, max = 120, min = 1) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw fail(`${label} must contain ${min}–${max} characters.`);
  return value.trim();
};
export function coordinates(lat, lon) {
  if (
    lat === null ||
    lon === null ||
    lat === "" ||
    lon === "" ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lon)) ||
    Math.abs(Number(lat)) > 90 ||
    Math.abs(Number(lon)) > 180
  )
    throw fail("Valid latitude and longitude required.");
  return [Number(lat), Number(lon)];
}
export function distanceKm(a, b) {
  const rad = (v) => (v * Math.PI) / 180;
  const t =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(t)));
}
export function monthlyStats(rows) {
  const months = new Map();
  for (const r of rows) {
    const month = r.acquiredAt.slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(r);
  }
  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => ({
      month,
      count: items.length,
      observedDays: new Set(items.map((r) => r.acquiredAt.slice(0, 10))).size,
      medianFrp: median(items.map((r) => r.frp)),
      maxFrp: Math.max(...items.map((r) => r.frp)),
    }));
}
export function thermalChange(a, b) {
  if (
    !a ||
    !b ||
    a.count < 10 ||
    b.count < 10 ||
    a.observedDays < 3 ||
    b.observedDays < 3 ||
    a.medianFrp <= 0
  )
    return null;
  return (100 * (b.medianFrp - a.medianFrp)) / a.medianFrp;
}
export const CHECKLIST = [
  "timestamp",
  "source",
  "context",
  "contact",
  "fieldVerification",
];
export function createOperationsStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS observation_history(id TEXT,provenance TEXT,payload TEXT,acquired_at TEXT,source TEXT,lat REAL,lon REAL,PRIMARY KEY(id,provenance));
  CREATE INDEX IF NOT EXISTS history_query ON observation_history(source,provenance,acquired_at);
  CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,payload TEXT,created_at TEXT);
  CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,payload TEXT,updated_at TEXT);`);
  return {
    archive(detections, provenance = "nasa") {
      const q = db.prepare(
        "INSERT OR REPLACE INTO observation_history VALUES(?,?,?,?,?,?,?)",
      );
      db.exec("SAVEPOINT archive_batch");
      try {
        for (const d of detections)
          q.run(
            d.id,
            provenance,
            JSON.stringify(d),
            d.acquiredAt,
            d.source,
            d.lat,
            d.lon,
          );
        db.exec("RELEASE archive_batch");
      } catch (e) {
        db.exec("ROLLBACK TO archive_batch");
        db.exec("RELEASE archive_batch");
        throw e;
      }
    },
    history(source, bbox, provenance = "nasa") {
      if (
        !Object.hasOwn(SOURCES, source) ||
        !["nasa", "user-import"].includes(provenance)
      )
        throw fail("Invalid history source.");
      const [w, s, e, n] = bboxValue(bbox);
      const args = [source, provenance, w, e, s, n];
      const where =
        "source=? AND provenance=? AND lon BETWEEN ? AND ? AND lat BETWEEN ? AND ?";
      const total = db
        .prepare(
          `SELECT COUNT(*) AS count FROM observation_history WHERE ${where}`,
        )
        .get(...args).count;
      const rows = db
        .prepare(
          `SELECT payload FROM observation_history WHERE ${where} ORDER BY acquired_at DESC LIMIT 50000`,
        )
        .all(...args)
        .map((r) => JSON.parse(r.payload));
      const months = monthlyStats(rows);
      return {
        source,
        provenance,
        bbox: [w, s, e, n],
        total,
        sampled: rows.length,
        truncated: total > 50000,
        months,
        first: rows.at(-1)?.acquiredAt || null,
        last: rows[0]?.acquiredAt || null,
        changePercent: thermalChange(months.at(-2), months.at(-1)),
        limitation:
          "Positive detections only. Months with no records are missing, not zero activity. Thermal change does not establish production change; cloud, overpass, season and operations may explain differences.",
      };
    },
    importHistory(value) {
      if (
        !Object.hasOwn(SOURCES, value.source) ||
        typeof value.csv !== "string" ||
        Buffer.byteLength(value.csv) > 2 * 1024 * 1024
      )
        throw fail("Choose a satellite and FIRMS CSV up to 2 MB.");
      let data;
      try {
        data = normalize(parseCSV(value.csv), value.source);
      } catch {
        throw fail(
          "Invalid FIRMS CSV. Require coordinates, FRP and acquisition date/time.",
        );
      }
      if (!data.detections.length || data.detections.length > 15000)
        throw fail("Import requires 1–15,000 valid observations.");
      this.archive(data.detections, "user-import");
      return {
        imported: data.detections.length,
        rejected: data.rejectedRows,
        duplicates: data.duplicates,
        provenance: "user-import",
        warning:
          "User-supplied history is unverified and never used for NASA model training.",
      };
    },
    contacts() {
      return db
        .prepare("SELECT payload FROM contacts ORDER BY created_at DESC")
        .all()
        .map((r) => JSON.parse(r.payload));
    },
    addContact(value) {
      const [lat, lon] = coordinates(value.lat, value.lon);
      const phone = str(value.phone, "Public phone", 40);
      if (!/^[+\d()\s-]{5,40}$/.test(phone))
        throw fail("Enter a valid public telephone number.");
      let url;
      try {
        url = new URL(value.sourceUrl);
      } catch {
        throw fail("A public HTTPS source URL is required.");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw fail("Use a public HTTPS source URL without credentials.");
      const verifiedOn = str(value.verifiedOn, "Verification date", 10);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn) ||
        !Number.isFinite(Date.parse(verifiedOn)) ||
        new Date(verifiedOn).toISOString().slice(0, 10) !== verifiedOn ||
        verifiedOn > new Date().toISOString().slice(0, 10)
      )
        throw fail("Use a valid verification date, not in the future.");
      const item = {
        id: randomUUID(),
        name: str(value.name, "Contact name"),
        role: str(value.role, "Role"),
        phone,
        lat,
        lon,
        sourceUrl: url.href,
        verifiedBy: str(value.verifiedBy, "Verified by", 80),
        verifiedOn,
        verification:
          "User-attested; not independently verified by ThermalGuard",
      };
      db.prepare("INSERT INTO contacts VALUES(?,?,?)").run(
        item.id,
        JSON.stringify(item),
        new Date().toISOString(),
      );
      return item;
    },
    cases() {
      return db
        .prepare("SELECT payload FROM cases ORDER BY updated_at DESC")
        .all()
        .map((r) => JSON.parse(r.payload));
    },
    addCase(value, event) {
      if (!event || !event.id.startsWith("live-"))
        throw fail("Select an existing real NASA event first.");
      const existing = this.cases().find((c) => c.event.id === event.id);
      if (existing) return existing;
      const now = new Date().toISOString();
      const actor = str(value.actor || "Workspace user", "Editor", 80);
      const item = {
        id: randomUUID(),
        title: str(
          value.title ||
            `Investigate ${event.lat.toFixed(3)}, ${event.lon.toFixed(3)}`,
          "Title",
        ),
        event,
        status: "new",
        assignee: str(value.assignee || "Unassigned", "Assignee", 80),
        note: "",
        checklist: Object.fromEntries(CHECKLIST.map((k) => [k, false])),
        createdAt: now,
        updatedAt: now,
        activity: [
          {
            at: now,
            actor,
            text: "Case opened from NASA observation; no dispatch or cause confirmation.",
          },
        ],
      };
      db.prepare("INSERT INTO cases VALUES(?,?,?)").run(
        item.id,
        JSON.stringify(item),
        now,
      );
      return item;
    },
    updateCase(id, value) {
      const row = db.prepare("SELECT payload FROM cases WHERE id=?").get(id);
      if (!row) throw fail("Case not found.", 404);
      const item = JSON.parse(row.payload),
        changes = [];
      const actor = str(value.actor || "Workspace user", "Editor", 80);
      if (value.status !== undefined) {
        if (
          !["new", "investigating", "monitoring", "closed"].includes(
            value.status,
          )
        )
          throw fail("Invalid case status.");
        if (item.status !== value.status)
          changes.push(`Status: ${item.status} → ${value.status}`);
        item.status = value.status;
      }
      if (value.assignee !== undefined) {
        const name = str(value.assignee, "Assignee", 80);
        if (name !== item.assignee) changes.push(`Assigned to ${name}`);
        item.assignee = name;
      }
      if (value.note !== undefined) {
        const note = str(value.note, "Note", 2000, 0);
        if (note !== item.note) changes.push(`Note updated: ${note}`);
        item.note = note;
      }
      if (value.checklist !== undefined) {
        if (
          !value.checklist ||
          typeof value.checklist !== "object" ||
          Array.isArray(value.checklist) ||
          Object.keys(value.checklist).some((k) => !CHECKLIST.includes(k)) ||
          Object.values(value.checklist).some((v) => typeof v !== "boolean")
        )
          throw fail("Invalid checklist.");
        for (const [key, checked] of Object.entries(value.checklist)) {
          if (item.checklist[key] !== checked)
            changes.push(`${key}: ${checked ? "checked" : "unchecked"}`);
          item.checklist[key] = checked;
        }
      }
      const now = new Date().toISOString();
      item.updatedAt = now;
      item.activity = [
        ...item.activity,
        ...changes.map((text) => ({ at: now, actor, text })),
      ].slice(-200);
      db.prepare("UPDATE cases SET payload=?,updated_at=? WHERE id=?").run(
        JSON.stringify(item),
        now,
        id,
      );
      return item;
    },
  };
}

export function createResponseContext({ fetcher = fetch } = {}) {
  const cache = new Map(),
    pending = new Map();
  let last = 0;
  async function json(url, options = {}) {
    const r = await fetcher(url, {
      ...options,
      signal: AbortSignal.timeout(18000),
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (text.length > 5000000) throw Error("Response too large");
    return JSON.parse(text);
  }
  return async (lat, lon, { force = false } = {}) => {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`,
      old = cache.get(key);
    if (!force && old && Date.now() - old.saved < 900000)
      return { ...old.data, cached: true };
    if (pending.has(key)) return pending.get(key);
    if (Date.now() - last < 3000)
      throw fail("Wait three seconds between new location lookups.", 429);
    last = Date.now();
    const job = (async () => {
      const query = `[out:json][timeout:15];(nwr(around:5000,${lat},${lon})[emergency=fire_hydrant];nwr(around:5000,${lat},${lon})[amenity=fire_station];nwr(around:5000,${lat},${lon})[amenity=hospital];nwr(around:5000,${lat},${lon})[office=government];nwr(around:1500,${lat},${lon})[industrial];nwr(around:1500,${lat},${lon})[landuse~"industrial|farmland|forest"];nwr(around:1500,${lat},${lon})[man_made=flare];);out center 100;`;
      const [osm, weather] = await Promise.allSettled([
        json(
          "https://overpass-api.de/api/interpreter?data=" +
            encodeURIComponent(query),
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "ThermalGuard-CompileX/1.0 (research prototype)",
            },
          },
        ),
        json(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&wind_speed_unit=ms&timezone=UTC`,
        ),
      ]);
      const resources =
        osm.status === "fulfilled"
          ? (osm.value.elements || [])
              .map((e) => {
                const tags = e.tags || {},
                  point = {
                    lat: e.lat ?? e.center?.lat,
                    lon: e.lon ?? e.center?.lon,
                  };
                return {
                  id: `${e.type}/${e.id}`,
                  name: tags.name || "Unnamed mapped feature",
                  ref: tags.ref || null,
                  type:
                    tags.emergency ||
                    tags.amenity ||
                    tags.office ||
                    tags.man_made ||
                    tags.landuse ||
                    tags.industrial,
                  tags,
                  phone: tags["contact:phone"] || tags.phone || null,
                  ...point,
                  distanceKm:
                    Number.isFinite(point.lat) && Number.isFinite(point.lon)
                      ? distanceKm({ lat, lon }, point)
                      : null,
                  sourceUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
                };
              })
              .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon))
              .sort((a, b) => a.distanceKm - b.distanceKm)
          : [];
      const result = {
        lat,
        lon,
        resources,
        weather:
          weather.status === "fulfilled"
            ? {
                ...weather.value.current,
                units: weather.value.current_units,
                sourceUrl: "https://open-meteo.com/",
                label: "Current modeled weather, not incident-time measurement",
              }
            : null,
        errors: {
          osm:
            osm.status === "rejected"
              ? "OpenStreetMap lookup unavailable. No resources or contacts have been invented."
              : null,
          weather:
            weather.status === "rejected"
              ? "Weather provider unavailable."
              : null,
        },
        fetchedAt: new Date().toISOString(),
        cached: false,
        limitation:
          "OSM is community mapping, not an official response inventory. A hydrant reference is an asset ID, not a phone. Availability, water pressure and contact accuracy are unverified. Distances are straight-line, not driving routes.",
      };
      if (osm.status === "fulfilled" || weather.status === "fulfilled")
        cache.set(key, { data: result, saved: Date.now() });
      while (cache.size > 100) cache.delete(cache.keys().next().value);
      return result;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  };
}
