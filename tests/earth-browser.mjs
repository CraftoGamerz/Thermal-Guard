import { chromium } from "playwright";
import assert from "node:assert/strict";
import { PerspectiveCamera, Vector3 } from "three";
import { mkdir } from "node:fs/promises";
await mkdir(".build", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
// Software WebGL can vary a few color channels by one level on a still frame.
const visuallyStill = async (a, b) =>
  page.evaluate(
    async (images) => {
      const frames = await Promise.all(
        images.map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        }),
      );
      if (frames[0].length !== frames[1].length) return false;
      let difference = 0;
      for (let i = 0; i < frames[0].length; i++)
        difference += Math.abs(frames[0][i] - frames[1][i]);
      return difference / frames[0].length < 0.01;
    },
    [a, b].map(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
    ),
  );
page.on("pageerror", (e) => errors.push(e.message));
const url =
  process.env.EARTH_TEST_URL || "http://127.0.0.1:4176/ThermalGuard/";
try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".earth-canvas canvas").waitFor();
  await page.waitForFunction(() => !document.querySelector(".earth-status"));
  await page.waitForTimeout(1800);
  const rotation = page.getByRole("button", { name: "Toggle Earth rotation" });
  assert.equal(
    await rotation.getAttribute("aria-pressed"),
    "true",
    "Earth starts rotating automatically",
  );
  const autoBefore = await page.locator(".earth-canvas").screenshot();
  await page.waitForTimeout(500);
  assert(
    !autoBefore.equals(await page.locator(".earth-canvas").screenshot()),
    "Automatic rotation changes the view",
  );
  await page.screenshot({ path: ".build/earth-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Focus selected district" }).click();
  await page.waitForTimeout(2200);
  const globe = page.locator(".earth-canvas"),
    before = await globe.screenshot();
  const b = await globe.boundingBox();
  const sphericalPoint = (lat, lon, radius) =>
    new Vector3(
      radius *
        Math.cos((lat * Math.PI) / 180) *
        Math.cos((lon * Math.PI) / 180),
      radius * Math.sin((lat * Math.PI) / 180),
      -radius *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin((lon * Math.PI) / 180),
    );
  const camera = new PerspectiveCamera(42, b.width / b.height, 0.1, 100);
  camera.position.copy(sphericalPoint(22.36, 69.87, 2.65));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const pin = sphericalPoint(23.78, 86.42, 1.014).project(camera);
  await page.mouse.click(
    b.x + ((pin.x + 1) / 2) * b.width,
    b.y + ((1 - pin.y) / 2) * b.height,
  );
  assert.equal(
    await page.locator(".district-card.active h3").innerText(),
    "Dhanbad",
    "Earth marker selects its district",
  );
  await page.locator(".district-card").filter({ hasText: "Jamnagar" }).click();
  await page.waitForTimeout(1000);
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.6, {
    steps: 15,
  });
  await page.mouse.up();
  await page.waitForTimeout(600);
  assert(
    !before.equals(await globe.screenshot()),
    "Dragging must change Earth",
  );
  const dragged = await globe.screenshot();
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(400);
  assert(!dragged.equals(await globe.screenshot()), "Wheel must zoom Earth");
  await page.getByRole("button", { name: "Toggle Earth rotation" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Toggle Earth rotation" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.55, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(2000);
  const resumed = await globe.screenshot();
  await page.waitForTimeout(500);
  assert(
    !resumed.equals(await globe.screenshot()),
    "Automatic rotation resumes after dragging",
  );
  await rotation.click();
  await page.waitForTimeout(800);
  const paused = await globe.screenshot();
  await page.waitForTimeout(500);
  assert(
    await visuallyStill(paused, await globe.screenshot()),
    "Explicit pause keeps Earth still",
  );
  await page.getByRole("button", { name: "Focus selected district" }).click();
  await globe.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("+");
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
  await page.getByLabel("Display name", { exact: false }).fill("Sankirtan");
  await page.getByLabel("Public demo PIN", { exact: true }).fill("2026");
  await page.screenshot({ path: ".build/earth-login.png" });
  await page.getByRole("button", { name: "Enter district workspace" }).click();
  // All test decisions belong to explicit replay, never a live NASA event.
  if (await page.getByRole("button", { name: "Live feed", exact: true }).count())
    await page.getByRole("button", { name: "Demo replay", exact: true }).click();
  await page.locator(".spotlight-item").first().waitFor();
  assert.equal(
    await page.getByLabel("Geographic area").inputValue(),
    "dhanbad",
  );
  assert(
    (await page.locator(".manager-session").innerText()).includes("Sankirtan"),
  );
  await page.locator(".spotlight-item").first().click();
  await page.getByRole("dialog", { name: "Evidence & review" }).waitFor();
  assert.equal(
    await page.getByLabel("Analyst name", { exact: true }).inputValue(),
    "Sankirtan (demo)",
  );
  await page
    .getByLabel("Evidence / rationale")
    .fill("Synthetic district demonstration review.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await page.getByText("Decision saved to the audit trail.").waitFor();
  await page
    .getByRole("button", { name: "Close evidence", exact: true })
    .click();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".manager-session").waitFor();
  assert.equal(
    await page.getByLabel("Geographic area").inputValue(),
    "dhanbad",
  );
  await page.screenshot({
    path: ".build/district-workspace.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.locator(".earth-home").waitFor();
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("tg_demo_manager_v1")),
    null,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".build/earth-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile overflow",
  );
  await page
    .getByRole("button", { name: "District manager", exact: true })
    .click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
  await page
    .getByRole("button", { name: "Explore Jamnagar", exact: true })
    .click();
  await page.locator(".spotlight-item").first().waitFor();
  assert.equal(
    await page.getByLabel("Geographic area").inputValue(),
    "jamnagar",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile workspace overflow",
  );
  assert.deepEqual(errors, []);
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(url);
  await reduced.locator(".earth-canvas canvas").waitFor();
  assert.equal(
    await reduced
      .getByRole("button", { name: "Toggle Earth rotation" })
      .getAttribute("aria-pressed"),
    "false",
    "Reduced motion disables autoplay",
  );
  await reduced.close();
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return String(kind).startsWith("webgl")
        ? null
        : original.call(this, kind, ...args);
    };
  });
  await fallback.goto(url);
  await fallback
    .getByText(
      "3D is unavailable on this device. Select a district below to continue.",
    )
    .waitFor();
  await fallback
    .getByRole("button", { name: "Explore Jamnagar", exact: true })
    .click();
  await fallback.getByLabel("Geographic area").waitFor();
  await fallback.close();
  console.log(
    "PASS: Earth rendering, drag, wheel, keyboard, rotation, district selection, invalid/valid demo PIN, review, reload, logout, guest, mobile.",
  );
} finally {
  await browser.close();
}
