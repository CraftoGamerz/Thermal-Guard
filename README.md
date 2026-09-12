# ThermalGuard

CompileX's satellite intelligence prototype. React/Vite, a Node API and SQLite, using actual NASA FIRMS thermal observations.

## Start

Requires Node.js 24 or newer. From this folder:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Vite and the API share one server. No NASA key is required for the public South Asia feeds.

### Real XGBoost model setup

The current workspace already has the isolated model environment installed. On a new machine, install Python 3.12, then run the following once before using Smart Analyser:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r analyser/requirements.txt
npm run dev
```

On Linux/macOS use `python3.12 -m venv .venv` and `.venv/bin/python -m pip install -r analyser/requirements.txt`. Set server-only `PYTHON_BIN` if using a different compatible environment. Pins: XGBoost 3.1.3, NumPy 2.2.6, SciPy 1.15.3. No NASA key or paid service is needed for the default path.

Open Smart Analyser in **Live feed** mode and choose a sensor, extent and time window. **Run real XGBoost analysis** performs actual Node/Python work: NASA fetch → validation → training → temporal evaluation → scoring. The displayed duration is measured, not an inserted animation delay. One heavy job can run at a time; network requests timeout after 25 seconds and the model after 120 seconds. If Python/data is unavailable, an actionable error replaces the report; fake scores are never substituted.

The model estimates **same-observation FRP**, not next-day fire risk or fire cause. It trains on the first UTC days of the seven-day regional NASA dataset, uses the penultimate day for residual ranking and tests on the last day (which may be partial). The UI publishes actual sample counts, MAE/RMSE, training-median comparison, training gain importance and per-input tree contributions. No hazard labels, fabricated weather or imagined facility baselines are used.

CSV mode accepts up to 2 MB / 15,000 rows with `latitude,longitude,frp,acq_date,acq_time,bright_ti4,bright_ti5,scan,track,daynight`. Use FIRMS units: FRP in MW, brightness in K, pixel dimensions in km, UTC date YYYY-MM-DD, time HHMM and D/N. Select the correct satellite source. Uploaded data is unverified and is scored in full, not cropped to the chosen extent; it never becomes training data or a NASA review record. Missing/out-of-range model fields are excluded and counted rather than guessed. `analyser/hotspots_data.csv` is the **legacy synthetic demo**, not a validated training dataset.

Reports include observed/model FRP, residual percentile (not probability), same-sensor earlier detections within 5 km, provenance and real timings. JSON includes full evidence; CSV contains scored rows and source metadata. Historical comparisons use only prior UTC days in the available week, not a 30-day or annual facility baseline. In-sample/calibration membership is visible. A 95th-percentile excess is an exploratory review flag, not proof of an emergency.

Completed reports persist in SQLite `analysis_runs`; retrieve a known run with `GET /api/analysis/jobs/:id`. `data/analysis/<run-id>/model.json` and `training.json` retain the actual model and exact normalized NASA training snapshot; the report records its SHA-256 digest. The `.venv/` and `data/` directories are ignored by Git. Back up these files together; repeated runs retain artifacts and consume local disk. Leaving the analysis screen stops browser polling but an already accepted backend job finishes. A server restart interrupts in-flight work; rerun when prompted. No source or Pages deployment is performed by analysis.

To run the compiled build:

```powershell
npm run build
npm start
```

The Vite output is `dist/`. The Node server must run for `/api` and live NASA ingestion. The public [GitHub Pages build](https://sankirtansyadavofficial-hack.github.io/ThermalGuard/) uses a visibly labeled synthetic replay with browser-local reviews and watch areas because Pages cannot run Node/SQLite and NASA blocks cross-origin browser downloads.

## Earth explorer and district demo

The index opens a navigable 3D Earth: drag or touch to rotate, wheel/pinch to zoom, or use the labelled buttons and arrow keys. Select an orange pilot marker or district card to focus Earth, then inspect the area in the workspace. The cartographic globe uses bundled Natural Earth land data, not Google imagery or live incident markers. A WebGL failure leaves all district/navigation controls available.

The landing globe progressively applies the previous index page's Earth day, night-light, cloud, terrain and water texture treatment from the public Three Globe example mirrors. If those images cannot load, the bundled Natural Earth globe remains interactive. No Google Earth assets, map API key or hidden browser credential is used.

Select **District manager**, choose Jamnagar, Ahmedabad, Ludhiana or Dhanbad, optionally enter a name and use public PIN **2026**. This is explicitly a simulated session, not real authentication. It preselects an approximate district bounding box and prefills the review name. Refresh restores the session; Sign out clears it. Other geographic filters remain accessible; no district access restrictions are claimed. Hosted reviews are local to the browser, not centrally synchronized.

Source repository: [sankirtansyadavofficial-Hack/ThermalGuard](https://github.com/sankirtansyadavofficial-Hack/ThermalGuard). Source is on `main`; compiled files only are on `gh-pages`.

## Implemented

- Real NOAA-20, NOAA-21 and S-NPP VIIRS downloads: 24h, 48h and 7d.
- Interactive dark/street maps and dated NASA MODIS imagery, with attribution.
- Geographic extent, sensor, confidence, FRP, priority, decision and text filters.
- CSV validation, deduplication, approximate 1 km grid/UTC day grouping and explainable review rules.
- Evidence drawer with actual acquisition samples, source confidence, version and timestamps.
- On-demand OSM industrial context. If Overpass times out, the app shows an explicit error and keeps the satellite evidence available.
- Confirm/reject/defer decisions, six human-assigned source classes and persistent SQLite audit history.
- Saved areas, observed-activity analytics and filtered CSV/GeoJSON evidence exports.
- Five-minute caching, coalesced requests, timestamped stale recovery and explicitly synthetic replay.
- Actual CPU XGBoost, asynchronous analysis API, CSV input scoring, temporal benchmark, anomaly evidence chart/table and reproducible model artifacts.

## Configuration

Copy `.env.example` to `.env` if needed. Never commit secrets.

| Variable          | Purpose                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`            | Default 4173.                                                                                                                                                                               |
| `PYTHON_BIN` | Optional model Python executable path; defaults to the project's .venv. Never expose it as a VITE_ variable. |
| `HOST`            | Default 127.0.0.1.                                                                                                                                                                          |
| `FIRMS_MAP_KEY`   | Optional server-only [NASA FIRMS key](https://firms.modaps.eosdis.nasa.gov/api/map_key/). Enables Area API for 1/2-day requests; 7-day requests use public CSV. Never use a `VITE_` prefix. |
| `WORKSPACE_TOKEN` | Optional local API bearer token. At least 24 characters required before non-loopback binding. Enter this in Connection settings, not the NASA key.                                          |

External deployment needs an HTTPS reverse proxy and persistent storage for `data/`. A shared workspace token is not individual identity verification or district permissions. Do not expose the default local mode publicly. SQLite uses WAL; back up the database and its WAL consistently before migration.

Publish the honest browser-only presentation build with `npm run deploy:pages`. This writes the compiled `dist/` contents to `gh-pages`; source code remains on `main`.

## Demonstrate

1. Explore Earth, select a pilot district, and enter the workspace as guest or demo manager. In the Node build, show Live feed retrieval and acquisition timestamps; Pages is explicitly replay-only.
2. Change the area or satellite. Map, metrics, queue and exports share the same filters.
3. Select an event. Explain FRP and sensor confidence, then inspect observations.
4. Request OSM facility context when available. Proximity alone does not identify a fire source.
5. Enter an analyst name, decision, classification and rationale. Save and reopen the audit trail.
6. Export evidence. Use Demo replay explicitly if offline: its fixed 12 September 2026 scenario is synthetic throughout the interface.

## Verify

```powershell
npm test
npm run test:model
npm run lint
npm run build
# With npm start running and Chrome installed:
npm run test:browser
# Pages checks: first run npm run build:pages, then in another terminal:
# npx vite preview --host 127.0.0.1 --port 4176 --base=/ThermalGuard/
npm run test:earth
# With full-stack server running on 4175 (or set ANALYSIS_TEST_URL):
npm run test:analysis
```

Set `BROWSER_EXECUTABLE` for another Chrome/Chromium path. Browser checks create/remove their own synthetic reviews and temporary watch area, exercise exports and mobile layouts, and save screenshots to ignored `.build/`. API tests use an isolated database. Live NASA checks are separate.

## Scientific boundaries

`rules-1.0.0` is a transparent screening baseline, not a trained classifier. Elevated priority means peak FRP >=50 MW and nominal/high sensor confidence. Standard means other events >=10 MW; Routine means the rest. These are prototype thresholds, not calibrated incident probabilities. Source class remains uncertain until human review.

Grid/day boundaries can split one physical incident. Repeated detections are not independent incident confirmations. India extent is a rectangle and includes neighboring territory; the public download covers South Asia even if a custom extent lies elsewhere.

A trained six-class cause classifier, long-term facility baselines, verified facility overlap, Sentinel/WorldCover/ERA5 fusion, verified user roles and emergency dispatch remain future work. The actual XGBoost FRP regression now has measured temporal error; this is not incident-classification accuracy, spatial generalization or safety validation. Satellite overpasses and clouds limit visibility. No claim of continuous surveillance or official warning service is made.

## Source of truth

Read `PRD.md`, `APP_FLOW.md`, `TECH_STACK.md`, `FRONTEND_GUIDELINES.md`, `BACKEND_STRUCTURE.md`, `IMPLEMENTATION_PLAN.md` and `TODO.md` before extending the app.

Active code: `src/workspace/`, `server/`, `tests/`. Old globe/demo components remain as reference source but are not imported or included in the shipped JavaScript. Their fake accounts and simulated records are not active.

## Primary sources

- [NASA FIRMS downloads](https://firms.modaps.eosdis.nasa.gov/active_fire/)
- [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area/)
- [NASA GIBS imagery documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [OpenStreetMap Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenStreetMap license and attribution](https://www.openstreetmap.org/copyright)
- [Natural Earth public-domain cartographic data](https://www.naturalearthdata.com/about/terms-of-use/)
- [Three.js OrbitControls](https://threejs.org/docs/#OrbitControls)
- [Three Globe example Earth assets](https://github.com/vasturiano/three-globe/tree/master/example/img)
