// ThermalGuard — Comprehensive Simulated Satellite Data
// Based on ThermalGuard Satellite Intelligence specifications
// Data sources: NASA FIRMS VIIRS, ESA WorldCover, ERA5, OpenStreetMap

// ── Helper: generate 12-month FRP history ─────────────────────────────────────
function genHistory(baseAvg, mad, spike = null) {
  const months = [
    '2025-10','2025-11','2025-12','2026-01','2026-02','2026-03',
    '2026-04','2026-05','2026-06','2026-07','2026-08','2026-09',
  ]
  return months.map((m, i) => {
    const seasonal = 1 + 0.12 * Math.sin((i / 11) * Math.PI * 2)
    const noise    = 0.9 + Math.random() * 0.2
    let avg = baseAvg * seasonal * noise
    if (spike && i === 11) avg = spike // current month spike
    return {
      month: m,
      avg:  parseFloat(avg.toFixed(1)),
      min:  parseFloat((avg * 0.55).toFixed(1)),
      max:  parseFloat((avg * 1.45).toFixed(1)),
    }
  })
}

// ── JAMNAGAR DISTRICT (Gujarat) ───────────────────────────────────────────────
// Reliance + Nayara refinery belt — mostly Gas Flares + Industrial Heat
const JAMNAGAR = [
  {
    id: 'HS-JAM-001',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Routine Gas Flare', classColor: '#f5a623',
    lat: 22.4707, lng: 69.0730,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:42',
      bright_ti4: 367.2, bright_ti5: 298.1, delta_t: 69.1,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 142.8, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 85.2, mad_frp: 12.4, robust_deviation: 4.65, days_seen_30d: 28, days_seen_365d: 340, persistence_rate: 0.93 },
    frpHistory: genHistory(85, 12, 142.8),
    classification: { 'Acute Industrial Fire': 0.04, 'Routine Gas Flare': 0.82, 'Persistent Industrial Heat': 0.08, 'Wildfire / Natural Fire': 0.02, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.03 },
    landCover: { built_up: 48, tree_cover: 4, shrubland: 2, grassland: 3, cropland: 6, bare: 28, water: 7, wetland: 2 },
    weather: { wind_speed_ms: 4.2, wind_direction_deg: 225, temperature_c: 28.4, humidity_pct: 72, precipitation_mm: 0 },
    facility: { name: 'Reliance Jamnagar Refinery (SEZ)', type: 'Petroleum Refinery', distance_m: 120, overlap: true },
    cluster: { detection_count: 14, overpass_count: 8, spatial_spread_km2: 0.18, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-JAM-002',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Acute Industrial Fire', classColor: '#ff4444',
    lat: 22.4850, lng: 69.0920,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'Suomi-NPP', acq_date: '2026-09-12', acq_time: '00:58',
      bright_ti4: 383.1, bright_ti5: 301.4, delta_t: 81.7,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 187.3, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 62.1, mad_frp: 9.8, robust_deviation: 12.8, days_seen_30d: 2, days_seen_365d: 88, persistence_rate: 0.24 },
    frpHistory: genHistory(60, 10, 187.3),
    classification: { 'Acute Industrial Fire': 0.79, 'Routine Gas Flare': 0.10, 'Persistent Industrial Heat': 0.05, 'Wildfire / Natural Fire': 0.03, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.02 },
    landCover: { built_up: 62, tree_cover: 2, shrubland: 1, grassland: 1, cropland: 4, bare: 22, water: 6, wetland: 2 },
    weather: { wind_speed_ms: 5.8, wind_direction_deg: 210, temperature_c: 29.1, humidity_pct: 68, precipitation_mm: 0 },
    facility: { name: 'Nayara Energy (Essar Oil) Refinery', type: 'Petroleum Refinery', distance_m: 85, overlap: true },
    cluster: { detection_count: 3, overpass_count: 2, spatial_spread_km2: 0.41, centroid_drift_rate: 12, growth_direction: 225 },
  },
  {
    id: 'HS-JAM-003',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 22.4580, lng: 69.0550,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-21', acq_date: '2026-09-12', acq_time: '02:18',
      bright_ti4: 341.8, bright_ti5: 296.2, delta_t: 45.6,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 78.4, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 74.2, mad_frp: 8.1, robust_deviation: 0.52, days_seen_30d: 30, days_seen_365d: 358, persistence_rate: 0.98 },
    frpHistory: genHistory(74, 8, 78.4),
    classification: { 'Acute Industrial Fire': 0.01, 'Routine Gas Flare': 0.12, 'Persistent Industrial Heat': 0.81, 'Wildfire / Natural Fire': 0.01, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.04 },
    landCover: { built_up: 70, tree_cover: 3, shrubland: 1, grassland: 1, cropland: 2, bare: 18, water: 4, wetland: 1 },
    weather: { wind_speed_ms: 3.1, wind_direction_deg: 200, temperature_c: 27.8, humidity_pct: 74, precipitation_mm: 0 },
    facility: { name: 'HPCL Rajkot-Jamnagar Pipeline Terminal', type: 'Pipeline Terminal', distance_m: 340, overlap: false },
    cluster: { detection_count: 28, overpass_count: 18, spatial_spread_km2: 0.12, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-JAM-004',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Routine Gas Flare', classColor: '#f5a623',
    lat: 22.4320, lng: 69.1100,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:42',
      bright_ti4: 352.4, bright_ti5: 297.8, delta_t: 54.6,
      scan: 0.39, track: 0.36, confidence: 'n', frp: 96.2, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 91.8, mad_frp: 14.2, robust_deviation: 0.31, days_seen_30d: 27, days_seen_365d: 312, persistence_rate: 0.85 },
    frpHistory: genHistory(91, 14, 96.2),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.76, 'Persistent Industrial Heat': 0.14, 'Wildfire / Natural Fire': 0.02, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.05 },
    landCover: { built_up: 38, tree_cover: 6, shrubland: 4, grassland: 5, cropland: 12, bare: 26, water: 7, wetland: 2 },
    weather: { wind_speed_ms: 3.8, wind_direction_deg: 240, temperature_c: 28.1, humidity_pct: 71, precipitation_mm: 0 },
    facility: { name: 'ONGC Jamnagar Gas Processing Plant', type: 'Gas Processing', distance_m: 210, overlap: true },
    cluster: { detection_count: 19, overpass_count: 12, spatial_spread_km2: 0.09, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-JAM-005',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 22.5100, lng: 69.0400,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'Suomi-NPP', acq_date: '2026-09-07', acq_time: '14:22',
      bright_ti4: 338.1, bright_ti5: 294.9, delta_t: 43.2,
      scan: 0.42, track: 0.38, confidence: 'n', frp: 64.7, daynight: 'D', version: '2.0NRT',
    },
    baseline: { median_frp: 59.4, mad_frp: 7.2, robust_deviation: 0.74, days_seen_30d: 25, days_seen_365d: 280, persistence_rate: 0.77 },
    frpHistory: genHistory(59, 7, 64.7),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.08, 'Persistent Industrial Heat': 0.80, 'Wildfire / Natural Fire': 0.04, 'Agricultural Burning': 0.02, 'Uncertain / Other': 0.04 },
    landCover: { built_up: 55, tree_cover: 5, shrubland: 3, grassland: 4, cropland: 8, bare: 20, water: 4, wetland: 1 },
    weather: { wind_speed_ms: 2.9, wind_direction_deg: 190, temperature_c: 31.2, humidity_pct: 65, precipitation_mm: 0 },
    facility: { name: 'Jamnagar Power Station (GETCO)', type: 'Thermal Power Plant', distance_m: 180, overlap: true },
    cluster: { detection_count: 22, overpass_count: 14, spatial_spread_km2: 0.14, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-JAM-006',
    district: 'Jamnagar', state: 'Gujarat',
    class: 'Uncertain / Other', classColor: '#888888',
    lat: 22.4450, lng: 68.9800,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:42',
      bright_ti4: 318.6, bright_ti5: 295.2, delta_t: 23.4,
      scan: 0.39, track: 0.36, confidence: 'l', frp: 28.3, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 22.1, mad_frp: 8.4, robust_deviation: 0.74, days_seen_30d: 8, days_seen_365d: 102, persistence_rate: 0.28 },
    frpHistory: genHistory(22, 8, 28.3),
    classification: { 'Acute Industrial Fire': 0.08, 'Routine Gas Flare': 0.12, 'Persistent Industrial Heat': 0.14, 'Wildfire / Natural Fire': 0.18, 'Agricultural Burning': 0.12, 'Uncertain / Other': 0.36 },
    landCover: { built_up: 22, tree_cover: 12, shrubland: 18, grassland: 14, cropland: 22, bare: 8, water: 2, wetland: 2 },
    weather: { wind_speed_ms: 6.2, wind_direction_deg: 280, temperature_c: 27.4, humidity_pct: 80, precipitation_mm: 2.1 },
    facility: { name: 'Jamnagar Industrial Estate (GIDC)', type: 'Industrial Estate', distance_m: 890, overlap: false },
    cluster: { detection_count: 2, overpass_count: 1, spatial_spread_km2: 0.82, centroid_drift_rate: 48, growth_direction: 180 },
  },
]

// ── LUDHIANA DISTRICT (Punjab) ────────────────────────────────────────────────
// Agricultural crop-burning season (Kharif harvest Oct-Nov)
const LUDHIANA = [
  {
    id: 'HS-LUD-001',
    district: 'Ludhiana', state: 'Punjab',
    class: 'Agricultural Burning', classColor: '#a8c640',
    lat: 30.9010, lng: 75.8573,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '06:14',
      bright_ti4: 326.4, bright_ti5: 296.8, delta_t: 29.6,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 22.4, daynight: 'D', version: '2.0NRT',
    },
    baseline: { median_frp: 8.2, mad_frp: 4.1, robust_deviation: 3.46, days_seen_30d: 6, days_seen_365d: 62, persistence_rate: 0.17 },
    frpHistory: genHistory(8, 4, 22.4),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.01, 'Persistent Industrial Heat': 0.02, 'Wildfire / Natural Fire': 0.08, 'Agricultural Burning': 0.84, 'Uncertain / Other': 0.03 },
    landCover: { built_up: 4, tree_cover: 2, shrubland: 1, grassland: 6, cropland: 84, bare: 2, water: 1, wetland: 0 },
    weather: { wind_speed_ms: 2.1, wind_direction_deg: 310, temperature_c: 24.8, humidity_pct: 58, precipitation_mm: 0 },
    facility: { name: 'Agricultural Field — Rice Stubble', type: 'Cropland / Agricultural Burning', distance_m: 0, overlap: false },
    cluster: { detection_count: 4, overpass_count: 2, spatial_spread_km2: 1.24, centroid_drift_rate: 62, growth_direction: 310 },
  },
  {
    id: 'HS-LUD-002',
    district: 'Ludhiana', state: 'Punjab',
    class: 'Agricultural Burning', classColor: '#a8c640',
    lat: 30.8750, lng: 75.8800,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'Suomi-NPP', acq_date: '2026-09-12', acq_time: '07:02',
      bright_ti4: 331.2, bright_ti5: 297.4, delta_t: 33.8,
      scan: 0.41, track: 0.38, confidence: 'h', frp: 31.8, daynight: 'D', version: '2.0NRT',
    },
    baseline: { median_frp: 7.4, mad_frp: 3.8, robust_deviation: 6.42, days_seen_30d: 4, days_seen_365d: 48, persistence_rate: 0.13 },
    frpHistory: genHistory(7, 4, 31.8),
    classification: { 'Acute Industrial Fire': 0.01, 'Routine Gas Flare': 0.01, 'Persistent Industrial Heat': 0.01, 'Wildfire / Natural Fire': 0.06, 'Agricultural Burning': 0.89, 'Uncertain / Other': 0.02 },
    landCover: { built_up: 2, tree_cover: 3, shrubland: 2, grassland: 4, cropland: 87, bare: 1, water: 1, wetland: 0 },
    weather: { wind_speed_ms: 1.8, wind_direction_deg: 320, temperature_c: 25.1, humidity_pct: 55, precipitation_mm: 0 },
    facility: { name: 'Punjab Farmland — Stubble Burning', type: 'Cropland / Agricultural Burning', distance_m: 0, overlap: false },
    cluster: { detection_count: 3, overpass_count: 2, spatial_spread_km2: 1.48, centroid_drift_rate: 74, growth_direction: 320 },
  },
  {
    id: 'HS-LUD-003',
    district: 'Ludhiana', state: 'Punjab',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 30.9200, lng: 75.8300,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-21', acq_date: '2026-09-12', acq_time: '05:58',
      bright_ti4: 342.8, bright_ti5: 298.1, delta_t: 44.7,
      scan: 0.39, track: 0.36, confidence: 'n', frp: 48.6, daynight: 'D', version: '2.0NRT',
    },
    baseline: { median_frp: 44.2, mad_frp: 6.8, robust_deviation: 0.65, days_seen_30d: 26, days_seen_365d: 298, persistence_rate: 0.82 },
    frpHistory: genHistory(44, 7, 48.6),
    classification: { 'Acute Industrial Fire': 0.03, 'Routine Gas Flare': 0.04, 'Persistent Industrial Heat': 0.78, 'Wildfire / Natural Fire': 0.04, 'Agricultural Burning': 0.06, 'Uncertain / Other': 0.05 },
    landCover: { built_up: 55, tree_cover: 8, shrubland: 3, grassland: 4, cropland: 18, bare: 9, water: 2, wetland: 1 },
    weather: { wind_speed_ms: 2.4, wind_direction_deg: 290, temperature_c: 26.2, humidity_pct: 61, precipitation_mm: 0 },
    facility: { name: 'Ludhiana Textile Mills Complex', type: 'Textile Manufacturing', distance_m: 220, overlap: true },
    cluster: { detection_count: 18, overpass_count: 11, spatial_spread_km2: 0.22, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-LUD-004',
    district: 'Ludhiana', state: 'Punjab',
    class: 'Agricultural Burning', classColor: '#a8c640',
    lat: 30.8520, lng: 75.8100,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '06:14',
      bright_ti4: 322.1, bright_ti5: 295.8, delta_t: 26.3,
      scan: 0.39, track: 0.36, confidence: 'n', frp: 15.9, daynight: 'D', version: '2.0NRT',
    },
    baseline: { median_frp: 6.8, mad_frp: 3.2, robust_deviation: 2.85, days_seen_30d: 3, days_seen_365d: 42, persistence_rate: 0.11 },
    frpHistory: genHistory(7, 3, 15.9),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.01, 'Persistent Industrial Heat': 0.03, 'Wildfire / Natural Fire': 0.11, 'Agricultural Burning': 0.79, 'Uncertain / Other': 0.04 },
    landCover: { built_up: 3, tree_cover: 5, shrubland: 3, grassland: 8, cropland: 79, bare: 1, water: 1, wetland: 0 },
    weather: { wind_speed_ms: 1.6, wind_direction_deg: 300, temperature_c: 24.5, humidity_pct: 60, precipitation_mm: 0 },
    facility: { name: 'Ludhiana Rural Farmlands', type: 'Cropland / Agricultural Burning', distance_m: 0, overlap: false },
    cluster: { detection_count: 2, overpass_count: 1, spatial_spread_km2: 0.88, centroid_drift_rate: 55, growth_direction: 300 },
  },
]

// ── MUMBAI DISTRICT (Maharashtra) ─────────────────────────────────────────────
const MUMBAI = [
  {
    id: 'HS-MUM-001',
    district: 'Mumbai', state: 'Maharashtra',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 19.0760, lng: 72.8777,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:28',
      bright_ti4: 344.2, bright_ti5: 298.4, delta_t: 45.8,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 58.4, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 54.8, mad_frp: 8.2, robust_deviation: 0.44, days_seen_30d: 29, days_seen_365d: 342, persistence_rate: 0.94 },
    frpHistory: genHistory(55, 8, 58.4),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.08, 'Persistent Industrial Heat': 0.82, 'Wildfire / Natural Fire': 0.04, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.03 },
    landCover: { built_up: 72, tree_cover: 6, shrubland: 2, grassland: 2, cropland: 4, bare: 10, water: 3, wetland: 1 },
    weather: { wind_speed_ms: 3.4, wind_direction_deg: 215, temperature_c: 27.2, humidity_pct: 82, precipitation_mm: 4.2 },
    facility: { name: 'Bharat Petroleum BPCL Refinery, Mahul', type: 'Petroleum Refinery', distance_m: 180, overlap: true },
    cluster: { detection_count: 24, overpass_count: 15, spatial_spread_km2: 0.16, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-MUM-002',
    district: 'Mumbai', state: 'Maharashtra',
    class: 'Wildfire / Natural Fire', classColor: '#ff8c00',
    lat: 19.2140, lng: 72.9100,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'Suomi-NPP', acq_date: '2026-09-12', acq_time: '00:44',
      bright_ti4: 356.8, bright_ti5: 299.2, delta_t: 57.6,
      scan: 0.40, track: 0.37, confidence: 'h', frp: 72.1, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 14.2, mad_frp: 8.4, robust_deviation: 6.88, days_seen_30d: 5, days_seen_365d: 68, persistence_rate: 0.19 },
    frpHistory: genHistory(14, 8, 72.1),
    classification: { 'Acute Industrial Fire': 0.04, 'Routine Gas Flare': 0.02, 'Persistent Industrial Heat': 0.06, 'Wildfire / Natural Fire': 0.82, 'Agricultural Burning': 0.03, 'Uncertain / Other': 0.03 },
    landCover: { built_up: 8, tree_cover: 72, shrubland: 12, grassland: 4, cropland: 2, bare: 1, water: 1, wetland: 0 },
    weather: { wind_speed_ms: 5.2, wind_direction_deg: 240, temperature_c: 26.8, humidity_pct: 78, precipitation_mm: 0 },
    facility: { name: 'Sanjay Gandhi National Park — Forest Edge', type: 'Protected Forest', distance_m: 0, overlap: false },
    cluster: { detection_count: 6, overpass_count: 3, spatial_spread_km2: 2.14, centroid_drift_rate: 88, growth_direction: 240 },
  },
  {
    id: 'HS-MUM-003',
    district: 'Mumbai', state: 'Maharashtra',
    class: 'Uncertain / Other', classColor: '#888888',
    lat: 19.0420, lng: 72.8580,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-21', acq_date: '2026-09-12', acq_time: '02:14',
      bright_ti4: 314.2, bright_ti5: 294.8, delta_t: 19.4,
      scan: 0.39, track: 0.36, confidence: 'l', frp: 18.6, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 16.8, mad_frp: 6.2, robust_deviation: 0.29, days_seen_30d: 11, days_seen_365d: 140, persistence_rate: 0.38 },
    frpHistory: genHistory(17, 6, 18.6),
    classification: { 'Acute Industrial Fire': 0.09, 'Routine Gas Flare': 0.14, 'Persistent Industrial Heat': 0.22, 'Wildfire / Natural Fire': 0.14, 'Agricultural Burning': 0.08, 'Uncertain / Other': 0.33 },
    landCover: { built_up: 40, tree_cover: 18, shrubland: 10, grassland: 8, cropland: 12, bare: 6, water: 4, wetland: 2 },
    weather: { wind_speed_ms: 4.8, wind_direction_deg: 220, temperature_c: 27.0, humidity_pct: 84, precipitation_mm: 8.4 },
    facility: { name: 'Dharavi Industrial Area', type: 'Mixed Industrial', distance_m: 640, overlap: false },
    cluster: { detection_count: 2, overpass_count: 1, spatial_spread_km2: 0.54, centroid_drift_rate: 28, growth_direction: 200 },
  },
]

// ── SURAT DISTRICT (Gujarat) ──────────────────────────────────────────────────
const SURAT = [
  {
    id: 'HS-SUR-001',
    district: 'Surat', state: 'Gujarat',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 21.1702, lng: 72.8311,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:38',
      bright_ti4: 348.6, bright_ti5: 297.8, delta_t: 50.8,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 81.4, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 76.8, mad_frp: 10.2, robust_deviation: 0.45, days_seen_30d: 30, days_seen_365d: 355, persistence_rate: 0.97 },
    frpHistory: genHistory(77, 10, 81.4),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.10, 'Persistent Industrial Heat': 0.82, 'Wildfire / Natural Fire': 0.02, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.03 },
    landCover: { built_up: 65, tree_cover: 4, shrubland: 2, grassland: 3, cropland: 6, bare: 14, water: 5, wetland: 1 },
    weather: { wind_speed_ms: 3.8, wind_direction_deg: 200, temperature_c: 29.4, humidity_pct: 76, precipitation_mm: 1.2 },
    facility: { name: 'Surat Hazira Industrial Zone (LNG Terminal)', type: 'LNG Terminal', distance_m: 280, overlap: true },
    cluster: { detection_count: 26, overpass_count: 16, spatial_spread_km2: 0.11, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-SUR-002',
    district: 'Surat', state: 'Gujarat',
    class: 'Routine Gas Flare', classColor: '#f5a623',
    lat: 21.1480, lng: 72.8600,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'Suomi-NPP', acq_date: '2026-09-12', acq_time: '00:52',
      bright_ti4: 358.2, bright_ti5: 298.6, delta_t: 59.6,
      scan: 0.40, track: 0.37, confidence: 'h', frp: 112.8, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 104.2, mad_frp: 15.8, robust_deviation: 0.54, days_seen_30d: 28, days_seen_365d: 326, persistence_rate: 0.89 },
    frpHistory: genHistory(104, 16, 112.8),
    classification: { 'Acute Industrial Fire': 0.03, 'Routine Gas Flare': 0.79, 'Persistent Industrial Heat': 0.11, 'Wildfire / Natural Fire': 0.02, 'Agricultural Burning': 0.01, 'Uncertain / Other': 0.04 },
    landCover: { built_up: 42, tree_cover: 5, shrubland: 3, grassland: 4, cropland: 10, bare: 26, water: 8, wetland: 2 },
    weather: { wind_speed_ms: 4.4, wind_direction_deg: 215, temperature_c: 29.8, humidity_pct: 74, precipitation_mm: 0.8 },
    facility: { name: 'ONGC Hazira Gas Processing Complex', type: 'Gas Processing', distance_m: 140, overlap: true },
    cluster: { detection_count: 20, overpass_count: 13, spatial_spread_km2: 0.08, centroid_drift_rate: 0, growth_direction: null },
  },
]

// ── CHENNAI DISTRICT (Tamil Nadu) ─────────────────────────────────────────────
const CHENNAI = [
  {
    id: 'HS-CHE-001',
    district: 'Chennai', state: 'Tamil Nadu',
    class: 'Persistent Industrial Heat', classColor: '#3a9fff',
    lat: 13.0827, lng: 80.2707,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-20', acq_date: '2026-09-12', acq_time: '01:22',
      bright_ti4: 338.4, bright_ti5: 297.2, delta_t: 41.2,
      scan: 0.39, track: 0.36, confidence: 'h', frp: 52.1, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 48.6, mad_frp: 7.4, robust_deviation: 0.47, days_seen_30d: 28, days_seen_365d: 335, persistence_rate: 0.92 },
    frpHistory: genHistory(49, 7, 52.1),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.06, 'Persistent Industrial Heat': 0.85, 'Wildfire / Natural Fire': 0.03, 'Agricultural Burning': 0.02, 'Uncertain / Other': 0.02 },
    landCover: { built_up: 68, tree_cover: 8, shrubland: 2, grassland: 3, cropland: 5, bare: 10, water: 3, wetland: 1 },
    weather: { wind_speed_ms: 4.8, wind_direction_deg: 140, temperature_c: 31.8, humidity_pct: 78, precipitation_mm: 0 },
    facility: { name: 'Manali Petrochemical Complex (CPCL)', type: 'Petrochemical', distance_m: 290, overlap: true },
    cluster: { detection_count: 22, overpass_count: 14, spatial_spread_km2: 0.14, centroid_drift_rate: 0, growth_direction: null },
  },
  {
    id: 'HS-CHE-002',
    district: 'Chennai', state: 'Tamil Nadu',
    class: 'Agricultural Burning', classColor: '#a8c640',
    lat: 13.1500, lng: 80.3200,
    satellite: {
      sensor: 'VIIRS', spacecraft: 'NOAA-21', acq_date: '2026-09-12', acq_time: '02:06',
      bright_ti4: 320.8, bright_ti5: 295.4, delta_t: 25.4,
      scan: 0.39, track: 0.36, confidence: 'n', frp: 14.2, daynight: 'N', version: '2.0NRT',
    },
    baseline: { median_frp: 6.2, mad_frp: 2.8, robust_deviation: 2.86, days_seen_30d: 4, days_seen_365d: 38, persistence_rate: 0.10 },
    frpHistory: genHistory(6, 3, 14.2),
    classification: { 'Acute Industrial Fire': 0.02, 'Routine Gas Flare': 0.01, 'Persistent Industrial Heat': 0.03, 'Wildfire / Natural Fire': 0.12, 'Agricultural Burning': 0.78, 'Uncertain / Other': 0.04 },
    landCover: { built_up: 12, tree_cover: 8, shrubland: 6, grassland: 8, cropland: 62, bare: 2, water: 1, wetland: 1 },
    weather: { wind_speed_ms: 3.6, wind_direction_deg: 160, temperature_c: 30.4, humidity_pct: 74, precipitation_mm: 0 },
    facility: { name: 'Tiruvallur Agricultural Zone', type: 'Cropland / Agricultural Burning', distance_m: 0, overlap: false },
    cluster: { detection_count: 3, overpass_count: 2, spatial_spread_km2: 0.92, centroid_drift_rate: 42, growth_direction: 160 },
  },
]

// ── Master data map ───────────────────────────────────────────────────────────
export const ALL_HOTSPOTS_BY_DISTRICT = {
  'Jamnagar':  JAMNAGAR,
  'Ludhiana':  LUDHIANA,
  'Mumbai':    MUMBAI,
  'Surat':     SURAT,
  'Chennai':   CHENNAI,
}

// ── Helper exports ────────────────────────────────────────────────────────────
export function getHotspotsByDistrict(district) {
  return ALL_HOTSPOTS_BY_DISTRICT[district] || []
}

export function getHotspotById(id) {
  for (const spots of Object.values(ALL_HOTSPOTS_BY_DISTRICT)) {
    const found = spots.find(s => s.id === id)
    if (found) return found
  }
  return null
}

export function getAllHotspots() {
  return Object.values(ALL_HOTSPOTS_BY_DISTRICT).flat()
}
