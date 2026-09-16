import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = resolve(root, "data/thermalguard.sqlite");

try {
  const db = new DatabaseSync(dbPath);

  console.log("\n==========================================================================================");
  console.log("🛰️  LATEST THERMAL HOTSPOTS & SATELLITE LOCATIONS STORED IN SQLITE DATABASE");
  console.log("==========================================================================================\n");

  const latestRun = db.prepare("SELECT id, created_at, payload FROM analysis_runs ORDER BY created_at DESC LIMIT 1").get();
  if (latestRun) {
    const data = JSON.parse(latestRun.payload);
    if (data.result && data.result.rows && data.result.rows.length > 0) {
      console.log(`📌 Source: Latest XGBoost Run (${latestRun.id})`);
      console.log(`⏱️ Analysis Recorded At: ${latestRun.created_at}`);
      console.log(`🔥 Showing first 15 thermal detections scored by the model:\n`);

      const formatted = data.result.rows.slice(0, 15).map((r, idx) => ({
        "#": idx + 1,
        "Latitude": r.lat,
        "Longitude": r.lon,
        "Time (UTC)": r.acquiredAt,
        "Fire Power (MW)": r.observedFrp,
        "XGBoost Baseline": Number(r.expectedFrp.toFixed(2)),
        "Excess Heat (MW)": Number(r.excessMw.toFixed(2)),
        "Satellite": r.source,
        "Status": r.unusual ? "⚠️ UNUSUAL SPIKE" : "Normal"
      }));

      console.table(formatted);
      console.log(`\nTotal observations stored in this run: ${data.result.rows.length} thermal hotspots.`);
    }
  }

  console.log("\n==========================================================================================");
  console.log("📍 CLUSTERED EMERGENCY HOTSPOT EVENTS (table: event_records)");
  console.log("==========================================================================================\n");

  const events = db.prepare(`
    SELECT
      id,
      json_extract(payload, '$.lat') as lat,
      json_extract(payload, '$.lon') as lon,
      json_extract(payload, '$.firstSeen') as first_seen,
      json_extract(payload, '$.radiusKm') as radius_km
    FROM event_records
    WHERE id LIKE 'live-%'
    ORDER BY first_seen DESC
    LIMIT 10
  `).all();

  const formattedEvents = events.map((e, idx) => ({
    "#": idx + 1,
    "Event ID": e.id,
    "Latitude": e.lat,
    "Longitude": e.lon,
    "First Detected (UTC)": e.first_seen,
    "Radius (km)": e.radius_km ? Number(e.radius_km.toFixed(2)) : "N/A"
  }));

  console.table(formattedEvents);
  console.log("\n");

} catch (err) {
  console.error("Error reading database:", err.message);
}
