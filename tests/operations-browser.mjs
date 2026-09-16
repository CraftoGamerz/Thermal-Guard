// Deterministic UI integration fixture. In-memory database; never writes QA
// contacts, incidents or synthetic observations into the real application DB.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createApplication } from "../server/index.mjs";
await mkdir(".build", { recursive: true });
const csv =
  "latitude,longitude,frp,acq_date,acq_time,confidence,satellite,bright_ti4,bright_ti5,scan,track,daynight\n22.1,70.1,82,2026-09-12,0430,h,N20,345,298,.4,.4,D\n";
let runs = 0;
const app = await createApplication({
  dbPath: ":memory:",
  fetcher: async (url) =>
    url.includes("overpass")
      ? Response.json({
          elements: [
            {
              type: "node",
              id: 1,
              lat: 22.101,
              lon: 70.101,
              tags: {
                emergency: "fire_hydrant",
                name: "QA hydrant",
                ref: "QA-H17",
              },
            },
            {
              type: "node",
              id: 2,
              lat: 22.102,
              lon: 70.102,
              tags: {
                amenity: "fire_station",
                name: "QA fire station",
                phone: "1234567890",
              },
            },
            {
              type: "way",
              id: 3,
              center: { lat: 22.1, lon: 70.1 },
              tags: { landuse: "industrial", name: "QA industrial context" },
            },
          ],
        })
      : url.includes("open-meteo")
        ? Response.json({
            current: {
              time: "2026-09-12T12:00",
              temperature_2m: 29,
              relative_humidity_2m: 68,
              wind_speed_10m: 4,
              wind_direction_10m: 220,
            },
            current_units: {},
          })
        : new Response(csv),
  analysisOptions: {
    runner: async (payload) => {
      runs++;
      return {
        model: { library: "QA fixture, not a real model" },
        rows: payload.scoring.map((d) => ({
          ...d,
          unusual: true,
          residualPercentile: 98,
          excessMw: 40,
          baseline: { observedDays: 4 },
        })),
        quality: { scored: 1 },
        timings: {},
        limitations: ["UI test fixture"],
      };
    },
  },
});
await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${app.server.address().port}/`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.setDefaultTimeout(10000);
page.on("pageerror", (e) => errors.push(e.message));
const navigate = async (id) => {
  await page.evaluate((id) => {
    location.hash = id;
  }, id);
  await page.locator(".ops-banner").waitFor();
};
try {
  await page.goto(base + "#mission");
  await page
    .locator(".auto-analysis-bar")
    .getByText("Report ready", { exact: true })
    .waitFor({ timeout: 30000 });
  assert.equal(runs, 1, "Automatically starts once without a manual run");
  assert.equal(await page.locator(".ops-classes h4").count(), 6);
  await page.waitForFunction(
    () => document.querySelectorAll(".ops-classes .candidate").length >= 2,
  );
  assert.equal(await page.locator(".ops-inbox button").count(), 1);
  await page.getByLabel("Suspicion threshold").selectOption("99");
  await page
    .getByText("No flagged events in this selection", { exact: true })
    .waitFor();
  await page.getByLabel("Suspicion threshold").selectOption("95");
  await page.screenshot({
    path: ".build/operations-mission.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create investigation" }).click();
  await page.getByText(/Investigation case saved/).waitFor();
  await navigate("cases");
  await page.getByRole("region", { name: "Case workload board" }).waitFor();
  assert.match(
    await page.locator(".workload-board").innerText(),
    /1\s+open/,
  );
  await page.getByLabel("Order cases").selectOption("checks");
  await page.getByLabel("Assignee", { exact: true }).fill("QA analyst");
  await page
    .locator(".ops-case")
    .getByLabel("Case status", { exact: true })
    .selectOption("investigating");
  await page.getByLabel("Inspect NASA source", { exact: true }).check();
  await page
    .getByLabel("Investigation note")
    .fill("Test-only verification; no dispatch.");
  await page.getByRole("button", { name: "Save shared case update" }).click();
  await page.getByText("Case progress saved.", { exact: true }).waitFor();
  await page.getByRole("button", { name: /QA analyst 1 open/ }).waitFor();
  assert.match(
    await page.locator(".case-check-progress").innerText(),
    /1\s*\/\s*5/,
  );
  assert.match(
    await page.locator(".case-next-check").innerText(),
    /Check acquisition time/,
  );
  await page.getByLabel("Search saved cases").fill("QA analyst");
  assert.equal(await page.locator(".ops-case").count(), 1);
  await page.getByLabel("Search saved cases").fill("not-a-saved-case");
  await page.getByText("No cases match this board filter", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear search" }).click();
  assert.equal(await page.locator(".ops-case").count(), 1);
  await page.getByRole("button", { name: "Open saved evidence" }).click();
  await page.getByRole("dialog", { name: /Evidence & review/ }).waitFor();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("button", { name: "Find in Mission control" }).click();
  await page.getByText("Your investigation starts before the click.", { exact: true }).waitFor();
  await navigate("cases");
  await page.getByText(/Activity history/).click();
  assert((await page.locator(".ops-case").innerText()).includes("QA analyst"));
  const brief = page.waitForEvent("download");
  await page.getByRole("button", { name: "Case brief" }).click();
  assert.match((await brief).suggestedFilename(), /thermalguard-case/);
  await page.screenshot({
    path: ".build/operations-cases.png",
    fullPage: true,
  });
  await navigate("resources");
  await page.getByText("QA-H17", { exact: false }).waitFor();
  assert(
    (await page.locator(".ops-resource-list").innerText()).includes(
      "Public phone not mapped",
    ),
  );
  await page.getByLabel("Search resources").fill("QA-H17");
  assert.equal(await page.locator(".ops-resource-list article").count(), 1);
  await page.getByLabel("Search resources").fill("");
  await page.getByText("Add a sourced public contact", { exact: true }).click();
  for (const [name, value] of Object.entries({
    name: "QA administrative office",
    role: "QA officer",
    phone: "1234567890",
    sourceUrl: "https://example.org/qa",
    verifiedBy: "QA analyst",
  }))
    await page.locator(`.ops-contact-form [name="${name}"]`).fill(value);
  await page.getByRole("button", { name: "Save public contact" }).click();
  await page
    .locator(".ops-directory h4")
    .filter({ hasText: "QA administrative office" })
    .waitFor();
  await page.screenshot({
    path: ".build/operations-resources.png",
    fullPage: true,
  });
  await navigate("trends");
  await page
    .getByText("Thermal change ≠ production change.", { exact: true })
    .waitFor();
  const historical = ["latitude,longitude,frp,acq_date,acq_time"];
  for (const [month, frp] of [
    ["07", 40],
    ["08", 20],
  ])
    for (let i = 0; i < 12; i++)
      historical.push(
        `22.1,70.1,${frp},2026-${month}-0${(i % 3) + 1},${String(400 + i).padStart(4, "0")}`,
      );
  await page.getByLabel("Import historical FIRMS CSV").setInputFiles({
    name: "test-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(historical.join("\n")),
  });
  await page.getByText("-50%", { exact: false }).waitFor();
  assert.equal(
    await page.getByLabel("History provenance").inputValue(),
    "user-import",
  );
  const trend = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export trend evidence" }).click();
  assert.match((await trend).suggestedFilename(), /thermal-history/);
  await page.screenshot({
    path: ".build/operations-trends.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByLabel("History provenance").selectOption("user-import");
  await page.getByText("-50%", { exact: false }).waitFor();
  await navigate("cases");
  await page.waitForFunction(
    () => document.querySelector(".ops-case input")?.value === "QA analyst",
  );
  assert.equal(
    await page.getByLabel("Inspect NASA source", { exact: true }).isChecked(),
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ["mission", "resources", "trends", "cases"]) {
    await navigate(id);
    await page.waitForTimeout(250);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `No mobile overflow: ${id}`,
    );
    await page.screenshot({
      path: `.build/operations-${id}-mobile.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      operations: "pass",
      automaticModelRuns: runs,
      caseCount: app.store.cases().length,
      contacts: app.store.contacts().length,
      errors,
    }),
  );
} catch (error) {
  await page.screenshot({
    path: ".build/operations-test-failure.png",
    fullPage: true,
  });
  console.log((await page.locator("body").innerText()).slice(-6000));
  throw error;
} finally {
  await browser.close();
  await app.close();
}
