// Real NASA / XGBoost and provider read checks; creates no test cases or contacts.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const base = process.env.ANALYSIS_TEST_URL || "http://127.0.0.1:4185/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  jobs = [];
let result;
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", async (response) => {
  if (
    response.url().endsWith("/api/analysis/jobs") &&
    response.request().method() === "POST"
  )
    jobs.push(await response.json());
  if (/\/api\/analysis\/jobs\//.test(response.url())) {
    const data = await response.json();
    if (data.status === "completed") result = data.result;
  }
});
try {
  await page.goto(base + "#mission");
  await page.waitForFunction(
    () =>
      /Report ready|Analysis stopped|Automatic analysis paused/.test(
        document.querySelector(".auto-analysis-bar")?.textContent || "",
      ),
    null,
    { timeout: 120000 },
  );
  assert(result, await page.locator(".auto-analysis-bar").innerText());
  assert.match(result.model.library, /XGBoost/);
  assert(result.quality.scored > 0);
  assert.equal(jobs.length, 1);
  await page.screenshot({
    path: ".build/operations-live-mission.png",
    fullPage: true,
  });
  // Changing the rendered page does not enqueue another model for identical observations.
  await page.evaluate(() => {
    location.hash = "analyser";
  });
  await page
    .getByText("A measured benchmark, not a confidence claim.")
    .waitFor();
  await page.screenshot({ path: ".build/operations-live-analyser.png" });
  await page.evaluate(() => {
    location.hash = "resources";
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector(".ops-banner button")
        ?.textContent.includes("Refresh context"),
    null,
    { timeout: 30000 },
  );
  const resources = await page.locator(".operations").innerText();
  await page.screenshot({
    path: ".build/operations-live-resources.png",
    fullPage: true,
  });
  assert.equal(jobs.length, 1);
  assert.deepEqual(errors, []);
  const summary = {
    model: result.model.library,
    scored: result.quality.scored,
    train: result.model.train,
    calibration: result.model.calibration,
    test: result.model.test,
    metrics: result.model.metrics,
    timings: result.timings,
    source: result.provenance.input,
    runId: result.runId,
    resourcesText: resources,
    errors,
  };
  await writeFile(
    ".build/operations-live-verification.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(
    JSON.stringify({ ...summary, resourcesText: resources.slice(0, 1100) }),
  );
} finally {
  await browser.close();
}
