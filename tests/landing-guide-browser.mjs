import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    process.env.EARTH_TEST_URL || "http://127.0.0.1:4182/ThermalGuard/",
  );
  const feature = page.locator(".guide-feature").first();
  await feature.hover();
  assert.equal(await feature.getAttribute("aria-expanded"), "true");
  await page.keyboard.press("Escape");
  assert.equal(
    await feature.getAttribute("aria-expanded"),
    "false",
    "Escape dismisses a hover-only explanation",
  );
  await feature.focus();
  await page.keyboard.press("Escape");
  assert.equal(await feature.getAttribute("aria-expanded"), "false");
  await feature.click();
  await page.mouse.move(5, 5);
  assert.equal(
    await feature.getAttribute("aria-expanded"),
    "true",
    "Click pins the explanation",
  );
  await page
    .locator("#features")
    .screenshot({ path: ".build/guide-features.png" });
  await page.getByRole("tab", { name: "01 Observe" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "02 Receive" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.match(
    await page.getByRole("tabpanel").innerText(),
    /FIRMS distributes/,
  );
  await page.keyboard.press("End");
  assert.match(
    await page.getByRole("tabpanel").innerText(),
    /Make the decision reusable/,
  );
  await page.keyboard.press("Home");
  await page
    .locator("#approach")
    .screenshot({ path: ".build/guide-workflow.png" });
  const range = page.getByLabel("Peak fire radiative power");
  await range.focus();
  await page.keyboard.press("Home");
  assert.equal(
    await page.locator(".priority-result strong").innerText(),
    "Routine",
  );
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator(".priority-result strong").innerText(),
    "Standard",
  );
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator(".priority-result strong").innerText(),
    "Elevated",
  );
  await page
    .getByLabel("Sensor confidence", { exact: true })
    .selectOption("low");
  assert.equal(
    await page.locator(".priority-result strong").innerText(),
    "Standard",
  );
  await page.getByRole("button", { name: "NASA-connected server" }).click();
  assert.match(
    await page.locator(".architecture-path").innerText(),
    /Node.js API/,
  );
  assert.equal(
    await page.locator(".earth-data-note").innerText(),
    "Interactive demo · synthetic replay",
    "Documentation toggle cannot enable live mode",
  );
  await page.locator(".api-routes summary").filter({ hasText: "Load thermal evidence" }).click();
  assert.match(
    await page.locator(".api-routes details[open]").innerText(),
    /bbox=68,6,98,37/,
  );
  await page
    .locator("#architecture")
    .screenshot({ path: ".build/guide-backend.png" });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `No overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator("#approach")
    .screenshot({ path: ".build/guide-workflow-mobile.png" });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await mobile.goto(page.url());
  const tapCard = mobile.locator(".guide-feature").nth(2);
  await tapCard.tap();
  assert.equal(await tapCard.getAttribute("aria-expanded"), "true");
  await tapCard.tap();
  assert.equal(await tapCard.getAttribute("aria-expanded"), "false");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: feature hover/focus/pin/Escape/touch, workflow keyboard tabs, priority boundaries, API disclosures, deployment explanations and responsive layouts.",
  );
} finally {
  await browser.close();
}
