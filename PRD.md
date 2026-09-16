# ThermalGuard prototype

## Phase 21 — release destination configuration (17 September 2026)

Set the repository-owned GitHub Pages deployment script to publish the compiled static presentation build only to `CraftoGamerz/Thermal-Guard`'s `gh-pages` branch. This does not publish in this step, modify the live Node/NASA backend, expose environment files, or alter source history.

Success: the deployment script contains the repository-owned URL and output text; future manual releases run `npm run deploy:pages` from the clean publishing checkout after a successful source push.

## Phase 20 — bounded offline cache and release controls (17 September 2026)

Harden the browser snapshot cache for a production-ready release candidate. Retain only valid, exact live-query snapshots; cap browser storage by both entry count and serialized byte budget; evict oldest snapshots deterministically; preserve older valid snapshots if a newly fetched response cannot fit; expose an accessible cache summary and user-initiated clear control in Data & methodology. Cached observations must remain visibly stale/offline, never trigger automatic XGBoost, and never be described as fresh satellite data. Cache controls are local to the current browser, not cloud synchronization.

Success: corrupt/invalid stored entries are ignored; newest valid matching snapshot restores offline; eviction is deterministic and bounded; clear removes only this app's browser snapshot key; cache summary is accurate and works with no browser storage; normal live retrieval works even if cache storage rejects a write; desktop/mobile/test/build/lint pass.

## Phase 19 — case finding and verification guidance (17 September 2026)

Improve Case Desk retrieval and handoff: add a local, keyboard-accessible search across saved case title, assignee, note and saved coordinates, plus a per-case next-recorded-check cue derived from the existing checklist. Search and the cue are browser-only views over saved records; they must not create a case, modify a checklist, infer urgency/response need, measure person performance, or call a case ready, resolved or safe.

Success: matching remains case-insensitive and handles missing notes/owners; search combines with existing status/owner filters and order selection; a visible clear action restores all records; each cue names an existing incomplete check or accurately says all recorded checks are marked, with an explicit non-resolution limitation; 390px layout remains contained.

## Phase 18 — evidence return and case views (17 September 2026)

Make Case Desk a faster handoff surface: every saved case can reopen its own preserved observation in the evidence drawer or return the workspace to that observation in Mission control. Add client-side case view ordering—last updated, open work first, or recorded-check completion—derived strictly from saved fields. These actions must not request a new satellite analysis, change the case, create a review, assign urgency, or claim that saved evidence is current. A closed state and checklist count remain record fields, not safety outcomes.

Success: evidence/Mission actions target the case's saved event; active filters remain clear; ordering is keyboard-selectable, stable and honest for missing timestamps/checklists; empty data works; desktop/mobile remains contained.

## Phase 17 — live workload board (17 September 2026)

Add a Case desk workload board derived only from saved cases: status lanes, owned/unassigned workload, and checklist-completion progress. The board lets a user filter the existing Case desk by status or owner; it must not change a case, infer urgency, measure investigator performance, or call a person “available.” Checklist completion is a record-completeness indicator, not evidence that an incident is resolved.

Success: counts/progress update after each persisted save or case refresh, status/owner filters are keyboard buttons with clear active state and reset, no cases yields an honest empty board, and 390px layout remains contained.

## Phase 16 — Firebase realtime collaboration database (17 September 2026)

Use the supplied Thermal-Guard Firebase web project for a real Firestore collaboration mirror. On a successful local case create/update, persist a sanitized case snapshot and immutable latest activity entry under the `workspaces/thermal-guard` namespace. Subscribe to activity in realtime while Case desk is open so activity originating in another browser using the same Firebase project appears immediately. Firebase Anonymous Authentication provides a Firestore-rule identity; it is intentionally not a verified human identity. The existing Node/SQLite cases remain the resilient local record and continue to hold the full NASA event record, while Firestore holds only collaboration-ready case fields and activity.

The application must remain functional when Firebase is not configured, Firestore/Anonymous Auth has not been enabled, or a Firestore rule rejects access: local case saving succeeds, the interface reports cloud-sync state honestly and never displays invented remote updates. Do not add Analytics: database collaboration does not need it and telemetry needs a separate consent decision.

Success: Firebase client config is environment-driven; no credentials enter the repository; case updates attempt cloud sync without blocking the local record; realtime activity subscription has connecting/live/error/unconfigured states; Firestore rules are supplied for manual deployment; build/test/static fallback stay safe.

## Phase 15 — shared local case desk (17 September 2026)

Turn the existing Case desk into a more collective local-workspace workflow. Every new case update records a self-declared editor alongside its timestamp and change summary; the team pulse shows the latest persisted case activity, current owners and open-work count. While Case desk is open, the browser polls the existing local cases endpoint every 30 seconds and provides a manual refresh, so two browsers connected to the same local prototype can see saved work without refreshing the whole app.

This is collaborative case coordination, not user authentication or a verified presence system: editor names are self-declared, no user is shown as online, no private notification/message is sent, and the server’s existing shared-token/origin safeguards remain unchanged. Handoff is the persisted case note/activity trail, not an emergency or dispatch channel.

Success: a saved owner/status/checklist/note change records its editor and is shown in the pulse after refresh/poll; activity remains capped and existing old activity renders safely; static/replay stays honestly unavailable; keyboard/mobile layouts work without overflow.

## Phase 14 — side-by-side observation comparison (17 September 2026)

Add an optional comparison tray to the review queue. An analyst can select up to two existing NASA event groups and see their coordinates, acquisition span, observed peak FRP, detection count, rule-based review priority and current human review state side by side. The tray may calculate only explicit measurement deltas (for example, peak-FRP difference) and must link back to each event's evidence. It must not calculate a similarity, danger, production, causal, spread or response score; selection stays in browser state and does not change server data, model outputs or analyst decisions.

Success: comparison selection is keyboard accessible, changing/clearing selection is obvious, selection respects the current feed without creating a new API request, mobile fits without page overflow, and the explanatory limitation appears with the comparison.

## Phase 13 — interpretable drill-downs and attention ranking (17 September 2026)

Make the existing operational charts actionable rather than decorative. Every acquisition-hour, priority and confidence control must open a compact explanation of its matching observations and offer a deliberate path into the filtered review queue or the strongest matching evidence. The observed-versus-modelled scatter plot must likewise let an analyst open the underlying evidence row.

Add a location-level **attention rank** only inside a completed real NASA XGBoost report. Group scored detections by the existing NASA event/location, then derive a within-report comparison score from 70% the highest calibrated residual percentile and 30% the location's normalized log observed FRP. This ranks what to inspect first in the currently selected view; it is not a danger score, severity estimate, incident probability, cause classification, cross-area comparison or automated action. The interface must reveal the formula, its report-local denominator and the source detection count, and must omit the list if the report does not contain NASA event IDs.

Repair the landing story's scrolling visual contrast: chapter copy remains legible without a hard black/opaque sheet appearing and disappearing across the Earth. Preserve sticky Earth movement, drag controls and reduced-motion behavior. Add only lightweight visual feedback tied to existing data/motion; do not add a fabricated live telemetry source.

Success: keyboard-accessible chart controls and evidence deep links work in Live and replay views where their data exists; location ranks use the real XGBoost report only and disclose limits; landing scroll has continuous contrast without a black shadow transition; build, lint and focused browser/model checks pass.

## Phase 12 — resilient GIS operations (16 September 2026)

The supplied advanced blueprint is selectively adopted. This phase adds the features that can be implemented truthfully with the current real NASA observations and local prototype: an offline-first manager-area GIS view, local snapshots of the last successful live feed, visible administrative/watch-area geometry, selectable 1/3/5 km planning rings, coordinate readout/copy and GeoJSON export of the current operational layer. The map must retain the assigned manager area and cached observations after a network loss; online mode retrieves fresh NASA data and background tiles when available. No tiles, sensors or current data are fabricated during offline use.

Explicitly deferred: Sentinel-1/Sentinel-2/Sentinel-5P fusion, SAR/trace-gas validation, plume or chemical-dispersion prediction, asset vulnerability claims, cold-start facility detection, SHAP/counterfactual cause classification, signed/NDMA-grade reports and any “air-gapped/classified” assertion. They need source access, calibration, ground truth, licensing or authority that this prototype does not have. Existing XGBoost remains a real FRP regression—not a six-class cause model—and the six evidence classes stay hypotheses.

Success: the map has no hard-coded API key or unverified emergency-dispatch directory; it uses Leaflet with source-labelled selectable tiles online, local geometry/coordinates/events offline, a clear fresh/cached/offline indicator, no automatic dispatch, and tests for snapshot fallback, manager boundary, rings and mobile layout.

## Phase 11 — Earth-led operations workspace (15 September 2026)

Supersedes older scope exclusions below. Actual checkout is `Web/Thermal-Guard`, intake HEAD 182982c; preserve its strict online NASA policy, Python dependency installer and deployment configuration. No publish/account/paid-service changes requested.

Redesign landing around an oversized sticky 3D Earth that travels left/right through scroll chapters, with hold/drag camera dolly, release recovery, rotation, keyboard and reduced-motion fallback. Sticky branded navigation includes CompileX, logo, every workspace destination and team section. Keep page scrolling usable (wheel scrolls the story; explicit controls/pinch zoom Earth). Mobile uses a compact visual with readable foreground content.

New software capabilities (in addition to visual redesign): (1) automatic XGBoost jobs on new live-feed fingerprints with pause/retry; (2) six-class evidence-hypothesis panel with explicit abstention, separate from XGBoost regression; (3) suspicion inbox with configurable residual threshold; (4) candidate-source context scoring using mapped land use/industrial tags and real history, never verified cause; (5) nearby OSM hydrants/stations/hospitals with IDs, mapped phone numbers and provenance; (6) public administrative contacts from OSM where present plus source-required local directory; (7) current Open-Meteo weather context, not incident-time weather; (8) persistent investigation cases with assignee/status/notes; (9) incident verification checklist; (10) case activity history; (11) JSON investigation brief; (12) automatic real-observation archive; (13) historical FIRMS CSV import with separate unverified provenance; (14) monthly median-FRP/detection-day charts; (15) two-period thermal change percentage; (16) keyboard command palette and cross-page navigation. Mission control, Response resources, Activity trends and Case desk are new pages.

No labeled cause dataset exists. Six categories are Acute industrial fire, Routine gas flare, Persistent process heat, Wildfire / natural fire, Agricultural burning, Uncertain / Other. Automatically surface suspicions as hypotheses, list reasons/missing evidence, never report classifier probabilities or make confirmed reviews automatically. Regional name alone cannot identify a facility. Lower satellite FRP is NOT a production percentage: show thermal-signal change only, with coverage/sample counts, seasonal/sensor/cloud caveats and no causal claim. Imported historical data cannot contaminate NASA model training. Hydrant ref is an asset number, not a telephone; missing contacts/availability remain unknown. No automatic calls/messages/dispatch. Official 112 information is separate and only for genuine emergencies.

Acceptance: >=12 distinct functional manager capabilities, all 6 categories visible, real XGBoost auto-trigger without repeat loops, source-backed external context with partial failure handling, persistent cases/contacts/history, honest empty states, tested scroll/drag/reduced motion/mobile and retained existing workflow; build/lint/tests pass.

## Active scope: real observation analysis (12 September 2026)

This section supersedes older exclusions of ML training below. The user has no labeled source-class dataset and explicitly chose real-observation scoring. Replace the simulated Smart Analyser with a real server-side XGBoost regression of log(1 + measured FRP), using VIIRS radiometry, pixel geometry, location and acquisition time. Never use target FRP as an input feature or train on the supplied scoring CSV. This is same-observation consistency screening, not a fire forecast, cause classifier or emergency-risk probability.

- Fetch real NASA FIRMS feeds server-side, retain source URLs, acquisition/retrieval timestamps, quality counts, cache/outage status and actual timings. Default the Node application to real data; synthetic replay remains explicit and cannot enter real model analysis.
- Train from seven-day South Asia observations for the selected sensor. Split chronologically into training days, calibration day and final held-out day; publish actual MAE/RMSE and median baseline comparison. Refuse insufficient data. Mark in-sample, calibration and held-out results separately.
- Asynchronous bounded analysis jobs expose actual processing stages, with no artificial delay or fabricated progress percentages. Persist completed evidence reports and model artifacts locally.
- Score the selected NASA extent/window or a validated user-uploaded FIRMS CSV (unverified provenance). Show observed versus modeled FRP, residual percentile, measured prior nearby detections, missing inputs, out-of-domain warnings and downloadable JSON/CSV evidence.
- Preserve Earth, Street map, filters, evidence reviews, saved areas, exports and demo manager states. Remove fabricated facility/weather/land-cover/history and confidence claims from active analysis.
- Scope is the local full-stack application. GitHub Pages remains a clearly labeled static replay; it cannot execute Python/Node. No hosting/account changes or automatic publication in this task.

Success: NASA data is fetched and scored by the actual XGBoost library end to end; UI displays real timestamps/metrics/errors; invalid input, insufficient data, concurrency and model failures are tested; build/lint and desktop/mobile browser checks pass. Out of scope: verified hazard labels, independently validated safety performance, fabricated weather, dispatch, paid hosting and verified district identities.

## Purpose

Deliver CompileX's satellite intelligence platform as a working Vite application: inspect NASA thermal detections, prioritize evidence for human review, and preserve analyst decisions. This application scope supersedes the parent workbook project's exclusion of prototype development.

## Features and acceptance

- Real NASA FIRMS NOAA-20, NOAA-21 and S-NPP public South Asia CSV ingestion, 24h/48h/7d windows. Optional server-only FIRMS MAP_KEY enables the area API for up to five days.
- Map and review queue with geographic extent, sensor, confidence, FRP and review filters. India means a rectangular extent, not an administrative boundary.
- Deterministic deduplication, 1 km/24h event clustering and explainable rule-based review priority. Source classification remains uncertain until an analyst reviews it. No fabricated AI probabilities.
- Detail workspace with actual observations, FRP sequence, optional on-demand OSM context, source lineage and explicit missing evidence.
- Confirm/reject/defer review with classification, rationale and SQLite audit history. Saved areas persist. CSV and GeoJSON exports preserve provenance and decisions.
- Source health, refresh/cache age, retrieval errors, empty states and an explicit synthetic replay for presentations. Never silently replace live data with invented data.
- Responsive professional dark geospatial UI, keyboard controls, legible contrast and reduced motion.
- Local prototype launches with one command; production build runs with the Node API server. Tests exercise processing, API validation and persistence.
- GitHub Pages publishes a browser-only presentation build under `/ThermalGuard/`. It uses the explicit synthetic replay and browser-local reviews/areas because Pages cannot run Node/SQLite and NASA public CSV blocks browser CORS. The hosted UI must never label replay as live satellite data.

## Constraints

Landing education: add accessible hover/focus/tap feature explanations, a selectable five-stage satellite-to-review walkthrough, an illustrative FRP/confidence priority calculator using the existing rules, and a backend explorer distinguishing the hosted replay from the Node/NASA deployment. Describe satellite limitations and link official NASA references. Preserve the Earth, district login and all workspace functions; add no new data sources, authentication or detection claims.

Near-real-time detections are not continuous surveillance or verified incidents. Rule priority is not fire probability. A trained six-class model, calibrated accuracy, ground truth, dispatch and national deployment are outside this iteration. Prototype scope only. Keys stay server-side.

## Interactive Earth and district demonstration

The index opens an interactive 3D Earth with drag, scroll/pinch zoom, keyboard controls, reset, rotation toggle and selectable district pilot locations. These locations are illustrative coverage presets, not live incident markers. Earth is navigational context, not Google imagery or street-level mapping. The landing globe applies the prior index-page visual treatment - realistic Earth day, night-light, cloud, terrain and water textures - when its public texture mirrors load; it falls back to the bundled Natural Earth cartography without losing controls or district selection. A labelled demo manager login uses public PIN 2026 and a selected district; it is session-only role simulation, never authentication. Four pilot areas (Jamnagar, Ahmedabad, Ludhiana, Dhanbad) use approximate bounding boxes, not official boundaries. Manager sessions start in their selected area, retain all evidence/review/export workflows and can explore other areas. Guest exploration remains available. Publish source and gh-pages to sankirtansyadavofficial-Hack/ThermalGuard under the user's verified GitHub identity without automated coauthor trailers; preserve the previous repository history separately.

## Success

Pointer-responsive hero: on fine-pointer devices, moving the mouse across the opening section gently changes the Earth viewing angle and screen position with damped parallax and linked blue lighting. Dragging takes priority, wheel/pinch zoom and marker selection remain accurate, and leaving the hero eases back to neutral. Pause freezes ambient pointer motion; focus/keyboard navigation resets it. Disable the decorative motion for reduced-motion and touch-only users. Preserve all landing education and workspace features.

The opening view restores the supplied original's oversized blue Earth, dense star field and atmospheric lighting while retaining the current landing content and district/workspace features. Rotation starts automatically, pauses during dragging, resumes after 1.2 seconds of inactivity, and obeys the explicit pause button and reduced-motion preference.

Build and tests pass; a real NASA request populates the map; review survives reload; exports and filters work; desktop/mobile layouts are inspected. External outages are clearly surfaced with timestamped cached data when available.
