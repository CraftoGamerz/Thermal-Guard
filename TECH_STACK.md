# Technical stack

Phase 21 retains `gh-pages` 6.3.0 and updates only its repository destination in `scripts/deploy-pages.mjs` to `https://github.com/CraftoGamerz/Thermal-Guard.git`. Source and Pages deploy branches remain separate; the static build cannot run the Node/Python backend.

Phase 20 retains browser `localStorage` and adds no service worker, cache library, remote cache or telemetry. `offlineCache.js` supplies deterministic validation, count/byte compaction, summary and app-key-only clear operations; pure cache functions are covered by Node tests. It does not cache credentials or user-entered case/contact data.

Phase 19 adds only deterministic client helpers in `caseBoard.js`, tested through Node's built-in `node:test`. Search and next-check guidance use already downloaded case values—no API, persistence, telemetry or cloud query is added.

Phase 18 uses existing React navigation, focus state and EvidenceDrawer callbacks. Ordering is a dependency-free, tested browser projection of saved case values; no new endpoint, NASA request, map provider or cloud write is introduced.

Phase 17 uses a dependency-free deterministic browser projection of existing case records. `caseBoard.js` is tested with node:test and does not introduce an API, database field or cloud aggregation.

Phase 16 adds Firebase JavaScript SDK 12.19.0, using modular `firebase/app`, `firebase/auth` and `firebase/firestore`. Browser-only Vite configuration is provided through `VITE_FIREBASE_*` build variables. Firestore Anonymous Auth and the supplied `firestore.rules` must be enabled/deployed in Firebase Console/CLI before cloud sync works. Analytics is deliberately not initialized.

Phase 15 uses the existing React 19.2.8 polling effect and local Node/SQLite cases route; no websocket, push service, account provider or dependency is added. Case desk polls only while open at 30 seconds, and uses the existing `GET /api/cases` / `PATCH /api/cases/:id` contracts.

Phase 14 adds no dependency. `tests/comparison-browser.mjs` uses the existing Playwright 1.62.1 runner against a local full-stack workspace to validate two selected queue events, evidence deep-link, clear action and a 390px no-overflow layout.

Phase 13 adds no service, dependency or endpoint. Chart drill-down uses React state and semantic native buttons/dialog-like panels. Location attention ranking is a deterministic browser-side projection of an already completed real-analysis report; it does not modify the Python XGBoost artifact, SQLite evidence, queue priority or cached feed.

Phase 12: retains Leaflet 1.9.4; removes the hard-coded Google Maps client key and third-party Google map runtime. Browser `localStorage` holds bounded, versioned last-successful event snapshots and view preference only; it is not encrypted, synchronized, authority-grade or a replacement for a service-worker/offline map package. No new data source or package is introduced.

Phase 11 retains all pinned frontend packages and current Python installer/pins in analyser/requirements.txt (runtime package manifest is authoritative for installer compatibility). No new npm runtime dependency. Three.js + CSS sticky/scroll transforms for story; native React controls for command palette/charts/operations. Node built-in SQLite persists cases, contacts, observation history. External read-only integrations: Overpass JSON (OSM contributor mapping) and Open-Meteo forecast/current endpoint (weather model output, attribution required). Existing strict online NASA defaults are preserved. New Node tests and Playwright operations/landing tests; no backend hosting modifications.

- Runtime: Node.js 24.15.0 (package requires >=24); built-in HTTP, SQLite, crypto and child_process.
- Frontend: React/React DOM 19.2.8; Vite 8.2.2; @vitejs/plugin-react 6.1.0; Leaflet 1.9.4; Three.js 0.186.0; lucide-react 1.41.0.
- Model runtime: Python 3.12.x (verified host 3.12.14), isolated `.venv`; current compatible installation verified with XGBoost 3.4.1, NumPy 2.5.3, SciPy 1.18.1. Existing requirements use lower bounds, not exact pins; these are the tested resolved versions. Core DMatrix/train API, no scikit-learn dependency. CPU hist trees, fixed seed, two threads.
- Persistence: existing built-in node:sqlite WAL for snapshots/events/reviews/areas plus analysis_runs; model JSON and run report under ignored data/analysis. No cloud database.
- Auth: optional server-only WORKSPACE_TOKEN, same-origin API; demo PIN is not auth.
- Deploy: `npm run dev` uses Vite middleware + Node; `npm run build && npm start` same-origin full stack. Python path defaults to project .venv, override PYTHON_BIN. Pages remains separate static replay. No new hosting service.
- Tests: node:test, Playwright 1.62.1, Oxlint 1.79.0; Python unittest. Existing gh-pages 6.3.0 unchanged. Pin Python requirements in analyser/requirements.txt.
