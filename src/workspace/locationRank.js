const finite = (value) => Number.isFinite(Number(value));

/**
 * A report-local investigation ordering, not a hazard or cause score.
 * It is deliberately derived only after the server has returned real model rows.
 */
export function locationRank(report) {
  if (!report?.rows?.length || !report?.events?.length) return [];
  const groups = new Map();
  for (const row of report.rows) {
    if (!row.eventId || !finite(row.observedFrp) || !finite(row.residualPercentile))
      continue;
    const group = groups.get(row.eventId) || {
      eventId: row.eventId,
      maxResidualPercentile: -Infinity,
      maxObservedFrp: -Infinity,
      detections: 0,
      unusualDetections: 0,
      lat: row.lat,
      lon: row.lon,
    };
    group.maxResidualPercentile = Math.max(
      group.maxResidualPercentile,
      Number(row.residualPercentile),
    );
    group.maxObservedFrp = Math.max(group.maxObservedFrp, Number(row.observedFrp));
    group.detections += 1;
    group.unusualDetections += row.unusual ? 1 : 0;
    groups.set(row.eventId, group);
  }
  const events = new Map(report.events.map((event) => [event.id, event]));
  const ranked = [...groups.values()].filter((group) => events.has(group.eventId));
  const maxLogFrp = Math.max(
    0,
    ...ranked.map((group) => Math.log1p(group.maxObservedFrp)),
  );
  return ranked
    .map((group) => {
      const residualComponent = Math.max(
        0,
        Math.min(100, group.maxResidualPercentile),
      );
      const frpComponent = maxLogFrp
        ? (Math.log1p(group.maxObservedFrp) / maxLogFrp) * 100
        : 0;
      return {
        ...group,
        event: events.get(group.eventId),
        observedFrpComponent: frpComponent,
        attentionScore: Math.round(residualComponent * 0.7 + frpComponent * 0.3),
      };
    })
    .sort(
      (a, b) =>
        b.attentionScore - a.attentionScore ||
        b.maxResidualPercentile - a.maxResidualPercentile ||
        b.maxObservedFrp - a.maxObservedFrp,
    )
    .map((group, index) => ({ ...group, rank: index + 1 }));
}
