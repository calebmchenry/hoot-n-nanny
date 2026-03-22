import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'artifacts', 'visual', 'sprint-009-trading-post');

const PORT = process.env.PORT || 5176;
const BASE = `http://localhost:${PORT}/hoot-n-nanny/`;

async function run() {
  const browser = await chromium.launch();

  const viewports = [
    { name: 'phone-portrait', width: 390, height: 844 },
    { name: 'phone-small', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await page.goto(BASE);

    // Wait for game ready
    await page.waitForFunction(() => window.__GAME_READY__ === true, null, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Force-start the Trading Post scene via exposed game instance
    await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      if (!game) throw new Error('No __PHASER_GAME__ found');
      game.scene.stop('Barn');
      game.scene.start('TradingPost');
    });

    await page.waitForTimeout(1500);

    const { mkdir } = await import('fs/promises');
    await mkdir(outDir, { recursive: true });
    await page.screenshot({
      path: path.join(outDir, `${vp.name}-trading-post.png`),
      fullPage: false,
    });
    console.log(`Captured ${vp.name} animals tab (${vp.width}x${vp.height})`);

    // Click the Legendary tab to screenshot it too
    await page.evaluate(() => {
      const game = window.__PHASER_GAME__;
      const scene = game.scene.getScene('TradingPost');
      if (scene && scene.legendaryTabBg) {
        scene.legendaryTabBg.emit('pointerdown');
      }
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outDir, `${vp.name}-legendary-tab.png`),
      fullPage: false,
    });
    console.log(`Captured ${vp.name} legendary tab`);
    await context.close();
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
