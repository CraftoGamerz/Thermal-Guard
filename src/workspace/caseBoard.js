export const CASE_STATUSES = ["new", "investigating", "monitoring", "closed"];
export const CASE_ORDERS = ["recent", "open", "checks"];

export function caseProgress(item) {
  const checks = Object.values(item?.checklist || {});
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    percent: checks.length ? Math.round((completed / checks.length) * 100) : 0,
  };
}

export function nextRecordedCheck(item) {
  const entries = Object.entries(item?.checklist || {});
  const next = entries.find(([, checked]) => !checked);
  return {
    key: next?.[0] || null,
    completed: entries.filter(([, checked]) => checked).length,
    total: entries.length,
    allMarked: entries.length > 0 && !next,
  };
}

export function matchesCaseSearch(item, query = "") {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const saved = [
    item?.title,
    item?.assignee,
    item?.note,
    item?.event?.lat?.toFixed?.(4),
    item?.event?.lon?.toFixed?.(4),
    item?.event?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return saved.includes(needle);
}

export function caseBoard(cases = []) {
  const statuses = Object.fromEntries(CASE_STATUSES.map((status) => [status, 0]));
  const owners = new Map();
  for (const item of cases) {
    const status = CASE_STATUSES.includes(item.status) ? item.status : "new";
    statuses[status] += 1;
    const name = item.assignee?.trim() || "Unassigned";
    const owner = owners.get(name) || {
      name,
      cases: 0,
      open: 0,
      checksCompleted: 0,
      checksTotal: 0,
    };
    const progress = caseProgress(item);
    owner.cases += 1;
    owner.open += status === "closed" ? 0 : 1;
    owner.checksCompleted += progress.completed;
    owner.checksTotal += progress.total;
    owners.set(name, owner);
  }
  return {
    statuses,
    open: cases.filter((item) => item.status !== "closed").length,
    owners: [...owners.values()]
      .map((owner) => ({
        ...owner,
        completion: owner.checksTotal
          ? Math.round((owner.checksCompleted / owner.checksTotal) * 100)
          : 0,
      }))
      .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name)),
  };
}

function recordedCheckRatio(item) {
  const { completed, total } = caseProgress(item);
  return total ? completed / total : 0;
}

function savedTime(item) {
  const value = Date.parse(item?.updatedAt || item?.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

export function orderCases(cases = [], order = "recent") {
  const selected = CASE_ORDERS.includes(order) ? order : "recent";
  return [...cases].sort((a, b) => {
    if (selected === "open") {
      const closedDelta = Number(a.status === "closed") - Number(b.status === "closed");
      if (closedDelta) return closedDelta;
    }
    if (selected === "checks") {
      const checkDelta = recordedCheckRatio(a) - recordedCheckRatio(b);
      if (checkDelta) return checkDelta;
    }
    const timeDelta = savedTime(b) - savedTime(a);
    return timeDelta || String(a.id || "").localeCompare(String(b.id || ""));
  });
}
