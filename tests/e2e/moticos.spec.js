import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

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
  const from = page.locator(`[data-cell-index="${fromIndex}"]`);
  const to = page.locator(`[data-cell-index="${toIndex}"]`);
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error("Unable to locate merge pair.");

  await page.mouse.move(
    fromBox.x + fromBox.width / 2,
    fromBox.y + fromBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    toBox.x + toBox.width / 2,
    toBox.y + toBox.height / 2,
    { steps: 8 }
  );
  await page.mouse.up();
  await expect(page.getByTestId("merges")).toHaveText(String(expectedMergeCount));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MOTICOS" })).toBeVisible();
});

test("renders the complete game at desktop and mobile sizes", async ({ page }, testInfo) => {
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Save postcard/ })).toBeDisabled();

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-initial.png`,
    fullPage: true,
  });
});

test("merges, scores, locks controls during flight, and undoes cleanly", async ({ page }, testInfo) => {
  const first = page.locator('[data-tier="0"]').nth(0);
  const second = page.locator('[data-tier="0"]').nth(1);
  const from = await first.boundingBox();
  const to = await second.boundingBox();
  if (!from || !to) throw new Error("Unable to locate initial Clip pair.");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  await page.waitForTimeout(20);
  expect(await page.getByRole("button", { name: "New board" }).isDisabled()).toBe(true);

  await expect(page.getByTestId("score")).toHaveText("20");
  await expect(page.getByTestId("merges")).toHaveText("1");
  await expect(page.getByTestId("highest")).toHaveText("Fragment");
  await expect(page.locator('[data-tier="1"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-after-merge.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("score")).toHaveText("0");
  await expect(page.getByTestId("merges")).toHaveText("0");
  await expect(page.getByTestId("highest")).toHaveText("Clip");
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);
});

test("shuffle consumes one remix and leaves the board playable", async ({ page }) => {
  await page.getByRole("button", { name: "Shuffle (3)" }).click();
  await expect(page.getByRole("button", { name: "Shuffle (2)" })).toBeVisible();
  await expect(page.locator('[data-tier="0"]')).toHaveCount(8);
});

test("reaches Panel legally and downloads a postcard", async ({ page }, testInfo) => {
  for (let merge = 1; merge <= 7; merge += 1) {
    await mergeHighestAvailablePair(page, merge);
  }

  await expect(page.getByTestId("highest")).toHaveText("Panel");
  await expect(page.locator('[data-tier="3"]')).toHaveCount(1);
  const postcard = page.getByRole("button", { name: "Save postcard" });
  await expect(postcard).toBeEnabled();

  await page.waitForTimeout(750);
  await mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: `test-results/screenshots/${testInfo.project.name}-panel-unlocked.png`,
    fullPage: true,
  });

  const downloadPromise = page.waitForEvent("download");
  await postcard.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^moticos-panel-\d+\.png$/);
  await mkdir("test-results/postcards", { recursive: true });
  await download.saveAs(`test-results/postcards/${testInfo.project.name}-panel.png`);
});
