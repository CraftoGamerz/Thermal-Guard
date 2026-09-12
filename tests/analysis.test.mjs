import test from "node:test";
import assert from "node:assert/strict";
import { validateAnalysis, createAnalysis, runPython } from "../server/analysis.mjs";
import { normalize, parseCSV } from "../server/processing.mjs";
import { createStore } from "../server/store.mjs";
import { createApplication } from "../server/index.mjs";
const csv =
  "latitude,longitude,frp,acq_date,acq_time,confidence,bright_ti4,bright_ti5,scan,track,daynight\n22,70,50,2026-09-12,0430,nominal,340,295,0.4,0.4,D\n";

test("missing Python fails explicitly instead of returning a mock model", async () => {
  await assert.rejects(runPython({}, { python: "thermalguard-missing-runtime-for-test" }), { status: 503 });
});

test("NASA full-word confidence and I5 are retained; CSV inputs are bounded", () => {
  const { detections } = normalize(parseCSV(csv), "NOAA20");
  assert.equal(detections[0].confidence, "nominal");
  assert.equal(detections[0].brightnessI5, 295);
  assert.equal(validateAnalysis({ csv }).upload.detections.length, 1);
  for (const invalid of [
    { csv: "abc" },
    { mode: "replay" },
    { csv: "x".repeat(2100000) },
    { source: "__proto__" },
    { bbox: [90, 30, 70, 20] },
  ])
    assert.throws(() => validateAnalysis(invalid));
});

test("job stages, concurrency, report persistence and no fake failure fallback", async () => {
  const store = createStore(":memory:");
  let release;
  const waiting = new Promise((r) => {
    release = r;
  });
  let calls = 0;
  const providers = {
    events: async (query) => {
      calls++;
      return {
        meta: { provider: "NASA FIRMS", days: query.days },
        events: [
          {
            id: "real-event",
            detections: normalize(parseCSV(csv), query.source).detections,
          },
        ],
      };
    },
  };
  const engine = createAnalysis(store, providers, {
    runner: async (payload) => {
      await waiting;
      assert.equal(payload.scoring[0].eventId, "real-event");
      return { rows: [], timings: {} };
    },
  });
  try {
    const job = engine.start({});
    assert.throws(() => engine.start({}), { status: 429 });
    assert.equal(engine.get(job.id).status, "running");
    release();
    await engine.close();
    const done = engine.get(job.id);
    assert.equal(done.status, "completed");
    assert.equal(calls, 2);
    assert.equal(
      store.run(job.id).result.provenance.input.provider,
      "NASA FIRMS",
    );
    assert.ok(done.result.timings.totalMs >= 0);
    const failed = createAnalysis(store, {
      events: async () => {
        throw Object.assign(new Error("NASA offline"), { status: 502 });
      },
    });
    const failJob = failed.start({});
    await failed.close();
    assert.equal(failed.get(failJob.id).status, "failed");
    assert.equal(failed.get(failJob.id).result, undefined);
  } finally {
    store.db.close();
  }
});

test("analysis API uses auth, validates input and returns actual async result", async () => {
  const app = await createApplication({
    dbPath: ":memory:",
    token: "testing",
    fetcher: async () => new Response(csv),
    analysisOptions: { runner: async () => ({ rows: [], timings: {} }) },
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = (body, headers = {}) =>
    fetch(base + "/api/analysis/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer testing",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post({}, { Authorization: "" })).status, 401);
    assert.equal((await post({ mode: "replay" })).status, 400);
    assert.equal(
      (await post({}, { Origin: "https://example.com" })).status,
      403,
    );
    const started = await post({});
    assert.equal(started.status, 202);
    const job = await started.json();
    const result = await (
      await fetch(base + "/api/analysis/jobs/" + job.id, {
        headers: { Authorization: "Bearer testing" },
      })
    ).json();
    assert.equal(result.status, "completed");
    assert.equal(result.result.events[0].classification, "Uncertain / Other");
  } finally {
    await app.close();
  }
});
