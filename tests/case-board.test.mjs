import test from "node:test";
import assert from "node:assert/strict";
import {
  caseBoard,
  caseProgress,
  matchesCaseSearch,
  nextRecordedCheck,
  orderCases,
} from "../src/workspace/caseBoard.js";

const cases = [
  {
    status: "new",
    assignee: "Asha",
    checklist: { timestamp: true, source: false, context: false },
  },
  {
    status: "investigating",
    assignee: "Asha",
    checklist: { timestamp: true, source: true, context: false },
  },
  {
    status: "closed",
    assignee: "",
    checklist: { timestamp: true, source: true, context: true },
  },
];

test("case board aggregates saved case status, owners and recorded checks", () => {
  const board = caseBoard(cases);
  assert.deepEqual(board.statuses, { new: 1, investigating: 1, monitoring: 0, closed: 1 });
  assert.equal(board.open, 2);
  assert.deepEqual(board.owners[0], {
    name: "Asha",
    cases: 2,
    open: 2,
    checksCompleted: 3,
    checksTotal: 6,
    completion: 50,
  });
  assert.equal(board.owners.at(-1).name, "Unassigned");
});

test("case progress remains an honest zero when no checklist exists", () => {
  assert.deepEqual(caseProgress({}), { completed: 0, total: 0, percent: 0 });
});

test("case ordering is a stable client presentation of saved fields", () => {
  const ordered = orderCases([
    { id: "closed", status: "closed", updatedAt: "2026-09-12T10:00:00Z", checklist: { source: true } },
    { id: "open-old", status: "new", updatedAt: "2026-09-10T10:00:00Z", checklist: { source: true } },
    { id: "open-new", status: "monitoring", updatedAt: "2026-09-11T10:00:00Z", checklist: { source: false } },
  ], "open");
  assert.deepEqual(ordered.map((item) => item.id), ["open-new", "open-old", "closed"]);
  assert.deepEqual(orderCases(ordered, "checks").map((item) => item.id), ["open-new", "closed", "open-old"]);
  assert.equal(orderCases([{ id: "a" }, { id: "b" }], "unknown")[0].id, "a");
});

test("case search and next-check cue only read saved record fields", () => {
  const item = {
    title: "Verify Jamnagar signal",
    assignee: "Asha",
    note: "Check public context",
    event: { id: "live-observation", lat: 22.4716, lon: 70.0577 },
    checklist: { timestamp: true, source: false },
  };
  assert.equal(matchesCaseSearch(item, "70.0577"), true);
  assert.equal(matchesCaseSearch(item, "context"), true);
  assert.equal(matchesCaseSearch(item, "unknown"), false);
  assert.deepEqual(nextRecordedCheck(item), {
    key: "source",
    completed: 1,
    total: 2,
    allMarked: false,
  });
  assert.deepEqual(nextRecordedCheck({ checklist: { source: true } }), {
    key: null,
    completed: 1,
    total: 1,
    allMarked: true,
  });
});
