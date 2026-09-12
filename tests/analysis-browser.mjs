import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.ANALYSIS_TEST_URL || "http://127.0.0.1:4175/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(".build", { recursive: true });
const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base + "#analyser", { waitUntil: "domcontentloaded" });
  const run = page.getByRole("button", { name: "Run real XGBoost analysis" });
  await run.waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Run real XGBoost analysis"),
      )?.disabled,
    null,
    { timeout: 40000 },
  );
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/analysis/jobs/") &&
      r.request().method() === "GET" &&
      r.status() === 200,
  );
  await run.click();
  await response;
  await page
    .getByText("A measured benchmark, not a confidence claim.")
    .waitFor({ timeout: 60000 });
  assert.ok((await page.locator(".ra-evidence tbody tr").count()) > 0);
  await page.screenshot({
    path: ".build/real-analysis-desktop.png",
    fullPage: true,
  });
  await page.screenshot({ path: ".build/real-analysis-desktop-top.png" });
  const status = await page.locator(".ra-summary").innerText();
  console.log("REAL MODEL SUMMARY", status);
  await page
    .getByRole("button", { name: "Inputs", exact: true })
    .first()
    .click();
  await page
    .getByRole("region", { name: "Selected observation inputs" })
    .waitFor();
  const evidenceButton = page
    .getByRole("button", { name: "Review evidence", exact: true })
    .first();
  await evidenceButton.click();
  await page.getByRole("dialog", { name: "Evidence & review" }).waitFor();
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Full report JSON" }).click();
  const file = await download;
  assert.match(file.suggestedFilename(), /thermalguard-real-analysis.*json$/);
  await page
    .getByLabel("Search analysis observations")
    .fill("no-such-observation");
  await page.getByText("No observations match this filter.").waitFor();
  await page.getByLabel("Search analysis observations").fill("");
  await page.getByLabel("Analysis evidence filter").selectOption("held-out");
  assert.ok(
    (await page.locator(".ra-evidence tbody").innerText()).includes(
      "held-out day",
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".build/real-analysis-mobile-top.png" });
  await page.screenshot({
    path: ".build/real-analysis-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.getByLabel("Analysis input", { exact: true }).selectOption("csv");
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("not,nasa\n1,2"),
    });
  await run.click();
  await page
    .getByRole("alert")
    .filter({ hasText: "expected FIRMS CSV" })
    .waitFor();
  const header =
    "latitude,longitude,frp,acq_date,acq_time,confidence,bright_ti4,bright_ti5,scan,track,daynight\n";
  const date = new Date().toISOString().slice(0, 10);
  // Explicit test input, not a purported real incident. Production trains only on NASA.
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "qa-input.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        header + `22.36,69.87,15,${date},0430,nominal,345,298,0.4,0.4,D\n`,
      ),
    });
  await run.click();
  await page
    .getByText("A measured benchmark, not a confidence claim.")
    .waitFor({ timeout: 60000 });
  await page
    .getByText("Scoring a user-uploaded CSV.", { exact: false })
    .waitFor();
  assert.equal(await page.locator(".ra-evidence tbody tr").count(), 1);
  assert.equal(
    await page
      .getByRole("button", { name: "Review evidence", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Demo replay", exact: true }).click();
  await page
    .getByText(
      "Real analysis requires the full-stack application in Live mode.",
    )
    .waitFor();
  assert.equal(await run.isDisabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real backend model, evidence drawer, export, filters, responsive layout, CSV error/scoring and replay guard",
  );
} finally {
  await browser.close();
}
