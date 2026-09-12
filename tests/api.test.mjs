import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../server/index.mjs";
const csv =
  "latitude,longitude,frp,acq_date,acq_time,confidence,satellite\n22.1,70.1,82,2026-09-12,0430,h,N20\n";
test("API ingestion, auth, review persistence, area validation and caching", async () => {
  let requests = 0;
  const app = await createApplication({
    dbPath: ":memory:",
    token: "test-secret",
    fetcher: async () => {
      requests++;
      return new Response(csv);
    },
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = (path, options = {}) =>
    fetch(base + path, {
      ...options,
      headers: {
        Authorization: "Bearer test-secret",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  try {
    assert.equal((await fetch(base + "/api/events")).status, 401);
    assert.equal((await call("/api/events?days=99")).status, 400);
    const feed = await (await call("/api/events")).json();
    assert.equal(feed.events.length, 1);
    assert.equal(requests, 1);
    const id = feed.events[0].id;
    const review = {
      status: "deferred",
      classification: "Uncertain / Other",
      note: "Need facility evidence.",
      analyst: "Reviewer",
    };
    assert.equal(
      (
        await call(`/api/events/${id}/reviews`, {
          method: "POST",
          body: JSON.stringify(review),
        })
      ).status,
      201,
    );
    const again = await (await call("/api/events")).json();
    assert.equal(again.events[0].review.status, "deferred");
    assert.equal(requests, 1);
    assert.equal(
      (
        await call("/api/events/missing/reviews", {
          method: "POST",
          body: JSON.stringify(review),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await call("/api/areas", {
          method: "POST",
          body: JSON.stringify({ name: "Invalid", bbox: [90, 20, 70, 30] }),
        })
      ).status,
      400,
    );
    const area = await (
      await call("/api/areas", {
        method: "POST",
        body: JSON.stringify({ name: "Gujarat", bbox: [68, 20, 75, 25] }),
      })
    ).json();
    assert.ok(area.area.id);
    assert.equal(
      (await call(`/api/areas/${area.area.id}`, { method: "DELETE" })).status,
      204,
    );
    assert.equal(
      (
        await call("/api/areas", {
          method: "POST",
          headers: { Origin: "https://different.example" },
          body: "{}",
        })
      ).status,
      403,
    );
  } finally {
    await app.close();
  }
});
