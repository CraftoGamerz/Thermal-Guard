import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createApplication } from "../server/index.mjs";

await mkdir(".build", { recursive: true });
const csv =
  "latitude,longitude,frp,acq_date,acq_time,confidence,satellite,bright_ti4,bright_ti5,scan,track,daynight\n22.36,69.87,82,2026-09-12,0430,h,N20,345,298,.4,.4,D\n";
const app = await createApplication({
  dbPath: ":memory:",
  fetcher: async () => new Response(csv),
  // Serve the already-built app: this avoids competing with a developer HMR
  // socket and keeps the GIS test isolated from a user's running workspace.
  dev: false,
});
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.server.address().port}/`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() =>
  localStorage.setItem("tg_auto_analysis", "false"),
);
page.setDefaultTimeout(15000);
try {
  // Tile downloads can remain open/retry, so networkidle is not a map-ready signal.
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".earth-canvas canvas").waitFor();
  await page
    .getByRole("button", { name: "District manager", exact: true })
    .click();
  await page.getByLabel("Display name", { exact: false }).fill("GIS QA");
  await page.getByLabel("Public demo PIN", { exact: true }).fill("2026");
  await page.getByRole("button", { name: "Enter district workspace" }).click();
  await page.getByLabel("Geographic area").waitFor();
  assert.equal(
    await page.getByLabel("Geographic area").inputValue(),
    "jamnagar",
  );
  await page.locator(".map-canvas.leaflet-container").waitFor();
  await page.getByText("Jamnagar boundary", { exact: false }).waitFor();
  assert(
    await page.evaluate(
      () => !!localStorage.getItem("thermalguard-live-snapshots-v1"),
    ),
  );
  await page.getByRole("button", { name: /22\.360° N/ }).click();
  await page.getByRole("button", { name: "Close evidence" }).click();
  const ring = page.getByLabel("Planning ring");
  assert.equal(await ring.isDisabled(), false);
  await ring.selectOption("3");
  await page
    .getByText("3 km is a distance guide only", { exact: false })
    .waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /GeoJSON/ }).click();
  assert.match(
    (await download).suggestedFilename(),
    /thermalguard-visible-layer\.geojson/,
  );
  await page.locator(".map-canvas").hover({ position: { x: 250, y: 220 } });
  await page.getByRole("button", { name: "Copy map coordinates" }).click();
  await page.screenshot({
    path: ".build/gis-live-manager.png",
    fullPage: true,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByText("Offline view: saved observation coordinates", { exact: false })
    .waitFor();
  await page.getByText("Offline — local view", { exact: false }).waitFor();
  await page.screenshot({
    path: ".build/gis-offline-manager.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    location.hash = "sources";
  });
  await page.getByText("Browser snapshot cache", { exact: true }).waitFor();
  assert.match(
    await page.locator(".browser-cache-panel").innerText(),
    /Saved queries\s+1\s*\/\s*6/,
  );
  await page
    .getByRole("button", { name: "Clear local ThermalGuard snapshots" })
    .click();
  await page.getByText(/Local ThermalGuard snapshots cleared/).waitFor();
  assert.equal(
    await page.evaluate(
      () => localStorage.getItem("thermalguard-live-snapshots-v1"),
    ),
    null,
  );
  await page.evaluate(() => {
    location.hash = "overview";
  });
  await page.locator(".map-canvas.leaflet-container").waitFor();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByText(
      "You are offline and this area has no saved live snapshot yet.",
      { exact: false },
    )
    .waitFor();
  await page.getByText("0 mapped events", { exact: false }).waitFor();
  await page.getByText("Jamnagar boundary", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByText("3 km is a distance guide only", { exact: false })
      .count(),
    0,
  );
  assert.equal(await ring.isDisabled(), true);
  await page.screenshot({
    path: ".build/gis-offline-empty-manager.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ gisOffline: "pass", errors }));
} finally {
  await browser.close();
  await app.close();
}
