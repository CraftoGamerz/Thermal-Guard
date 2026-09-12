# Implementation plan

Phases 1–9 are recorded in TODO; do not redo them.

## Phase 10 — real-data analysis

10.1 Inspect current code, confirm scope, document contracts and install isolated pinned model runtime.

10.2 Add genuine temporal-split XGBoost regression, measured-history calculations and input validation; test leakage boundaries, insufficient/missing data and metrics. Depends 10.1.

10.3 Add bounded async backend jobs, persistence, provenance and real timings; verify NASA data and failure paths. Depends 10.2.

10.4 Replace simulated Smart Analyser with backend job UI, input CSV, model card, charts/table, evidence drilldown and exports; preserve other features and static-mode honesty. Depends 10.3.

10.5 Run unit/API/model tests, build/lint, fresh NASA end-to-end and desktop/mobile UI QA; fix failures. Depends 10.4.

10.6 Document exact setup, observed validation outcomes and limitations; leave local application ready. No GitHub publication requested for phase 10. Depends 10.5.
