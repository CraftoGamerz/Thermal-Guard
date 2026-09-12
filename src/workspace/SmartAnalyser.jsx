import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Database,
  Download,
  FileUp,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import { api, formatUTC, STATIC_DEMO } from "./client";
import EvidenceDrawer from "./EvidenceDrawer";
import "./real-analyser.css";

const number = (v, digits = 2) =>
  Number.isFinite(v)
    ? v.toLocaleString("en-GB", { maximumFractionDigits: digits })
    : "—";
const duration = (ms) => `${number(ms / 1000)} s`;
const featureNames = {
  I4_K: "I4 brightness (K)",
  I5_K: "I5 brightness (K)",
  scan_km: "Pixel scan (km)",
  track_km: "Pixel track (km)",
  latitude: "Latitude",
  longitude: "Longitude",
  UTC_hour_sin: "UTC time · sine",
  UTC_hour_cos: "UTC time · cosine",
  daylight: "Day / night",
};

function exportReport(report, type) {
  let content = JSON.stringify(report, null, 2);
  if (type === "csv") {
    const records = report.rows.map((r) => ({
      detection_id: r.id,
      event_id: r.eventId,
      acquisition_utc: r.acquiredAt,
      latitude: r.lat,
      longitude: r.lon,
      observed_frp_mw: r.observedFrp,
      modeled_frp_mw: r.expectedFrp,
      excess_mw: r.excessMw,
      residual_percentile_not_probability: r.residualPercentile,
      evaluation_membership: r.split,
      prior_5km_detections: r.baseline.priorDetections,
      prior_observed_days: r.baseline.observedDays,
      prior_median_frp_mw: r.baseline.medianFrp,
      flags: r.flags.join("; "),
      source: r.source,
      input_provenance: report.provenance.input.provider,
      source_url: report.provenance.input.sourceUrl,
      retrieved_at: report.provenance.input.fetchedAt,
      training_source_url: report.provenance.training.sourceUrl,
      training_retrieved_at: report.provenance.training.fetchedAt,
      stale_training: report.provenance.training.stale,
      stale_input: report.provenance.input.stale,
      model: report.model.version,
      training_digest: report.model.trainingDigest,
      run_id: report.runId,
    }));
    const keys = Object.keys(records[0]);
    const cell = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    content = [
      keys.join(","),
      ...records.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n");
  }
  const url = URL.createObjectURL(
    new Blob([content], {
      type: type === "csv" ? "text/csv;charset=utf-8" : "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `thermalguard-real-analysis-${report.runId}.${type}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Scatter({ rows }) {
  const sample = rows.filter(
    (_, i) => i % Math.max(1, Math.ceil(rows.length / 500)) === 0,
  );
  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(r.observedFrp, r.expectedFrp)),
  );
  const scale = (n) => Math.log1p(n) / Math.log1p(max);
  return (
    <figure className="ra-scatter">
      <svg
        viewBox="0 0 480 250"
        role="img"
        aria-label={`Observed versus modeled FRP, logarithmic axes. ${sample.length} plotted observations; diagonal indicates agreement. Full data in the evidence table.`}
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1="52"
              x2="455"
              y1={207 - t * 180}
              y2={207 - t * 180}
              stroke="#283c43"
            />
            <text x="44" y={211 - t * 180} textAnchor="end">
              {number(Math.expm1(t * Math.log1p(max)), 1)}
            </text>
            <text x={52 + t * 403} y="225" textAnchor="middle">
              {number(Math.expm1(t * Math.log1p(max)), 1)}
            </text>
          </g>
        ))}
        <line
          x1="52"
          y1="207"
          x2="455"
          y2="27"
          stroke="#889b9f"
          strokeDasharray="5 5"
        />
        {sample.map((r) => (
          <circle
            key={r.id}
            cx={52 + scale(r.expectedFrp) * 403}
            cy={207 - scale(r.observedFrp) * 180}
            r="3"
            fill={r.unusual ? "#ffb76b" : "#59d8e6"}
            opacity="0.65"
          >
            <title>{`${r.id}: observed ${number(r.observedFrp)} MW; modeled ${number(r.expectedFrp)} MW`}</title>
          </circle>
        ))}
        <text x="252" y="245" textAnchor="middle">
          Modeled FRP · MW (log scale)
        </text>
        <text transform="translate(13 125) rotate(-90)" textAnchor="middle">
          Observed FRP · MW
        </text>
      </svg>
      <figcaption>
        Cyan: observations · Amber: unusually high residuals. Above the diagonal
        means observed FRP exceeds the estimate. {sample.length}/{rows.length}{" "}
        points shown.
      </figcaption>
    </figure>
  );
}

export default function SmartAnalyser({
  feed,
  loading,
  area,
  setArea,
  areas,
  source,
  days,
  mode,
  onSavedReview,
}) {
  const [input, setInput] = useState("nasa"),
    [file, setFile] = useState(null),
    [csv, setCsv] = useState("");
  const [job, setJob] = useState(null),
    [jobId, setJobId] = useState(null),
    [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(""),
    [report, setReport] = useState(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState(null);
  const [evidence, setEvidence] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (detail) document.getElementById("analysis-input-detail")?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [detail]);
  const blocked = STATIC_DEMO || mode === "replay";
  const busy = submitting || ["running", "queued"].includes(job?.status);

  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        const value = await api(`/analysis/jobs/${jobId}`, {
          signal: controller.signal,
        });
        setJob(value);
        if (value.status === "completed") {
          setReport(value.result);
          setJobId(null);
        } else if (value.status === "failed") {
          setError(value.error);
          setJobId(null);
        } else timer = setTimeout(poll, 1000);
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(`Status check failed: ${e.message}`);
          setJob((j) => ({ ...j, status: "connection-error" }));
        }
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobId, retry]);

  async function run() {
    setError("");
    setReport(null);
    setDetail(null);
    setPage(0);
    setSubmitting(true);
    try {
      const value = await api("/analysis/jobs", {
        method: "POST",
        body: JSON.stringify({
          source,
          days: Number(days),
          bbox: area.bbox,
          ...(input === "csv" ? { csv } : {}),
        }),
      });
      setJob(value);
      setJobId(value.id);
    } catch (e) {
      setError(e.message);
      setJob(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function upload(e) {
    const chosen = e.target.files?.[0];
    setError("");
    setCsv("");
    setFile(null);
    setReport(null);
    setDetail(null);
    if (!chosen) return;
    if (chosen.size > 2 * 1024 * 1024) {
      setError("Choose a FIRMS CSV no larger than 2 MB.");
      return;
    }
    try {
      setCsv(await chosen.text());
      setFile(chosen.name);
    } catch {
      setError("Could not read this file. Choose it again.");
    }
  }

  const filtered = useMemo(
    () =>
      (report?.rows || []).filter(
        (r) =>
          (filter === "all" ||
            (filter === "unusual" && r.unusual) ||
            (filter === "held-out" && r.split === "held-out day") ||
            (filter === "limited" && r.flags.length > 0)) &&
          `${r.id} ${r.lat} ${r.lon} ${r.acquiredAt}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [report, filter, search],
  );
  const rows = filtered.slice(page * 25, (page + 1) * 25);
  const model = report?.model;
  const stale =
    report &&
    (report.provenance.training.stale || report.provenance.input.stale);
  const selectedEvent = report?.events.find((e) => e.id === evidence);
  const statusText = job?.stage || "Ready for a real backend run";

  return (
    <div className="real-analyser">
      <section className="ra-hero">
        <div className="ra-heading">
          <div className="ra-symbol">
            <BrainCircuit size={26} />
          </div>
          <div>
            <span className="eyebrow">MEASURED DATA / EXPLAINABLE MODEL</span>
            <h2>From thermal signals to better questions.</h2>
            <p>
              Real NASA observations. Server-side XGBoost. Evidence you can
              inspect.
            </p>
          </div>
        </div>
        <div className="ra-controls">
          <label>
            Monitoring extent
            <select
              aria-label="Monitoring extent"
              value={area.id}
              disabled={busy}
              onChange={(e) =>
                setArea(areas.find((a) => a.id === e.target.value))
              }
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Analysis input
            <select
              aria-label="Analysis input"
              value={input}
              disabled={busy || blocked}
              onChange={(e) => {
                setInput(e.target.value);
                setReport(null);
                setDetail(null);
              }}
            >
              <option value="nasa">NASA extent / current window</option>
              <option value="csv">Upload measured FIRMS CSV</option>
            </select>
          </label>
          <button
            className="primary"
            onClick={run}
            disabled={
              busy ||
              blocked ||
              (input === "nasa" && loading) ||
              (input === "csv" && !csv)
            }
          >
            {busy ? (
              <RefreshCw size={17} className="spin" />
            ) : (
              <BrainCircuit size={17} />
            )}
            {busy
              ? "Processing real observations…"
              : "Run real XGBoost analysis"}
          </button>
        </div>
        <div className="ra-provenance">
          <span>
            <Database size={14} /> {source} ·{" "}
            {days === "1" ? "24 hours" : `${days} days`} · rectangular extent
          </span>
          <span>{feed?.meta?.detectionCount ?? "—"} feed detections</span>
          <span>Training: seven-day South Asia feed</span>
        </div>
        {input === "csv" && (
          <div className="ra-upload">
            <label>
              <FileUp size={17} /> FIRMS CSV · maximum 2 MB
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={upload}
                disabled={busy}
              />
            </label>
            <p>
              {file || "Your CSV is scored, never used to train the model."}{" "}
              Required: latitude, longitude, frp, acq_date, acq_time,
              bright_ti4, bright_ti5, scan, track, daynight. Set the correct
              sensor above. Uploaded source provenance is unverified; the full
              file is scored, not cropped to the selected extent.
            </p>
          </div>
        )}
      </section>

      {blocked ? (
        <div className="ra-notice" role="status">
          <Info size={19} />
          <div>
            <strong>
              Real analysis requires the full-stack application in Live mode.
            </strong>
            <p>
              {STATIC_DEMO
                ? "This GitHub Pages build cannot execute Node or Python. Run npm run dev locally after installing the model requirements. This page will not manufacture XGBoost results."
                : "Switch from Demo replay to Live NASA above. Synthetic scenarios cannot be scored as real evidence."}
            </p>
          </div>
        </div>
      ) : (
        <div className="ra-process" aria-live="polite">
          <Activity size={17} />
          <span>{statusText}</span>
          {job && <span>{duration(job.elapsedMs || 0)} measured elapsed</span>}
          <small>
            Fetch → validate → train → evaluate → score. No artificial delay.
          </small>
        </div>
      )}
      {error && (
        <div className="ra-notice ra-warning" role="alert">
          <Info size={18} />
          <div>
            {error}
            {jobId && !busy && (
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  setRetry((r) => r + 1);
                }}
              >
                Retry status check
              </button>
            )}
          </div>
        </div>
      )}
      {!report && !busy && !blocked && (
        <section className="ra-intro">
          <h3>What will this analysis tell you?</h3>
          <div className="ra-grid three">
            <div>
              <span>01 / OBSERVE</span>
              <h4>What did VIIRS measure?</h4>
              <p>
                FRP, thermal brightness, coordinates, pixel size and UTC
                acquisition time. No guessed weather or facility names.
              </p>
            </div>
            <div>
              <span>02 / COMPARE</span>
              <h4>Is the heat unusual for these inputs?</h4>
              <p>
                The model estimates FRP from measured inputs and ranks its
                residual against a separate calibration day.
              </p>
            </div>
            <div>
              <span>03 / INVESTIGATE</span>
              <h4>What needs human corroboration?</h4>
              <p>
                Check nearby prior detections, inspect raw evidence and record a
                review. Anomaly does not establish cause or danger.
              </p>
            </div>
          </div>
        </section>
      )}

      {report && (
        <>
          {(stale || report.provenance.input.mode === "upload") && (
            <div className="ra-notice ra-warning">
              <Info size={18} />
              <div>
                {stale && (
                  <p>
                    NASA refresh failed for part of this run. A dated,
                    previously retrieved real snapshot was used; check source
                    timestamps.
                  </p>
                )}
                {report.provenance.input.mode === "upload" && (
                  <p>
                    Scoring a user-uploaded CSV. Its provenance is unverified;
                    the model was trained only on NASA data.
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="ra-summary">
            {[
              [
                "Observations scored",
                number(report.rows.length),
                "Individual detections, not incidents",
              ],
              [
                "Unusual excess",
                number(report.rows.filter((r) => r.unusual).length),
                "≥95th residual percentile; not hazard probability",
              ],
              [
                "Held-out error · MAE",
                `${number(model.metrics.maeMw)} MW`,
                `${model.test.count} observations on ${model.test.day}`,
              ],
              [
                "Actual processing time",
                duration(report.timings.totalMs),
                `NASA ${duration(report.timings.nasaFetchMs)} · worker ${duration(report.timings.workerMs)}`,
              ],
            ].map(([label, value, caption]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{caption}</small>
              </div>
            ))}
          </div>
          <div className="ra-grid two">
            <section className="panel padded">
              <div className="ra-section-title">
                <span className="eyebrow">MODEL CARD</span>
                <span className="ra-tag">
                  {model.library} · {model.trees} trees
                </span>
              </div>
              <h3>A measured benchmark, not a confidence claim.</h3>
              <div className="ra-split">
                {[
                  [
                    "TRAIN",
                    `${model.train.from} → ${model.train.to}`,
                    model.train.count,
                  ],
                  ["CALIBRATE", model.calibration.day, model.calibration.count],
                  ["TEST", model.test.day, model.test.count],
                ].map(([label, date, count]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{number(count)}</strong>
                    <small>{date}</small>
                  </div>
                ))}
              </div>
              <dl className="ra-values">
                <div>
                  <dt>Model mean absolute error</dt>
                  <dd>{number(model.metrics.maeMw)} MW</dd>
                </div>
                <div>
                  <dt>Training-median baseline error</dt>
                  <dd>{number(model.medianBaseline.maeMw)} MW</dd>
                </div>
                <div>
                  <dt>Model root mean square error</dt>
                  <dd>{number(model.metrics.rmseMw)} MW</dd>
                </div>
              </dl>
              <p className={model.beatsMedianMae ? "ra-positive" : "ra-amber"}>
                {model.beatsMedianMae
                  ? "Lower error than the median baseline on this held-out day."
                  : "Did not beat the median baseline on this held-out day. Treat the model as experimental."}
              </p>
              <p className="ra-caption">
                Fixed settings; final UTC day is excluded from training and
                calibration and may be incomplete. This is a temporal test, not
                independent incident validation.
              </p>
            </section>
            <section className="panel padded">
              <span className="eyebrow">OBSERVED × MODELED</span>
              <h3>Where does the signal diverge?</h3>
              <Scatter rows={report.rows} />
            </section>
          </div>
          <section className="panel padded ra-evidence">
            <div className="ra-section-title">
              <div>
                <span className="eyebrow">DETECTION-LEVEL EVIDENCE</span>
                <h3>Inspect the observations behind each score.</h3>
              </div>
              <div className="ra-actions">
                <button
                  className="secondary"
                  onClick={() => exportReport(report, "csv")}
                >
                  <Download size={15} />
                  Analysis CSV
                </button>
                <button
                  className="secondary"
                  onClick={() => exportReport(report, "json")}
                >
                  <Download size={15} />
                  Full report JSON
                </button>
              </div>
            </div>
            <div className="ra-table-controls">
              <label>
                <Search size={15} />
                <input
                  aria-label="Search analysis observations"
                  placeholder="Search coordinates, UTC date or ID"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <select
                aria-label="Analysis evidence filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All observations</option>
                <option value="unusual">Unusual excess only</option>
                <option value="held-out">Held-out day only</option>
                <option value="limited">Outside training range</option>
              </select>
            </div>
            <p className="ra-caption">
              FRP is fire radiative power, not air temperature. The residual
              percentile is an empirical rank, not a probability. Earlier-period
              scores are not held-out validation.
            </p>
            <div className="ra-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Observation / UTC</th>
                    <th>
                      Observed
                      <br />
                      MW
                    </th>
                    <th>
                      Modeled
                      <br />
                      MW
                    </th>
                    <th>
                      Residual
                      <br />
                      percentile
                    </th>
                    <th>
                      Earlier nearby
                      <br />
                      history
                    </th>
                    <th>
                      Evaluation
                      <br />
                      membership
                    </th>
                    <th>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>
                          {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                        </strong>
                        <small>{formatUTC(r.acquiredAt)}</small>
                        <small>{r.confidence} sensor confidence</small>
                      </td>
                      <td>{number(r.observedFrp)}</td>
                      <td>{number(r.expectedFrp)}</td>
                      <td>
                        <span className={`ra-tag ${r.unusual ? "amber" : ""}`}>
                          {number(r.residualPercentile, 1)}th
                        </span>
                        <small>
                          {r.unusual
                            ? "Unusual excess"
                            : "No high residual flag"}
                        </small>
                      </td>
                      <td>
                        {number(r.baseline.priorDetections)} detections
                        <small>
                          {r.baseline.observedDays} observed days · 5 km
                        </small>
                        <small>Median {number(r.baseline.medianFrp)} MW</small>
                      </td>
                      <td>
                        {r.split}
                        <small className={r.flags.length ? "ra-amber" : ""}>
                          {r.flags.length
                            ? `${r.flags.length} quality / range warnings`
                            : "Within feature ranges"}
                        </small>
                      </td>
                      <td>
                        <button
                          className="secondary"
                          onClick={() => setDetail(r)}
                        >
                          Inputs
                        </button>
                        {r.eventId && (
                          <button
                            className="text-button"
                            onClick={() => setEvidence(r.eventId)}
                          >
                            Review evidence
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="ra-empty">No observations match this filter.</p>
              )}
            </div>
            <div className="ra-pagination">
              <span>
                {number(filtered.length)} matching observations · page{" "}
                {page + 1} of {Math.max(1, Math.ceil(filtered.length / 25))}
              </span>
              <div>
                <button
                  className="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="secondary"
                  disabled={(page + 1) * 25 >= filtered.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
          {detail && (
            <section
              id="analysis-input-detail"
              className="panel padded ra-detail"
              aria-label="Selected observation inputs"
            >
              <div className="ra-section-title">
                <div>
                  <span className="eyebrow">MEASUREMENTS / {detail.id}</span>
                  <h3>Actual inputs, not regional assumptions.</h3>
                </div>
                <button className="secondary" onClick={() => setDetail(null)}>
                  Close inputs
                </button>
              </div>
              <div className="ra-grid two">
                <dl className="ra-values">
                  {Object.entries(detail.features).map(([key, value]) => (
                    <div key={key}>
                      <dt>{featureNames[key]}</dt>
                      <dd>{number(value, 4)}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h4>Largest model contributions</h4>
                  {detail.contributions.map((c) => (
                    <p key={c.feature}>
                      {featureNames[c.feature]}{" "}
                      <strong>
                        {c.logContribution >= 0 ? "+" : ""}
                        {number(c.logContribution, 3)}
                      </strong>
                    </p>
                  ))}
                  <p className="ra-caption">
                    Exact tree contributions to the predicted log(1 + FRP), not
                    causal explanations or risk percentages.
                  </p>
                  <p>
                    Earlier nearby median: {number(detail.baseline.medianFrp)}{" "}
                    MW. Median absolute deviation:{" "}
                    {number(detail.baseline.madFrp)} MW. At least three prior
                    detections required.
                  </p>
                  {detail.flags.map((flag) => (
                    <p className="ra-amber" key={flag}>
                      {flag}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          )}
          <div className="ra-grid two">
            <section className="panel padded">
              <span className="eyebrow">FEATURE IMPORTANCE</span>
              <h3>What this model used.</h3>
              {model.importance.map((item) => (
                <div className="ra-importance" key={item.feature}>
                  <span>{featureNames[item.feature]}</span>
                  <meter
                    min="0"
                    max="1"
                    value={item.gainShare}
                    aria-label={`${featureNames[item.feature]} training gain share`}
                  />
                  <strong>{number(item.gainShare * 100, 1)}%</strong>
                </div>
              ))}
              <p className="ra-caption">
                Normalized training gain, not causal importance. Observed FRP is
                the target and is never an input feature.
              </p>
            </section>
            <section className="panel padded">
              <span className="eyebrow">SOURCE & QUALITY</span>
              <h3>Trace this run back to its data.</h3>
              {Object.entries(report.provenance).map(([key, meta]) => (
                <div className="ra-source" key={key}>
                  <strong>
                    {key === "training" ? "Training snapshot" : "Scoring input"}{" "}
                    · {meta.provider}
                  </strong>
                  <p>
                    {formatUTC(meta.fetchedAt)} ·{" "}
                    {meta.stale
                      ? "STALE SNAPSHOT"
                      : meta.cached
                        ? "Cached real snapshot"
                        : meta.mode === "upload"
                          ? "Unverified upload"
                          : "Fetched from NASA"}
                  </p>
                  <p>
                    Rejected rows: {meta.rejectedRows ?? 0} · duplicates
                    removed: {meta.duplicates ?? 0}
                  </p>
                  {meta.sourceUrl && (
                    <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
                      Open exact NASA source ↗
                    </a>
                  )}
                </div>
              ))}
              <p>
                Incomplete/out-of-bounds model inputs excluded:{" "}
                {report.quality.excludedScoringRows} scoring /{" "}
                {model.excludedTrainingRows} training rows.
              </p>
              <small className="ra-run-id">Run {report.runId}</small>
            </section>
          </div>
          <details className="panel padded ra-method">
            <summary>Methodology, operating limits and reproducibility</summary>
            <p>
              {model.version} · Trained {formatUTC(model.trainedAt)}. The model
              fits log(1 + FRP) with nine measured features. Residual = log(1 +
              observed FRP) − predicted log FRP. Its rank is compared with the
              calibration day's residuals. A positive residual at or above the
              95th percentile is flagged for investigation only.
            </p>
            <ul>
              {report.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p>
              Source classification remains Uncertain / Other until a human
              review. No weather, facility overlap, land-cover percentages,
              30-day or annual history are fabricated. Nearby history covers
              strictly earlier UTC days in the downloaded seven-day window.
            </p>
            <p>
              Model artifact and report are retained in the local backend. The
              full JSON export includes input features, timestamps, metrics and
              a training-data digest. Changing input CSV does not change the
              NASA training dataset.
            </p>
            <a
              href="https://firms.modaps.eosdis.nasa.gov/active_fire/"
              target="_blank"
              rel="noreferrer"
            >
              NASA FIRMS documentation ↗
            </a>
          </details>
        </>
      )}
      {selectedEvent && (
        <EvidenceDrawer
          key={selectedEvent.id}
          event={selectedEvent}
          meta={report.provenance.input}
          onClose={() => setEvidence(null)}
          onSaved={(id, decision) => {
            setReport((r) => ({
              ...r,
              events: r.events.map((e) =>
                e.id === id ? { ...e, review: decision } : e,
              ),
            }));
            onSavedReview(id, decision);
          }}
        />
      )}
    </div>
  );
}
