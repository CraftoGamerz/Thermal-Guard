import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Layers, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { colors } from "./client";

export default function MapView({
  events,
  bbox,
  onSelect,
  selectedId,
  acquisition,
}) {
  const element = useRef(null),
    map = useRef(null),
    dots = useRef(null),
    select = useRef(onSelect);
  const [layer, setLayer] = useState("streets"),
    [tileError, setTileError] = useState(false);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  const bounds = useCallback(
    () => [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ],
    [bbox],
  );
  const imageryDate = acquisition?.slice(0, 10);
  useEffect(() => {
    const m = L.map(element.current, {
      zoomControl: false,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 17,
      zoomSnap: 0.25,
    }).setView([23, 80], 4);
    map.current = m;
    dots.current = L.layerGroup().addTo(m);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (map.current)
      map.current.fitBounds(bounds(), { padding: [34, 34], animate: false });
  }, [bounds]);
  useEffect(() => {
    if (!map.current) return;
    setTileError(false);
    const date =
      imageryDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const config =
      layer === "satellite"
        ? [
            `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
            {
              attribution: "Imagery: NASA GIBS / MODIS Terra",
              maxNativeZoom: 9,
            },
          ]
        : [
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            },
          ];
    const tiles = L.tileLayer(config[0], {
      ...config[1],
      maxZoom: 17,
      crossOrigin: true,
    }).addTo(map.current);
    tiles.on("tileerror", () => setTileError(true));
    tiles.bringToBack();
    return () => tiles.remove();
  }, [layer, imageryDate]);
  useEffect(() => {
    if (!dots.current) return;
    dots.current.clearLayers();
    for (const event of events) {
      const active = event.id === selectedId;
      const marker = L.circleMarker([event.lat, event.lon], {
        radius: active ? 10 : Math.min(7, 3.8 + Math.log1p(event.maxFrp) * 0.4),
        color: active ? "#ffffff" : colors[event.priority],
        weight: active ? 2 : 1,
        fillColor: colors[event.priority],
        fillOpacity: 0.85,
      });
      const tooltip = document.createElement("span");
      tooltip.textContent = `${event.priority} · ${event.maxFrp.toFixed(1)} MW · ${event.detections.length} detection(s)`;
      marker.bindTooltip(tooltip);
      marker.on("click", () => select.current(event));
      dots.current.addLayer(marker);
    }
  }, [events, selectedId]);
  return (
    <div className={`map-surface map-theme-${layer}`}>
      <div
        ref={element}
        className="map-canvas"
        role="region"
        aria-label="Thermal event map. Use the adjacent queue for keyboard accessible event selection."
      />
      <div className="map-topline">
        <span>
          <span className="map-dot" /> {events.length.toLocaleString()} mapped
          events
        </span>
        <span>NASA FIRMS / VIIRS</span>
      </div>
      <div className="map-controls">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => map.current.zoomIn()}
        >
          <Plus size={17} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => map.current.zoomOut()}
        >
          <Minus size={17} />
        </button>
        <button
          title="Fit selected area"
          aria-label="Fit selected area"
          onClick={() => map.current.fitBounds(bounds(), { padding: [34, 34] })}
        >
          <Crosshair size={17} />
        </button>
      </div>
      <div className="map-layer">
        <Layers size={15} />
        <select
          aria-label="Basemap"
          value={layer}
          onChange={(e) => setLayer(e.target.value)}
        >
          <option value="dark">Dark basemap</option>
          <option value="streets">Street map</option>
          <option value="satellite">NASA imagery</option>
        </select>
      </div>
      <div className="map-legend">
        {Object.entries(colors).map(([name, color]) => (
          <span key={name}>
            <i style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
      {tileError && (
        <div className="map-warning">
          Some map tiles are unavailable. Try another basemap; event coordinates
          remain available.
        </div>
      )}
      {layer === "satellite" && (
        <div className="imagery-date">
          MODIS imagery · {acquisition?.slice(0, 10) || "previous UTC day"} ·
          clouds may obscure the surface
        </div>
      )}
    </div>
  );
}
