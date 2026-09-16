import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Flame,
  Globe2,
  MapPin,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { DISTRICTS } from "./districts";
import { STATIC_DEMO } from "./client";
import LandingGuide from "./LandingGuide";
import { DESTINATIONS } from "./navigation";
import "./story.css";
const Earth = lazy(() => import("./Earth"));
export default function Landing({ onEnter, manager }) {
  const [district, setDistrict] = useState(
    DISTRICTS.find((d) => d.id === manager?.districtId) || DISTRICTS[0],
  );
  const [error, setError] = useState("");
  const dialog = useRef(null);
  const story = useRef(null);
  const [storyMotion, setStoryMotion] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const el = story.current,
      mq = matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    const update = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      const p = Math.max(
        0,
        Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
      );
      const animated = storyMotion && !mq.matches;
      el.style.setProperty(
        "--story-shift",
        `${animated ? 14 - 34 * Math.sin(p * Math.PI) : 14}vw`,
      );
      el.style.setProperty(
        "--story-scale",
        String(animated ? 1 + 0.07 * Math.sin(p * Math.PI) : 1),
      );
      el.dataset.scrollProgress = animated ? String(p) : "0";
      el.dataset.motion = animated ? "on" : "off";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    mq.addEventListener("change", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mq.removeEventListener("change", schedule);
    };
  }, [storyMotion]);
  function login(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("pin") !== "2026") {
      setError("Use the public demo PIN: 2026. This is not a real account.");
      return;
    }
    const selected = DISTRICTS.find((d) => d.id === form.get("district"));
    dialog.current.close();
    onEnter(selected, {
      districtId: selected.id,
      name:
        String(form.get("name")).trim().slice(0, 60) ||
        `${selected.name} manager`,
    });
  }
  return (
    <div className="earth-home cinematic">
      <header className="earth-header">
        <a href="#home" className="earth-brand">
          <span>
            <Flame size={24} />
          </span>
          Thermal<span className="light-name">Guard</span>
          <small className="team-signature">BY COMPILEX</small>
        </a>
        <nav aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#approach">How it works</a>
          <a href="#architecture">The technology</a>
          <a href="#team">Team</a>
          <details className="site-directory">
            <summary>All locations</summary>
            <div>
              {DESTINATIONS.map((d) => (
                <a href={`#${d.id}`} key={d.id}>
                  {d.label}
                  <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
          </details>
          <button onClick={() => onEnter(null, manager)}>
            Open workspace <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <main>
        <section ref={story} className="earth-hero earth-story">
          <div className="earth-visual">
            <div className="orbital-shape orbit-one" />
            <div className="orbital-shape orbit-two" />
            <div className="story-grid" />
            <div className="earth-view-label">
              <Globe2 size={14} /> ORBITAL VIEW{" "}
              <span>HOLD + DRAG TO DOLLY / RELEASE TO EASE BACK</span>
            </div>
            <Suspense
              fallback={
                <div className="earth-loading">Loading Earth explorer…</div>
              }
            >
              <Earth district={district} onSelect={setDistrict} />
            </Suspense>
            <div className="earth-coordinate">
              <span>SELECTED PILOT</span>
              <strong>
                {district.name}, {district.state}
              </strong>
              <code>
                {district.lat.toFixed(2)}° N / {district.lon.toFixed(2)}° E
              </code>
            </div>
          </div>
          <div className="story-chapters">
            <div className="earth-intro">
              <div className="eyebrow">
                <span /> COMPILEX / SATELLITE INTELLIGENCE
              </div>
              <h1>
                The planet
                <br />
                has a <em>pulse.</em>
              </h1>
              <p>
                Read the heat. Understand the difference. Turn a signal from
                space into a grounded local investigation.
              </p>
              <div className="earth-cta">
                <button
                  className="primary"
                  onClick={() => onEnter(district, manager)}
                >
                  Explore {district.name} <ArrowRight size={17} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setError("");
                    dialog.current.showModal();
                  }}
                >
                  District manager <ShieldCheck size={16} />
                </button>
              </div>
              <div className="earth-data-note">
                <span className="status-dot replay" />
                {STATIC_DEMO
                  ? "Interactive demo · synthetic replay"
                  : "NASA-connected prototype · live feed in workspace"}
              </div>
              <div className="earth-mini-flow">
                <span>
                  01 <b>Observe</b>
                </span>
                <i />
                <span>
                  02 <b>Investigate</b>
                </span>
                <i />
                <span>
                  03 <b>Review</b>
                </span>
              </div>
              <a className="hero-learn" href="#approach">
                Follow a signal from space <ArrowDown size={15} />
              </a>
              <button
                className="story-motion"
                aria-pressed={storyMotion}
                onClick={() => setStoryMotion((v) => !v)}
              >
                {storyMotion ? "Pause scroll motion" : "Enable scroll motion"}
              </button>
            </div>
            <article className="story-chapter chapter-right">
              <span className="eyebrow">
                02 / INTELLIGENCE, NOT ASSUMPTIONS
              </span>
              <h2>
                A hotspot.
                <br />
                Six possible
                <br />
                <em>stories.</em>
              </h2>
              <p>
                Industrial fire, flare, process heat, wildfire, agricultural
                burning—or not enough evidence. Automatic XGBoost finds unusual
                signals. Context helps you ask the right question.
              </p>
              <a href="#mission" className="story-link">
                Enter Mission control <ArrowUpRight size={18} />
              </a>
              <div className="story-chips">
                <span>NASA observations</span>
                <span>Real XGBoost</span>
                <span>Human judgment</span>
              </div>
            </article>
            <article className="story-chapter chapter-left">
              <span className="eyebrow">03 / FROM PIXEL TO PEOPLE</span>
              <h2>
                Local context.
                <br />A clearer
                <br />
                <em>next step.</em>
              </h2>
              <p>
                Find mapped hydrants and public offices. Compare thermal
                history. Assign an investigation and keep the evidence trail.
                Built for managers—not just maps.
              </p>
              <a href="#resources" className="story-link">
                Explore response tools <ArrowUpRight size={18} />
              </a>
              <div className="story-chips">
                <span>Response resources</span>
                <span>Activity trends</span>
                <span>Case desk</span>
              </div>
            </article>
          </div>
        </section>
        <section className="pilot-section" aria-label="Pilot districts">
          <div className="pilot-heading">
            <div>
              <span className="eyebrow">LOCAL CONTEXT. CLEARER DECISIONS.</span>
              <h2>Choose your area of focus.</h2>
            </div>
            <span>
              04 pilot presets{" "}
              <small>Approximate extents, not official boundaries</small>
            </span>
          </div>
          <div className="district-grid">
            {DISTRICTS.map((d, i) => (
              <button
                key={d.id}
                className={`district-card ${district.id === d.id ? "active" : ""}`}
                aria-pressed={district.id === d.id}
                onClick={() => setDistrict(d)}
              >
                <div>
                  <span>
                    0{i + 1} / {d.state}
                  </span>
                  <MapPin size={17} />
                </div>
                <h3>{d.name}</h3>
                <p>{d.focus}</p>
                <ArrowUpRight className="district-arrow" size={20} />
              </button>
            ))}
          </div>
          <div className="district-context">
            <ScanLine size={22} />
            <p>
              <strong>{district.name}: </strong>
              {district.description}
            </p>
            <button onClick={() => onEnter(district, manager)}>
              Inspect area <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <LandingGuide />
        <section className="team-section" id="team">
          <div>
            <span className="eyebrow">THE PEOPLE BEHIND THE PIXELS</span>
            <h2>
              We are <em>CompileX.</em>
            </h2>
            <p>
              Building a clearer bridge between satellite evidence and local
              decisions.
            </p>
          </div>
          <div className="team-grid">
            {[
              "Sankirtans Yadav",
              "Abusina Hossain",
              "Adil Mukhtar",
              "Saranjaya Yadav",
            ].map((name, i) => (
              <article key={name}>
                <span>0{i + 1}</span>
                <div className="team-monogram">
                  {name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <h3>{name}</h3>
                <small>THERMALGUARD / CONTRIBUTOR</small>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="earth-footer">
        <span>ThermalGuard / CompileX</span>
        <p>
          Research prototype. Not an emergency warning service.
          {STATIC_DEMO &&
            " Hosted reviews stay in this browser; live NASA ingestion requires the Node API."}
        </p>
        <a
          href="https://github.com/sankirtansyadavofficial-Hack/ThermalGuard"
          target="_blank"
          rel="noreferrer"
        >
          Project source <ArrowUpRight size={14} />
        </a>
      </footer>
      <dialog
        ref={dialog}
        className="manager-dialog"
        aria-labelledby="manager-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <button
          className="manager-close icon-button"
          aria-label="Close manager login"
          onClick={() => dialog.current.close()}
        >
          <X size={20} />
        </button>
        <span className="demo-badge">
          <ShieldCheck size={14} /> DEMO ACCESS
        </span>
        <h2 id="manager-title">
          Your district.
          <br />
          Your review desk.
        </h2>
        <p>
          Simulate a district manager session. No real account, password or
          district authorization is created.
        </p>
        <form onSubmit={login}>
          <label>
            Pilot district
            <select
              name="district"
              key={district.id}
              defaultValue={district.id}
            >
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.state}
                </option>
              ))}
            </select>
          </label>
          <label>
            Display name <small>(optional)</small>
            <input
              name="name"
              maxLength={60}
              placeholder="e.g. Sankirtan"
              autoComplete="off"
            />
          </label>
          <label>
            Public demo PIN
            <input
              name="pin"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              placeholder="2026"
              autoComplete="off"
              aria-describedby="pin-hint"
            />
          </label>
          <small id="pin-hint">
            Enter 2026 · for demonstration only. Do not use a real password.
          </small>
          {error && (
            <p role="alert" className="manager-error">
              {error}
            </p>
          )}
          <button className="primary" type="submit">
            Enter district workspace <ArrowRight size={17} />
          </button>
        </form>
      </dialog>
    </div>
  );
}
