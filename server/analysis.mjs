import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SOURCES,
  bboxValue,
  parseCSV,
  normalize,
  fail,
} from "./processing.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
export const CSV_LIMIT = 2 * 1024 * 1024;
export function validateAnalysis(value) {
  const source = value.source || "NOAA20",
    days = Number(value.days || 1);
  if (
    !Object.hasOwn(SOURCES, source) ||
    ![1, 2, 7].includes(days) ||
    (value.mode && value.mode !== "live")
  )
    throw fail(
      "Select a valid real NASA source and time window. Replay cannot enter the model.",
    );
  const query = { source, days, bbox: bboxValue(value.bbox), mode: "live" };
  let upload = null;
  if (value.csv !== undefined) {
    if (
      typeof value.csv !== "string" ||
      !value.csv.trim() ||
      Buffer.byteLength(value.csv) > CSV_LIMIT
    )
      throw fail("Choose a nonempty FIRMS CSV no larger than 2 MB.");
    upload = normalize(parseCSV(value.csv), source);
    if (!upload.detections.length)
      throw fail("The CSV contains no valid FIRMS observations.");
    if (upload.detections.length > 15000)
      throw fail("The CSV exceeds 15,000 observations.");
  }
  return { query, upload };
}

export function runPython(payload, { signal, python: pythonOverride } = {}) {
  return new Promise((resolveResult, reject) => {
    const venvPython = resolve(
      root,
      process.platform === "win32"
        ? ".venv/Scripts/python.exe"
        : ".venv/bin/python",
    );
    const python =
      pythonOverride ||
      process.env.PYTHON_BIN ||
      (existsSync(venvPython)
        ? venvPython
        : process.platform === "win32"
          ? "python"
          : "python3");
    const child = spawn(
      python,
      [resolve(root, "analyser/xgboost_analyser.py")],
      {
        shell: false,
        windowsHide: true,
        cwd: root,
        signal,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          OMP_NUM_THREADS: "2",
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "",
      stderr = "",
      overflow = false;
    const timer = setTimeout(() => {
      overflow = true;
      child.kill();
    }, 120000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 32000000) {
        overflow = true;
        child.kill();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.stdin.on("error", () => {});
    child.on("error", () => {
      clearTimeout(timer);
      reject(
        fail(
          "Model runtime unavailable. Create .venv and install analyser/requirements.txt, or set PYTHON_BIN to that environment's Python.",
          503,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (overflow)
        return reject(
          fail(
            "Model exceeded the 120-second / 32 MB processing limit. Use a smaller input.",
            503,
          ),
        );
      let data;
      try {
        data = JSON.parse(output);
      } catch {
        return reject(
          fail(
            stderr.includes("ModuleNotFoundError")
              ? "Missing Python model dependencies. Install analyser/requirements.txt in the configured Python environment."
              : "Model process did not return a valid report. Check the Python runtime and input fields.",
            503,
          ),
        );
      }
      if (code !== 0 || data.error)
        return reject(fail(data.error || "Model process failed.", 422));
      resolveResult(data);
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export function createAnalysis(
  store,
  providers,
  { runner = runPython, artifactRoot = resolve(root, "data/analysis") } = {},
) {
  const runs = new Map();
  let active = null,
    closing = false;
  const controller = new AbortController();
  function get(id) {
    const run = runs.get(id) || store.run(id);
    if (!run) throw fail("Analysis job not found. Start a new analysis.", 404);
    if (!runs.has(id) && ["queued", "running"].includes(run.status)) {
      Object.assign(run, {
        status: "failed",
        stage: "Interrupted",
        error: "The server restarted during this job. Run analysis again.",
      });
      store.saveRun(run);
    }
    return {
      ...run,
      elapsedMs: run.finishedAt
        ? Date.parse(run.finishedAt) - Date.parse(run.startedAt)
        : Date.now() - Date.parse(run.startedAt),
    };
  }
  return {
    get,
    start(value) {
      if (active || closing)
        throw fail(
          "An analysis is already running. Wait for it to finish and retry.",
          429,
        );
      const { query, upload } = validateAnalysis(value);
      const run = {
        id: randomUUID(),
        status: "queued",
        stage: "Queued",
        startedAt: new Date().toISOString(),
      };
      runs.set(run.id, run);
      store.saveRun(run);
      // Keep status creation synchronous; every stage below performs real work.
      active = (async () => {
        try {
          run.status = "running";
          run.stage = "Fetching and validating NASA observations";
          const fetchStart = performance.now();
          const [training, input] = await Promise.all([
            providers.events({
              source: query.source,
              days: 7,
              bbox: [60, 0, 105, 40],
              mode: "live",
            }),
            upload ? Promise.resolve(null) : providers.events(query),
          ]);
          const fetchMs = Math.round(performance.now() - fetchStart);
          const flatten = (events) =>
            events.flatMap((e) =>
              e.detections.map((d) => ({ ...d, eventId: e.id })),
            );
          const scoring = upload ? upload.detections : flatten(input.events);
          if (!scoring.length)
            throw fail(
              "No detections in this extent/window. Try seven days or a wider area; nothing has been fabricated.",
              422,
            );
          run.stage =
            "Training XGBoost, evaluating holdout and scoring observations";
          const computeStart = performance.now();
          const result = await runner(
            {
              training: flatten(training.events),
              scoring,
              modelPath: resolve(artifactRoot, run.id, "model.json"),
            },
            { signal: controller.signal },
          );
          if (upload)
            for (const row of result.rows)
              row.flags.push(
                "User CSV; not an independently verified held-out NASA observation",
              );
          result.timings = {
            ...result.timings,
            nasaFetchMs: fetchMs,
            workerMs: Math.round(performance.now() - computeStart),
            totalMs: Date.now() - Date.parse(run.startedAt),
          };
          result.provenance = {
            training: training.meta,
            input: upload
              ? {
                  mode: "upload",
                  provider: "User CSV — provenance unverified",
                  source: query.source,
                  detectionCount: upload.detections.length,
                  rejectedRows: upload.rejectedRows,
                  duplicates: upload.duplicates,
                  fetchedAt: null,
                }
              : input.meta,
          };
          // Retain reviewable NASA event evidence from this exact run; never create it from uploads.
          result.events = input?.events || [];
          result.request = { ...query, input: upload ? "csv" : "nasa" };
          result.runId = run.id;
          run.result = result;
          run.status = "completed";
          run.stage = "Report ready";
        } catch (error) {
          run.status = "failed";
          run.stage = "Analysis stopped";
          run.error = error.status
            ? error.message
            : "Analysis failed. Check the local model runtime and retry; no substitute scores were produced.";
        } finally {
          run.finishedAt = new Date().toISOString();
          store.saveRun(run);
          active = null;
          while (runs.size > 10) runs.delete(runs.keys().next().value);
        }
      })();
      return {
        id: run.id,
        status: run.status,
        stage: run.stage,
        startedAt: run.startedAt,
      };
    },
    async close() {
      closing = true;
      controller.abort();
      await active;
    },
  };
}
