import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

function isIphoneProject(testInfo) {
  return testInfo.project.name.startsWith("webkit-iphone");
}

async function dragTile(page, from, to) {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error("Unable to locate merge pair.");

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
}

async function mergeHighestAvailablePair(page, expectedMergeCount) {
  const tiles = await page.locator("[data-cell-index]").evaluateAll((elements) =>
    elements
      .map((element) => ({
        index: Number(element.dataset.cellIndex),
        tier: element.dataset.tier,
      }))
      .filter((tile) => tile.tier !== "empty")
  );

  const indicesByTier = new Map();
  for (const tile of tiles) {
    const tier = Number(tile.tier);
    const indices = indicesByTier.get(tier) ?? [];
    indices.push(tile.index);
    indicesByTier.set(tier, indices);
  }

  const tier = [...indicesByTier.entries()]
    .filter(([, indices]) => indices.length >= 2)
    .map(([value]) => value)
    .sort((a, b) => b - a)[0];

  if (tier === undefined) throw new Error("Moticos board has no legal merge.");
  const [fromIndex, toIndex] = indicesByTier.get(tier);
  await dragTile(
    page,
    page.locator(`[data-cell-index="${fromIndex}"]`),
    page.locator(`[data-cell-index="${toIndex}"]`)
  );
  await expect(page.getByTestId("merges")).toHaveText(String(expectedMergeCount));
  await expect(page.getByRole("button", { name: "New board" })).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MOTICOS" })).toBeVisible();
});

test("renders eight distinct miniature collages", async ({ page }, testInfo) => {
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);
  await expect(page.locator(".mm-artwork-svg")).toHaveCount(8 + 8);
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Chop/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Save postcard/ })).toBeDisabled();

  const seeds = await page.locator('[data-tier="0"] .mm-artwork-svg').evaluateAll((elements) =>
    elements.map((element) => element.innerHTML)
  );
  expect(new Set(seeds).size).toBe(8);

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-collage-initial.png`,
    fullPage: true,
  });
});

test("keeps the iPhone layout inside the viewport with touch-ready controls", async ({ page }, testInfo) => {
  test.skip(!isIphoneProject(testInfo), "iPhone-specific layout gate");

  const viewportContent = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewportContent).toContain("viewport-fit=cover");

  const metrics = await page.evaluate(() => {
    const board = document.querySelector(".mm-board")?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll(".mm-btn, .mm-mute")].map((element) =>
      element.getBoundingClientRect().height
    );
    const tileStyle = getComputedStyle(document.querySelector(".mm-tile"));
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boardLeft: board?.left ?? -1,
      boardRight: board?.right ?? Infinity,
      buttonHeights: buttons,
      tileTouchAction: tileStyle.touchAction,
      tileUserSelect: tileStyle.userSelect,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.boardLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.boardRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.buttonHeights.every((height) => height >= 43.5)).toBe(true);
  expect(metrics.tileTouchAction).toBe("none");
  expect(metrics.tileUserSelect).toBe("none");

  await page.getByRole("button", { name: "Mute sound effects" }).tap();
  await expect(page.getByRole("button", { name: "Unmute sound effects" })).toBeVisible();
  await page.getByRole("button", { name: "New board" }).tap();
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-iphone-layout.png`,
    fullPage: true,
  });
});

test("merges with ancestry, scores, locks controls, and undoes cleanly", async ({ page }, testInfo) => {
  const first = page.locator('[data-tier="0"]').nth(0);
  const second = page.locator('[data-tier="0"]').nth(1);
  await dragTile(page, first, second);

  await page.waitForTimeout(20);
  expect(await page.getByRole("button", { name: "New board" }).isDisabled()).toBe(true);

  await expect(page.getByTestId("score")).toHaveText("20");
  await expect(page.getByTestId("merges")).toHaveText("1");
  await expect(page.getByTestId("highest")).toHaveText("Fragment");
  await expect(page.locator('[data-tier="1"]')).toHaveCount(1);
  await expect(page.locator('[data-tier="1"]')).toHaveAttribute("data-lineage", "2");
  await expect(page.locator('[data-tier="1"]')).toHaveAttribute("data-motif-count", /[3-9]/);
  await expect(page.locator(".mm-residue")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Chop (3)" })).toBeEnabled();

  await page.waitForTimeout(700);
  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-collage-after-merge.png`,
    fullPage: true,
  });

  const undo = page.getByRole("button", { name: "Undo" });
  if (isIphoneProject(testInfo)) await undo.tap();
  else await undo.click();
  await expect(page.getByTestId("score")).toHaveText("0");
  await expect(page.getByTestId("merges")).toHaveText("0");
  await expect(page.getByTestId("highest")).toHaveText("Clip");
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);
  await expect(page.locator(".mm-residue")).toHaveCount(0);
});

test("Chop creates a useful matching pair and can be undone", async ({ page }, testInfo) => {
  await mergeHighestAvailablePair(page, 1);
  const chop = page.getByRole("button", { name: "Chop (3)" });
  if (isIphoneProject(testInfo)) await chop.tap();
  else await chop.click();
  await expect(page.getByRole("button", { name: "Chop (2)" })).toBeVisible();
  await expect(page.locator('[data-tier="1"]')).toHaveCount(0);
  await expect(page.locator('[data-tier="0"]')).toHaveCount(9);

  await page.waitForTimeout(500);
  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-after-chop.png`,
    fullPage: true,
  });

  const undo = page.getByRole("button", { name: "Undo" });
  if (isIphoneProject(testInfo)) await undo.tap();
  else await undo.click();
  await expect(page.locator('[data-tier="1"]')).toHaveCount(1);
  await expect(page.locator('[data-tier="0"]')).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Chop (3)" })).toBeVisible();
  await expect(page.getByTestId("score")).toHaveText("20");
});

test("reaches Panel legally and downloads a collage postcard", async ({ page }, testInfo) => {
  for (let merge = 1; merge <= 7; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }

  await expect(page.getByTestId("highest")).toHaveText("Panel");
  await expect(page.locator('[data-tier="3"]')).toHaveCount(1);
  await expect(page.locator('[data-tier="3"]')).toHaveAttribute("data-lineage", "8");
  const postcard = page.getByRole("button", { name: "Save postcard" });
  await expect(postcard).toBeEnabled();

  await page.waitForTimeout(750);
  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-collage-panel.png`,
    fullPage: true,
  });

  const downloadPromise = page.waitForEvent("download");
  if (isIphoneProject(testInfo)) await postcard.tap();
  else await postcard.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^moticos-panel-\d+\.png$/);
  await mkdir("test-results/postcards", { recursive: true });
  await download.saveAs(`test-results/postcards/${testInfo.project.name}-collage-panel.png`);
});

test("fits the final Motico arrival inside iPhone WebKit", async ({ page }, testInfo) => {
  await page.goto("/?gallery=1&arrival=1");
  const arrival = page.getByRole("dialog");
  await expect(arrival).toBeVisible();
  await expect(arrival.getByText("A MOTICO HAS ARRIVED")).toBeVisible();
  await expect(arrival.getByText("128 scraps have become one correspondence.")).toBeVisible();

  const bounds = await arrival.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.innerWidth + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.innerHeight + 1);

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-motico-arrival.png`,
    fullPage: true,
  });

  const close = page.getByRole("button", { name: "Return to the board" });
  if (isIphoneProject(testInfo)) await close.tap();
  else await close.click();
  await expect(arrival).toBeHidden();
});

test("renders all tiers in the development gallery", async ({ page }, testInfo) => {
  await page.goto("/?gallery=1");
  await expect(page.getByRole("heading", { name: "Every tier, inspected at full scale" })).toBeVisible();
  await expect(page.locator("[data-gallery-tier]")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Motico" })).toBeVisible();

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-tier-gallery.png`,
    fullPage: true,
  });
});
