import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('audio controls render and mute persists after reload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('audio-controls')).toBeVisible();
  await page.getByTestId('audio-expand').click();
  await page.getByTestId('audio-mute').click();

  const shell = page.locator('.app-shell');
  await expect(shell).toHaveAttribute('data-audio-muted', 'true');

  await page.reload();
  await expect(shell).toHaveAttribute('data-audio-muted', 'true');
});

test('phase music ownership switches barn -> shop -> win correctly', async ({ page }) => {
  const shell = page.locator('.app-shell');

  await page.goto('/?seed=shop');
  await page.getByTestId('invite-button').click();
  await expect(shell).toHaveAttribute('data-audio-unlocked', 'true');
  await expect(shell).toHaveAttribute('data-audio-track', 'barn-party');

  await page.getByTestId('call-night').click();
  await page.getByTestId('continue-from-summary').click();
  await expect(shell).toHaveAttribute('data-audio-track', 'shop');

  await page.getByTestId('start-next-night').click();
  await expect(shell).toHaveAttribute('data-audio-track', 'barn-party');

  await page.goto('/?seed=win');
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('call-night').click();
  await page.getByTestId('continue-from-summary').click();

  await expect(page.getByRole('heading', { name: 'Blue Ribbon Victory' })).toBeVisible();
  await expect(shell).toHaveAttribute('data-audio-track', 'none');
});

test('full audio-enabled win flow emits no console warnings or errors', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'warning' || type === 'error') {
      consoleProblems.push(`[${type}] ${msg.text()}`);
    }
  });

  await page.goto('/?seed=win');

  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('invite-button').click();
  await page.getByTestId('call-night').click();
  await page.getByTestId('continue-from-summary').click();
  await page.getByTestId('play-again').click();

  await expect(page.locator('.app-shell')).toHaveAttribute('data-audio-track', 'barn-party');
  expect(consoleProblems).toEqual([]);
});
