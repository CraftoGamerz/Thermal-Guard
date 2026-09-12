import {
  SOURCES,
  VERSION,
  parseCSV,
  normalize,
  cluster,
  replay,
  inBox,
  fail,
} from "./processing.mjs";

export function createProviders(store, { fetcher = fetch, mapKey = "" } = {}) {
  const pending = new Map();
  let contextLast = 0;
  async function request(url, options = {}) {
    const response = await fetcher(url, {
      ...options,
      signal: AbortSignal.timeout(25000),
      headers: {
        "User-Agent": "ThermalGuard-CompileX/1.0 (student research prototype)",
        ...options.headers,
      },
    });
    if (!response.ok)
      throw fail(`Upstream service returned HTTP ${response.status}.`, 502);
    const text = await response.text();
    if (text.length > 30000000)
      throw fail("Upstream response exceeded the supported size.", 502);
    return text;
  }
  return {
    async events({ source, days, bbox, mode }) {
      const started = performance.now();
      const src = SOURCES[source];
      if (mode === "replay") {
        const events = cluster(
          replay(source).filter((d) => inBox(d, bbox)),
          mode,
        );
        store.remember(events);
        return {
          events: store.decorate(events),
          meta: {
            mode,
            provider: "Synthetic presentation scenario",
            source,
            fetchedAt: null,
            sourceUrl: null,
            stale: false,
            cached: false,
            detectionCount: events.reduce((n, e) => n + e.detections.length, 0),
            rejectedRows: 0,
            duplicates: 0,
            processing: VERSION,
            warning:
              "Synthetic data dated 12 September 2026. Not satellite observations. Time-window setting does not alter this fixed scenario.",
          },
        };
      }
      const useKey = !!mapKey && days <= 5;
      const publicUrl = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${src.folder}/csv/${src.file}_South_Asia_${days === 7 ? "7d" : days * 24 + "h"}.csv`;
      const url = useKey
        ? `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${src.api}/${bbox.join(",")}/${days}`
        : publicUrl;
      const key = useKey
        ? `firms-v2:${source}:${days}:${bbox.join(",")}`
        : `firms-v2:${source}:${days}:South_Asia`;
      const cached = store.snapshot(key);
      let result,
        stale = false,
        warning = null;
      if (cached && Date.now() - Date.parse(cached.savedAt) < 300000)
        result = { ...cached, cached: true };
      else {
        try {
          if (!pending.has(key))
            pending.set(
              key,
              (async () => {
                const normalized = normalize(
                  parseCSV(await request(url)),
                  source,
                );
                const data = {
                  ...normalized,
                  fetchedAt: new Date().toISOString(),
                  sourceUrl: useKey
                    ? "https://firms.modaps.eosdis.nasa.gov/api/area/"
                    : publicUrl,
                  cached: false,
                };
                store.saveSnapshot(key, data);
                return data;
              })().finally(() => pending.delete(key)),
            );
          result = await pending.get(key);
        } catch {
          if (!cached)
            throw fail(
              "NASA FIRMS is currently unreachable or returned invalid data. Retry, select another sensor, or explicitly use the replay scenario.",
              502,
            );
          result = { ...cached, cached: true };
          stale = true;
          warning =
            "NASA refresh failed. Showing a previously retrieved snapshot; check its acquisition dates.";
        }
      }
      const detections = result.detections.filter((d) => inBox(d, bbox));
      const events = cluster(detections);
      store.remember(events);
      const latest = detections.length
        ? detections.reduce(
            (a, d) => (d.acquiredAt > a ? d.acquiredAt : a),
            detections[0].acquiredAt,
          )
        : null;
      return {
        events: store.decorate(events),
        meta: {
          mode,
          provider: "NASA FIRMS",
          source,
          sourceUrl: result.sourceUrl,
          fetchedAt: result.fetchedAt,
          latestAcquisition: latest,
          cached: result.cached,
          stale,
          warning,
          detectionCount: detections.length,
          rejectedRows: result.rejectedRows,
          duplicates: result.duplicates,
          processing: VERSION,
          coverage: useKey
            ? "Requested bounding box"
            : "South Asia download, filtered to requested bounding box",
          bbox,
          days,
          serverMs: Math.round(performance.now() - started),
        },
      };
    },
    async context(lat, lon) {
      const key = `osm:${lat.toFixed(4)}:${lon.toFixed(4)}`;
      const cached = store.snapshot(key);
      if (cached && Date.now() - Date.parse(cached.savedAt) < 86400000)
        return { ...cached, cached: true };
      if (Date.now() - contextLast < 15000)
        throw fail("Please wait 15 seconds between facility queries.", 429);
      contextLast = Date.now();
      const query = `[out:json][timeout:20];(nwr(around:1500,${lat},${lon})["industrial"];nwr(around:1500,${lat},${lon})["landuse"="industrial"];nwr(around:1500,${lat},${lon})["power"="plant"];);out center tags 25;`;
      let data;
      try {
        data = JSON.parse(
          await request("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }),
        );
      } catch {
        throw fail(
          "OpenStreetMap context is unavailable. The satellite evidence remains available; retry later.",
          502,
        );
      }
      const value = {
        facilities: (data.elements || []).map((e) => ({
          id: `${e.type}/${e.id}`,
          name: e.tags?.name || "Unnamed mapped industrial feature",
          type: e.tags?.industrial || e.tags?.power || e.tags?.landuse,
          lat: e.lat ?? e.center?.lat,
          lon: e.lon ?? e.center?.lon,
          url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        })),
        fetchedAt: new Date().toISOString(),
        source: "OpenStreetMap contributors / Overpass",
        limitation:
          "Mapped features within 1.5 km. Proximity does not prove fire origin or facility involvement. OSM coverage can be incomplete.",
      };
      store.saveSnapshot(key, value);
      return value;
    },
  };
}
