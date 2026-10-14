import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.env.PREVIEW_URL || 'http://127.0.0.1:8000/';
const output = 'visual-review/evidence-studio';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const outcomes = [];
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'narrow', width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
      locale: 'en-IN',
    });
    await context.addInitScript(() => {
      try { localStorage.setItem('gurjas.analyticsConsent.v1', 'denied'); } catch {}
    });
    const page = await context.newPage();
    const jsErrors = [];
    page.on('pageerror', (error) => jsErrors.push(error.message));
    await page.goto(root, { waitUntil: 'domcontentloaded' });
    await page.locator('#product-front-door-title').waitFor();
    await page.evaluate(() => document.fonts?.ready);
    const evidenceDesk = page.locator('[data-studio-workbench]');
    const tabs = page.locator('[data-studio-tab]');
    if (await tabs.count() !== 3) throw Error('Evidence Desk must have exactly three paths');
    if (await page.locator('[data-product-tool]').count() !== 11) throw Error('Eleven registered tools must remain available');
    if (!(await page.locator('[data-studio-panel="journal"]').isVisible())) throw Error('First panel missing');
    await page.screenshot({ path: path.join(output, `${viewport.name}-hero.png`), fullPage: false });
    await evidenceDesk.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `${viewport.name}-desk-journal.png`), fullPage: false });
    await tabs.nth(1).click();
    if (!(await page.locator('[data-studio-panel="method"]').isVisible())) throw Error('Method tab did not reveal its actual path');
    await page.screenshot({ path: path.join(output, `${viewport.name}-desk-method.png`), fullPage: false });
    await tabs.nth(1).press('ArrowRight');
    if (!(await page.locator('[data-studio-panel="institution"]').isVisible())) throw Error('Arrow-key tab navigation failed');

    const input = page.locator('[data-product-search-input]');
    await input.fill('SEM');
    if (await page.locator('[data-product-tool]:visible').count() !== 1) throw Error('Local search should filter to one SEM tool');
    await input.press('Enter');
    await page.waitForURL('**/tools/sem-sample-size-calculator/', { timeout: 10_000 });

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: document.documentElement.clientWidth,
    }));
    if (jsErrors.length) throw Error(`JavaScript error(s): ${jsErrors.join('; ')}`);

    // Return to the redesigned homepage before collecting actual layout width.
    await page.goto(root, { waitUntil: 'domcontentloaded' });
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: document.documentElement.clientWidth,
      h1Count: document.querySelectorAll('h1').length,
    }));
    if (layout.scrollWidth > layout.width + 1) throw Error(`Horizontal overflow at ${viewport.width}px: ${layout.scrollWidth - layout.width}px`);
    if (layout.h1Count !== 1) throw Error('Homepage must have exactly one H1');
    outcomes.push({ viewport: viewport.name, width: viewport.width, jsErrors: 0, overflow: 0, tabs: 3, tools: 11, keyboard: 'pass', search: 'pass', initialToolPageWidth: dimensions.width });
    await context.close();
  }

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const page = await noJs.newPage();
  await page.goto(root, { waitUntil: 'domcontentloaded' });
  if (!(await page.locator('[data-studio-panel="journal"]').isVisible())) throw Error('No-JS homepage must preserve readable research pathway');
  if (!(await page.locator('[data-studio-directory] summary').isVisible())) throw Error('No-JS tool directory must remain browsable');
  outcomes.push({ viewport: 'no-js', fallback: 'pass' });
  await noJs.close();
  writeFileSync(path.join(output, 'preview-report.json'), JSON.stringify({ previewOnly: true, outcomes }, null, 2) + '\n');
  console.log('Evidence Studio preview interactions and viewport checks passed.', outcomes);
} finally {
  await browser.close();
}
