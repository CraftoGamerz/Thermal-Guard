import test from "node:test";
import assert from "node:assert/strict";
import { locationRank } from "../src/workspace/locationRank.js";

const report = {
  events: [
    { id: "west", lat: 22, lon: 70 },
    { id: "east", lat: 23, lon: 71 },
  ],
  rows: [
    { eventId: "west", lat: 22, lon: 70, observedFrp: 10, residualPercentile: 99, unusual: true },
    { eventId: "west", lat: 22, lon: 70, observedFrp: 5, residualPercentile: 72, unusual: false },
    { eventId: "east", lat: 23, lon: 71, observedFrp: 110, residualPercentile: 60, unusual: false },
  ],
};

test("location attention rank groups real report rows and is report-local", () => {
  const ranks = locationRank(report);
  assert.equal(ranks.length, 2);
  assert.equal(ranks[0].eventId, "west");
  assert.equal(ranks[0].rank, 1);
  assert.equal(ranks[0].detections, 2);
  assert.equal(ranks[0].unusualDetections, 1);
  assert.equal(ranks[0].attentionScore, 85);
  assert.equal(ranks[1].observedFrpComponent, 100);
});

test("location attention rank omits CSV-style rows without existing NASA events", () => {
  assert.deepEqual(locationRank({ rows: [{ observedFrp: 10 }], events: [] }), []);
  assert.deepEqual(locationRank({ rows: [{ ...report.rows[0], eventId: "gone" }], events: report.events }), []);
});
