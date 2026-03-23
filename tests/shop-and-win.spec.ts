import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('shop purchase round-trip adds animal to next night farm', async ({ page }) => {
  await page.goto('/?seed=shop');

  await page.getByTestId('call-night').click();
  await page.getByTestId('continue-from-summary').click();

  const cards = page.locator('[data-offer-id]');
  const count = await cards.count();
  let purchasedName = '';

  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    if (!(await card.isEnabled())) {
      continue;
    }

    const name = ((await card.locator('h3').textContent()) ?? '').trim();
    if (name === 'Chicken' || name === 'Pig') {
      continue;
    }

    purchasedName = name;
    await card.click();
    break;
  }

  expect(purchasedName.length).toBeGreaterThan(0);

  await page.getByTestId('start-next-night').click();
  await page.locator('[data-slot-index="0"]').click();

  await expect(page.getByText(new RegExp(`${purchasedName}:`))).toBeVisible();
});

test('seeded win path reaches win screen and play again resets', async ({ page }) => {
  await page.goto('/?seed=win');

  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('call-night').click();

  await page.getByTestId('continue-from-summary').click();
  await expect(page.getByRole('heading', { name: 'Blue Ribbon Victory' })).toBeVisible();

  await page.getByTestId('play-again').click();

  await expect(page.getByText('Night 1')).toBeVisible();
  await expect(page.getByText('Pop 0')).toBeVisible();
  await expect(page.getByText('Cash 0')).toBeVisible();
});
