# Technical stack

- Runtime: Node.js 24.15.0 (package requires >=24); built-in HTTP, SQLite, crypto and child_process.
- Frontend: React/React DOM 19.2.8; Vite 8.2.2; @vitejs/plugin-react 6.1.0; Leaflet 1.9.4; Three.js 0.186.0; lucide-react 1.41.0.
- Model runtime: Python 3.12.x (verified host 3.12.14), isolated `.venv`; XGBoost 3.1.3, NumPy 2.2.6, SciPy 1.15.3. Core DMatrix/train API, no scikit-learn dependency. CPU hist trees, fixed seed, two threads.
- Persistence: existing built-in node:sqlite WAL for snapshots/events/reviews/areas plus analysis_runs; model JSON and run report under ignored data/analysis. No cloud database.
- Auth: optional server-only WORKSPACE_TOKEN, same-origin API; demo PIN is not auth.
- Deploy: `npm run dev` uses Vite middleware + Node; `npm run build && npm start` same-origin full stack. Python path defaults to project .venv, override PYTHON_BIN. Pages remains separate static replay. No new hosting service.
- Tests: node:test, Playwright 1.62.1, Oxlint 1.79.0; Python unittest. Existing gh-pages 6.3.0 unchanged. Pin Python requirements in analyser/requirements.txt.
