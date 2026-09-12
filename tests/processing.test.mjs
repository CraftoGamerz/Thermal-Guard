import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCSV,
  normalize,
  cluster,
  bboxValue,
  replay,
} from "../server/processing.mjs";
const csv =
  'latitude,longitude,frp,acq_date,acq_time,confidence,satellite\r\n22.1,70.1,82,2026-09-12,0430,h,"NOAA,20"\r\n22.1,70.1,82,2026-09-12,0430,h,"NOAA,20"\r\nbad,70,4,2026-09-12,0430,h,N20\r\n';
test("CSV normalization preserves UTC, quotes, confidence and removes duplicates/invalid coordinates", () => {
  const result = normalize(parseCSV(csv), "NOAA20");
  assert.equal(result.detections.length, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.rejectedRows, 1);
  assert.equal(result.detections[0].acquiredAt, "2026-09-12T04:30:00Z");
  assert.equal(result.detections[0].satellite, "NOAA,20");
});
test("clustering is stable and abstains from unvalidated source classification", () => {
  const detections = replay();
  const a = cluster(detections),
    b = cluster([...detections].reverse());
  assert.deepEqual(a.map((e) => e.id).sort(), b.map((e) => e.id).sort());
  assert.equal(
    a.reduce((n, e) => n + e.detections.length, 0),
    detections.length,
  );
  assert.ok(a.every((e) => e.classification === "Uncertain / Other"));
});
test("invalid geographic and upstream content are rejected", () => {
  for (const value of ["1,2,0,4", "NaN,1,2,3", "1,,3,4", "-181,1,2,3"])
    assert.throws(() => bboxValue(value));
  assert.deepEqual(bboxValue("68,6,98,37"), [68, 6, 98, 37]);
  assert.throws(() => parseCSV("<html>API error</html>"));
  assert.throws(() => parseCSV('latitude,acq_date,frp\n"unfinished'));
});
