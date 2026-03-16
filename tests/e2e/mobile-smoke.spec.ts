import { expect, test } from '@playwright/test';

test('barn scene loads on mobile viewport', async ({ page }) => {
  await page.goto('/hoot-n-nanny/');
  await page.waitForFunction(() => {
    const readyWindow = window as Window & { __GAME_READY__?: boolean };
    return readyWindow.__GAME_READY__ === true;
  });

  await expect(page.locator('canvas')).toBeVisible();
});
