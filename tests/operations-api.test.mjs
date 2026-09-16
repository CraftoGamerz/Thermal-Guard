import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../server/index.mjs";
const csv =
  "latitude,longitude,frp,acq_date,acq_time,confidence,satellite\n22.1,70.1,82,2026-09-12,0430,h,N20\n";
test("strict live retrieval fails on outage while archived history remains available", async () => {
  let online = true, calls = 0;
  const app = await createApplication({ dbPath: ":memory:", allowOfflineFallback: false, fetcher: async () => { calls++; if (!online) throw Error("QA outage"); return new Response(csv); } });
  await new Promise(r => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}/api`;
  try {
    assert.equal((await fetch(base + "/events")).status, 200);
    online = false;
    assert((await fetch(base + "/events")).status >= 500);
    assert.equal(calls, 2, "Default live mode must not silently reuse a fresh cached snapshot");
    assert.equal((await (await fetch(base + "/history")).json()).total, 1);
  } finally { await app.close(); }
});
test("operations HTTP validation, auth, same-origin and case/history persistence", async () => {
  const app = await createApplication({
    dbPath: ":memory:",
    token: "qa-only",
    fetcher: async (url) =>
      url.includes("overpass")
        ? Response.json({ elements: [] })
        : url.includes("open-meteo")
          ? Response.json({
              current: { temperature_2m: 29 },
              current_units: { temperature_2m: "°C" },
            })
          : new Response(csv),
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = (path, method = "GET", value, headers = {}) =>
    fetch(base + "/api" + path, {
      method,
      headers: {
        Authorization: "Bearer qa-only",
        "Content-Type": "application/json",
        ...headers,
      },
      ...(value ? { body: JSON.stringify(value) } : {}),
    });
  try {
    assert.equal((await fetch(base + "/api/contacts")).status, 401);
    assert.equal(
      (
        await call(
          "/cases",
          "POST",
          { eventId: "missing" },
          { Origin: "https://evil.invalid" },
        )
      ).status,
      403,
    );
    assert.equal((await call("/response-context?lat=NaN&lon=70")).status, 400);
    const feed = await (await call("/events")).json();
    const { case: item } = await (
      await call("/cases", "POST", { eventId: feed.events[0].id })
    ).json();
    assert.ok(item.id);
    assert.equal(
      (await call(`/cases/${item.id}`, "PATCH", { status: "fake" })).status,
      400,
    );
    assert.equal(
      (
        await call(`/cases/${item.id}`, "PATCH", {
          status: "monitoring",
          note: "QA test",
          checklist: { source: true },
        })
      ).status,
      200,
    );
    const cases = await (await call("/cases")).json();
    assert.equal(cases.cases[0].status, "monitoring");
    assert.equal(cases.cases[0].checklist.source, true);
    const history = await (
      await call("/history?source=NOAA20&bbox=68,6,98,37")
    ).json();
    assert.equal(history.total, 1);
    assert.equal(
      (await call("/history/import", "POST", { source: "NOAA20", csv })).status,
      201,
    );
    const separate = await (
      await call(
        "/history?source=NOAA20&bbox=68,6,98,37&provenance=user-import",
      )
    ).json();
    assert.equal(separate.total, 1);
    const contact = {
      name: "QA office",
      role: "Public office",
      phone: "1234567890",
      lat: 22,
      lon: 70,
      sourceUrl: "https://example.org/directory",
      verifiedBy: "QA",
      verifiedOn: "2026-09-01",
    };
    assert.equal(
      (
        await call("/contacts", "POST", {
          ...contact,
          sourceUrl: "javascript:alert(1)",
        })
      ).status,
      400,
    );
    assert.equal((await call("/contacts", "POST", contact)).status, 201);
    assert.equal((await (await call("/contacts")).json()).contacts.length, 1);
    const context = await (
      await call("/response-context?lat=22&lon=70")
    ).json();
    assert.equal(context.weather.temperature_2m, 29);
    assert.equal(context.resources.length, 0);
  } finally {
    await app.close();
  }
});
