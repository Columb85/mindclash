import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'docs', 'assets', 'screenshots');

const shots = [
  { url: 'https://www.mindclash.xyz', file: 'landing.png' },
  { url: 'https://www.mindclash.xyz/app', file: 'arena.png' },
  { url: 'https://www.mindclash.xyz/verify', file: 'verify.png' },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const { url, file } of shots) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, file) });
  console.log('saved', file);
}

await browser.close();
