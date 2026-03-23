import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_ASSETS_DIR = 'dist/assets';
const BUDGET_BYTES = 150 * 1024;

const jsFiles = readdirSync(DIST_ASSETS_DIR).filter((file) => file.endsWith('.js'));

let total = 0;
for (const file of jsFiles) {
  const absolutePath = join(DIST_ASSETS_DIR, file);
  if (!statSync(absolutePath).isFile()) {
    continue;
  }

  const source = readFileSync(absolutePath);
  total += gzipSync(source).byteLength;
}

if (total > BUDGET_BYTES) {
  throw new Error(`Bundle budget exceeded: ${total} bytes gzipped > ${BUDGET_BYTES}`);
}

console.log(`Bundle budget OK: ${total} bytes gzipped`);
