import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowUpRight,
  Download,
  MapPin,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { api, CLASSES, formatUTC, download, colors } from "./client";
import { Sparkline } from "./Charts";

export default function EvidenceDrawer({ event, meta, onClose, onSaved }) {
  const ref = useRef(null);
  const [status, setStatus] = useState(event.review?.status || "deferred"),
    [classification, setClassification] = useState(
      event.review?.classification || CLASSES.at(-1),
    );
  const [note, setNote] = useState(""),
    [analyst, setAnalyst] = useState(
      localStorage.getItem("tg_analyst_name") || "",
    );
  const [history, setHistory] = useState([]),
    [context, setContext] = useState(null),
    [contextError, setContextError] = useState(""),
    [contextLoading, setContextLoading] = useState(false);
  const [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const controller = new AbortController();
    api(`/events/${event.id}/reviews`, { signal: controller.signal })
      .then((d) => setHistory(d.reviews))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      controller.abort();
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [event.id]);
  function keyDown(e) {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const focus = [
        ...ref.current.querySelectorAll(
          "button:not(:disabled),a,input,select,textarea",
        ),
      ];
      const first = focus[0],
        last = focus.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const d = await api(`/events/${event.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ status, classification, note, analyst }),
      });
      setHistory(d.reviews);
      localStorage.setItem("tg_analyst_name", analyst);
      setMessage("Decision saved to the audit trail.");
      setNote("");
      onSaved(event.id, d.reviews[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function loadContext() {
    setContextLoading(true);
    setContextError("");
    try {
      setContext(await api(`/context?lat=${event.lat}&lon=${event.lon}`));
    } catch (e) {
      setContextError(e.message);
    } finally {
      setContextLoading(false);
    }
  }
  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={ref}
        tabIndex={-1}
        onKeyDown={keyDown}
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
      >
        <header className="drawer-header">
          <div>
            <span className="eyebrow">EVENT INTELLIGENCE</span>
            <h2 id="evidence-title">Evidence & review</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close evidence"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <div className="drawer-scroll">
          <div className="event-identity">
            <span className="badge" style={{ color: colors[event.priority] }}>
              {event.priority} review priority
            </span>
            <span className="mono">{event.id.slice(-8).toUpperCase()}</span>
          </div>
          <h3 className="coordinate-title">
            {event.lat.toFixed(4)}° N, {event.lon.toFixed(4)}° E
          </h3>
          <p className="muted">
            {formatUTC(event.lastSeen)}
            <br />
            {meta?.mode === "replay"
              ? "Synthetic presentation scenario"
              : `${event.source} · VIIRS thermal observations`}
          </p>
          <div className="evidence-stats">
            <div>
              <span>Peak FRP</span>
              <strong>
                {event.maxFrp.toFixed(1)} <small>MW</small>
              </strong>
            </div>
            <div>
              <span>Detections</span>
              <strong>{event.detections.length}</strong>
            </div>
            <div>
              <span>Sensor confidence</span>
              <strong className="capitalize">{event.confidence}</strong>
            </div>
          </div>
          <section className="drawer-section">
            <h3>Why this event is in your queue</h3>
            <ul className="evidence-reasons">
              {event.reasons.map((r) => (
                <li key={r}>
                  <span />
                  {r}
                </li>
              ))}
            </ul>
            <div className="notice">
              Priority uses transparent rules, not a calibrated fire
              probability. Current source class:{" "}
              <strong>
                {event.review?.classification || "Uncertain / Other"}
              </strong>
              .
            </div>
          </section>
          <section className="drawer-section">
            <div className="section-title">
              <h3>Observed thermal signal</h3>
              <span className="mono">FRP / MW</span>
            </div>
            <div className="signal-chart">
              <Sparkline
                values={event.detections.map((d) => d.frp)}
                height={75}
                color="#ff9559"
              />
            </div>
            <p className="small muted">
              {event.detections.length > 1
                ? "Acquisition-ordered samples within this grid cell and UTC day. Not a continuous time series."
                : "Only one observation. There is not enough evidence to establish a trend."}
            </p>
            <div className="observations">
              {event.detections.map((d) => (
                <div key={d.id}>
                  <span>{formatUTC(d.acquiredAt)}</span>
                  <strong>{d.frp.toFixed(1)} MW</strong>
                  <span>{d.daynight === "N" ? "Night" : "Day"}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="drawer-section">
            <div className="section-title">
              <h3>
                <MapPin size={16} /> Facility context
              </h3>
              <button
                className="text-button"
                disabled={contextLoading || meta?.mode === "replay"}
                onClick={loadContext}
              >
                {contextLoading
                  ? "Querying…"
                  : context
                    ? "Refresh"
                    : "Load OSM context"}
                <ArrowUpRight size={14} />
              </button>
            </div>
            {contextError && (
              <p className="inline-error" role="alert">
                {contextError}
              </p>
            )}
            {context ? (
              <>
                {context.facilities.length ? (
                  context.facilities.map((f) => (
                    <a
                      className="facility"
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div>
                        <strong>{f.name}</strong>
                        <span>{f.type}</span>
                      </div>
                      <ArrowUpRight size={16} />
                    </a>
                  ))
                ) : (
                  <p className="muted small">
                    No mapped industrial features returned within 1.5 km. This
                    is not proof that no facility exists.
                  </p>
                )}
                <p className="small muted">
                  {context.limitation}
                  <br />
                  Retrieved {formatUTC(context.fetchedAt)}. © OpenStreetMap
                  contributors.
                </p>
              </>
            ) : (
              <p className="small muted">
                {meta?.mode === "replay"
                  ? "Facility queries are disabled for synthetic scenarios."
                  : "Query mapped industrial land, plants and facilities within 1.5 km. Facility overlap, land cover and verified ground truth are not yet available."}
              </p>
            )}
          </section>
          <section className="drawer-section">
            <h3>
              <ShieldCheck size={17} /> Analyst decision
            </h3>
            <p className="small muted">
              A review records your interpretation. It does not dispatch an
              alert or overwrite the NASA observation.
            </p>
            <form onSubmit={save} className="review-form">
              <label>
                Decision
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="deferred">Defer · more evidence needed</option>
                  <option value="confirmed">
                    Confirm · event warrants follow-up
                  </option>
                  <option value="rejected">
                    Reject · no follow-up required
                  </option>
                </select>
              </label>
              <label>
                Source classification
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                >
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Analyst name
                <input
                  required
                  maxLength={80}
                  value={analyst}
                  onChange={(e) => setAnalyst(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
              <label>
                Evidence / rationale
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What supports your decision? Note missing evidence."
                />
              </label>
              <button className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save review"}
                <Check size={16} />
              </button>
              {message && (
                <p className="success" role="status">
                  {message}
                </p>
              )}
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
          <section className="drawer-section">
            <h3>
              <Clock size={16} /> Audit trail{" "}
              <span className="muted">({history.length})</span>
            </h3>
            {history.length ? (
              history.map((h) => (
                <div className="audit-item" key={h.id}>
                  <div>
                    <strong>{h.analyst}</strong>
                    <span className="badge">{h.status}</span>
                  </div>
                  <p>{h.note}</p>
                  <span className="small muted">
                    {h.classification} · {formatUTC(h.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted small">
                No decisions yet. The first saved review starts this event’s
                history.
              </p>
            )}
          </section>
          <section className="drawer-section provenance">
            <h3>Source lineage</h3>
            <p>
              Processing: {event.model}
              <br />
              Retrieved: {formatUTC(meta?.fetchedAt)}
              <br />
              Product version:{" "}
              {[...new Set(event.detections.map((d) => d.version))].join(", ")}
              <br />
              Approximate 1 km grid / UTC day. Adjacent grid cells may split one
              physical event.
            </p>
            {meta?.sourceUrl && (
              <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
                Open NASA source <ArrowUpRight size={14} />
              </a>
            )}
            <button
              className="secondary"
              onClick={() => download([event], "geojson", meta)}
            >
              <Download size={15} /> Export evidence
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}
