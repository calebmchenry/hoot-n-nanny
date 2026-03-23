import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST_DIR = resolve('dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
const INDEX_PATH = join(DIST_DIR, 'index.html');

const fail = (issues) => {
  console.error('GitHub Pages artifact check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
};

if (!existsSync(INDEX_PATH)) {
  fail([`Missing ${INDEX_PATH}. Run "npm run build" first.`]);
}

if (!existsSync(ASSETS_DIR)) {
  fail([`Missing ${ASSETS_DIR}. Run "npm run build" first.`]);
}

const assetsEntries = readdirSync(ASSETS_DIR).filter((entry) => statSync(join(ASSETS_DIR, entry)).isFile());
if (assetsEntries.length === 0) {
  fail([`No built assets found in ${ASSETS_DIR}.`]);
}

const html = readFileSync(INDEX_PATH, 'utf8');

const referenceRegex = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;
const references = [];
let match = referenceRegex.exec(html);
while (match) {
  references.push(match[1]);
  match = referenceRegex.exec(html);
}

const externalRefs = references.filter((value) => /^(?:https?:)?\/\//i.test(value));
const absoluteAssets = references.filter((value) => value.startsWith('/assets/'));

const assetRefs = references.filter((value) => /^(?:\.\/|\/)?assets\/.+\.(?:js|css)(?:[?#].*)?$/i.test(value));
const missingAssets = [];

for (const ref of assetRefs) {
  const normalized = ref.replace(/^[./]+/, '').split('#')[0].split('?')[0];
  const absolutePath = join(DIST_DIR, normalized);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    missingAssets.push(ref);
  }
}

const issues = [];
for (const ref of externalRefs) {
  issues.push(`External dependency reference found in dist/index.html: ${ref}`);
}

for (const ref of absoluteAssets) {
  issues.push(`Absolute asset path found (must be relative): ${ref}`);
}

for (const ref of missingAssets) {
  issues.push(`Referenced asset missing from dist/assets: ${ref}`);
}

if (issues.length > 0) {
  fail(issues);
}

console.log('GitHub Pages artifact check passed.');
