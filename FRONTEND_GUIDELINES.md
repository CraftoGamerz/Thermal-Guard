# Frontend guidelines

Preserve current dark workspace and interactive Earth. Analysis uses charcoal panels, white primary text, muted gray supporting text, cyan for measured/model information and amber for unusual/stale/limited evidence. Do not use danger labels implying verified emergencies or green implying safety.

Use existing font and spacing; responsive cards, compact readable table with horizontal scroll contained inside its panel. No page overflow at 390px. Visible labels for inputs/file upload, focus outlines, semantic table headings, status aria-live and actionable error messages. Avoid fabricated progress bars; real stage names and elapsed duration are sufficient. Reduced-motion respects user settings.

Analysis layout: controls + provenance strip → observed metrics → temporal model evaluation and scatter plot → evidence table → expandable methodology/limitations. Clearly distinguish observed FRP (MW), modeled FRP (MW), residual percentile (not probability), in-sample/calibration/held-out status, and unavailable data. CSV/JSON report export separate from existing feed exports. Never silently fill missing data with regional constants.
