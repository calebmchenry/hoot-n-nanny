import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const focusWithTab = async (page: Page, target: Locator) => {
  for (let index = 0; index < 120; index += 1) {
    const focused = await target.evaluate((element) => element === document.activeElement).catch(() => false);

    if (focused) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  throw new Error('Failed to focus target with keyboard Tab navigation.');
};

test('bust flow pins a guest and excludes it from the next night draw', async ({ page }) => {
  await page.goto('/?seed=bust');

  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();

  await expect(page.getByText('Pin one guest for next night')).toBeVisible();
  await page.getByRole('button', { name: 'Goose' }).click();

  await expect(page.getByTestId('summary-card')).toBeVisible();
  await page.getByTestId('continue-from-summary').click();

  await expect(page.getByTestId('trading-post')).toBeVisible();
  await page.getByTestId('start-next-night').click();

  await page.locator('[data-slot-index="0"]').click();
  await expect(page.getByText(/Goose:/)).toHaveCount(0);
});

test('keyboard-only loop can complete night -> summary -> shop -> next night', async ({ page }) => {
  await page.goto('/?seed=shop');

  await expect(page.getByTestId('door-slot')).toBeFocused();
  await page.keyboard.press('Enter');

  const callNightButton = page.getByTestId('call-night');
  await focusWithTab(page, callNightButton);
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('summary-card')).toBeVisible();

  const continueButton = page.getByTestId('continue-from-summary');
  await focusWithTab(page, continueButton);
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('trading-post')).toBeVisible();

  const startNextNightButton = page.getByTestId('start-next-night');
  await focusWithTab(page, startNextNightButton);
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('door-slot')).toBeFocused();
});

test('touch critical path works on the mobile Playwright project', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch sanity is mobile-only.');

  await page.goto('/?seed=shop');

  await page.getByTestId('invite-button').tap();
  await page.getByTestId('call-night').tap();
  await page.getByTestId('continue-from-summary').tap();

  await expect(page.getByTestId('trading-post')).toBeVisible();

  const offers = page.locator('[data-offer-id]');
  const offerCount = await offers.count();
  for (let index = 0; index < offerCount; index += 1) {
    const offer = offers.nth(index);
    if (await offer.isEnabled()) {
      await offer.tap();
      break;
    }
  }

  await page.getByTestId('start-next-night').tap();
  await expect(page.getByTestId('door-slot')).toBeVisible();
});

test('loss-path run has no console errors or warnings', async ({ page }) => {
  const consoleProblems: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'warning' || type === 'error') {
      consoleProblems.push(`[${type}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    consoleProblems.push(`[pageerror] ${error.message}`);
  });

  await page.goto('/?seed=bust');

  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();

  await page.getByRole('button', { name: 'Goose' }).click();
  await page.getByTestId('continue-from-summary').click();
  await expect(page.getByTestId('trading-post')).toBeVisible();

  expect(consoleProblems).toEqual([]);
});
