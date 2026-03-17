import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/hoot-n-nanny/');
  await page.waitForFunction(() => {
    const readyWindow = window as Window & { __GAME_READY__?: boolean };
    return readyWindow.__GAME_READY__ === true;
  });
});

test('canvas fills viewport', async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('Missing viewport size in Playwright test context.');
  }

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounding box not available.');
  }

  expect(box.width).toBeGreaterThanOrEqual(viewport.width * 0.95);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height * 0.95);
});

test('rotate prompt visibility matches viewport profile', async ({ page }, testInfo) => {
  const rotatePrompt = page.locator('#rotate-prompt');

  if (testInfo.project.name === 'phone-landscape') {
    await expect(rotatePrompt).toBeVisible();
    return;
  }

  if (testInfo.project.name === 'desktop') {
    await expect(rotatePrompt).toBeHidden();
  }
});

test('data-scene is set to Barn after boot', async ({ page }) => {
  await expect(page.locator('#game-container')).toHaveAttribute('data-scene', 'Barn');
});
