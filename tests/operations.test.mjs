import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../server/store.mjs";
import {
  monthlyStats,
  thermalChange,
  createResponseContext,
} from "../server/operations.mjs";
import { hypotheses } from "../src/workspace/hypotheses.js";
test("six source categories abstain without context; suspicion is never confirmation", () => {
  const result = hypotheses({ id: "e" }, [
    { eventId: "e", unusual: true, baseline: { observedDays: 4 } },
  ]);
  assert.equal(result.length, 6);
  assert.equal(result.at(-1).candidate, true);
  const mapped = hypotheses(
    { id: "e" },
    [{ eventId: "e", unusual: true, baseline: { observedDays: 4 } }],
    { resources: [{ distanceKm: 1, tags: { landuse: "industrial" } }] },
  );
  assert.equal(mapped[0].candidate, true);
  assert.equal(mapped[0].status, "Unverified hypothesis");
  assert.equal(hypotheses(null, [], { resources: [{ distanceKm: 1, tags: { landuse: "forest" } }] })[3].candidate, false);
});
test("history provenance is separate, monthly change requires enough observed days", () => {
  const s = createStore(":memory:");
  try {
    const points = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      source: "NOAA20",
      lat: 22,
      lon: 70,
      frp: 10,
      acquiredAt: `2026-08-${String((i % 3) + 1).padStart(2, "0")}T12:00:00Z`,
    }));
    s.archive(points);
    s.archive(points, "user-import");
    s.archive(points);
    assert.equal(s.history("NOAA20", [68, 6, 98, 37]).total, 12);
    assert.equal(s.history("NOAA20", [68, 6, 98, 37], "user-import").total, 12);
    const a = monthlyStats(points)[0];
    assert.equal(thermalChange(a, { ...a, medianFrp: 5 }), -50);
    assert.equal(thermalChange(a, { ...a, observedDays: 1 }), null);
  } finally {
    s.db.close();
  }
});
test("contacts validate sources; cases persist checklist and chronological activity", () => {
  const s = createStore(":memory:");
  try {
    assert.throws(() => s.addContact({}), /latitude/);
    const c = s.addContact({
      name: "Test public office",
      role: "Test",
      phone: "1234567890",
      lat: 22,
      lon: 70,
      sourceUrl: "https://example.org/directory",
      verifiedBy: "QA",
      verifiedOn: "2026-09-01",
    });
    assert.ok(c.id);
    const item = s.addCase(
      { actor: "Case opener" },
      { id: "live-test", lat: 22, lon: 70 },
    );
    assert.equal(item.activity[0].actor, "Case opener");
    assert.equal(
      s.addCase({}, { id: "live-test", lat: 22, lon: 70 }).id,
      item.id,
    );
    const changed = s.updateCase(item.id, {
      status: "investigating",
      checklist: { source: true },
      note: "Test verification",
      actor: "Browser QA",
    });
    assert.equal(changed.checklist.source, true);
    assert.equal(changed.activity.length, 4);
    assert.equal(changed.activity.at(-1).actor, "Browser QA");
    assert.throws(() => s.updateCase(item.id, { checklist: { bad: true } }));
  } finally {
    s.db.close();
  }
});
test("resource provider preserves missing phone/asset IDs and weather partial errors", async () => {
  const get = createResponseContext({
    fetcher: async (url) =>
      url.includes("open-meteo")
        ? new Response("", { status: 503 })
        : Response.json({
            elements: [
              {
                type: "node",
                id: 7,
                lat: 22,
                lon: 70,
                tags: { emergency: "fire_hydrant", ref: "H-7" },
              },
            ],
          }),
  });
  const r = await get(22, 70);
  assert.equal(r.resources[0].phone, null);
  assert.equal(r.resources[0].ref, "H-7");
  assert.equal(r.weather, null);
  assert.ok(r.errors.weather);
  assert.equal((await get(22, 70)).cached, true);
});
