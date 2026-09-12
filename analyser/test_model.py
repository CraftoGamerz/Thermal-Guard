"""Synthetic fixtures are for tests only, never production training."""
import copy
import tempfile
import unittest
from pathlib import Path
import numpy as np
from xgboost_analyser import analyse, vector, prior_history, history_index


def fixture():
    rng = np.random.default_rng(12)
    rows = []
    for day in range(1, 8):
        for i in range(60):
            t4 = float(rng.uniform(310, 390))
            rows.append({"id": f"test-{day}-{i}", "lat": 22.3, "lon": 69.9,
                         "frp": float(max(0, (t4-300)*0.5+rng.normal(0, 2))),
                         "brightness": t4, "brightnessI5": 295., "scan": .4, "track": .4,
                         "daynight": "D", "confidence": "nominal", "source": "NOAA20",
                         "acquiredAt": f"2026-09-{day:02d}T12:{i:02d}:00Z"})
    return rows


class ModelTests(unittest.TestCase):
    def test_no_frp_feature_leakage(self):
        row = fixture()[0]
        self.assertEqual(vector(row), vector({**row, "frp": 99999}))
        self.assertIsNone(vector({**row, "brightnessI5": None}))

    def test_prior_history_excludes_current_and_future(self):
        rows = fixture()
        self.assertEqual(prior_history(rows[0], history_index(rows))["priorDetections"], 0)
        self.assertEqual(prior_history(rows[60], history_index(rows))["observedDays"], 1)

    def test_real_training_evaluation_and_artifact(self):
        rows = fixture()
        with tempfile.TemporaryDirectory() as folder:
            path = str(Path(folder)/"model.json")
            result = analyse({"training": rows, "scoring": rows[-60:], "modelPath": path})
            self.assertEqual(result["model"]["train"]["count"], 300)
            self.assertEqual(result["model"]["test"]["count"], 60)
            self.assertTrue(result["model"]["beatsMedianMae"])
            self.assertEqual(result["rows"][0]["split"], "held-out day")
            self.assertTrue(Path(path).is_file())
            self.assertTrue(Path(folder, "training.json").is_file())
            altered = copy.deepcopy(rows)
            for row in altered[-60:]:
                row["frp"] *= 20
            second = analyse({"training": altered, "scoring": rows[-60:], "modelPath": path})
            self.assertEqual({r["id"]: r["expectedFrp"] for r in result["rows"]},
                             {r["id"]: r["expectedFrp"] for r in second["rows"]})
            self.assertNotEqual(result["model"]["metrics"], second["model"]["metrics"])
            changed_input = copy.deepcopy(rows[-60:])
            for row in changed_input:
                row["frp"] *= 10
            third = analyse({"training": rows, "scoring": changed_input, "modelPath": path})
            self.assertEqual(result["model"]["trainingDigest"], third["model"]["trainingDigest"])
            self.assertEqual({r["id"]: r["expectedFrp"] for r in result["rows"]},
                             {r["id"]: r["expectedFrp"] for r in third["rows"]})
            self.assertGreater(sum(r["unusual"] for r in third["rows"]), sum(r["unusual"] for r in result["rows"]))

    def test_insufficient_data_refused(self):
        with self.assertRaisesRegex(ValueError, "four observed UTC days"):
            analyse({"training": fixture()[:60], "scoring": [], "modelPath": "unused"})

    def test_missing_model_inputs_and_future_history(self):
        rows = fixture()
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, "No scorable observations"):
                analyse({"training": rows, "scoring": [{**rows[-1], "brightness": None}], "modelPath": str(Path(folder)/"model.json")})
        old = {**rows[-1], "acquiredAt": "2026-10-07T12:00:00Z"}
        self.assertEqual(prior_history(old, history_index(rows))["priorDetections"], 0)


if __name__ == "__main__":
    unittest.main()
