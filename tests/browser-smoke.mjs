import { chromium } from "playwright";
import { DatabaseSync } from "node:sqlite";
import { mkdir } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : { channel: "chrome" }),
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:4173/#overview", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.body.innerText.includes("Acquiring satellite observations"),
    { timeout: 40000 },
  );
  await page.screenshot({ path: ".build/desktop-live.png", fullPage: true });
  console.log("LIVE:", await page.locator(".top-actions").innerText());
  console.log("METRICS:", await page.locator(".metrics").innerText());
  await page.getByRole("button", { name: "Demo replay", exact: true }).click();
  await page.locator(".spotlight-item").first().waitFor();
  await page.locator(".spotlight-item").first().click();
  await page.getByRole("dialog", { name: "Evidence & review" }).waitFor();
  await page.getByLabel("Analyst name", { exact: true }).fill("Browser QA");
  await page
    .getByLabel("Evidence / rationale")
    .fill("Synthetic review used to verify persistence during local QA.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await page.getByText("Decision saved to the audit trail.").waitFor();
  await page.screenshot({ path: ".build/evidence.png", fullPage: true });
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Demo replay", exact: true }).click();
  await page.getByText("Reviewed · deferred").first().waitFor();
  await page
    .getByRole("button", { name: "Review queue", exact: false })
    .first()
    .click();
  await page.locator("table").waitFor();
  await page.getByRole("button", { name: "Export data" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV spreadsheet" }).click();
  await download;
  await page.getByRole("button", { name: "Watch areas", exact: true }).click();
  await page.getByLabel("Area name", { exact: true }).fill("QA test area");
  await page.getByRole("button", { name: "Save watch area" }).click();
  await page.getByRole("button", { name: "Delete QA test area" }).waitFor();
  await page.getByRole("button", { name: "Delete QA test area" }).click();
  await page
    .getByRole("button", { name: "Data & methodology", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Data connection", exact: true })
    .waitFor();
  await page.screenshot({ path: ".build/sources.png", fullPage: true });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await page.getByRole("heading", { name: "Satellite acquisition timeline" }).waitFor();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: ".build/mobile.png", fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  console.log(JSON.stringify({ errors, mobileOverflow: overflow }));
  if (errors.length || overflow) throw new Error("Browser validation failed");
} finally {
  await browser.close();
  // Remove only synthetic test decisions created by this smoke script.
  const db = new DatabaseSync("data/thermalguard.sqlite");
  db.prepare(
    "DELETE FROM reviews WHERE analyst=? AND note=? AND event_id LIKE 'replay-%'",
  ).run(
    "Browser QA",
    "Synthetic review used to verify persistence during local QA.",
  );
  db.close();
}
