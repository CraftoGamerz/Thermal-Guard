import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const url =
  process.env.EARTH_TEST_URL || "http://127.0.0.1:4182/ThermalGuard/";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".earth-canvas canvas").waitFor();
  await page.waitForTimeout(1500);
  const lightX = () =>
    page
      .locator(".earth-hero")
      .evaluate((el) =>
        parseFloat(el.style.getPropertyValue("--earth-light-x")),
      );
  await page.mouse.move(350, 180);
  await page.waitForTimeout(1100);
  assert((await lightX()) < 72, "Pointer left steers the scene left");
  await page.screenshot({ path: ".build/pointer-earth-left.png" });
  await page.mouse.move(1180, 700);
  await page.waitForTimeout(1100);
  assert((await lightX()) > 80, "Pointer right steers the scene right");
  await page.screenshot({ path: ".build/pointer-earth-right.png" });
  const beforeDrag = await lightX();
  await page.mouse.down();
  await page.mouse.move(1060, 600, { steps: 15 });
  await page.waitForTimeout(300);
  assert(
    Math.abs((await lightX()) - beforeDrag) < 0.2,
    "Direct drag freezes passive follow",
  );
  await page.mouse.up();
  await page.mouse.move(900, 800);
  await page.waitForTimeout(1900);
  assert(
    Math.abs((await lightX()) - beforeDrag) > 1,
    "Follow resumes after drag",
  );
  await page.mouse.move(600, 30);
  await page.waitForTimeout(1600);
  assert(
    Math.abs((await lightX()) - 75) < 0.15,
    "Leaving hero restores neutral offset",
  );
  await page.getByRole("button", { name: "Toggle Earth rotation" }).click();
  const paused = await lightX();
  await page.mouse.move(1200, 600);
  await page.waitForTimeout(600);
  assert.equal(await lightX(), paused, "Pause stops passive follow");
  // Reset the base view, then test the visible markers with a nonzero offset.
  await page.getByRole("button", { name: "Focus selected district" }).click();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Toggle Earth rotation" }).click();
  await page.mouse.move(1160, 650);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Toggle Earth rotation" }).click();
  await page.waitForTimeout(300);
  const frame = await page.screenshot();
  const pins = await page.evaluate(
    async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const remaining = new Set();
      for (let i = 0; i < pixels.length; i += 4) {
        if (
          pixels[i] >= 253 &&
          Math.abs(pixels[i + 1] - 149) <= 2 &&
          Math.abs(pixels[i + 2] - 89) <= 2
        )
          remaining.add(i / 4);
      }
      const groups = [];
      while (remaining.size) {
        const start = remaining.values().next().value,
          pending = [start],
          group = [];
        remaining.delete(start);
        while (pending.length) {
          const pixel = pending.pop();
          group.push(pixel);
          for (const next of [
            pixel - 1,
            pixel + 1,
            pixel - canvas.width,
            pixel + canvas.width,
          ])
            if (remaining.delete(next)) pending.push(next);
        }
        if (group.length > 60)
          groups.push({
            x: group.reduce((n, p) => n + (p % canvas.width), 0) / group.length,
            y:
              group.reduce((n, p) => n + Math.floor(p / canvas.width), 0) /
              group.length,
          });
      }
      return groups;
    },
    `data:image/png;base64,${frame.toString("base64")}`,
  );
  assert.equal(
    pins.length,
    4,
    "Four visible district pins located in the rendered view",
  );
  const easternPin = pins.sort((a, b) => b.x - a.x)[0];
  await page.mouse.click(easternPin.x, easternPin.y);
  assert.equal(
    await page.locator(".district-card.active h3").innerText(),
    "Dhanbad",
    "Picking follows the parallax camera",
  );
  for (const options of [
    { reducedMotion: "reduce" },
    { hasTouch: true, isMobile: true },
  ]) {
    const stable = await browser.newPage({
      viewport: { width: 390, height: 844 },
      ...options,
    });
    await stable.goto(url);
    await stable.locator(".earth-canvas").scrollIntoViewIfNeeded();
    await stable.waitForTimeout(500);
    await stable.mouse.move(330, 600);
    await stable.waitForTimeout(500);
    assert.equal(
      await stable
        .locator(".earth-hero")
        .evaluate((el) =>
          parseFloat(el.style.getPropertyValue("--earth-light-x")),
        ),
      75,
      "Reduced-motion/touch modes disable hover motion",
    );
    assert.equal(
      await stable.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await stable.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: pointer follow, drag precedence, resume, neutral return, pause, visible-marker picking, reduced motion and touch layout.",
  );
} finally {
  await browser.close();
}
