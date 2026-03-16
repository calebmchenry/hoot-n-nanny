import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const PHASER_LIMIT_BYTES = 400 * 1024;
const APP_LIMIT_BYTES = 100 * 1024;
const assetsDir = path.resolve(process.cwd(), 'dist/assets');

const toKb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

const getGzipBytes = async (filePath) => {
  const contents = await readFile(filePath);
  return gzipSync(contents).length;
};

const fail = (message) => {
  console.error(`Bundle budget check failed: ${message}`);
  process.exit(1);
};

const main = async () => {
  const assetFiles = (await readdir(assetsDir)).filter((fileName) => fileName.endsWith('.js'));

  if (assetFiles.length === 0) {
    fail(`No JavaScript files found in ${assetsDir}. Run npm run build first.`);
  }

  const jsAssets = await Promise.all(
    assetFiles.map(async (fileName) => {
      const filePath = path.join(assetsDir, fileName);
      const gzipBytes = await getGzipBytes(filePath);
      return {
        fileName,
        gzipBytes,
      };
    }),
  );

  const phaserAsset =
    jsAssets.find((asset) => asset.fileName.startsWith('phaser-')) ??
    jsAssets.find((asset) => asset.fileName.includes('phaser'));

  if (!phaserAsset) {
    fail('Could not find a Phaser chunk. Expected a file name containing "phaser".');
  }

  const appAsset =
    jsAssets.find((asset) => asset.fileName.startsWith('index-')) ??
    jsAssets.find(
      (asset) =>
        !asset.fileName.startsWith('phaser-') &&
        !asset.fileName.includes('phaser') &&
        !asset.fileName.startsWith('vendor-'),
    );

  if (!appAsset) {
    fail('Could not find an app chunk. Expected an index-* JavaScript asset.');
  }

  const totalGzipBytes = jsAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0);

  console.log(`Phaser chunk: ${phaserAsset.fileName} (${toKb(phaserAsset.gzipBytes)} gzipped)`);
  console.log(`App chunk: ${appAsset.fileName} (${toKb(appAsset.gzipBytes)} gzipped)`);
  console.log(`Total JS: ${toKb(totalGzipBytes)} gzipped`);

  let hasFailure = false;

  if (phaserAsset.gzipBytes > PHASER_LIMIT_BYTES) {
    console.error(
      `Phaser chunk exceeds budget: ${toKb(phaserAsset.gzipBytes)} > ${toKb(PHASER_LIMIT_BYTES)}`,
    );
    hasFailure = true;
  }

  if (appAsset.gzipBytes > APP_LIMIT_BYTES) {
    console.error(
      `App chunk exceeds budget: ${toKb(appAsset.gzipBytes)} > ${toKb(APP_LIMIT_BYTES)}`,
    );
    hasFailure = true;
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log('Bundle budget check passed.');
};

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
