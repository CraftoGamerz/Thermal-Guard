import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = resolve(root, "data/thermalguard.sqlite");

console.log("Watching SQLite Database for real-time XGBoost analysis runs...");
console.log(`Database: ${dbPath}\n`);

let db;
try {
  db = new DatabaseSync(dbPath);
} catch (err) {
  console.error("Failed to open database:", err.message);
  process.exit(1);
}

let lastRunId = null;
let lastStatus = null;
let lastStage = null;

function poll() {
  try {
    const totalRuns = db.prepare("SELECT count(*) as c FROM analysis_runs").get().c;
    const totalEvents = db.prepare("SELECT count(*) as c FROM event_records").get().c;
    const totalSnapshots = db.prepare("SELECT count(*) as c FROM snapshots").get().c;

    const latest = db.prepare("SELECT id, payload, created_at FROM analysis_runs ORDER BY created_at DESC LIMIT 1").get();

    if (latest) {
      const data = JSON.parse(latest.payload);
      if (data.id !== lastRunId || data.status !== lastStatus || data.stage !== lastStage) {
        lastRunId = data.id;
        lastStatus = data.status;
        lastStage = data.stage;

        const time = new Date().toLocaleTimeString();
        console.log(`\n======================================================`);
        console.log(`[${time}] Analysis Run Update Detected in SQLite!`);
        console.log(`Run ID:   ${data.id}`);
        console.log(`Status:   ${data.status.toUpperCase()}`);
        console.log(`Stage:    ${data.stage}`);
        console.log(`DB State: ${totalRuns} total runs | ${totalEvents} events | ${totalSnapshots} satellite snapshots`);

        if (data.result) {
          const t = data.result.timings || {};
          const rowCount = data.result.rows ? data.result.rows.length : 0;
          console.log(`\nXGBoost Analysis Completed & Saved to DB:`);
          console.log(`   - Observations Scored: ${rowCount}`);
          console.log(`   - NASA Fetch Time:     ${t.nasaFetchMs || 0} ms`);
          console.log(`   - XGBoost Model Time:  ${t.workerMs || 0} ms`);
          console.log(`   - Total Pipeline Time: ${t.totalMs || 0} ms`);
          if (data.result.metrics) {
            console.log(`   - Model Metrics:       Accuracy ${(data.result.metrics.accuracy * 100 || 0).toFixed(1)}% | ROC-AUC ${(data.result.metrics.rocAuc || 0).toFixed(3)}`);
          }
        }
        console.log(`======================================================\n`);
      }
    }
  } catch {
    // Ignore transient lock during concurrent write
  }
}

// Initial poll and recurring check every 1 second
poll();
const interval = setInterval(poll, 1000);

process.on("SIGINT", () => {
  clearInterval(interval);
  console.log("\nStopped SQLite watcher.");
  process.exit(0);
});
