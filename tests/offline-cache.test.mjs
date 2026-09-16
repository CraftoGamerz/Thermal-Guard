import test from "node:test";
import assert from "node:assert/strict";
import { compactSnapshots, snapshotKey } from "../src/workspace/offlineCache.js";

const snapshot = (savedAt, id) => ({
  savedAt,
  feed: { meta: { mode: "live" }, events: [{ id }] },
});

test("browser snapshots keep only valid newest entries within deterministic bounds", () => {
  const compacted = compactSnapshots(
    {
      old: snapshot("2026-09-12T09:00:00Z", "old"),
      latest: snapshot("2026-09-12T11:00:00Z", "latest"),
      invalid: { savedAt: "not-a-date", feed: { events: [] } },
    },
    1,
    10_000,
  );
  assert.deepEqual(Object.keys(compacted), ["latest"]);
  assert.deepEqual(compactSnapshots({ latest: compacted.latest }, 1, 10), {});
});

test("snapshot keys are exact to source, window and normalized coordinates", () => {
  assert.equal(
    snapshotKey({ source: "NOAA20", days: "1", bbox: [68, "6", 98, 37] }),
    "NOAA20:1:68,6,98,37",
  );
});
