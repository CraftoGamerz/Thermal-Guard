/**
 * LEGACY DEMONSTRATION ONLY — NOT A TRAINED XGBOOST MODEL.
 * No longer imported by the active application. Real analysis is implemented
 * in server/analysis.mjs and analyser/xgboost_analyser.py. The hand-written
 * rules below are preserved solely as historical demo code, not evidence.
 * xgb.js — Calibrated XGBoost Gradient-Boosted Decision Tree Engine (JavaScript)
 *
 * Implements Gradient Boosting with decision trees (CART) calibrated against
 * satellite thermal baselines (NASA FIRMS VIIRS & ThermalGuard specifications).
 *
 * Key Baseline Criteria:
 * - High historical persistence (>70%) indicates routine flares or continuous process heat (Low/Moderate).
 * - Low persistence (<35%) combined with severe anomaly deviation (sigma >= 7.0) indicates Acute Emergencies (Critical).
 * - High cropland (>60%) indicates agricultural residue/stubble burning (Moderate).
 * - High forest cover with strong winds indicates wildfire hazard (High).
 * - Eliminates false alarm Critical alerts on baseline-conforming signals (e.g. 67 MW process heat in Ahmedabad).
 */

const _NUM_CLASSES = 4;
export const FEATURE_NAMES = [
  'FRP (MW)',
  'Brightness T4 (K)',
  'Thermal Delta (K)',
  'Robust Deviation (sigma)',
  'Persistence Rate',
  'Days Seen 30d',
  'Built-Up %',
  'Tree Cover %',
  'Cropland %',
  'Wind Speed (m/s)',
  'Humidity %',
  'Temperature (C)',
  'Detection Count',
  'Spatial Spread (km2)',
  'Centroid Drift (m/pass)',
  'Confidence High (0/1)',
  'Confidence Nominal (0/1)',
  'Facility Overlap (0/1)',
  'FRP / Median Ratio',
];

/**
 * Predict risk level for a 19-dimensional feature vector.
 * @param {number[]} x
 * @returns {{ classIndex: number, label: string, color: string, score: number, probabilities: number[] }}
 */
export function predict(x) {
  const frp        = x[0] || 0;
  const _t4        = x[1] || 320;
  const _dt        = x[2] || 20;
  const rd         = x[3] || 0;
  const pr         = x[4] != null ? x[4] : 0.5;
  const builtUp    = x[6] || 30;
  const treeCover  = x[7] || 10;
  const cropland   = x[8] || 15;
  const wind       = x[9] || 3;

  // Base log-odds margins (Class 3 has negative prior to prevent spurious Critical classifications)
  const m = [0.0, 0.0, 0.0, -2.4];

  // ── Ensemble Tree 1: Persistence vs Robust Anomaly Deviation (Core Baseline) ──
  if (pr >= 0.70) {
    // Routine persistent heat source (Refinery flare, kiln, boiler)
    if (rd <= 2.5) {
      m[0] += 2.0; m[1] += 0.8; m[2] -= 0.8; m[3] -= 2.4;
    } else if (rd <= 5.0) {
      m[1] += 1.8; m[0] += 0.4; m[2] += 0.4; m[3] -= 1.8;
    } else {
      m[2] += 1.4; m[1] += 1.0; m[0] -= 0.4; m[3] -= 0.8;
    }
  } else {
    // Non-routine or episodic heat source
    if (rd >= 7.5 && (pr < 0.35 || frp >= 150)) {
      // Acute sudden disaster spike
      m[3] += 3.8; m[2] += 1.2; m[1] -= 1.4; m[0] -= 2.8;
    } else if (rd >= 4.0) {
      m[2] += 2.0; m[1] += 0.6; m[3] += 0.2; m[0] -= 1.4;
    } else {
      m[1] += 1.4; m[0] += 0.8; m[2] -= 0.4; m[3] -= 1.8;
    }
  }

  // ── Ensemble Tree 2: Landscape & Land Cover Context (ESA WorldCover) ────────
  if (cropland >= 55) {
    // Agricultural residue burning
    m[1] += 2.2; m[0] += 0.5; m[2] -= 0.6; m[3] -= 2.4;
  } else if (treeCover >= 50) {
    // Forested zone / wildfire exposure
    if (wind >= 4.5) {
      m[2] += 2.0; m[1] += 0.6; m[3] += 0.3; m[0] -= 1.8;
    } else {
      m[1] += 1.4; m[2] += 1.0; m[0] -= 0.6; m[3] -= 1.8;
    }
  } else if (builtUp >= 55) {
    // Dense industrial / manufacturing zone
    if (pr >= 0.80 && rd <= 2.0) {
      m[0] += 2.2; m[1] += 0.5; m[2] -= 1.0; m[3] -= 2.6;
    } else if (rd >= 7.0 && pr < 0.35) {
      m[3] += 3.2; m[2] += 1.0; m[1] -= 1.2; m[0] -= 2.6;
    } else {
      m[1] += 1.4; m[0] += 0.6; m[2] += 0.3; m[3] -= 1.5;
    }
  }

  // ── Ensemble Tree 3: FRP Physical Magnitude Calibration ────────────────────
  if (frp <= 30) {
    m[0] += 1.8; m[1] += 0.9; m[2] -= 1.2; m[3] -= 3.0;
  } else if (frp <= 75) {
    // 30 - 75 MW (e.g. 67 MW in Ahmedabad, standard industrial boilers)
    if (pr >= 0.70) {
      m[0] += 1.6; m[1] += 1.2; m[2] -= 0.4; m[3] -= 2.2;
    } else {
      m[1] += 1.6; m[0] += 0.5; m[2] += 0.3; m[3] -= 1.8;
    }
  } else if (frp <= 140) {
    // 75 - 140 MW (e.g. Jamnagar flare or large kiln)
    if (pr >= 0.75) {
      m[1] += 2.0; m[0] += 0.2; m[2] += 0.5; m[3] -= 1.8;
    } else {
      m[2] += 2.0; m[1] += 0.6; m[3] += 0.4; m[0] -= 1.5;
    }
  } else {
    // > 140 MW (Extreme radiative output)
    if (pr < 0.35 && rd >= 6.0) {
      m[3] += 3.4; m[2] += 0.8; m[1] -= 1.4; m[0] -= 2.8;
    } else {
      m[1] += 1.5; m[2] += 1.4; m[3] -= 0.5; m[0] -= 0.8;
    }
  }

  // Softmax multi-class normalization
  const maxM = Math.max(...m);
  const exp = m.map(v => Math.exp(v - maxM));
  const sumExp = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map(v => v / sumExp);

  const cls = probs.indexOf(Math.max(...probs));
  const LABELS = ['Low', 'Moderate', 'High', 'Critical'];
  const COLORS = ['#22c55e', '#f5a623', '#ff9559', '#ff4444'];

  return {
    classIndex: cls,
    label: LABELS[cls],
    color: COLORS[cls],
    score: probs[cls],
    probabilities: probs,
    margins: m,
  };
}

/**
 * Normalized feature gain weights
 */
export function featureImportance() {
  const gains = [
    { name: 'Robust Deviation (sigma)', importance: 0.26 },
    { name: 'Persistence Rate (365d)',  importance: 0.22 },
    { name: 'FRP (MW)',                 importance: 0.18 },
    { name: 'Built-Up % / SEZ',         importance: 0.11 },
    { name: 'Cropland %',               importance: 0.08 },
    { name: 'Thermal Delta (K)',        importance: 0.06 },
    { name: 'Tree Cover %',             importance: 0.04 },
    { name: 'Wind Speed (m/s)',         importance: 0.03 },
    { name: 'Centroid Drift',           importance: 0.02 },
  ];
  return gains;
}

/**
 * Construct feature vector from a hotspot or event record.
 */
export function featuresFromHotspot(hs) {
  const sat = hs.satellite || {};
  const bl  = hs.baseline || {};
  const lc  = hs.landCover || {};
  const wx  = hs.weather || {};
  const cl  = hs.cluster || {};
  const frp = sat.frp != null ? sat.frp : (hs.maxFrp != null ? hs.maxFrp : (hs.frp || 0));
  const med = bl.median_frp != null ? bl.median_frp : (frp * 0.8);

  return [
    frp,
    sat.bright_ti4 || 342,
    sat.delta_t || ((sat.bright_ti4 || 342) - (sat.bright_ti5 || 298)) || 44,
    bl.robust_deviation != null ? bl.robust_deviation : ((frp - med) / Math.max(bl.mad_frp || 8, 1)),
    bl.persistence_rate != null ? bl.persistence_rate : 0.8,
    bl.days_seen_30d || 24,
    lc.built_up || 65,
    lc.tree_cover || 5,
    lc.cropland || 10,
    wx.wind_speed_ms || 3.2,
    wx.humidity_pct || 68,
    wx.temperature_c || 28.5,
    cl.detection_count || (hs.detections?.length || 3),
    cl.spatial_spread_km2 || 0.2,
    cl.centroid_drift_rate || 0,
    sat.confidence === 'h' || hs.confidence === 'high' ? 1 : 0,
    sat.confidence === 'n' || hs.confidence === 'nominal' ? 1 : 0,
    hs.facility?.overlap ? 1 : 0,
    med > 0 ? frp / med : 1,
  ];
}
