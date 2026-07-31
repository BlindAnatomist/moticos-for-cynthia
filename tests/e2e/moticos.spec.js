import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

function isIphoneProject(testInfo) {
  return testInfo.project.name.startsWith("webkit-iphone");
}

async function dragTile(page, from, to, nearMiss = false) {
  const floating = page.locator(".mm-floating-tile");
  await expect(floating).toHaveCount(0);

  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error("Unable to locate merge pair.");
  const startX = fromBox.x + fromBox.width / 2;
  const startY = fromBox.y + fromBox.height / 2;
  const targetX = toBox.x + toBox.width / 2 + (nearMiss ? toBox.width * 0.62 : 0);
  const targetY = toBox.y + toBox.height / 2;
  const midpointX = startX + (targetX - startX) * 0.55;
  const midpointY = startY + (targetY - startY) * 0.55;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(midpointX, midpointY, { steps: 4 });
  await page.mouse.move(targetX, targetY, { steps: 8 });
  await expect(floating).toBeVisible();
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
  await expect(page.locator(".mm-floating-tile")).toHaveCount(0);
}

async function capture(page, testInfo, name) {
  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-${name}.png`,
    fullPage: true,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MOTICOS" })).toBeVisible();
});

test("starts with the longer Found Pieces route and improved progression", async ({ page }, testInfo) => {
  await expect(page.getByRole("button", { name: /Found Pieces.*24 merges/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-tier="0"]')).toHaveCount(6);
  await expect(page.locator('[data-tier="1"]')).toHaveCount(5);
  await expect(page.locator('[data-tier="2"]')).toHaveCount(6);
  await expect(page.locator('[data-tier="3"]')).toHaveCount(5);
  await expect(page.locator('[data-tier="4"]')).toHaveCount(3);
  await expect(page.locator('[data-tier]:not([data-tier="empty"])')).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Cut (3)" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Keepsake (0)" })).toBeDisabled();
  await expect(page.locator("[data-progression-tier]")).toHaveCount(8);
  await expect(page.getByText("PATH TO MOTICOS")).toBeVisible();
  await expect(page.getByText("Moticos", { exact: true })).toBeVisible();
  await capture(page, testInfo, "found-route-initial");
});

test("keeps the five-by-five iPhone layout and all controls inside the viewport", async ({ page }, testInfo) => {
  test.skip(!isIphoneProject(testInfo), "iPhone-specific layout gate");
  const metrics = await page.evaluate(() => {
    const board = document.querySelector(".mm-board")?.getBoundingClientRect();
    const tile = document.querySelector(".mm-tile")?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll("button")].map((element) =>
      element.getBoundingClientRect().height
    );
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boardLeft: board?.left ?? -1,
      boardRight: board?.right ?? Infinity,
      tileWidth: tile?.width ?? 0,
      tileHeight: tile?.height ?? 0,
      buttonHeights: buttons,
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.boardLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.boardRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.tileWidth).toBeGreaterThanOrEqual(54);
  expect(metrics.tileHeight).toBeGreaterThanOrEqual(54);
  expect(metrics.buttonHeights.every((height) => height >= 43.5)).toBe(true);
  await page.getByRole("button", { name: "Mute sound effects" }).tap();
  await expect(page.getByRole("button", { name: "Unmute sound effects" })).toBeVisible();
  await capture(page, testInfo, "iphone-layout");
});

test("preserves the accepted magnetic drag and Undo behavior", async ({ page }, testInfo) => {
  const first = page.locator('[data-tier="0"]').nth(0);
  const second = page.locator('[data-tier="0"]').nth(1);
  await dragTile(page, first, second, true);
  await expect(page.getByTestId("merges")).toHaveText("1");
  await expect(page.locator('[data-tier]:not([data-tier="empty"])')).toHaveCount(24);
  await expect(page.getByRole("button", { name: "Cut (3)" })).toBeEnabled();
  await expect(page.locator(".mm-residue")).toHaveCount(1);
  await capture(page, testInfo, "after-magnetic-merge");

  const undo = page.getByRole("button", { name: "Undo" });
  if (isIphoneProject(testInfo)) await undo.tap();
  else await undo.click();
  await expect(page.getByTestId("merges")).toHaveText("0");
  await expect(page.locator('[data-tier]:not([data-tier="empty"])')).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Cut (3)" })).toBeDisabled();
});

test("awards a Keepsake at the sixth merge and preserves a focal fragment", async ({ page }, testInfo) => {
  for (let merge = 1; merge <= 6; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }
  await expect(page.getByRole("button", { name: "Keepsake (1)" })).toBeEnabled();
  await expect(page.getByText(/Correspondence found: Keepsake earned/)).toBeVisible();

  const keepsake = page.getByRole("button", { name: "Keepsake (1)" });
  if (isIphoneProject(testInfo)) await keepsake.tap();
  else await keepsake.click();
  await expect(keepsake).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Keepsake armed/)).toBeVisible();

  await mergeHighestAvailablePair(page, 7);
  await expect(page.getByRole("button", { name: "Keepsake (0)" })).toBeDisabled();
  await expect(page.locator(".mm-kept-mark")).toHaveCount(1);
  await capture(page, testInfo, "keepsake-preserved");
});

test("uses Cut terminology and preserves the field", async ({ page }, testInfo) => {
  await mergeHighestAvailablePair(page, 1);
  const cut = page.getByRole("button", { name: "Cut (3)" });
  if (isIphoneProject(testInfo)) await cut.tap();
  else await cut.click();
  await expect(page.getByRole("button", { name: "Cut (2)" })).toBeVisible();
  await expect(page.locator('[data-tier]:not([data-tier="empty"])')).toHaveCount(25);
  await expect(page.getByRole("button", { name: /Chop \(/ })).toHaveCount(0);
  await capture(page, testInfo, "after-cut");
});

test("offers From Scraps and earns the first found piece", async ({ page }, testInfo) => {
  const route = page.getByRole("button", { name: /From Scraps.*31 merges/ });
  if (isIphoneProject(testInfo)) await route.tap();
  else await route.click();
  await expect(route).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-tier="0"]')).toHaveCount(25);

  for (let merge = 1; merge <= 3; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }
  await expect(page.locator('[data-tier="6"]')).toHaveCount(1);
  await expect(page.getByText(/Found piece discovered: Correspondence/)).toBeVisible();
  await expect(page.locator('[data-tier]:not([data-tier="empty"])')).toHaveCount(23);
  await capture(page, testInfo, "scraps-first-discovery");
});

test("downloads a postcard and explains where it went", async ({ page }, testInfo) => {
  const first = page.locator('[data-tier="2"]').nth(0);
  const second = page.locator('[data-tier="2"]').nth(1);
  await dragTile(page, first, second);
  await expect(page.getByTestId("highest")).toHaveText("Panel");

  const downloadPromise = page.waitForEvent("download");
  const downloadButton = page.getByRole("button", { name: "Download postcard" });
  if (isIphoneProject(testInfo)) await downloadButton.tap();
  else await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^moticos-panel-\d+\.png$/);
  await mkdir("test-results/postcards", { recursive: true });
  await download.saveAs(`test-results/postcards/${testInfo.project.name}-panel.png`);
  await expect(page.getByText(/Safari Downloads in the Files app/)).toBeVisible();
});

test("opens the native share path when file sharing is available", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: ({ files }) => Array.isArray(files) && files.length === 1,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ files }) => {
        window.__sharedPostcard = files[0].name;
      },
    });
  });
  await page.goto("/");
  await dragTile(page, page.locator('[data-tier="2"]').nth(0), page.locator('[data-tier="2"]').nth(1));
  const share = page.getByRole("button", { name: "Share postcard" });
  if (isIphoneProject(testInfo)) await share.tap();
  else await share.click();
  await expect(page.getByText(/share sheet opened/i)).toBeVisible();
  expect(await page.evaluate(() => window.__sharedPostcard)).toMatch(/^moticos-panel-\d+\.png$/);
});

test("completes Found Pieces in 24 merges and names the singular final form Moticos", async ({ page }, testInfo) => {
  for (let merge = 1; merge <= 24; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }
  await expect(page.getByTestId("highest")).toHaveText("Moticos");
  await expect(page.locator('[data-tier="7"][data-lineage="128"]')).toHaveCount(1);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("A MOTICOS HAS ARRIVED")).toBeVisible();
  await capture(page, testInfo, "moticos-arrival-found");
});

test("completes From Scraps in 31 merges", async ({ page }) => {
  await page.getByRole("button", { name: /From Scraps.*31 merges/ }).click();
  for (let merge = 1; merge <= 31; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }
  await expect(page.getByTestId("highest")).toHaveText("Moticos");
  await expect(page.locator('[data-tier="7"][data-lineage="128"]')).toHaveCount(1);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("renders the recomposed all-tier gallery and final arrival", async ({ page }, testInfo) => {
  await page.goto("/?gallery=1&arrival=1");
  await expect(page.locator("[data-gallery-tier]")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Moticos" })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("A MOTICOS HAS ARRIVED")).toBeVisible();
  await capture(page, testInfo, "tier-gallery-and-arrival");
});
