export const CATEGORIES = [
  "Acute industrial fire",
  "Routine gas flare",
  "Persistent process heat",
  "Wildfire / natural fire",
  "Agricultural burning",
  "Uncertain / Other",
];
export function hypotheses(event, rows = [], context = null) {
  const points = rows.filter((r) => r.eventId === event?.id),
    unusual = points.some((r) => r.unusual),
    repeats = Math.max(0, ...points.map((r) => r.baseline?.observedDays || 0));
  const tags = (event ? context?.resources || [] : [])
    .filter((r) => r.distanceKm <= 1.5)
    .map((r) => r.tags || {});
  const industrial = tags.some(
      (t) => t.industrial || t.landuse === "industrial",
    ),
    flare = tags.some(
      (t) => t.man_made === "flare" || t.industrial === "flare",
    ),
    crop = tags.some((t) => t.landuse === "farmland"),
    forest = tags.some((t) => t.landuse === "forest");
  const evidence = [
    industrial && unusual,
    flare,
    industrial && repeats >= 3,
    forest,
    crop,
  ];
  const reasons = [
    "Mapped industrial context and unusually high model residual; incident unconfirmed.",
    "A flare is mapped nearby; normal operation is not established.",
    "Industrial mapping plus detections on at least three prior days; process attribution unconfirmed.",
    "Forest land is mapped nearby; origin and spread are unknown.",
    "Farmland is mapped nearby; agricultural burning is not established.",
  ];
  return CATEGORIES.map((name, i) => ({
    name,
    candidate: i === 5 ? !evidence.some(Boolean) : Boolean(evidence[i]),
    reason:
      i === 5
        ? evidence.some(Boolean)
          ? "Alternative causes remain possible; human corroboration required."
          : "Insufficient corroborating context to assign a source class."
        : evidence[i]
          ? reasons[i]
          : "Not enough corroborating evidence.",
    status:
      event?.review?.classification === name
        ? "Human review"
        : i === 5
          ? "Abstention"
          : "Unverified hypothesis",
  }));
}
