import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const candidateRoot = new URL(process.env.CANDIDATE_URL || 'http://127.0.0.1:8000/');
const contracts = JSON.parse(await (await import('node:fs/promises')).readFile('data/tool-contracts.json', 'utf8'));
const outputDirectory = path.resolve('tests/visual/artifacts/tool-standard-panels');
const viewports = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 844 },
];

if (contracts.tools.length !== 11) {
  throw new Error('Tool Standard visual capture requires exactly eleven governed tools.');
}

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'en-IN',
      reducedMotion: 'reduce',
      viewport: { width: viewport.width, height: viewport.height },
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem('gurjas.analyticsConsent.v1', 'denied');
      } catch {}
    });

    try {
      for (const tool of contracts.tools) {
        const page = await context.newPage();
        const url = new URL(tool.url.replace(/^\//, ''), candidateRoot).href;
        try {
          const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
          if (!response?.ok()) {
            throw new Error(`${tool.id} returned ${response?.status() ?? 'no response'}`);
          }

          await page.addStyleTag({
            content: `
              *, *::before, *::after {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
              }
            `,
          });
          await page.evaluate(async () => {
            if (document.fonts?.ready) await document.fonts.ready;
          });

          const panel = page.locator('[data-tool-standard="1"]');
          if ((await panel.count()) !== 1 || !(await panel.isVisible())) {
            throw new Error(`${tool.id} does not expose one visible Tool Standard panel`);
          }

          const facts = await panel.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              display: style.display,
              hidden: element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true',
              left: rect.left,
              right: rect.right,
              width: rect.width,
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: document.documentElement.clientWidth,
              labels: [...element.querySelectorAll('dt, h3')].map((node) => node.textContent?.trim()),
            };
          });

          if (facts.hidden || facts.display === 'none') {
            throw new Error(`${tool.id} Tool Standard panel is hidden`);
          }
          if (facts.left < -1 || facts.right > viewport.width + 1 || facts.width > viewport.width + 1) {
            throw new Error(`${tool.id} Tool Standard panel clips at ${viewport.name}`);
          }
          if (facts.documentWidth > facts.viewportWidth + 1) {
            throw new Error(`${tool.id} overflows horizontally at ${viewport.name}`);
          }

          const requiredLabels = [
            'Maturity',
            tool.status === 'living-resource' ? 'Snapshot' : 'Method version',
            'Reviewed',
            'Processing',
            'Evidence basis',
            'Privacy',
            'Limitations',
            'Decision boundary',
          ];
          for (const label of requiredLabels) {
            if (!facts.labels.includes(label)) {
              throw new Error(`${tool.id} Tool Standard panel is missing ${label}`);
            }
          }

          const screenshot = `${viewport.name}--${tool.id}.png`;
          await panel.screenshot({ path: path.join(outputDirectory, screenshot) });
          results.push({
            tool: tool.id,
            route: tool.url,
            viewport: viewport.name,
            screenshot,
            panelWidth: facts.width,
            viewportWidth: facts.viewportWidth,
            documentWidth: facts.documentWidth,
          });
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDirectory, 'report.json'),
  `${JSON.stringify(results, null, 2)}\n`,
);

console.log(`Captured ${results.length} Tool Standard panels across eleven tools and two viewports.`);
