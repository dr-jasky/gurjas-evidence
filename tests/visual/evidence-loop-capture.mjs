import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.CANDIDATE_URL ?? 'http://127.0.0.1:8000/';
const outputDirectory = process.env.REVIEW_OUTPUT_DIR ?? 'visual-review';
const route = new URL('/tools/reference-integrity-checker/', baseUrl).toString();
const viewports = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 844 },
];

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, `${viewport.name} reference checker must load`);

    const decline = page.locator('[data-consent="denied"]');
    if (await decline.isVisible()) await decline.click();

    const panel = page.locator('.tool-evidence-loop');
    await panel.scrollIntoViewIfNeeded();
    assert.equal(await panel.count(), 1, `${viewport.name} must expose one evidence loop`);
    assert.equal(await panel.locator('.tool-evidence-loop__card').count(), 2, `${viewport.name} must expose the two registered evidence cards`);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    assert.ok(dimensions.documentWidth <= dimensions.viewportWidth, `${viewport.name} evidence loop must not create horizontal overflow`);

    await page.screenshot({
      path: `${outputDirectory}/${viewport.name}--reference-integrity-evidence-loop.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('Reference checker two-entry evidence loop captured at desktop and mobile widths.');
