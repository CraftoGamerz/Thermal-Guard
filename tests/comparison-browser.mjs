import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.COMPARISON_TEST_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(`${base}#queue`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Demo replay", exact: true }).click();
  const compare = page.getByRole("button", { name: "Compare", exact: true });
  await compare.first().waitFor({ timeout: 10000 });
  assert.ok((await compare.count()) >= 2, "queue has two comparison controls");
  await compare.nth(0).click();
  await compare.nth(1).click();
  const tray = page.getByRole("region", { name: "Selected event comparison" });
  await tray.waitFor();
  assert.match(await tray.innerText(), /Peak observed FRP difference/);
  await tray.getByRole("button", { name: "Inspect evidence" }).first().click();
  await page.getByRole("dialog", { name: "Evidence & review" }).waitFor();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "comparison tray does not introduce mobile page overflow",
  );
  await tray.getByRole("button", { name: "Clear comparison" }).click();
  await tray.waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log("comparison tray, evidence route and mobile layout pass");
} finally {
  await browser.close();
}
