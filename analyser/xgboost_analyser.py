"""Real NASA-observation regression via JSON stdin/stdout; never trains on score input.
Same-observation FRP consistency screening, NOT a cause classifier or forecast.
"""
import hashlib
import json
import math
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import xgboost as xgb

VERSION = "frp-consistency-1.0.0"
FEATURES = ["I4_K", "I5_K", "scan_km", "track_km", "latitude", "longitude",
            "UTC_hour_sin", "UTC_hour_cos", "daylight"]


def vector(row):
    """No observed FRP or FRP-derived feature is allowed here."""
    bounds = {"brightness": (150, 500), "brightnessI5": (150, 500),
              "scan": (0.01, 5), "track": (0.01, 5),
              "lat": (-90, 90), "lon": (-180, 180)}
    for key, (lo, hi) in bounds.items():
        value = row.get(key)
        if not isinstance(value, (float, int)) or not math.isfinite(value) or not lo <= value <= hi:
            return None
    if row.get("daynight") not in ("D", "N"):
        return None
    stamp = datetime.fromisoformat(row["acquiredAt"].replace("Z", "+00:00"))
    angle = (stamp.hour + stamp.minute / 60) / 24 * math.tau
    return [row[k] for k in bounds] + [math.sin(angle), math.cos(angle), int(row["daynight"] == "D")]


def distance(a, b):
    lat1, lat2 = math.radians(a["lat"]), math.radians(b["lat"])
    dlat, dlon = lat2 - lat1, math.radians(b["lon"] - a["lon"])
    v = math.sin(dlat / 2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon / 2)**2
    return 12742 * math.asin(min(1, math.sqrt(v)))


def history_index(rows):
    index = defaultdict(list)
    for row in rows:
        index[(math.floor(row["lat"] * 20), math.floor(row["lon"] * 20))].append(row)
    return index


def prior_history(row, index):
    day = row["acquiredAt"][:10]
    stamp = datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()
    x, y = math.floor(row["lat"] * 20), math.floor(row["lon"] * 20)
    nearby = [p for i in range(x-2, x+3) for j in range(y-2, y+3)
              for p in index.get((i, j), []) if p["acquiredAt"][:10] < day
              and stamp - datetime.fromisoformat(p["acquiredAt"].replace("Z", "+00:00")).timestamp() <= 7*86400
              and distance(p, row) <= 5]
    days = sorted({p["acquiredAt"][:10] for p in nearby})
    values = [p["frp"] for p in nearby]
    median = float(np.median(values)) if len(values) >= 3 else None
    mad = float(np.median(np.abs(np.array(values)-median))) if median is not None else None
    return {"radiusKm": 5, "priorDetections": len(values), "observedDays": len(days),
            "firstDay": days[0] if days else None, "lastDay": days[-1] if days else None,
            "medianFrp": median, "madFrp": mad,
            "observedToMedian": row["frp"]/median if median and median > 0 else None}


def metrics(actual, predicted):
    return {"maeMw": float(np.mean(np.abs(actual-predicted))),
            "rmseMw": float(np.sqrt(np.mean((actual-predicted)**2)))}


def analyse(payload):
    start = time.perf_counter()
    raw = payload["training"]
    if len(raw) > 50000 or len(payload["scoring"]) > 15000:
        raise ValueError("Dataset exceeds the prototype's bounded processing limit.")
    rows = sorted([r for r in raw if vector(r) is not None], key=lambda r: r["acquiredAt"])
    days = sorted({r["acquiredAt"][:10] for r in rows})
    if len(days) < 4:
        raise ValueError("Need at least four observed UTC days for independent temporal evaluation.")
    train = [r for r in rows if r["acquiredAt"][:10] < days[-2]]
    cal = [r for r in rows if r["acquiredAt"][:10] == days[-2]]
    test = [r for r in rows if r["acquiredAt"][:10] == days[-1]]
    if len(train) < 100 or min(len(cal), len(test)) < 20:
        raise ValueError("Insufficient measured data: need 100 training and 20 calibration/test observations each. Try another sensor.")
    def matrix(points):
        return xgb.DMatrix(np.asarray([vector(r) for r in points], dtype=np.float32), feature_names=FEATURES)
    training = matrix(train)
    training.set_label(np.log1p([r["frp"] for r in train]))
    model = xgb.train({"objective": "reg:squarederror", "tree_method": "hist", "max_depth": 4,
                       "eta": 0.06, "subsample": 0.9, "colsample_bytree": 0.9,
                       "seed": 42, "nthread": 2}, training, num_boost_round=140)
    fit_ms = round((time.perf_counter()-start)*1000)
    cal_residuals = np.sort(np.log1p([r["frp"] for r in cal])-model.predict(matrix(cal)))
    test_prediction = np.maximum(0, np.expm1(model.predict(matrix(test))))
    actual = np.array([r["frp"] for r in test])
    median = float(np.median([r["frp"] for r in train]))
    evaluation = metrics(actual, test_prediction)
    baseline_metrics = metrics(actual, np.full(len(test), median))
    gains = model.get_score(importance_type="gain")
    total_gain = sum(gains.values()) or 1
    feature_importance = sorted([{"feature": k, "gainShare": gains.get(k, 0)/total_gain} for k in FEATURES], key=lambda a: -a["gainShare"])
    score = [r for r in payload["scoring"] if vector(r) is not None]
    if not score:
        raise ValueError("No scorable observations. Require measured I4/I5 brightness, scan, track and D/N flag in addition to FIRMS coordinates, date/time and FRP.")
    dm = matrix(score)
    expected_log = model.predict(dm)
    contributions = model.predict(dm, pred_contribs=True)
    train_values = np.array([vector(r) for r in train])
    lower, upper = train_values.min(axis=0), train_values.max(axis=0)
    index = history_index(raw)
    results = []
    for row, predicted, effect in zip(score, expected_log, contributions):
        features = vector(row)
        flags = [FEATURES[i] + " outside training range" for i, value in enumerate(features) if value < lower[i] or value > upper[i]]
        observed, expected = row["frp"], max(0, float(np.expm1(predicted)))
        residual = math.log1p(observed)-float(predicted)
        percentile = float(np.searchsorted(cal_residuals, residual, side="right")/len(cal)*100)
        day = row["acquiredAt"][:10]
        split = "training period" if day < days[-2] else "calibration day" if day == days[-2] else "held-out day" if day == days[-1] else "after evaluation window"
        if day < days[0]:
            flags.append("Acquisition predates training window")
        if split == "after evaluation window":
            flags.append("Acquisition after evaluation window; temporal generalization unverified")
        top = sorted(zip(FEATURES, effect[:-1]), key=lambda p: -abs(float(p[1])))[:3]
        results.append({"id": row["id"], "eventId": row.get("eventId"), "lat": row["lat"], "lon": row["lon"],
                        "acquiredAt": row["acquiredAt"], "source": row["source"], "confidence": row["confidence"],
                        "observedFrp": observed, "expectedFrp": expected, "excessMw": observed-expected,
                        "residualPercentile": percentile, "unusual": percentile >= 95 and observed > expected,
                        "split": split, "flags": flags, "baseline": prior_history(row, index),
                        "features": dict(zip(FEATURES, features)),
                        "contributions": [{"feature": k, "logContribution": float(v)} for k, v in top]})
    artifact = Path(payload["modelPath"])
    artifact.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(artifact)
    # Preserve the exact normalized NASA snapshot so the digest is auditable.
    artifact.with_name("training.json").write_text(json.dumps(rows, sort_keys=True, allow_nan=False), encoding="utf-8")
    digest = hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()
    return {"model": {"version": VERSION, "library": "XGBoost " + xgb.__version__, "target": "log(1 + observed FRP MW)",
                      "trainedAt": datetime.now(timezone.utc).isoformat(), "trainingDigest": digest,
                      "train": {"from": days[0], "to": days[-3], "count": len(train)},
                      "calibration": {"day": days[-2], "count": len(cal)}, "test": {"day": days[-1], "count": len(test)},
                      "metrics": evaluation, "medianBaseline": {"frpMw": median, **baseline_metrics},
                      "beatsMedianMae": evaluation["maeMw"] < baseline_metrics["maeMw"],
                      "importance": feature_importance, "features": FEATURES, "trees": 140,
                      "excludedTrainingRows": len(raw)-len(rows)},
            "rows": sorted(results, key=lambda r: -r["residualPercentile"]),
            "quality": {"scored": len(score), "excludedScoringRows": len(payload["scoring"])-len(score)},
            "timings": {"fitMs": fit_ms, "pythonTotalMs": round((time.perf_counter()-start)*1000)},
            "limitations": ["Same-observation FRP estimate, not a forecast or fire-cause/risk probability.",
                            "Radiometry and FRP are physically related; residuals may reflect sensor effects or model error.",
                            "Temporal holdout only; no independent spatial or incident-ground-truth validation.",
                            "Residual percentile ranks calibration-day errors; 95th percentile is an exploratory threshold.",
                            "Seven-day, positive-detection-only history is not a long-term facility baseline or persistence probability.",
                            "Clouds, overpasses and resolution can hide activity. No detection does not establish safety."]}


if __name__ == "__main__":
    try:
        print(json.dumps(analyse(json.load(sys.stdin)), allow_nan=False))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
