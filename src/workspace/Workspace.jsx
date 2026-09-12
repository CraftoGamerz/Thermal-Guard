import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bookmark,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Flame,
  Focus,
  Globe2,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  api,
  age,
  colors,
  download,
  formatUTC,
  PRESETS,
  STATIC_DEMO,
} from "./client";
import MapView from "./MapView";
import EvidenceDrawer from "./EvidenceDrawer";
import { Timeline, PriorityBars } from "./Charts";
import { DISTRICTS } from "./districts";
import SmartAnalyser from "./SmartAnalyser";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "queue", label: "Review queue", icon: ListFilter },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "areas", label: "Watch areas", icon: Bookmark },
  { id: "sources", label: "Data & methodology", icon: Database },
  { id: "analyser", label: "Smart Analyser", icon: BrainCircuit },
];
const TITLES = {
  overview: [
    "Thermal intelligence, in focus.",
    "Observe satellite signals. Investigate the evidence. Make informed decisions.",
  ],
  queue: [
    "Every signal deserves context.",
    "A traceable review queue, from satellite observation to analyst decision.",
  ],
  analytics: [
    "The shape of the signal.",
    "Understand observations in the current selection. All times are UTC.",
  ],
  areas: [
    "Your areas of interest.",
    "Save a geographic extent and return to the places that matter.",
  ],
  sources: [
    "Know the evidence behind it.",
    "Source health, processing methods and the boundaries of this prototype.",
  ],
  analyser: [
    "Intelligence that assists, not decides.",
    "Measured NASA observations, genuine XGBoost regression and a transparent evidence trail. No inferred fire causes.",
  ],
};

export default function Workspace({ initialArea, manager, onHome, onLogout }) {
  const [tab, setTab] = useState(() =>
    NAV.some((n) => n.id === location.hash.slice(1))
      ? location.hash.slice(1)
      : "overview",
  );
  const [area, setArea] = useState(initialArea || PRESETS[0]),
    [areas, setAreas] = useState([]),
    [source, setSource] = useState("NOAA20"),
    [days, setDays] = useState("1"),
    [mode, setMode] = useState(STATIC_DEMO ? "replay" : "live");
  const [feed, setFeed] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [health, setHealth] = useState(null);
  const bboxParam = area.bbox.join(",");
  const [search, setSearch] = useState(""),
    [priority, setPriority] = useState("All"),
    [confidence, setConfidence] = useState("All"),
    [review, setReview] = useState("All"),
    [selectedId, setSelectedId] = useState(null),
    [moreFilters, setMoreFilters] = useState(false),
    [minFrp, setMinFrp] = useState("0");
  const [exportOpen, setExportOpen] = useState(false),
    [connection, setConnection] = useState(false),
    [autoRefresh, setAutoRefresh] = useState(true),
    [toast, setToast] = useState("");
  const refresh = () => setRevision((r) => r + 1);
  function navigate(id) {
    setTab(id);
    location.hash = id;
    setExportOpen(false);
  }
  useEffect(() => {
    const cb = () => {
      const id = location.hash.slice(1);
      if (NAV.some((n) => n.id === id)) setTab(id);
    };
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  }, []);
  useEffect(() => {
    api("/health")
      .then(setHealth)
      .catch(() => {});
    api("/areas")
      .then((d) => setAreas(d.areas))
      .catch(() => {});
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    // This effect synchronizes a network request with the current query.
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setError("");
    setFeed(null);
    setSelectedId(null);
    const params = new URLSearchParams({ source, days, mode, bbox: bboxParam });
    api("/events?" + params, { signal: controller.signal })
      .then((d) => {
        if (current) setFeed(d);
      })
      .catch((e) => {
        if (current && e.name !== "AbortError") {
          setError(e.message);
          if (e.status === 401) setConnection(true);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [bboxParam, source, days, mode, revision]);
  useEffect(() => {
    if (!autoRefresh || mode !== "live" || selectedId) return;
    const timer = setInterval(refresh, 300000);
    return () => clearInterval(timer);
  }, [autoRefresh, mode, selectedId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const events = useMemo(
    () =>
      (feed?.events || []).filter(
        (e) =>
          (priority === "All" || e.priority === priority) &&
          (confidence === "All" || e.confidence === confidence) &&
          (review === "All" ||
            (review === "unreviewed"
              ? !e.review
              : e.review?.status === review)) &&
          e.maxFrp >= Number(minFrp || 0) &&
          `${e.id} ${e.lat.toFixed(3)} ${e.lon.toFixed(3)} ${e.source} ${e.review?.classification || e.classification}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [feed, priority, confidence, review, minFrp, search],
  );
  const selected = feed?.events.find((e) => e.id === selectedId);
  const countDetections = events.reduce((n, e) => n + e.detections.length, 0),
    elevated = events.filter((e) => e.priority === "Elevated").length,
    reviewed = events.filter((e) => e.review).length;
  const latest = feed?.meta.latestAcquisition,
    oldObservation =
      latest && Date.parse(feed.meta.fetchedAt) - Date.parse(latest) > 86400000;
  function reset() {
    setSearch("");
    setPriority("All");
    setConfidence("All");
    setReview("All");
    setMinFrp("0");
  }
  function saved(id, decision) {
    setFeed((f) => ({
      ...f,
      events: (f?.events || []).map((e) =>
        e.id === id ? { ...e, review: decision } : e,
      ),
    }));
  }
  function exported(format) {
    download(events, format, {
      ...feed?.meta,
      filters: {
        area: area.name,
        priority,
        confidence,
        review,
        minFrp,
        search,
      },
    });
    setExportOpen(false);
    setToast(`${events.length} events exported as ${format.toUpperCase()}.`);
  }
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
          onClick={() => navigate("overview")}
        >
          <span className="brand-symbol">
            <Flame size={23} strokeWidth={2.3} />
          </span>
          <span>
            Thermal<span className="brand-light">Guard</span>
            <small>THERMAL INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">C</span>
          <div>
            CompileX workspace<small>ThermalGuard · Research prototype</small>
          </div>
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={tab === id ? "nav-item active" : "nav-item"}
              aria-current={tab === id ? "page" : undefined}
              aria-label={label}
              title={label}
              data-label={label}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "queue" && feed && (
                <em>{feed.events.filter((e) => !e.review).length}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={onHome}
            aria-label="Earth explorer"
          >
            <Globe2 size={18} />
            <span>Earth explorer</span>
          </button>
          <div className="mission-note">
            <Radio size={18} />
            <strong>Signals to decisions.</strong>
            <p>Satellite evidence with a human in the loop.</p>
            <button onClick={() => navigate("sources")}>
              Explore the approach <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="connection-button"
            onClick={() => setConnection(true)}
          >
            <span className="profile">CX</span>
            <div>
              Analyst workspace
              <small>
                {health?.authRequired
                  ? "Protected connection"
                  : "Local prototype session"}
              </small>
            </div>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{NAV.find((n) => n.id === tab)?.label}</strong>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Back to Earth"
              title="Back to Earth"
              onClick={onHome}
            >
              <Globe2 size={17} />
            </button>
            <span className="mission-code">TG-VIIRS</span>
            <span
              className={`status-dot ${mode === "replay" ? "replay" : error || feed?.meta.stale ? "offline" : ""}`}
            />
            <span className="small">
              {mode === "replay"
                ? "Replay scenario"
                : loading
                  ? "Connecting to NASA"
                  : error
                    ? "Feed unavailable"
                    : feed?.meta.stale
                      ? "Cached snapshot"
                      : "NASA feed connected"}
            </span>
            <button
              className="icon-button"
              title="Data health"
              aria-label="Data health"
              onClick={() => navigate("sources")}
            >
              <Bell size={17} />
            </button>
          </div>
        </header>
        <main className="main-content">
          {manager && (
            <div className="manager-session">
              <ShieldCheck size={19} />
              <div>
                <strong>
                  {manager.name} ·{" "}
                  {DISTRICTS.find((d) => d.id === manager.districtId)?.name}
                </strong>
                <small>
                  Demo manager session · area filters are not access
                  restrictions
                </small>
              </div>
              <button className="secondary" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> SATELLITE MONITORING WORKSPACE
              </div>
              <h1>{TITLES[tab][0]}</h1>
              <p>{TITLES[tab][1]}</p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                Refresh
              </button>
              <div className="export-wrap">
                <button
                  className="primary"
                  disabled={!feed || loading}
                  onClick={() => setExportOpen((v) => !v)}
                  aria-expanded={exportOpen}
                >
                  <ArrowDownToLine size={16} />
                  Export data
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button onClick={() => exported("csv")}>
                      CSV spreadsheet
                    </button>
                    <button onClick={() => exported("geojson")}>
                      GeoJSON with provenance
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="toolbar" aria-label="Data selection">
            <label className="area-select">
              <MapPin size={16} />
              <select
                aria-label="Geographic area"
                value={area.id}
                onChange={(e) =>
                  setArea(
                    [...PRESETS, ...DISTRICTS, ...areas].find(
                      (a) => a.id === e.target.value,
                    ),
                  )
                }
              >
                {[...PRESETS, ...DISTRICTS, ...areas].map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Clock3 size={15} />
              <select
                aria-label="Time window"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                <option value="1">Last 24 hours</option>
                <option value="2">Last 48 hours</option>
                <option value="7">Last 7 days</option>
              </select>
            </label>
            <label>
              <Radio size={15} />
              <select
                aria-label="Satellite source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="NOAA20">NOAA-20 / VIIRS</option>
                <option value="NOAA21">NOAA-21 / VIIRS</option>
                <option value="SNPP">Suomi NPP / VIIRS</option>
              </select>
            </label>
            <div className="toolbar-spacer" />
            <div className="segmented" aria-label="Data mode">
              <button
                className={mode === "live" ? "chosen" : ""}
                onClick={() => setMode("live")}
                disabled={STATIC_DEMO}
                title={
                  STATIC_DEMO
                    ? "Live NASA ingestion requires the Node API deployment"
                    : undefined
                }
              >
                {STATIC_DEMO ? "Live needs API" : "Live feed"}
              </button>
              <button
                className={mode === "replay" ? "chosen" : ""}
                onClick={() => setMode("replay")}
              >
                Demo replay
              </button>
            </div>
          </section>
          {(feed?.meta.warning || oldObservation) && (
            <div className="banner">
              <CircleHelp size={17} />
              <span>
                {feed?.meta.warning ||
                  `Latest observation is ${age(latest)}. “Connected” describes retrieval, not continuous satellite coverage.`}
              </span>
            </div>
          )}
          {error && (
            <div className="error-panel" role="alert">
              <Radio size={24} />
              <div>
                <strong>Unable to load the satellite feed</strong>
                <p>{error}</p>
              </div>
              <button className="secondary" onClick={refresh}>
                Try again
              </button>
            </div>
          )}
          {["overview", "queue", "analytics"].includes(tab) && (
            <>
              <div className="metrics">
                <Metric
                  label="Satellite detections"
                  value={loading ? "—" : countDetections.toLocaleString()}
                  icon={Focus}
                  detail="Raw observations in selection"
                />
                <Metric
                  label="Thermal events"
                  value={loading ? "—" : events.length.toLocaleString()}
                  icon={Activity}
                  detail="Approximate spatial / day groups"
                />
                <Metric
                  label="Elevated priority"
                  value={loading ? "—" : elevated.toLocaleString()}
                  icon={Flame}
                  detail="Rule-based review candidates"
                  accent
                />
                <Metric
                  label="Analyst reviewed"
                  value={loading ? "—" : reviewed.toLocaleString()}
                  icon={ShieldCheck}
                  detail={`${events.length ? Math.round((reviewed / events.length) * 100) : 0}% of selected events reviewed`}
                />
              </div>
              <div className="filter-row">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search events"
                    placeholder="Search event ID, coordinates or source class…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Review priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="All">All priorities</option>
                  {Object.keys(colors).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <button
                  className={`secondary ${moreFilters ? "selected" : ""}`}
                  aria-expanded={moreFilters}
                  onClick={() => setMoreFilters((v) => !v)}
                >
                  <SlidersHorizontal size={15} />
                  Filters
                </button>
                <button className="text-button" onClick={reset}>
                  Reset
                </button>
              </div>
              {moreFilters && (
                <div className="extended-filters">
                  <label>
                    Sensor confidence
                    <select
                      value={confidence}
                      onChange={(e) => setConfidence(e.target.value)}
                    >
                      <option value="All">All confidence levels</option>
                      {["high", "nominal", "low", "unknown"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Review state
                    <select
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                    >
                      <option value="All">All decisions</option>
                      {["unreviewed", "confirmed", "rejected", "deferred"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Minimum FRP (MW)
                    <input
                      type="number"
                      min="0"
                      value={minFrp}
                      onChange={(e) => setMinFrp(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </>
          )}
          {tab === "overview" && (
            <>
              <div className="overview-grid">
                <section className="panel map-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Thermal activity map</h2>
                      <p>
                        {area.name} <span>·</span>{" "}
                        {mode === "live"
                          ? "Latest available satellite observations"
                          : "Fixed synthetic scenario"}
                      </p>
                    </div>
                    <span className="outline-label">
                      {mode === "replay" ? "SYNTHETIC" : "NEAR REAL-TIME"}
                    </span>
                  </div>
                  {loading ? (
                    <div className="map-loading">
                      <div className="loading-orbit">
                        <Radio size={27} />
                      </div>
                      <strong>Acquiring satellite observations</strong>
                      <span>
                        Connecting to NASA FIRMS. This can take a few seconds.
                      </span>
                    </div>
                  ) : (
                    <MapView
                      events={events}
                      bbox={area.bbox}
                      onSelect={(e) => setSelectedId(e.id)}
                      selectedId={selectedId}
                      acquisition={latest}
                    />
                  )}
                </section>
                <section className="panel priority-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Review spotlight</h2>
                      <p>Highest observed radiative power</p>
                    </div>
                    <span className="count-chip">{events.length}</span>
                  </div>
                  <div className="spotlight-list">
                    {loading
                      ? [1, 2, 3, 4].map((n) => (
                          <div className="skeleton-row" key={n} />
                        ))
                      : events.slice(0, 5).map((e, i) => (
                          <button
                            className="spotlight-item"
                            key={e.id}
                            onClick={() => setSelectedId(e.id)}
                          >
                            <span className="spot-rank">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <div className="spot-line">
                                <strong>
                                  {e.lat.toFixed(3)}° N, {e.lon.toFixed(3)}° E
                                </strong>
                                <ArrowUpRight size={14} />
                              </div>
                              <div className="spot-details">
                                <span style={{ color: colors[e.priority] }}>
                                  {e.priority}
                                </span>
                                <span>{e.maxFrp.toFixed(1)} MW</span>
                              </div>
                              <small>
                                {e.review
                                  ? `Reviewed · ${e.review.status}`
                                  : "Awaiting analyst review"}{" "}
                                <span>·</span> {e.detections.length} detections
                              </small>
                            </div>
                          </button>
                        ))}
                    {!loading && !events.length && (
                      <Empty
                        title="No events in this selection"
                        text="Try a wider area, another sensor or a longer time window."
                      />
                    )}
                  </div>
                  <button
                    className="panel-link"
                    onClick={() => navigate("queue")}
                  >
                    Open full review queue <ArrowRight size={16} />
                  </button>
                  <div className="queue-note">
                    <ShieldCheck size={16} />
                    <span>
                      Sensor confidence is not the probability of an industrial
                      fire.
                    </span>
                  </div>
                </section>
              </div>
              <div className="lower-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Observation activity</h2>
                      <p>Detection count by observed acquisition hour</p>
                    </div>
                    <Activity size={18} className="muted" />
                  </div>
                  <Timeline events={events} />
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Review priority</h2>
                      <p>Transparent screening rules</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Read priority methodology"
                      onClick={() => navigate("sources")}
                    >
                      <CircleHelp size={17} />
                    </button>
                  </div>
                  <PriorityBars events={events} />
                </section>
              </div>
            </>
          )}
          {tab === "queue" && (
            <EventTable
              events={events}
              loading={loading}
              onSelect={(e) => setSelectedId(e.id)}
            />
          )}
          {tab === "analytics" && (
            <>
              <div className="lower-grid analytics-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Satellite acquisition timeline</h2>
                      <p>
                        Observed hours only. Gaps do not mean an absence of
                        heat.
                      </p>
                    </div>
                  </div>
                  <Timeline events={events} />
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Review workload</h2>
                      <p>Events per priority category</p>
                    </div>
                  </div>
                  <PriorityBars events={events} />
                </section>
              </div>
              <div className="analysis-cards">
                <section className="panel padded">
                  <h2>Detection confidence</h2>
                  <p className="muted small">
                    Reported by the VIIRS product; highest value per event.
                  </p>
                  {["high", "nominal", "low", "unknown"].map((c) => (
                    <div className="confidence-row" key={c}>
                      <span className="capitalize">{c}</span>
                      <div className="bar-track">
                        <span
                          style={{
                            width: `${(events.filter((e) => e.confidence === c).length / (events.length || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {events.filter((e) => e.confidence === c).length}
                      </strong>
                    </div>
                  ))}
                </section>
                <section className="panel padded">
                  <span className="eyebrow">
                    OBSERVATIONS, NOT CLAIMED ACCURACY
                  </span>
                  <h2>What these numbers mean</h2>
                  <p>
                    FRP measures fire radiative power in megawatts. It does not
                    directly measure temperature, burned area or incident
                    severity.
                  </p>
                  <p>
                    One approximate event can contain repeated satellite
                    detections. Cloud cover and satellite overpass timing affect
                    what is visible.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("sources")}
                  >
                    Read the methodology <ArrowRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "areas" && (
            <Areas
              areas={areas}
              onChange={setAreas}
              onLoad={(a) => {
                setArea(a);
                navigate("overview");
              }}
              onError={setToast}
            />
          )}
          {tab === "sources" && (
            <Sources
              health={health}
              meta={feed?.meta}
              error={error}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              openConnection={() => setConnection(true)}
            />
          )}
          {tab === "analyser" && (
            <SmartAnalyser
              key={`${source}:${days}:${mode}:${bboxParam}`}
              feed={feed}
              loading={loading}
              area={area}
              setArea={setArea}
              areas={[...PRESETS, ...DISTRICTS, ...areas]}
              manager={manager}
              source={source}
              days={days}
              mode={mode}
              onSavedReview={saved}
            />
          )}
          <footer className="workspace-footer">
            <span>
              <span className="footer-dot" />
              {mode === "replay"
                ? "SYNTHETIC REPLAY"
                : feed?.meta.cached
                  ? "CACHED NASA SNAPSHOT"
                  : "NASA FIRMS"}{" "}
              <span>·</span>{" "}
              {feed?.meta.fetchedAt
                ? `Retrieved ${formatUTC(feed.meta.fetchedAt)}`
                : "Research prototype"}
            </span>
            <span>
              CompileX <span>·</span> Human-reviewed intelligence
            </span>
          </footer>
        </main>
      </div>
      {selected && (
        <EvidenceDrawer
          key={selected.id}
          event={selected}
          meta={feed.meta}
          onClose={() => setSelectedId(null)}
          onSaved={saved}
        />
      )}
      {connection && (
        <Connection
          health={health}
          onClose={() => setConnection(false)}
          onConnect={() => {
            setConnection(false);
            refresh();
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, detail, accent }) {
  return (
    <section className={`metric ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <p>
        {accent && <span className="mini-dot" />}
        {detail}
      </p>
    </section>
  );
}
function Empty({ title, text }) {
  return (
    <div className="empty">
      <Focus size={27} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
function EventTable({ events, loading, onSelect }) {
  const [page, setPage] = useState(0);
  const size = 20,
    pages = Math.max(1, Math.ceil(events.length / size));
  // Reset pagination when the external query's result changes.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => setPage(0), [events]);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            Event review queue <span className="muted">/ {events.length}</span>
          </h2>
          <p>
            Ordered by peak observed FRP. Select an event to inspect its
            evidence.
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Event / coordinates</th>
              <th>Last observation (UTC)</th>
              <th>Peak FRP</th>
              <th>Detections</th>
              <th>Priority</th>
              <th>Review state</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(page * size, (page + 1) * size).map((e) => (
              <tr key={e.id}>
                <td>
                  <strong className="mono">
                    {e.id.slice(-8).toUpperCase()}
                  </strong>
                  <small>
                    {e.lat.toFixed(4)} N, {e.lon.toFixed(4)} E
                  </small>
                </td>
                <td>{formatUTC(e.lastSeen).replace(" UTC", "")}</td>
                <td>
                  <strong>{e.maxFrp.toFixed(1)}</strong>{" "}
                  <span className="muted">MW</span>
                </td>
                <td>{e.detections.length}</td>
                <td>
                  <span className="badge" style={{ color: colors[e.priority] }}>
                    {e.priority}
                  </span>
                </td>
                <td>
                  <span className="review-state">
                    {e.review?.status || "Unreviewed"}
                  </span>
                </td>
                <td>
                  <button className="table-open" onClick={() => onSelect(e)}>
                    Review <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!events.length && (
        <Empty
          title={loading ? "Loading observations…" : "No matching events"}
          text="Your selection has no events to display. Adjust the filters or refresh the feed."
        />
      )}
      <div className="pagination">
        <span>
          Page {page + 1} of {pages}
        </span>
        <div>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
function Areas({ areas, onChange, onLoad, onError }) {
  const [name, setName] = useState(""),
    [bbox, setBbox] = useState("68,20,75,25"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function add(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/areas", {
        method: "POST",
        body: JSON.stringify({ name, bbox: bbox.split(",") }),
      });
      onChange((await api("/areas")).areas);
      setName("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id) {
    try {
      await api("/areas/" + id, { method: "DELETE" });
      onChange(areas.filter((a) => a.id !== id));
    } catch (e) {
      onError(e.message);
    }
  }
  return (
    <div className="areas-layout">
      <section className="panel padded">
        <span className="eyebrow">YOUR MONITORING EXTENTS</span>
        <h2>Saved watch areas</h2>
        <p className="muted">
          Geographic bookmarks, available across local sessions.
        </p>
        {areas.length ? (
          areas.map((a) => (
            <div className="area-card" key={a.id}>
              <div className="area-icon">
                <MapPin size={21} />
              </div>
              <div>
                <h3>{a.name}</h3>
                <p className="mono small">{a.bbox.join(", ")}</p>
              </div>
              <button className="text-button" onClick={() => onLoad(a)}>
                Open <ArrowUpRight size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${a.name}`}
                onClick={() => remove(a.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            title="Start with a place you know"
            text="Save a refinery belt, district extent or research region using its bounding coordinates."
          />
        )}
        <h3 className="starter-title">Quick-start extents</h3>
        {PRESETS.slice(1, 4).map((a) => (
          <button className="starter-area" key={a.id} onClick={() => onLoad(a)}>
            <Globe2 size={17} />
            <span>{a.name}</span>
            <ArrowRight size={16} />
          </button>
        ))}
      </section>
      <section className="panel padded">
        <h2>New watch area</h2>
        <form className="review-form" onSubmit={add}>
          <label>
            Area name
            <input
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gujarat refinery belt"
            />
          </label>
          <label>
            Bounding coordinates
            <input
              required
              value={bbox}
              onChange={(e) => setBbox(e.target.value)}
              placeholder="west, south, east, north"
            />
          </label>
          <p className="muted small">
            Order: west longitude, south latitude, east longitude, north
            latitude. These are rectangular extents, not verified administrative
            boundaries. Public NASA downloads cover South Asia.
          </p>
          <button className="primary" disabled={saving}>
            <Plus size={16} />
            {saving ? "Saving…" : "Save watch area"}
          </button>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
function Sources({
  health,
  meta,
  error,
  autoRefresh,
  setAutoRefresh,
  openConnection,
}) {
  return (
    <div className="sources-layout">
      <section className="panel padded">
        <div className="section-title">
          <h2>Data connection</h2>
          <span className="badge">
            {meta?.mode === "replay"
              ? "Synthetic mode"
              : error
                ? "Unavailable"
                : meta
                  ? "Connected"
                  : "Connecting"}
          </span>
        </div>
        <div className="source-provider">
          <div className="provider-symbol">
            <Radio size={25} />
          </div>
          <div>
            <h3>NASA FIRMS</h3>
            <p>Active fire & thermal anomaly observations</p>
          </div>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/active_fire/"
            target="_blank"
            rel="noreferrer"
            aria-label="Open NASA FIRMS"
          >
            <ArrowUpRight size={20} />
          </a>
        </div>
        <dl className="source-facts">
          <div>
            <dt>Access method</dt>
            <dd>
              {health?.keyConfigured
                ? "FIRMS Area API + public 7-day CSV"
                : "Public South Asia CSV · no key required"}
            </dd>
          </div>
          <div>
            <dt>Retrieved at</dt>
            <dd>{formatUTC(meta?.fetchedAt)}</dd>
          </div>
          <div>
            <dt>Latest acquisition</dt>
            <dd>{formatUTC(meta?.latestAcquisition)}</dd>
          </div>
          <div>
            <dt>Cache status</dt>
            <dd>
              {meta?.stale
                ? "Stale · upstream unavailable"
                : meta?.cached
                  ? "Served from 5-minute cache"
                  : "Fresh retrieval / explicit replay"}
            </dd>
          </div>
          <div>
            <dt>Rejected / duplicate rows</dt>
            <dd>
              {meta?.rejectedRows ?? "—"} / {meta?.duplicates ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Spatial coverage</dt>
            <dd>{meta?.coverage || "Synthetic replay / awaiting feed"}</dd>
          </div>
          <div>
            <dt>Processing version</dt>
            <dd>{health?.model || "rules-1.0.0"}</dd>
          </div>
        </dl>
        <label className="toggle-line">
          <span>
            <strong>Automatic refresh</strong>
            <small>
              Every 5 minutes in live mode. Paused during evidence review.
            </small>
          </span>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
        </label>
        {meta?.sourceUrl && (
          <a
            className="text-button"
            href={meta.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Inspect source data <ArrowUpRight size={14} />
          </a>
        )}
      </section>
      <section className="panel padded">
        <span className="eyebrow">EXPLAINABLE BY DESIGN</span>
        <h2>How a signal becomes a review</h2>
        <div className="pipeline">
          {[
            [
              "01",
              "Acquire & normalize",
              "Parse FIRMS CSV, validate coordinates and UTC acquisition times, preserve sensor confidence and remove duplicate detections.",
            ],
            [
              "02",
              "Group observations",
              "Approximate 1 km grid and UTC day grouping reduces repeated pixels. Grid boundaries can split an incident; this is not a verified incident count.",
            ],
            [
              "03",
              "Prioritize transparently",
              "Elevated: peak FRP ≥50 MW with nominal/high detection confidence. Standard: other events ≥10 MW. Routine: below 10 MW. Thresholds are prototype rules.",
            ],
            [
              "04",
              "Corroborate & review",
              STATIC_DEMO
                ? "Inspect the measurements and record a classification and rationale. Demo decisions stay in this browser; they are not shared between managers."
                : "Inspect the measurements, request OSM context, record a classification and rationale. All decisions append to the local SQLite audit trail.",
            ],
          ].map(([n, title, text]) => (
            <div key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel padded">
        <h2>What is working today</h2>
        <ul className="feature-list">
          {[
            "Live NASA CSV ingestion and optional server-side Area API access",
            "Spatial map, consistent filters and timestamped cache recovery",
            "On-demand OpenStreetMap industrial context with attribution",
            "Persistent reviews, saved areas and downloadable evidence",
            "Explicit offline presentation scenario with synthetic labels",
          ].map((t) => (
            <li key={t}>
              <Check size={16} />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel padded">
        <h2>Model & deployment boundaries</h2>
        <p>
          A trained six-class classifier, long-term facility baselines, Sentinel
          land-cover fusion and calibrated performance evaluation are future
          work. The Smart Analyser now runs a real server-side XGBoost FRP
          regression with temporal evaluation and seven-day measured nearby
          history. It does not classify fire causes or predict emergencies.
        </p>
        <p>
          NASA near-real-time data can arrive after an overpass. Clouds, sensor
          resolution and the acquisition schedule can conceal fires. This is an
          analyst research prototype, not an emergency dispatch service.
        </p>
        <div className="notice">
          {health?.authRequired
            ? "Workspace API access is protected by a server token. Analyst names are self-reported, not verified identities."
            : "Local single-workspace mode. External hosting requires a workspace token and HTTPS. No verified user identity or role-based access is implemented."}
        </div>
        <button className="secondary" onClick={openConnection}>
          <LockKeyhole size={15} />
          Connection settings
        </button>
        <div className="source-links">
          <a
            href="https://firms.modaps.eosdis.nasa.gov/api/area/"
            target="_blank"
            rel="noreferrer"
          >
            NASA API documentation <ArrowUpRight size={13} />
          </a>
          <a
            href="https://wiki.openstreetmap.org/wiki/Overpass_API"
            target="_blank"
            rel="noreferrer"
          >
            OSM Overpass documentation <ArrowUpRight size={13} />
          </a>
        </div>
      </section>
    </div>
  );
}
function Connection({ health, onClose, onConnect }) {
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.focus();
    return () => previous?.focus();
  }, []);
  async function connect(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const old = sessionStorage.getItem("tg_workspace_token");
    sessionStorage.setItem("tg_workspace_token", token);
    try {
      await api("/areas");
      onConnect();
    } catch (e) {
      if (old) sessionStorage.setItem("tg_workspace_token", old);
      else sessionStorage.removeItem("tg_workspace_token");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function key(e) {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const items = [
        ...dialog.current.querySelectorAll("button:not(:disabled),input"),
      ];
      if (
        e.shiftKey &&
        (document.activeElement === items[0] ||
          document.activeElement === dialog.current)
      ) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0].focus();
      }
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        tabIndex={-1}
        onKeyDown={key}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-title"
        className="connection-modal"
      >
        <div className="section-title">
          <h2 id="connection-title">Workspace connection</h2>
          <button
            className="icon-button"
            aria-label="Close connection settings"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="connection-emblem">
          <LockKeyhole size={26} />
        </div>
        <p>
          {health?.authRequired
            ? "Enter the access token configured on your ThermalGuard server."
            : "This server runs in local prototype mode. You can use all features without a token."}
        </p>
        <p className="muted small">
          NASA keys belong in the server’s FIRMS_MAP_KEY environment variable.
          Never paste a NASA key here.
        </p>
        {health?.authRequired ? (
          <form className="review-form" onSubmit={connect}>
            <label>
              Workspace access token
              <input
                type="password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Connecting…" : "Connect workspace"}
              <ArrowRight size={16} />
            </button>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <button className="primary" onClick={onClose}>
            Continue to workspace
            <ArrowRight size={16} />
          </button>
        )}
        <span className="small muted">
          Tokens are kept only in this tab’s session storage.
        </span>
      </section>
    </div>
  );
}
