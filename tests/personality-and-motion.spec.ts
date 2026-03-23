import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('summary skip controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('summary tally can be skipped by click and Enter', async ({ page }) => {
    const reachSummary = async () => {
      await page.goto('/?seed=win');
      await page.getByTestId('invite-button').click();
      await page.getByTestId('invite-button').click();
      await page.getByTestId('invite-button').click();
      await page.getByTestId('call-night').click();
      await expect(page.getByTestId('summary-card')).toBeVisible();
    };

    await reachSummary();
    await page.getByTestId('summary-card').click();
    await expect(page.getByTestId('summary-card')).toHaveAttribute('data-tally-state', 'complete');

    await reachSummary();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('summary-card')).toHaveAttribute('data-tally-state', 'complete');
  });
});

test('reduced motion reaches final summary UI immediately', async ({ page }) => {
  await page.goto('/?seed=win');

  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('call-night').click();

  await expect(page.getByTestId('summary-card')).toHaveAttribute('data-tally-state', 'complete');
  await page.getByTestId('continue-from-summary').click();
  await expect(page.getByRole('heading', { name: 'Blue Ribbon Victory' })).toBeVisible();
  await expect(page.getByTestId('phase-curtain')).toHaveCount(0);
});

test('phase transitions restore focus to the active scene root', async ({ page }) => {
  await page.goto('/?seed=shop');

  await page.getByTestId('call-night').click();
  await page.getByTestId('continue-from-summary').click();
  await expect(page.getByTestId('trading-post')).toBeFocused();

  await page.getByTestId('start-next-night').click();
  await expect(page.getByTestId('door-slot')).toBeFocused();
});

test('at-capacity activate abilities are visibly advertised', async ({ page }) => {
  await page.goto('/?seed=ability');
  await expect(page.locator('[data-slot-index="2"]')).toHaveAttribute('data-attention', 'true');
});

test('text surfaces do not overflow at 320px width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/?seed=shop');

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
