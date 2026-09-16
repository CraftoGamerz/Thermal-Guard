import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Download,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wind,
} from "lucide-react";
import { api, formatUTC, STATIC_DEMO } from "./client";
import { hypotheses } from "./hypotheses";
import {
  CASE_STATUSES,
  caseBoard,
  caseProgress,
  matchesCaseSearch,
  nextRecordedCheck,
  orderCases,
} from "./caseBoard";
import {
  firebaseConfigured,
  mirrorCaseToFirebase,
  subscribeToFirebaseActivity,
} from "./firebaseCollaboration";
import "./operations.css";
const EMPTY = [];
const fmt = (n, d = 1) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-GB", { maximumFractionDigits: d })
    : "—";
const CHECKS = {
  timestamp: "Check acquisition time",
  source: "Inspect NASA source",
  context: "Corroborate local context",
  contact: "Verify response contact",
  fieldVerification: "Request / record field verification",
};
const featureLabels = {
  fire_hydrant: "Hydrant",
  fire_station: "Fire station",
  hospital: "Hospital",
  government: "Government office",
  flare: "Mapped flare",
  industrial: "Industrial context",
  farmland: "Farmland context",
  forest: "Forest context",
};
function download(data, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Empty({ title, children }) {
  return (
    <div className="ops-empty">
      <ShieldCheck size={24} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function CaseEditor({ item, onSave, editorName, onEvidence, onMission, currentEvent }) {
  const [value, setValue] = useState(item),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const progress = caseProgress(value);
  const nextCheck = nextRecordedCheck(value);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(item.id, value);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel padded ops-case" onSubmit={save}>
      <div className="ops-title">
        <div>
          <span className="eyebrow">CASE {item.id.slice(0, 8)}</span>
          <h3>{item.title}</h3>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            download(
              {
                ...item,
                notice:
                  "Investigation record, not an emergency dispatch or confirmed incident.",
              },
              `thermalguard-case-${item.id}.json`,
            )
          }
        >
          <Download size={15} />
          Case brief
        </button>
      </div>
      <p>
        {item.event.lat.toFixed(4)}, {item.event.lon.toFixed(4)} ·{" "}
        {formatUTC(item.event.lastSeen)} · peak {fmt(item.event.maxFrp)} MW
      </p>
      <div className="case-return-actions">
        <span>Saved observation</span>
        <button type="button" className="secondary" onClick={() => onEvidence(item.event)}>
          <ShieldCheck size={14} /> Open saved evidence
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!currentEvent}
          title={currentEvent ? "Focus this current observation in Mission control" : "This saved observation is outside the current Mission control feed"}
          onClick={() => onMission(currentEvent)}
        >
          <MapPin size={14} /> Find in Mission control
        </button>
        {!currentEvent && <small>Not in the current feed</small>}
      </div>
      <div className="case-check-progress" aria-label="Recorded verification checks">
        <div>
          <span>Recorded verification checks</span>
          <strong>{progress.completed} / {progress.total || "—"}</strong>
        </div>
        <meter min="0" max={Math.max(1, progress.total)} value={progress.completed} />
        <small>Checklist completion does not establish resolution or safety.</small>
      </div>
      <div className="case-next-check">
        <span>{nextCheck.key ? "Next recorded check" : "Record state"}</span>
        <strong>
          {nextCheck.key
            ? CHECKS[nextCheck.key] || `Record ${nextCheck.key}`
            : nextCheck.allMarked
              ? "All recorded checks marked"
              : "No recorded checklist yet"}
        </strong>
        <small>Human verification is still required.</small>
      </div>
      <div className="ops-form-grid">
        <label>
          Status
          <select
            aria-label="Case status"
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            {CASE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Assignee
          <input
            maxLength={80}
            value={value.assignee}
            onChange={(e) => setValue({ ...value, assignee: e.target.value })}
          />
        </label>
      </div>
      <div className="ops-checklist">
        {Object.entries(CHECKS).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value.checklist[key]}
              onChange={(e) =>
                setValue({
                  ...value,
                  checklist: { ...value.checklist, [key]: e.target.checked },
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
      <label>
        Shared investigation note
        <textarea
          maxLength={2000}
          value={value.note}
          onChange={(e) => setValue({ ...value, note: e.target.value })}
        />
      </label>
      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : "Save shared case update"}
      </button>
      <small>
        Saved under {editorName} as a self-declared editor in this local shared workspace.
      </small>
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>Activity history · {item.activity.length} entries</summary>
        {item.activity
          .slice()
          .reverse()
          .map((a, i) => (
            <p key={i}>
              <small>{formatUTC(a.at)}</small>
              {a.actor && <small> · {a.actor}</small>}
              <br />
              {a.text}
            </p>
          ))}
      </details>
    </form>
  );
}
function WorkloadBoard({ board, status, owner, onStatus, onOwner, filtered, onClear }) {
  return (
    <section className="workload-board" aria-label="Case workload board">
      <div className="workload-head">
        <div>
          <span className="eyebrow">LIVE WORKLOAD VIEW</span>
          <h3>Saved case coverage</h3>
          <p>Status, assignment and recorded verification checks from this Case Desk. They are not safety, urgency or performance scores.</p>
        </div>
        {filtered && (
          <button className="text-button" onClick={onClear}>Clear case filters</button>
        )}
      </div>
      <div className="workload-lanes" role="group" aria-label="Filter cases by status">
        <button
          className={status === "all" ? "selected" : ""}
          aria-pressed={status === "all"}
          onClick={() => onStatus("all")}
        >
          <span>All saved</span><b>{Object.values(board.statuses).reduce((sum, count) => sum + count, 0)}</b>
        </button>
        {CASE_STATUSES.map((item) => (
          <button
            key={item}
            className={status === item ? "selected" : ""}
            aria-pressed={status === item}
            onClick={() => onStatus(item)}
          >
            <span>{item}</span><b>{board.statuses[item]}</b>
          </button>
        ))}
      </div>
      <div className="workload-owners" role="group" aria-label="Filter cases by owner">
        <span>Owner workload</span>
        <button
          className={owner === "all" ? "selected" : ""}
          aria-pressed={owner === "all"}
          onClick={() => onOwner("all")}
        >
          All owners <b>{board.open} open</b>
        </button>
        {board.owners.map((item) => (
          <button
            key={item.name}
            className={owner === item.name ? "selected" : ""}
            aria-pressed={owner === item.name}
            onClick={() => onOwner(item.name)}
          >
            {item.name} <b>{item.open} open</b><small>{item.completion}% checks recorded</small>
          </button>
        ))}
        {!board.owners.length && <small>No saved owner workload yet.</small>}
      </div>
    </section>
  );
}
export default function Operations({
  page,
  feed,
  auto,
  area,
  source,
  mode,
  manager,
  focus,
  setFocus,
  navigate,
  onEvidence,
  feedLoading,
}) {
  const blocked = STATIC_DEMO || mode === "replay";
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const [contacts, setContacts] = useState([]),
    [cases, setCases] = useState([]),
    [lastSynced, setLastSynced] = useState(""),
    [cloudPulse, setCloudPulse] = useState([]),
    [cloudStatus, setCloudStatus] = useState(() =>
      firebaseConfigured() ? { state: "idle" } : { state: "unconfigured" },
    ),
    [cloudRevision, setCloudRevision] = useState(0),
    [context, setContext] = useState(null),
    [contextBusy, setContextBusy] = useState(false),
    [contextRevision, setContextRevision] = useState(0);
  const [threshold, setThreshold] = useState(95),
    [search, setSearch] = useState(""),
    [resourceType, setResourceType] = useState("all"),
    [caseStatus, setCaseStatus] = useState("all"),
    [caseOwner, setCaseOwner] = useState("all"),
    [caseOrder, setCaseOrder] = useState("recent"),
    [caseSearch, setCaseSearch] = useState("");
  const [history, setHistory] = useState(null),
    [provenance, setProvenance] = useState("nasa"),
    [historyBusy, setHistoryBusy] = useState(false),
    [baseMonth, setBaseMonth] = useState(""),
    [recentMonth, setRecentMonth] = useState("");
  const events = useMemo(() => {
    if (!auto.result?.events?.length) return feed?.events || EMPTY;
    const current = new Map((feed?.events || EMPTY).map(e => [e.id, e]));
    return auto.result.events.map(e => current.has(e.id) ? { ...e, review: current.get(e.id).review } : e);
  }, [auto.result, feed]);
  const bboxKey = area.bbox.join(",");
  const selected = events.find((e) => e.id === focus?.id) || events[0] || null;
  const lat = selected?.lat ?? (area.bbox[1] + area.bbox[3]) / 2,
    lon = selected?.lon ?? (area.bbox[0] + area.bbox[2]) / 2;
  useEffect(() => {
    if (blocked) return;
    let current = true;
    Promise.all([api("/contacts"), api("/cases")])
      .then(([a, b]) => {
        if (current) {
          setContacts(a.contacts);
          setCases(b.cases);
          setLastSynced(new Date().toISOString());
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [blocked, revision]);
  useEffect(() => {
    if (blocked || page !== "cases") return;
    const timer = setInterval(() => setRevision((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, [blocked, page]);
  useEffect(() => {
    if (blocked || page !== "cases") return;
    let active = true;
    let unsubscribe = () => {};
    subscribeToFirebaseActivity(
      (items) => active && setCloudPulse(items),
      (status) => active && setCloudStatus(status),
    ).then((stop) => {
      unsubscribe = stop;
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [blocked, page, cloudRevision]);
  useEffect(() => {
    if (blocked || feedLoading || !["mission", "resources"].includes(page))
      return;
    const abort = new AbortController();
    // Reset the external resource request snapshot before subscribing to its result.
    // eslint-disable-next-line react/set-state-in-effect
    setContext(null);
    setContextBusy(true);
    const lookup = () =>
      api(
        `/response-context?lat=${lat}&lon=${lon}&refresh=${contextRevision ? 1 : 0}`,
        { signal: abort.signal },
      );
    lookup()
      .catch(async (error) => {
        if (error.status !== 429 || abort.signal.aborted) throw error;
        // Rapid event changes can hit the provider's shared lookup throttle.
        // Retry once for the latest selection without inventing context.
        await new Promise((resolve) => setTimeout(resolve, 3100));
        if (abort.signal.aborted)
          throw new DOMException("Cancelled", "AbortError");
        return lookup();
      })
      .then(setContext)
      .catch((e) => {
        if (e.name !== "AbortError") setContext({ errors: { osm: e.message } });
      })
      .finally(() => {
        if (!abort.signal.aborted) setContextBusy(false);
      });
    return () => abort.abort();
  }, [blocked, feedLoading, page, lat, lon, contextRevision]);
  useEffect(() => {
    if (blocked || page !== "trends") return;
    const abort = new AbortController();
    // Loading is the state of this external history request.
    // eslint-disable-next-line react/set-state-in-effect
    setHistoryBusy(true);
    setHistory(null);
    api(
      "/history?" + new URLSearchParams({ source, bbox: bboxKey, provenance }),
      { signal: abort.signal },
    )
      .then((h) => {
        setHistory(h);
        setBaseMonth(h.months.at(-2)?.month || "");
        setRecentMonth(h.months.at(-1)?.month || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setHistoryBusy(false);
      });
    return () => abort.abort();
  }, [blocked, page, source, bboxKey, provenance, revision]);
  const rows = auto.result?.rows || EMPTY;
  const suspicious = useMemo(() => {
    const scores = new Map();
    for (const row of rows)
      if (row.residualPercentile >= threshold && row.excessMw > 0)
        scores.set(
          row.eventId,
          Math.max(scores.get(row.eventId) || 0, row.residualPercentile),
        );
    return events
      .filter((e) => scores.has(e.id))
      .map((e) => ({ ...e, score: scores.get(e.id) }))
      .sort((a, b) => b.score - a.score);
  }, [rows, events, threshold]);
  const categories = hypotheses(
    selected,
    rows,
    context &&
      Math.abs(context.lat - lat) < 0.0015 &&
      Math.abs(context.lon - lon) < 0.0015
      ? context
      : null,
  );
  const teamPulse = useMemo(
    () =>
      cases
        .flatMap((item) =>
          (item.activity || []).map((activity) => ({
            ...activity,
            caseId: item.id,
            title: item.title,
            owner: item.assignee,
          })),
        )
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, 6),
    [cases],
  );
  const activeOwners = useMemo(
    () =>
      [...new Set(cases.filter((item) => item.status !== "closed").map((item) => item.assignee))]
        .filter((owner) => owner && owner !== "Unassigned"),
    [cases],
  );
  const workload = useMemo(() => caseBoard(cases), [cases]);
  const activeEventsById = useMemo(
    () => new Map(events.map((item) => [item.id, item])),
    [events],
  );
  const visibleCases = useMemo(
    () =>
      orderCases(
        cases.filter(
            (item) =>
              (caseStatus === "all" || item.status === caseStatus) &&
            (caseOwner === "all" || (item.assignee?.trim() || "Unassigned") === caseOwner) &&
            matchesCaseSearch(item, caseSearch),
        ),
        caseOrder,
      ),
    [cases, caseStatus, caseOwner, caseOrder, caseSearch],
  );
  const caseFiltersActive = caseStatus !== "all" || caseOwner !== "all" || Boolean(caseSearch.trim());
  function clearCaseFilters() {
    setCaseStatus("all");
    setCaseOwner("all");
    setCaseSearch("");
  }
  function openMissionEvent(event) {
    if (!event) return;
    setFocus(event);
    navigate("mission");
  }
  const firebaseOnlyPulse = useMemo(
    () =>
      cloudPulse.filter(
        (remote) =>
          !teamPulse.some(
            (local) =>
              local.actor === remote.actor &&
              local.text === remote.text &&
              local.at === remote.occurredAt,
          ),
      ),
    [cloudPulse, teamPulse],
  );
  async function createCase(event) {
    if (!event) return;
    setError("");
    try {
      const created = await api("/cases", {
        method: "POST",
        body: JSON.stringify({
          eventId: event.id,
          assignee: manager?.name || "Unassigned",
          actor: manager?.name || "Workspace user",
        }),
      });
      void mirrorCaseToFirebase(created.case).then((result) => {
        if (result.state === "error") setCloudStatus(result);
      });
      setRevision((r) => r + 1);
      setNotice(
        "Investigation case saved. No emergency service has been contacted.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function saveCase(id, value) {
    const saved = await api(`/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: value.status,
        assignee: value.assignee,
        note: value.note,
        checklist: value.checklist,
        actor: manager?.name || "Workspace user",
      }),
    });
    void mirrorCaseToFirebase(saved.case).then((result) => {
      if (result.state === "error") setCloudStatus(result);
      else if (result.state === "live") setCloudStatus(result);
    });
    setRevision((r) => r + 1);
    setNotice("Case progress saved.");
  }
  async function addContact(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setError("");
    const b = Object.fromEntries(new FormData(form));
    try {
      await api("/contacts", {
        method: "POST",
        body: JSON.stringify({ ...b, lat: Number(b.lat), lon: Number(b.lon) }),
      });
      form.reset();
      setRevision((r) => r + 1);
      setNotice("Contact saved as user-attested, with its source link.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function importHistory(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("CSV must be at most 2 MB.");
      return;
    }
    setHistoryBusy(true);
    setError("");
    try {
      const r = await api("/history/import", {
        method: "POST",
        body: JSON.stringify({ source, csv: await file.text() }),
      });
      setNotice(
        `${r.imported} valid rows imported; ${r.rejected} rejected. User-supplied history stays separate from NASA training.`,
      );
      setProvenance("user-import");
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setHistoryBusy(false);
      e.target.value = "";
    }
  }
  const baseline = history?.months.find((m) => m.month === baseMonth),
    recent = history?.months.find((m) => m.month === recentMonth);
  const enough =
    baseline &&
    recent &&
    baseMonth < recentMonth &&
    baseline.count >= 10 &&
    recent.count >= 10 &&
    baseline.observedDays >= 3 &&
    recent.observedDays >= 3 &&
    baseline.medianFrp > 0;
  const percent = enough
    ? (100 * (recent.medianFrp - baseline.medianFrp)) / baseline.medianFrp
    : null;
  if (blocked)
    return (
      <Empty title="Live operations need the connected backend">
        Switch to Live feed. Historical imports, contacts, response context and
        cases are not simulated in replay or the static site.
      </Empty>
    );
  return (
    <div className="operations">
      {error && (
        <div role="alert" className="ops-notice warning">
          <span>{error}</span>
          <button className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="ops-notice">
          <span>{notice}</span>
          <button className="text-button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}
      {page === "mission" && (
        <>
          <div className="ops-banner">
            <div>
              <span className="eyebrow">COMPILEX / MISSION CONTROL</span>
              <h2>Your investigation starts before the click.</h2>
              <p>
                Automatic model screening, six source hypotheses and a clear
                path to action.
              </p>
            </div>
            <BrainCircuit size={44} />
          </div>
          <div className="ops-metrics">
            {[
              ["Observed events", events.length],
              ["Suspicion inbox", suspicious.length],
              ["Open cases", cases.filter((c) => c.status !== "closed").length],
              ["Model state", auto.status],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="ops-grid">
            <section className="panel padded">
              <div className="ops-title">
                <h3>Suspicion inbox</h3>
                <label>
                  Residual threshold{" "}
                  <select
                    aria-label="Suspicion threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  >
                    {[90, 95, 99].map((n) => (
                      <option key={n} value={n}>
                        {n}th percentile
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                Exploratory ranking—not a probability or a verified emergency.
              </p>
              {!suspicious.length ? (
                <Empty
                  title={
                    auto.status === "running"
                      ? "XGBoost is processing"
                      : "No flagged events in this selection"
                  }
                >
                  No flags does not establish safety. Check the model status and
                  data dates.
                </Empty>
              ) : (
                <div className="ops-inbox">
                  {suspicious.slice(0, 30).map((e) => (
                    <button
                      className={selected?.id === e.id ? "selected" : ""}
                      key={e.id}
                      onClick={() => setFocus(e)}
                    >
                      <span>
                        <MapPin size={15} />
                        {e.lat.toFixed(3)}, {e.lon.toFixed(3)}
                        <small>
                          {formatUTC(e.lastSeen)} · {fmt(e.maxFrp)} MW
                        </small>
                      </span>
                      <b>
                        {fmt(e.score)}th <ArrowRight size={14} />
                      </b>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="panel padded">
              <span className="eyebrow">SIX SOURCE CATEGORIES</span>
              <h3>Suspicion is a question, not a verdict.</h3>
              <label>
                Inspect event
                <select
                  aria-label="Investigation event"
                  value={selected?.id || ""}
                  onChange={(e) =>
                    setFocus(events.find((v) => v.id === e.target.value))
                  }
                >
                  <option value="" disabled>
                    Select an observation
                  </option>
                  {events.slice(0, 600).map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.lat.toFixed(3)}, {e.lon.toFixed(3)} · {fmt(e.maxFrp)}{" "}
                      MW
                    </option>
                  ))}
                </select>
              </label>
              <div className="ops-classes">
                {categories.map((c, i) => (
                  <div className={c.candidate ? "candidate" : ""} key={c.name}>
                    <span>0{i + 1}</span>
                    <div>
                      <h4>{c.name}</h4>
                      <small>
                        {c.status}
                        {c.candidate ? " · evidence to investigate" : ""}
                      </small>
                      <p>{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                {contextBusy
                  ? "Looking up mapped context…"
                  : "Context availability affects these rule-based hypotheses. XGBoost only estimates FRP; it is not a trained cause classifier."}
              </p>
              <div className="ops-actions">
                <button
                  className="primary"
                  disabled={!selected}
                  onClick={() => createCase(selected)}
                >
                  <Plus size={15} />
                  Create investigation
                </button>
                <button
                  className="secondary"
                  onClick={() => navigate("resources")}
                >
                  Response resources
                </button>
                <button
                  className="secondary"
                  disabled={!selected}
                  onClick={() => onEvidence(selected)}
                >
                  Raw evidence
                </button>
              </div>
            </section>
          </div>
          <section className="panel padded ops-playbook">
            <span className="eyebrow">RECOMMENDED NEXT STEPS</span>
            <div>
              {[
                "Check acquisition time",
                "Inspect model limits",
                "Corroborate local context",
                "Verify public contacts",
                "Record a human decision",
              ].map((s, i) => (
                <span key={s}>
                  <b>0{i + 1}</b>
                  {s}
                </span>
              ))}
            </div>
            <p>
              No autonomous dispatch. Analysts remain responsible for
              verification and appropriate escalation.
            </p>
          </section>
        </>
      )}
      {page === "resources" && (
        <>
          <div className="ops-banner">
            <div>
              <span className="eyebrow">RESPONSE CONTEXT</span>
              <h2>Find the people. Check the infrastructure.</h2>
              <p>
                {lat.toFixed(4)}, {lon.toFixed(4)} ·{" "}
                {selected
                  ? "Selected observation"
                  : "Area centre; select an event in Mission control for local resources"}
              </p>
            </div>
            <button
              className="secondary"
              disabled={contextBusy}
              onClick={() => setContextRevision((n) => n + 1)}
            >
              <RefreshCw size={16} />
              {contextBusy ? "Looking up…" : "Refresh context"}
            </button>
          </div>
          <div className="ops-notice">
            India emergency information:{" "}
            <a href="https://112.gov.in/" target="_blank" rel="noreferrer">
              112 — genuine emergencies only ↗
            </a>
            . This is not a local office number. ThermalGuard does not call or
            dispatch anyone.
          </div>
          {context?.errors?.osm && (
            <div className="ops-notice warning">{context.errors.osm}</div>
          )}
          <div className="ops-grid">
            <section className="panel padded">
              <div className="ops-title">
                <h3>Mapped resources nearby</h3>
                <select
                  aria-label="Resource type"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  <option value="all">All mapped features</option>
                  {Object.entries(featureLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <label className="ops-search">
                <Search size={16} />
                <input
                  placeholder="Search name, hydrant ID or phone"
                  aria-label="Search resources"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="ops-resource-list">
                {(context?.resources || [])
                  .filter(
                    (r) =>
                      (resourceType === "all" || r.type === resourceType) &&
                      `${r.name} ${r.ref} ${r.phone}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <article key={r.id}>
                      <span className="ops-tag">
                        {featureLabels[r.type] || r.type}
                      </span>
                      <h4>{r.name}</h4>
                      <p>
                        {fmt(r.distanceKm, 2)} km straight-line ·{" "}
                        {r.ref
                          ? `Asset ref: ${r.ref}`
                          : "Asset reference not mapped"}
                      </p>
                      <p>
                        {r.phone ? (
                          <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}>
                            <Phone size={12} /> {r.phone} · verify before use
                          </a>
                        ) : (
                          "Public phone not mapped"
                        )}
                      </p>
                      <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                        Inspect OSM source ↗
                      </a>
                    </article>
                  ))}
              </div>
              {!contextBusy && !context?.resources?.length && (
                <Empty title="No mapped inventory returned">
                  This does not mean there are no hydrants or services. Local
                  mapping may be incomplete; consult the authority's verified
                  inventory.
                </Empty>
              )}
              <p>
                {context?.limitation ||
                  "Community mapping is not an official response inventory. Hydrant availability and water pressure are unknown."}
              </p>
              <small>
                Retrieved {formatUTC(context?.fetchedAt)}{" "}
                {context?.cached ? "· cached context" : ""}
              </small>
            </section>
            <div>
              <section className="panel padded">
                <span className="eyebrow">WEATHER CONTEXT</span>
                <h3>
                  <Wind size={19} /> Conditions now—not at the overpass.
                </h3>
                {context?.weather ? (
                  <>
                    <div className="ops-metrics weather">
                      {[
                        [
                          "Temperature",
                          `${fmt(context.weather.temperature_2m)} °C`,
                        ],
                        ["Wind", `${fmt(context.weather.wind_speed_10m)} m/s`],
                        [
                          "Humidity",
                          `${fmt(context.weather.relative_humidity_2m)}%`,
                        ],
                        [
                          "Wind from",
                          `${fmt(context.weather.wind_direction_10m, 0)}°`,
                        ],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span>{k}</span>
                          <strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                    <p>
                      {context.weather.time} UTC · {context.weather.label}
                    </p>
                    <a
                      href="https://open-meteo.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Weather data by Open-Meteo ↗
                    </a>
                  </>
                ) : (
                  <p>
                    {contextBusy
                      ? "Fetching current model output…"
                      : context?.errors?.weather || "Weather unavailable."}
                  </p>
                )}
              </section>
              <section className="panel padded ops-directory">
                <h3>Source-backed public contact directory</h3>
                <p>
                  Saved locally with a named verifier. Not independently
                  verified by ThermalGuard.
                </p>
                {contacts.map((c) => (
                  <article key={c.id}>
                    <h4>
                      {c.name} · {c.role}
                    </h4>
                    <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>
                      {c.phone}
                    </a>
                    <p>
                      {c.lat}, {c.lon} · checked {c.verifiedOn} by{" "}
                      {c.verifiedBy}
                    </p>
                    <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                      Verification source ↗
                    </a>
                  </article>
                ))}
                {!contacts.length && (
                  <p>
                    No verified-by-user contacts saved. Add public office
                    details from a reliable directory below.
                  </p>
                )}
                <details>
                  <summary>Add a sourced public contact</summary>
                  <form onSubmit={addContact} className="ops-contact-form">
                    {[
                      ["name", "Office / contact name", "text"],
                      ["role", "Administrative role", "text"],
                      ["phone", "Public telephone", "tel"],
                      ["sourceUrl", "Public HTTPS source", "url"],
                      ["verifiedBy", "Verified by", "text"],
                      ["verifiedOn", "Verification date", "date"],
                      ["lat", "Latitude", "number"],
                      ["lon", "Longitude", "number"],
                    ].map(([name, label, type]) => (
                      <label key={name}>
                        {label}
                        <input
                          name={name}
                          type={type}
                          step={type === "number" ? "any" : undefined}
                          required
                          maxLength={name === "sourceUrl" ? 500 : 120}
                          defaultValue={
                            name === "lat"
                              ? lat
                              : name === "lon"
                                ? lon
                                : name === "verifiedOn"
                                  ? new Date().toISOString().slice(0, 10)
                                  : undefined
                          }
                        />
                      </label>
                    ))}
                    <button className="primary">Save public contact</button>
                  </form>
                </details>
              </section>
            </div>
          </div>
        </>
      )}
      {page === "trends" && (
        <>
          <div className="ops-banner">
            <div>
              <span className="eyebrow">ACTIVITY OBSERVATORY</span>
              <h2>Measure change. Don't invent the cause.</h2>
              <p>
                {area.name} · {source}. Archive builds from real retrievals;
                historical CSVs remain separate.
              </p>
              <p>
                For a facility question, first choose a narrowly bounded Watch
                area. A regional trend cannot be assigned to one factory.
              </p>
              <button className="text-button" onClick={() => navigate("areas")}>
                Define a watch area →
              </button>
            </div>
            <Activity size={42} />
          </div>
          <div className="panel padded">
            <div className="ops-title">
              <label>
                History provenance
                <select
                  aria-label="History provenance"
                  value={provenance}
                  onChange={(e) => setProvenance(e.target.value)}
                >
                  <option value="nasa">NASA retrieval archive</option>
                  <option value="user-import">
                    User-imported history · unverified
                  </option>
                </select>
              </label>
              <label>
                Import historical FIRMS CSV
                <input
                  aria-label="Import historical FIRMS CSV"
                  type="file"
                  accept=".csv"
                  onChange={importHistory}
                  disabled={historyBusy}
                />
              </label>
            </div>
            <p>
              Required: latitude, longitude, frp, acq_date, acq_time. Maximum 2
              MB / 15,000 rows. Choose the correct satellite above; imports
              never train XGBoost.
            </p>
          </div>
          {historyBusy ? (
            <Empty title="Reading measured history…">
              No synthetic months are being generated.
            </Empty>
          ) : !history?.months.length ? (
            <Empty title="Not enough history yet">
              Retrieve live observations over time, or import historical FIRMS
              CSVs. A few days cannot establish a multi-month factory trend.
            </Empty>
          ) : (
            <>
              <div className="ops-grid">
                <section className="panel padded">
                  <h3>Monthly observed thermal signal</h3>
                  <p>
                    Bars: median FRP. Counts and observed days describe
                    available positive detections, not full monitoring coverage.
                  </p>
                  <div className="ops-months">
                    {history.months.map((m) => (
                      <div key={m.month}>
                        <span>{m.month}</span>
                        <meter
                          min="0"
                          max={Math.max(
                            1,
                            ...history.months.map((a) => a.medianFrp),
                          )}
                          value={m.medianFrp}
                        />
                        <b>{fmt(m.medianFrp)} MW</b>
                        <small>
                          {m.count} detections · {m.observedDays} observed days
                        </small>
                      </div>
                    ))}
                  </div>
                  <p>
                    {history.truncated
                      ? "Limited to the latest 50,000 records; older coverage omitted."
                      : `${history.total} archived observations in this extent.`}
                  </p>
                </section>
                <section className="panel padded">
                  <span className="eyebrow">TWO-PERIOD COMPARISON</span>
                  <h3>Thermal change ≠ production change.</h3>
                  <div className="ops-form-grid">
                    {[
                      ["Baseline month", baseMonth, setBaseMonth],
                      ["Comparison month", recentMonth, setRecentMonth],
                    ].map(([label, value, setter]) => (
                      <label key={label}>
                        {label}
                        <select
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                        >
                          <option value="">Choose a month</option>
                          {history.months.map((m) => (
                            <option key={m.month}>{m.month}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <strong className="ops-change">
                    {percent === null
                      ? "Insufficient evidence"
                      : `${percent >= 0 ? "+" : ""}${fmt(percent)}%`}
                  </strong>
                  <p>
                    {percent === null
                      ? "Choose ordered months with at least 10 detections on 3 days each and a nonzero baseline."
                      : "Change in observed median FRP only. Lower heat may reflect operations, efficiency, maintenance, clouds, season or sampling—not a measured reduction in production."}
                  </p>
                  <p>{history.limitation}</p>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        {
                          ...history,
                          comparison: {
                            baseMonth,
                            recentMonth,
                            thermalChangePercent: percent,
                            productionChangePercent: null,
                          },
                        },
                        "thermalguard-thermal-history.json",
                      )
                    }
                  >
                    <Download size={15} />
                    Export trend evidence
                  </button>
                </section>
              </div>
            </>
          )}
        </>
      )}
      {page === "cases" && (
        <>
          <div className="ops-banner">
            <div>
              <span className="eyebrow">CASE DESK</span>
              <h2>A decision trail, not a disappearing alert.</h2>
              <p>
                Assign, verify, document and revisit investigations. No
                automated dispatch.
              </p>
            </div>
            <button className="secondary" onClick={() => navigate("mission")}>
              Find an observation <ArrowRight size={16} />
            </button>
          </div>
          <section className="ops-collaboration" aria-label="Shared local case activity">
            <div className="ops-collaboration-head">
              <div>
                <span className="eyebrow">SHARED LOCAL WORKSPACE</span>
                <h3>
                  <Users size={18} /> Team pulse
                </h3>
                <p>
                  Persisted local case updates, with an optional Firebase realtime mirror. This tab checks the local server every 30 seconds; editor names are self-declared, not authenticated presence.
                </p>
              </div>
              <div className="ops-collaboration-actions">
                <small>
                  {lastSynced
                    ? `Last checked ${formatUTC(lastSynced)}`
                    : "Checking shared records…"}
                </small>
                <button
                  className="secondary"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  <RefreshCw size={14} /> Refresh updates
                </button>
                {firebaseConfigured() && cloudStatus.state !== "live" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setCloudStatus({ state: "connecting" });
                      setCloudRevision((value) => value + 1);
                    }}
                  >
                    Retry Firebase connection
                  </button>
                )}
              </div>
            </div>
            <div className={`firebase-status ${cloudStatus.state}`} role="status">
              <span />
              {cloudStatus.state === "live" && "Firebase realtime activity connected"}
              {cloudStatus.state === "connecting" && "Connecting Firebase realtime activity…"}
              {cloudStatus.state === "unconfigured" && "Firebase is not configured in this build; local Case desk remains active."}
              {cloudStatus.state === "error" && `Firebase sync unavailable: ${cloudStatus.message}`}
              {cloudStatus.state === "idle" && "Firebase realtime activity is ready to connect."}
            </div>
            <div className="ops-collaboration-summary">
              <span>
                <b>{cases.filter((item) => item.status !== "closed").length}</b> open cases
              </span>
              <span>
                <b>{activeOwners.length}</b> assigned owner{activeOwners.length === 1 ? "" : "s"}
              </span>
              <span>
                {activeOwners.length ? activeOwners.join(" · ") : "No owner assigned yet"}
              </span>
            </div>
            {teamPulse.length ? (
              <div className="ops-pulse-list">
                {teamPulse.map((entry, index) => (
                  <div key={`${entry.caseId}-${entry.at}-${index}`}>
                    <span>{formatUTC(entry.at)}</span>
                    <p>
                      <b>{entry.actor || entry.owner || "Workspace user"}</b> · {entry.text}
                    </p>
                    <small>{entry.title}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ops-pulse-empty">Create a case to begin a persisted team activity trail.</p>
            )}
            {firebaseOnlyPulse.length > 0 && (
              <div className="firebase-pulse">
                <span className="eyebrow">FIREBASE REALTIME MIRROR</span>
                {firebaseOnlyPulse.slice(0, 4).map((entry) => (
                  <div key={entry.id}>
                    <small>{formatUTC(entry.occurredAt)}</small>
                    <p><b>{entry.actor}</b> · {entry.text}</p>
                    <small>{entry.caseTitle}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
          <WorkloadBoard
            board={workload}
            status={caseStatus}
            owner={caseOwner}
            onStatus={setCaseStatus}
            onOwner={setCaseOwner}
            filtered={caseFiltersActive}
            onClear={clearCaseFilters}
          />
          <div className="case-finder" role="search">
            <label>
              Search saved cases
              <input
                type="search"
                placeholder="Title, owner, note or coordinates"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
              />
            </label>
            <small>Searches saved record fields, not live satellite data.</small>
            {caseSearch && (
              <button className="text-button" onClick={() => setCaseSearch("")}>Clear search</button>
            )}
          </div>
          <div className="ops-title">
            <span>{visibleCases.length} of {cases.length} saved cases</span>
            <label className="case-order">
              Order cases
              <select value={caseOrder} onChange={(e) => setCaseOrder(e.target.value)}>
                <option value="recent">Updated recently</option>
                <option value="open">Open work first</option>
                <option value="checks">Least checks recorded</option>
              </select>
            </label>
            <label>
              Filter status
              <select
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value)}
              >
                <option value="all">All cases</option>
                {CASE_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {!cases.length ? (
            <Empty title="Your first investigation starts with evidence">
              Open Mission control, select an observed event and create an
              investigation.
            </Empty>
          ) : !visibleCases.length ? (
            <Empty title="No cases match this board filter">
              Clear the workload board filters to restore every saved investigation.
            </Empty>
          ) : (
            <div className="ops-grid">
              {visibleCases.map((c) => (
                  <CaseEditor
                    key={`${c.id}:${c.updatedAt}`}
                    item={c}
                    onSave={saveCase}
                    editorName={manager?.name || "Workspace user"}
                    onEvidence={onEvidence}
                    onMission={openMissionEvent}
                    currentEvent={activeEventsById.get(c.event.id)}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
