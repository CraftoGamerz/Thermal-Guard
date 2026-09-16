# Implementation plan

## Phase 22 (dependency order)

22.1 Document Pages blank-screen diagnosis, static limitations and contributor constraint. Done.

22.2 Inspect public branch/page and identify the missing/mismatched deployment artifact. Done; the deployed base was `/ThermalGuard/` but the repository Pages path is `/Thermal-Guard/`.

22.3 Rebuild/publish repository-owned static artifact and verify public asset paths. Done.

22.4 Verify public page load and contributor identity. Done.

## Phase 21 (dependency order)

21.1 Document source/Pages destination and static-build limitation. Done.

21.2 Update the repository-owned Pages deployment destination. Done; depends 21.1.

21.3 Verify the deployment script/build and push a user-authored source commit. Done; depends 21.2.

## Phase 20 (dependency order)

20.1 Document bounded local cache/recovery and release-control constraints. Done.

20.2 Add/test deterministic validation, byte/count compaction, summary and app-key clear helpers. Done; depends 20.1.

20.3 Surface local snapshot-cache status and explicit clear in Data & methodology. Done; depends 20.2.

20.4 Validate cache recovery/clear boundaries, browser/mobile workflow, builds and lint. Done; depends 20.3.

## Phase 19 (dependency order)

19.1 Document local search and non-resolution verification-cue constraints. Done.

19.2 Add/test saved-field case search and next-recorded-check projection. Done; depends 19.1.

19.3 Render the accessible finder, clear state, result summary and case cue. Done; depends 19.2.

19.4 Validate combined filters, desktop/mobile layout, build and lint. Done; depends 19.3.

## Phase 18 (dependency order)

18.1 Document saved-evidence return and presentation-only ordering constraints. Done.

18.2 Add/test deterministic case ordering from existing saved fields. Done; depends 18.1.

18.3 Add Case Desk evidence/Mission return actions and accessible ordering control. Done; depends 18.2.

18.4 Validate saved-evidence handoff, filters, desktop/mobile workflow, builds and lint. Done; depends 18.3.

## Phase 17 (dependency order)

17.1 Document deterministic workload-board scope and non-inference constraints. Done.

17.2 Add/test pure case status/owner/checklist aggregation. Done; depends 17.1.

17.3 Render interactive Case desk workload board and progress surfaces. Done; depends 17.2.

17.4 Validate desktop/mobile behavior, fallback, build and lint. Done; depends 17.3.

## Phase 16 (dependency order)

16.1 Document Firestore mirror boundaries, Firebase Auth/rule requirements and offline fallback. Done.

16.2 Add environment-based Firebase modular client, Firestore rules and configuration templates. Done.

16.3 Wire non-blocking case mirror plus realtime activity listener/status into Case desk. Done.

16.4 Verify local fallback, lint/build/tests and document Firebase Console actions that require the project owner. Done. Firebase returned permission-denied before user-owned Firestore rules are deployed; fallback was visibly verified.

## Phase 15 (dependency order)

15.1 Document shared-local coordination scope and non-authentication constraints. Done.

15.2 Persist self-declared editor metadata with case activity, preserving old records and validation. Done.

15.3 Add Case desk pulse, owner summaries, explicit local refresh/poll behavior and responsive UI. Done.

15.4 Test API persistence and browser refresh/case interaction; build and lint. Done.

## Phase 14 (dependency order)

14.1 Document constraints for local, two-event measurement comparison. Done.

14.2 Add accessible queue selection, comparison tray, evidence links and stale-selection behavior. Done.

14.3 Validate unit/build/lint/browser and responsive queue behavior. Done.

## Phase 13 (dependency order)

13.1 Document actionable-chart, report-local location-ranking and landing-contrast constraints. Done.

13.2 Build accessible chart/scatter drill-down interactions and explicit review/evidence navigation. Done.

13.3 Add deterministic report-local location attention ranking with tests and no mutation of XGBoost/queue state. Done.

13.4 Replace discontinuous landing shadow treatment with continuous local contrast and small data/motion feedback. Done.

13.5 Build, lint and run focused browser/unit checks across workspace, analyser, landing and mobile. Done.

## Phase 12 (dependency order)

12.1 Compare blueprint to existing verified capabilities, document truthful selected scope and deferred claims. Done.

12.2 Add bounded client snapshot storage plus online/offline state and exact-query fallback. Depends 12.1.

12.3 Replace unverified/credentialed map dependencies with resilient Leaflet GIS boundary, ring, coordinate and GeoJSON controls. Depends 12.2.

12.4 Wire manager-area/offline messaging into Overview and verify desktop/mobile, failure and static behaviour. Depends 12.3.

12.5 Run build, lint, unit/model/browser checks and document observed limitations. Depends 12.4.

## Phase 11 (dependency order)

11.1 Ground checkout, verify integrations, update contracts and feature inventory.
11.2 Implement observation archive/history import, response-context providers, contacts/cases persistence and tests. Depends 11.1.
11.3 Implement automatic analysis controller, evidence hypothesis rules and operational pages with workflows/tests. Depends 11.2.
11.4 Build oversized scroll-Earth story, hold/drag dolly, sticky branded navigation/team and command palette; responsive/reduced-motion QA. Depends 11.3.
11.5 Full build/lint/unit/model/browser checks, live integration checks and fixes; update docs and feature inventory. Depends 11.4.

Phases 1–9 are recorded in TODO; do not redo them.

## Phase 10 — real-data analysis

10.1 Inspect current code, confirm scope, document contracts and install isolated pinned model runtime.

10.2 Add genuine temporal-split XGBoost regression, measured-history calculations and input validation; test leakage boundaries, insufficient/missing data and metrics. Depends 10.1.

10.3 Add bounded async backend jobs, persistence, provenance and real timings; verify NASA data and failure paths. Depends 10.2.

10.4 Replace simulated Smart Analyser with backend job UI, input CSV, model card, charts/table, evidence drilldown and exports; preserve other features and static-mode honesty. Depends 10.3.

10.5 Run unit/API/model tests, build/lint, fresh NASA end-to-end and desktop/mobile UI QA; fix failures. Depends 10.4.

10.6 Document exact setup, observed validation outcomes and limitations; leave local application ready. No GitHub publication requested for phase 10. Depends 10.5.
