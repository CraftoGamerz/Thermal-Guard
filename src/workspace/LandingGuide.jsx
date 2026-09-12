import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Satellite,
  Radar,
  Layers3,
  ScanLine,
  ShieldCheck,
  MapPin,
  Download,
  Database,
  Server,
  Globe2,
  ChevronRight,
  Info,
  Activity,
} from "lucide-react";
import { STATIC_DEMO } from "./client";
import "./landing-guide.css";

const features = [
  {
    icon: Globe2,
    name: "Explore the signal",
    sub: "Interactive map & filters",
    detail:
      "Narrow observations by area, satellite, confidence and heat output. Select a hotspot to inspect its evidence.",
  },
  {
    icon: ScanLine,
    name: "See the evidence",
    sub: "Every observation, in context",
    detail:
      "Check acquisition time, sensor confidence and FRP. Request nearby mapped industrial features when the Node API is connected.",
  },
  {
    icon: Activity,
    name: "Prioritize attention",
    sub: "Transparent review rules",
    detail:
      "FRP and sensor confidence place events in a review queue. Each priority has a reason; it is not a fire probability.",
  },
  {
    icon: ShieldCheck,
    name: "Keep people in control",
    sub: "Review & decision history",
    detail:
      "Confirm, reject or defer an event with a source class and rationale. Every saved review leaves a traceable record.",
  },
  {
    icon: MapPin,
    name: "Focus on your district",
    sub: "Pilot areas & saved extents",
    detail:
      "Start with a pilot district or save your own rectangular watch area. Demo manager access uses the public PIN 2026.",
  },
  {
    icon: Download,
    name: "Take the evidence with you",
    sub: "CSV & GeoJSON exports",
    detail:
      "Export filtered events with source, timestamps and review decisions for analysis or mapping. Provenance travels with the data.",
  },
];

const stages = [
  {
    icon: Satellite,
    label: "Observe",
    owner: "01 / IN ORBIT",
    title: "Heat leaves a signal.",
    text: "VIIRS instruments on S-NPP, NOAA-20 and NOAA-21 measure radiation in several spectral bands. Unusually strong infrared signals can reveal active fires and other hot sources.",
    detail:
      "NASA compares pixels with their surroundings and applies spectral, cloud and water tests. The 375 m product describes nominal pixel resolution, not an exact fire size or boundary.",
    output: "Satellite measurements → NASA thermal anomaly detection",
    tag: "VIIRS · nominal 375 m product",
  },
  {
    icon: Radar,
    label: "Receive",
    owner: "02 / NASA FIRMS",
    title: "A signal becomes a record.",
    text: "NASA FIRMS distributes processed detections. ThermalGuard reads these records; it does not process raw satellite imagery or operate the satellites.",
    detail:
      "Each record can include latitude, longitude, acquisition time, confidence, fire radiative power (FRP), satellite and product version. The Node backend fetches public South Asia CSV files, or the optional keyed Area API.",
    output: "FIRMS CSV → validated observation records",
    tag: "NOAA-20 · NOAA-21 · S-NPP",
  },
  {
    icon: Layers3,
    label: "Organize",
    owner: "03 / THERMALGUARD API",
    title: "Less noise. More context.",
    text: "The server rejects malformed records, removes duplicate observations, normalizes times to UTC and filters to the requested geographic box.",
    detail:
      "Records from one source are grouped by an approximate 1 km grid cell and UTC day. FRP and confidence determine review priority. Grid boundaries can split nearby detections; clusters are not verified incidents.",
    output: "Observations → grouped events + explainable priority",
    tag: "Approx. 1 km grid · same UTC day",
  },
  {
    icon: ShieldCheck,
    label: "Review",
    owner: "04 / HUMAN JUDGMENT",
    title: "A hotspot needs a second look.",
    text: "An analyst inspects the observations, timing and heat output. Optional OpenStreetMap context can show nearby mapped industrial features.",
    detail:
      "Proximity does not prove the heat came from a facility. The analyst selects a source class, confirms, rejects or defers, and records a reason. Source classification starts as Uncertain / Other.",
    output: "Event + evidence → documented human decision",
    tag: "Context supports judgment, not automatic attribution",
  },
  {
    icon: Database,
    label: "Preserve",
    owner: "05 / TRACEABLE OUTPUT",
    title: "Make the decision reusable.",
    text: "The Node deployment keeps snapshots, event records, saved areas and review history in SQLite. The hosted demo keeps reviews and watch areas in this browser.",
    detail:
      "CSV and GeoJSON downloads retain timestamps, source, processing version and review decisions. Filters apply consistently to the map, queue, analytics and exports.",
    output: "Review history → reusable, source-linked exports",
    tag: "SQLite or browser-local demo storage",
  },
];

const routes = [
  {
    method: "POST / GET",
    path: "/api/analysis/jobs",
    title: "Run genuine XGBoost analysis",
    text: "POST creates a bounded background job: fetch NASA training observations, fit a real XGBoost FRP regression, evaluate a separate day and score the selected extent or uploaded FIRMS CSV. GET /api/analysis/jobs/:id returns actual stage, elapsed time and the evidence report. No fabricated progress, weather, causes or accuracy.",
    code: 'POST body: { source: "NOAA20", days: 1, bbox: [68,6,98,37], csv?: "FIRMS CSV" }\nResponse: { id, status, stage }\nGET /:id response: { status, elapsedMs, result?, error? }',
  },
  {
    method: "GET",
    path: "/api/health",
    title: "Check the connection",
    text: "Returns service status, providers, processing version, whether a NASA key is configured and whether workspace auth is required. The key itself is never returned.",
    code: "Response: { ok, keyConfigured, authRequired, model, providers }",
  },
  {
    method: "GET",
    path: "/api/events",
    title: "Load thermal evidence",
    text: "Choose NOAA20, NOAA21 or SNPP, a 1/2/7-day window, a west/south/east/north bounding box and live or replay mode. Returns grouped events and provenance metadata.",
    code: "Example: /api/events?source=NOAA20&days=1&bbox=68,6,98,37&mode=live\nResponse: { events, meta }",
  },
  {
    method: "GET / POST",
    path: "/api/events/:id/reviews",
    title: "Read or save review history",
    text: "A review needs an existing event, a confirmed/rejected/deferred status, an allowed source class, an analyst name and a rationale. Saving appends a record; it does not alter satellite confidence.",
    code: "Body: { status, classification, note, analyst }\nGET response: { reviews }",
  },
  {
    method: "GET",
    path: "/api/context",
    title: "Request nearby mapped context",
    text: "The Node API queries Overpass for mapped industrial or power features within 1.5 km. Results are cached for 24 hours; new queries are limited to one per 15 seconds. Missing context stays visibly unavailable.",
    code: "Example: /api/context?lat=22.36&lon=69.87\nResponse: { facilities, fetchedAt, source, limitation }",
  },
  {
    method: "GET / POST / DELETE",
    path: "/api/areas",
    title: "Manage saved watch areas",
    text: "List or create named geographic boxes. Delete a single saved area with /api/areas/:id. Coordinates must be valid and corners ordered; names must be 2–60 characters.",
    code: "POST body: { name, bbox: [west, south, east, north] }\nGET response: { areas } · DELETE response: 204",
  },
];

function SatelliteDiagram({ stage }) {
  return (
    <div className="signal-illustration">
      <span className="guide-mono">
        {stage === 0 ? "INFRARED OBSERVATION" : "FOLLOW THE EVIDENCE"}
      </span>
      <svg
        viewBox="0 0 480 290"
        role="img"
        aria-label="Illustration: satellite scans a surface grid, where a warm pixel becomes a thermal anomaly record. Not live imagery."
      >
        <defs>
          <linearGradient id="scan-beam" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#6fd8f3" stopOpacity=".3" />
            <stop offset="1" stopColor="#6fd8f3" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="pixel-glow">
            <stop stopColor="#ff9559" stopOpacity=".4" />
            <stop offset="1" stopColor="#ff9559" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M30 95 Q240 -30 450 95"
          fill="none"
          stroke="#426678"
          strokeDasharray="4 7"
        />
        <path
          d="M242 65 L90 235 L390 235 Z"
          fill="url(#scan-beam)"
          stroke="#6fd8f3"
          strokeOpacity=".18"
        />
        <g
          transform="translate(240 58) rotate(-20)"
          stroke="#8bdaef"
          strokeWidth="1.5"
        >
          <rect x="-18" y="-17" width="36" height="34" rx="5" fill="#234052" />
          <path d="M-18 0H-66M18 0H66" />
          <path d="M-70 -17H-30V17H-70ZM30 -17H70V17H30Z" fill="#102635" />
          <path
            d="M-57 -17V17M-43 -17V17M43 -17V17M57 -17V17M-70 0H-30M30 0H70"
            opacity=".5"
          />
          <circle r="6" fill="#c5f277" stroke="none" />
        </g>
        <ellipse cx="240" cy="211" rx="160" ry="55" fill="url(#pixel-glow)" />
        {Array.from({ length: 40 }, (_, i) => (
          <rect
            key={i}
            x={77 + (i % 8) * 41}
            y={151 + Math.floor(i / 8) * 20}
            width="36"
            height="15"
            rx="2"
            fill={i === 20 || i === 21 ? "#ff9559" : "#15303b"}
            stroke={i === 20 || i === 21 ? "#ffd7a8" : "#2c4d58"}
            opacity={i === 21 ? 0.6 : 1}
          />
        ))}
        <path d="M261 195L345 126H439" fill="none" stroke="#ff9559" />
        <text
          x="341"
          y="118"
          fill="#ffd2b2"
          fontSize="10"
          fontFamily="monospace"
        >
          THERMAL ANOMALY
        </text>
        <text
          x="77"
          y="270"
          fill="#98adb7"
          fontSize="10"
          fontFamily="monospace"
        >
          SURFACE PIXELS / SCHEMATIC
        </text>
      </svg>
      <div className="signal-output">
        <span className="status-dot" />
        <span>{stages[stage].output}</span>
      </div>
      <small>Illustration only · no live satellite scan</small>
    </div>
  );
}

export default function LandingGuide() {
  const [hovered, setHovered] = useState(null),
    [pinned, setPinned] = useState(null);
  const [stage, setStage] = useState(0),
    [frp, setFrp] = useState(60),
    [confidence, setConfidence] = useState("nominal");
  const [mode, setMode] = useState(STATIC_DEMO ? "hosted" : "server");
  const priority =
    frp >= 50 && ["nominal", "high"].includes(confidence)
      ? "Elevated"
      : frp >= 10
        ? "Standard"
        : "Routine";
  const current = stages[stage];
  useEffect(() => {
    const dismiss = (event) => {
      if (event.key === "Escape") {
        setHovered(null);
        setPinned(null);
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);
  function moveStage(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    if (event.key === "ArrowLeft")
      next = (index + stages.length - 1) % stages.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = stages.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      setStage(next);
      document.getElementById(`signal-tab-${next}`).focus();
    }
  }
  return (
    <>
      <nav className="guide-jump" aria-label="Explore this page">
        <span className="guide-mono">TAKE A CLOSER LOOK</span>
        <a href="#features">
          Capabilities <ArrowDown size={14} />
        </a>
        <a href="#approach">
          How it works <ArrowDown size={14} />
        </a>
        <a href="#architecture">
          Under the hood <ArrowDown size={14} />
        </a>
      </nav>
      <section className="guide-section" id="features">
        <div className="guide-heading">
          <div>
            <span className="eyebrow">THE TOOLKIT</span>
            <h2>One signal. A complete investigation.</h2>
          </div>
          <p>
            Explore what you can do.
            <br />
            Hover, focus or tap a card for a quick explanation.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon,
              active = hovered === index || pinned === index;
            return (
              <button
                key={feature.name}
                className={`guide-feature ${active ? "is-expanded" : ""}`}
                aria-expanded={active}
                aria-describedby={`feature-detail-${index}`}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setHovered(index);
                }}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => {
                  setPinned(pinned === index ? null : index);
                  setHovered(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setPinned(null);
                    setHovered(null);
                  }
                }}
              >
                <span className="feature-top">
                  <Icon size={23} />
                  <span>
                    0{index + 1} <Info size={14} />
                  </span>
                </span>
                <strong>{feature.name}</strong>
                <span className="feature-sub">{feature.sub}</span>
                <span
                  id={`feature-detail-${index}`}
                  className="feature-detail"
                  hidden={!active}
                >
                  {feature.detail}
                </span>
                <span className="feature-hint">
                  {active
                    ? "Click / tap to pin or close"
                    : "Explore capability"}
                  <ArrowUpRight size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="guide-section workflow-section" id="approach">
        <div className="guide-heading">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>From orbit to a decision.</h2>
          </div>
          <p>
            Follow a thermal signal through five stages.
            <br />
            Select a step to see what happens.
          </p>
        </div>
        <div
          className="signal-tabs"
          role="tablist"
          aria-label="Satellite to decision workflow"
        >
          {stages.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                id={`signal-tab-${index}`}
                role="tab"
                aria-selected={stage === index}
                aria-controls="signal-panel"
                tabIndex={stage === index ? 0 : -1}
                onClick={() => setStage(index)}
                onKeyDown={(e) => moveStage(e, index)}
              >
                <span>0{index + 1}</span>
                <Icon size={20} />
                {item.label}
                <ChevronRight size={14} />
              </button>
            );
          })}
        </div>
        <div
          className="signal-panel"
          id="signal-panel"
          role="tabpanel"
          aria-labelledby={`signal-tab-${stage}`}
          tabIndex={0}
        >
          <SatelliteDiagram stage={stage} />
          <div className="signal-explanation">
            <span className="guide-mono">{current.owner}</span>
            <h3>{current.title}</h3>
            <p>{current.text}</p>
            <p>{current.detail}</p>
            <span className="signal-tag">{current.tag}</span>
            <div className="step-controls">
              <span>{stage + 1} / 5</span>
              <button onClick={() => setStage((stage + 1) % stages.length)}>
                {stage === 4 ? "Back to orbit" : "Next stage"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="science-note">
          <Info size={19} />
          <p>
            <strong>A hotspot is a clue, not a complete diagnosis.</strong>{" "}
            Clouds, heavy smoke, small or cool fires, and gaps between satellite
            passes can hide activity. Detection does not establish cause, damage
            or an emergency.
          </p>
          <a
            href="https://forum.earthdata.nasa.gov/viewtopic.php?t=5178"
            target="_blank"
            rel="noreferrer"
          >
            NASA limitations <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="source-links">
          <span>SCIENCE REFERENCES</span>
          <a
            href="https://viirsland.gsfc.nasa.gov/PDF/VIIRS_activefire_375m_ATBD.pdf"
            target="_blank"
            rel="noreferrer"
          >
            VIIRS detection algorithm ↗
          </a>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html"
            target="_blank"
            rel="noreferrer"
          >
            FIRMS field definitions ↗
          </a>
        </div>
      </section>
      <section className="guide-section rule-lab" aria-labelledby="rule-title">
        <div>
          <span className="eyebrow">TRY THE LOGIC</span>
          <h2 id="rule-title">What deserves a closer look?</h2>
          <p>
            Move the heat-output slider and change sensor confidence to see the
            prototype’s review rule in action.
          </p>
          <span className="lab-disclaimer">
            Illustrative inputs · not live observations or NASA’s detection
            algorithm.
          </span>
        </div>
        <div className="rule-controls">
          <label htmlFor="learning-frp">
            Peak fire radiative power{" "}
            <output htmlFor="learning-frp">{frp} MW</output>
          </label>
          <input
            id="learning-frp"
            type="range"
            min="0"
            max="100"
            step="1"
            value={frp}
            onChange={(e) => setFrp(Number(e.target.value))}
          />
          <div className="range-ticks">
            <span>0 MW</span>
            <span>50 MW</span>
            <span>100 MW</span>
          </div>
          <label htmlFor="learning-confidence">Sensor confidence</label>
          <select
            id="learning-confidence"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="nominal">Nominal</option>
            <option value="high">High</option>
            <option value="unknown">Unknown</option>
          </select>
          <div
            className={`priority-result priority-${priority.toLowerCase()}`}
            aria-live="polite"
          >
            <span className="guide-mono">REVIEW PRIORITY</span>
            <strong>{priority}</strong>
            <p>
              {priority === "Elevated"
                ? "At least 50 MW with nominal or high confidence."
                : priority === "Standard"
                  ? "At least 10 MW; the elevated-priority condition is not met."
                  : "Below 10 MW in this prototype’s rule."}{" "}
              This ranks attention; it does not measure incident probability.
            </p>
          </div>
        </div>
      </section>
      <section className="guide-section" id="architecture">
        <div className="guide-heading">
          <div>
            <span className="eyebrow">UNDER THE HOOD</span>
            <h2>The system behind the screen.</h2>
          </div>
          <p>
            Two deployment modes. One review workflow.
            <br />
            Select a mode to inspect its data path.
          </p>
        </div>
        <div
          className="architecture-switch"
          role="group"
          aria-label="Deployment explanation"
        >
          <button
            aria-pressed={mode === "hosted"}
            onClick={() => setMode("hosted")}
          >
            <Globe2 size={16} />
            Hosted demo {STATIC_DEMO && <small>YOU ARE HERE</small>}
          </button>
          <button
            aria-pressed={mode === "server"}
            onClick={() => setMode("server")}
          >
            <Server size={16} />
            NASA-connected server {!STATIC_DEMO && <small>YOU ARE HERE</small>}
          </button>
        </div>
        <p className="mode-explanation">
          {mode === "hosted"
            ? "This GitHub Pages build runs in your browser. Its fixed, synthetic replay lets you demonstrate the workflow without a running server."
            : "The Node deployment fetches NASA FIRMS observations and serves the React workspace and API from the same origin."}{" "}
          Switching this explanation does not change your connection.
        </p>
        <div
          className="architecture-path"
          aria-label={
            mode === "hosted"
              ? "GitHub Pages to React browser to synthetic replay and local storage"
              : "NASA FIRMS to Node API to SQLite and React workspace"
          }
        >
          <article>
            <span className="guide-mono">01 / SOURCE</span>
            {mode === "hosted" ? <Globe2 /> : <Satellite />}
            <h3>{mode === "hosted" ? "GitHub Pages" : "NASA FIRMS"}</h3>
            <p>
              {mode === "hosted"
                ? "Compiled Vite site + fixed replay"
                : "Public CSV / optional Area API"}
            </p>
          </article>
          <ArrowRight className="path-arrow" />
          <article>
            <span className="guide-mono">02 / PROCESS</span>
            {mode === "hosted" ? <Layers3 /> : <Server />}
            <h3>
              {mode === "hosted" ? "React + static adapter" : "Node.js API"}
            </h3>
            <p>
              {mode === "hosted"
                ? "Browser-side filters and review rules"
                : "Validate · group · Python XGBoost jobs"}
            </p>
          </article>
          <ArrowRight className="path-arrow" />
          <article>
            <span className="guide-mono">03 / WORKSPACE + STORAGE</span>
            <Database />
            <h3>{mode === "hosted" ? "This browser" : "React + SQLite"}</h3>
            <p>
              {mode === "hosted"
                ? "Local reviews and watch areas; session-only demo login"
                : "Map, model evidence and reviews; SQLite reports + model artifacts"}
            </p>
          </article>
        </div>
        <div className="backend-facts">
          <article>
            <h3>Connections</h3>
            <p>
              NASA FIRMS supplies thermal detections. Overpass provides optional
              OSM context. OpenStreetMap supplies basemaps; dated NASA GIBS
              imagery is an optional map layer. Earth textures are illustrative,
              not live observations.
            </p>
          </article>
          <article>
            <h3>Resilience</h3>
            <p>
              The Node feed cache lasts 5 minutes and concurrent requests are
              combined. Upstream requests time out after 25 seconds. A failed
              refresh returns a clearly marked stale snapshot when available, or
              an error.
            </p>
          </article>
          <article>
            <h3>Access & integrity</h3>
            <p>
              NASA keys stay on the server. External Node binding requires a
              workspace token. Input validation, same-origin writes and prepared
              SQLite statements protect the API. The district PIN is role
              simulation, not real authentication.
            </p>
          </article>
        </div>
        <div className="api-heading">
          <div>
            <span className="eyebrow">THE API CONTRACT</span>
            <h3>Open a route. See its job.</h3>
          </div>
          <span>Node deployment only · examples do not send requests</span>
        </div>
        <div className="api-routes">
          {routes.map((route) => (
            <details key={route.path}>
              <summary>
                <span className="http-method">{route.method}</span>
                <code>{route.path}</code>
                <span className="route-title">{route.title}</span>
                <ChevronRight size={17} />
              </summary>
              <div>
                <p>{route.text}</p>
                <pre>{route.code}</pre>
              </div>
            </details>
          ))}
        </div>
        <div className="source-links">
          <span>UPSTREAM DOCUMENTATION</span>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/api/area/"
            target="_blank"
            rel="noreferrer"
          >
            NASA FIRMS Area API ↗
          </a>
          <a
            href="https://github.com/sankirtansyadavofficial-Hack/ThermalGuard"
            target="_blank"
            rel="noreferrer"
          >
            Read the implementation ↗
          </a>
        </div>
      </section>
    </>
  );
}
