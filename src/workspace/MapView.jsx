import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  Copy,
  Crosshair,
  Download,
  Layers,
  Minus,
  Plus,
  Ruler,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { colors } from "./client";

const LAYERS = {
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    maxZoom: 20,
  },
  satellite: {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    attribution: "NASA GIBS / MODIS Terra",
    maxNativeZoom: 9,
    maxZoom: 9,
  },
};
const RINGS = [0, 1, 3, 5];
const toBounds = (bbox) => [
  [bbox[1], bbox[0]],
  [bbox[3], bbox[2]],
];
const safeText = (value) => String(value).replace(/[<>&]/g, "");

function asGeojson(events, bbox, areaName) {
  return {
    type: "FeatureCollection",
    metadata: {
      title: `ThermalGuard visible GIS layer — ${areaName}`,
      exportedAt: new Date().toISOString(),
      limitation:
        "Planning boundary and detected thermal events. Rings are distance guides, not impact zones or dispatch instructions.",
    },
    features: [
      {
        type: "Feature",
        properties: { kind: "watch-area", name: areaName },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[1]],
              [bbox[2], bbox[3]],
              [bbox[0], bbox[3]],
              [bbox[0], bbox[1]],
            ],
          ],
        },
      },
      ...events.map((event) => ({
        type: "Feature",
        properties: {
          kind: "thermal-event",
          id: event.id,
          priority: event.priority,
          maxFrpMw: event.maxFrp,
          detections: event.detections.length,
          lastSeenUtc: event.lastSeen,
          source: event.source,
        },
        geometry: { type: "Point", coordinates: [event.lon, event.lat] },
      })),
    ],
  };
}
function downloadGeojson(value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/geo+json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "thermalguard-visible-layer.geojson";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MapView({
  events,
  bbox,
  areaName,
  manager,
  offline,
  onSelect,
  selectedId,
  acquisition,
}) {
  const host = useRef(null);
  const map = useRef(null);
  const initialBounds = useRef(toBounds(bbox));
  const [defaultImageryDate] = useState(() =>
    new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  );
  const tiles = useRef(null);
  const eventLayer = useRef(null);
  const geometryLayer = useRef(null);
  const ringsLayer = useRef(null);
  const select = useRef(onSelect);
  const [layer, setLayer] = useState("streets");
  const [failedTileKey, setFailedTileKey] = useState("");
  const [ring, setRing] = useState({ areaKey: "", value: 0 });
  const [ringTarget, setRingTarget] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [copied, setCopied] = useState(false);
  const areaKey = bbox.join(",");
  const retainedTarget =
    ringTarget?.areaKey === areaKey &&
    events.some((event) => event.id === ringTarget.event.id)
      ? ringTarget.event
      : null;
  const selected = useMemo(
    () =>
      retainedTarget || events.find((event) => event.id === selectedId) || null,
    [events, selectedId, retainedTarget],
  );
  const imageryDate = useMemo(
    () => acquisition?.slice(0, 10) || defaultImageryDate,
    [acquisition, defaultImageryDate],
  );
  const tileKey = `${layer}:${imageryDate}`;
  const tileError = failedTileKey === tileKey;
  const bounds = useCallback(() => toBounds(bbox), [bbox]);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const event = events.find((item) => item.id === selectedId);
    // Retain the last inspected location as an optional GIS distance target
    // after its evidence drawer is closed.
    if (event) {
      // eslint-disable-next-line react/set-state-in-effect
      setRingTarget({ event, areaKey });
    }
  }, [events, selectedId, areaKey]);
  // The map instance mounts once; later bbox changes update GIS layers without
  // tearing down the user's pan/zoom state.
  useEffect(() => {
    const instance = L.map(host.current, {
      zoomControl: false,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 19,
      zoomSnap: 0.25,
    }).fitBounds(initialBounds.current, { padding: [28, 28] });
    map.current = instance;
    eventLayer.current = L.layerGroup().addTo(instance);
    geometryLayer.current = L.layerGroup().addTo(instance);
    ringsLayer.current = L.layerGroup().addTo(instance);
    L.control
      .scale({ imperial: false, position: "bottomleft" })
      .addTo(instance);
    instance.on("mousemove", (event) => setCursor(event.latlng));
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    map.current?.fitBounds(bounds(), { padding: [28, 28], animate: false });
  }, [bounds]);
  useEffect(() => {
    if (!map.current) return;
    tiles.current?.remove();
    const config = LAYERS[layer];
    const url = config.url.replace("{date}", imageryDate);
    const next = L.tileLayer(url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      maxNativeZoom: config.maxNativeZoom,
      crossOrigin: true,
    });
    next.on("tileerror", () => setFailedTileKey(tileKey));
    next.addTo(map.current);
    next.bringToBack();
    tiles.current = next;
    return () => next.remove();
  }, [layer, imageryDate, tileKey]);
  useEffect(() => {
    if (!eventLayer.current) return;
    eventLayer.current.clearLayers();
    for (const event of events) {
      const active = event.id === selectedId;
      const marker = L.circleMarker([event.lat, event.lon], {
        radius: active ? 10 : Math.min(7, 3.8 + Math.log1p(event.maxFrp) * 0.4),
        color: active ? "#fff" : colors[event.priority],
        weight: active ? 2 : 1,
        fillColor: colors[event.priority],
        fillOpacity: 0.88,
      });
      marker.bindTooltip(
        `${safeText(event.priority)} · ${Number(event.maxFrp).toFixed(1)} MW · ${event.detections.length} detection(s)`,
      );
      marker.on("click", () => {
        setRingTarget({ event, areaKey });
        select.current(event);
      });
      eventLayer.current.addLayer(marker);
    }
  }, [events, selectedId, areaKey]);
  useEffect(() => {
    if (!geometryLayer.current) return;
    geometryLayer.current.clearLayers();
    const rectangle = L.rectangle(bounds(), {
      color: "#c5f277",
      weight: 2,
      fillColor: "#c5f277",
      fillOpacity: 0.06,
      dashArray: "7 5",
      interactive: false,
    });
    rectangle.bindTooltip(`${areaName} · selected GIS extent`);
    geometryLayer.current.addLayer(rectangle);
  }, [bounds, areaName]);
  useEffect(() => {
    if (!ringsLayer.current) return;
    ringsLayer.current.clearLayers();
    const ringKm = ring.areaKey === areaKey ? ring.value : 0;
    if (!selected || !ringKm) return;
    L.circle([selected.lat, selected.lon], {
      radius: ringKm * 1000,
      color: "#9dc9d2",
      weight: 1.5,
      dashArray: "6 6",
      fill: false,
      interactive: false,
    })
      .bindTooltip(`${ringKm} km planning distance · not an impact zone`)
      .addTo(ringsLayer.current);
  }, [selected, ring, areaKey]);
  const ringKm = ring.areaKey === areaKey ? ring.value : 0;
  async function copyCoordinates() {
    if (!cursor) return;
    try {
      await navigator.clipboard.writeText(
        `${cursor.lat.toFixed(5)}, ${cursor.lng.toFixed(5)}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={`map-surface gis-map ${offline ? "gis-offline" : ""}`}>
      <div
        ref={host}
        className="map-canvas"
        role="region"
        aria-label={`Interactive GIS map of ${areaName}`}
      />
      <div className="map-topline">
        <span className="map-top-stat">
          <span className="map-dot" /> {events.length.toLocaleString()} mapped
          events
        </span>
        <span>{offline ? "LOCAL SNAPSHOT / GEOMETRY" : "LIVE NASA / GIS"}</span>
      </div>
      <div className="map-controls">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => map.current?.zoomIn()}
        >
          <Plus size={17} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={17} />
        </button>
        <button
          title="Fit selected area"
          aria-label="Fit selected area"
          onClick={() =>
            map.current?.fitBounds(bounds(), { padding: [28, 28] })
          }
        >
          <Crosshair size={17} />
        </button>
      </div>
      <div className="map-layer">
        <Layers size={15} />
        <select
          aria-label="Basemap"
          value={layer}
          onChange={(event) => setLayer(event.target.value)}
        >
          <option value="streets">OpenStreetMap streets</option>
          <option value="dark">Dark reference</option>
          <option value="satellite">NASA MODIS image</option>
        </select>
      </div>
      <div className="gis-tools">
        <label>
          <Ruler size={14} /> Planning ring
          <select
            aria-label="Planning ring"
            value={ringKm}
            disabled={!selected}
            onChange={(event) =>
              setRing({ areaKey, value: Number(event.target.value) })
            }
          >
            {RINGS.map((value) => (
              <option key={value} value={value}>
                {value ? `${value} km` : "Off"}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => downloadGeojson(asGeojson(events, bbox, areaName))}
        >
          <Download size={14} /> GeoJSON
        </button>
      </div>
      <div className="gis-readout">
        <span>
          {manager ? `${manager.name} · ${areaName}` : areaName} boundary
        </span>
        <button
          aria-label="Copy map coordinates"
          disabled={!cursor}
          onClick={copyCoordinates}
        >
          <Copy size={13} />{" "}
          {cursor
            ? `${cursor.lat.toFixed(4)}, ${cursor.lng.toFixed(4)}`
            : "Move on map"}
        </button>
        {copied && <small>Copied</small>}
      </div>
      <div className="map-legend">
        {Object.entries(colors).map(([name, color]) => (
          <span key={name}>
            <i style={{ background: color }} />
            {name}
          </span>
        ))}
        <span className="gis-boundary">
          <i />
          Selected area
        </span>
      </div>
      {(tileError || offline) && (
        <div className="map-warning">
          {offline
            ? "Offline view: saved observation coordinates and the assigned boundary remain available. Basemap tiles may be unavailable."
            : "Basemap tiles are unavailable. GIS boundary and event coordinates remain available."}
        </div>
      )}
      {selected && ringKm > 0 && (
        <div className="gis-ring-note">
          {ringKm} km is a distance guide only—not a plume, evacuation, impact
          or dispatch zone.
        </div>
      )}
      {layer === "satellite" && (
        <div className="imagery-date">
          MODIS image · {acquisition?.slice(0, 10) || "previous UTC day"} ·
          clouds may obscure the surface
        </div>
      )}
    </div>
  );
}
