import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function createStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS snapshots(key TEXT PRIMARY KEY,payload TEXT NOT NULL,saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_records(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY,event_id TEXT NOT NULL,status TEXT NOT NULL,classification TEXT NOT NULL,note TEXT NOT NULL,analyst TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS reviews_event ON reviews(event_id,id);
    CREATE TABLE IF NOT EXISTS areas(id TEXT PRIMARY KEY,name TEXT NOT NULL,bbox TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS analysis_runs(id TEXT PRIMARY KEY,payload TEXT NOT NULL,created_at TEXT NOT NULL);`);
  return {
    db,
    saveRun(run) {
      db.prepare("INSERT OR REPLACE INTO analysis_runs VALUES(?,?,?)").run(
        run.id,
        JSON.stringify(run),
        run.startedAt,
      );
    },
    run(id) {
      const row = db
        .prepare("SELECT payload FROM analysis_runs WHERE id=?")
        .get(id);
      return row ? JSON.parse(row.payload) : null;
    },
    snapshot(key) {
      const r = db.prepare("SELECT * FROM snapshots WHERE key=?").get(key);
      return r ? { ...JSON.parse(r.payload), savedAt: r.saved_at } : null;
    },
    saveSnapshot(key, value) {
      db.prepare("INSERT OR REPLACE INTO snapshots VALUES(?,?,?)").run(
        key,
        JSON.stringify(value),
        new Date().toISOString(),
      );
    },
    remember(events) {
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO event_records VALUES(?,?)",
      );
      db.exec("BEGIN");
      try {
        for (const e of events) stmt.run(e.id, JSON.stringify(e));
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    event(id) {
      const row = db
        .prepare("SELECT payload FROM event_records WHERE id=?")
        .get(id);
      return row ? JSON.parse(row.payload) : null;
    },
    reviews(id) {
      return db
        .prepare("SELECT * FROM reviews WHERE event_id=? ORDER BY id DESC")
        .all(id);
    },
    decorate(events) {
      const q = db.prepare(
        "SELECT * FROM reviews WHERE event_id=? ORDER BY id DESC LIMIT 1",
      );
      return events.map((e) => ({ ...e, review: q.get(e.id) || null }));
    },
    review(id, value) {
      db.prepare(
        "INSERT INTO reviews(event_id,status,classification,note,analyst,created_at) VALUES(?,?,?,?,?,?)",
      ).run(
        id,
        value.status,
        value.classification,
        value.note,
        value.analyst,
        new Date().toISOString(),
      );
      return this.reviews(id);
    },
    areas() {
      return db
        .prepare("SELECT * FROM areas ORDER BY created_at DESC")
        .all()
        .map((a) => ({ ...a, bbox: JSON.parse(a.bbox) }));
    },
    addArea(name, bbox) {
      const id = randomUUID();
      db.prepare("INSERT INTO areas VALUES(?,?,?,?)").run(
        id,
        name,
        JSON.stringify(bbox),
        new Date().toISOString(),
      );
      return this.areas().find((a) => a.id === id);
    },
    deleteArea(id) {
      return db.prepare("DELETE FROM areas WHERE id=?").run(id).changes;
    },
  };
}
