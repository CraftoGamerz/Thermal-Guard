# Application flow

Authoritative active scope: PRD real-observation analysis, phase 10.

Landing Earth → guest or public-PIN demo manager → Overview / Review queue / Analytics / Watch areas / Data & methodology / Smart Analyser. Preserve current Earth, map and navigation. Manager is a demonstration state, not authentication. Node API may require a shared workspace token; 401 opens connection settings.

Smart Analyser uses the workspace sensor, time window and area. NASA feed → Run real analysis → queued/fetching NASA/training and scoring/completed or failed. Poll job status, retain report on successful completion; dismiss stale requests on area/source/window changes or unmount. Do not show made-up progress. Report contains acquisition/retrieval provenance, quality counts, measured elapsed times, temporal evaluation, feature importance, observed-versus-modeled chart, searchable anomaly evidence table and JSON/CSV exports. Evidence buttons open existing review drawer for NASA events.

Optional CSV mode → file selection (2 MB limit) → parse/validate on server → score against NASA-trained model. Required FIRMS columns: latitude, longitude, frp, acq_date, acq_time, bright_ti4, bright_ti5, scan, track, daynight. Source selected explicitly. Uploaded provenance is unverified; CSV observations cannot create reviewable NASA records. Show rejected/duplicate/missing-feature counts. Empty extent is valid; insufficient training data or no valid scoring rows produces a clear error.

Static Pages/replay → show unavailable real-analysis notice and full-stack setup guidance, never fall back to mock ML. Outage with a real cached snapshot → prominent stale warning in report. Missing Python/runtime → setup error; competing job → 429, retry later. Models are exploratory, source classes remain Uncertain / Other until human review. An in-sample/calibration result must not be mistaken for independent testing.
