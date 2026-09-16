import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const base = process.env.EARTH_TEST_URL || "http://127.0.0.1:4185/";
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".earth-canvas canvas").waitFor();
  await page.waitForFunction(() => !document.querySelector(".earth-status"));
  await page.waitForTimeout(800);
  assert.equal(
    await page
      .getByRole("button", { name: "Toggle Earth rotation" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.screenshot({ path: ".build/cinematic-desktop.png" });
  await page.mouse.move(1110, 360);
  await page.mouse.down();
  await page.mouse.move(965, 265, { steps: 20 });
  await page.waitForTimeout(600);
  const held = await page.locator(".earth-canvas").getAttribute("data-dolly");
  assert(Number(held) < 0.94, "Holding and dragging eases the globe closer");
  await page.mouse.up();
  await page.waitForTimeout(1000);
  assert(
    Number(await page.locator(".earth-canvas").getAttribute("data-dolly")) >
      0.98,
    "Release returns to resting zoom",
  );
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(600);
  assert(
    (await page.evaluate(() => scrollY)) > 600,
    "Wheel over globe scrolls story, not trapped orbit zoom",
  );
  const shift = await page
    .locator(".earth-story")
    .evaluate((el) => el.style.getPropertyValue("--story-shift"));
  assert(parseFloat(shift) < 0, "Earth moves to left beside second chapter");
  await page.screenshot({ path: ".build/cinematic-chapter-two.png" });
  await page.evaluate(() => scrollTo(0, 1770));
  await page.waitForTimeout(400);
  await page.screenshot({ path: ".build/cinematic-chapter-three.png" });
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog").getByRole("textbox").fill("resources");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Response resources/ })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base, { waitUntil: "networkidle" });
  await mobile.locator(".earth-canvas canvas").waitFor();
  await mobile.waitForTimeout(600);
  assert.equal(
    await mobile
      .getByRole("button", { name: "Toggle Earth rotation" })
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(
    await mobile.locator(".earth-story").getAttribute("data-motion"),
    "off",
  );
  assert(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "No mobile horizontal overflow",
  );
  await mobile.screenshot({ path: ".build/cinematic-mobile.png" });
  await mobile.evaluate(() => scrollTo(0, 900));
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: ".build/cinematic-mobile-scroll.png" });
  // Existing district/PIN workflow remains usable after the scroll redesign.
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator(".district-card").filter({ hasText: "Dhanbad" }).click();
  assert.equal(
    await page.locator(".district-card.active h3").innerText(),
    "Dhanbad",
  );
  await page
    .getByRole("button", { name: "District manager", exact: true })
    .click();
  await page.getByLabel("Public demo PIN", { exact: true }).fill("0000");
  await page.getByRole("button", { name: "Enter district workspace" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Display name", { exact: false }).fill("QA viewer");
  await page.getByLabel("Public demo PIN", { exact: true }).fill("2026");
  await page.getByRole("button", { name: "Enter district workspace" }).click();
  await page.getByLabel("Geographic area").waitFor();
  assert.equal(
    await page.getByLabel("Geographic area").inputValue(),
    "dhanbad",
  );
  assert(
    (await page.locator(".manager-session").innerText()).includes("QA viewer"),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      cinematic: "pass",
      heldDolly: held,
      secondChapterShift: shift,
      errors,
    }),
  );
} finally {
  await browser.close();
}
