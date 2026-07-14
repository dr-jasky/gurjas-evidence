import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.REVIEW_BASE_URL ?? "http://127.0.0.1:8000";
const outputDirectory = process.env.REVIEW_OUTPUT_DIR ?? "visual-review";

const routes = [
  { name: "home", path: "/" },
  { name: "services", path: "/services/" },
  {
    name: "institutional-research-integrity",
    path: "/services/research-integrity/",
  },
  {
    name: "naac-iqac-evidence-readiness",
    path: "/services/naac-evidence-readiness/",
  },
  {
    name: "impact-evaluation-analytics",
    path: "/services/impact-evaluation/",
  },
  {
    name: "advanced-research-methods",
    path: "/services/research-methods/",
  },
  {
    name: "phd-shortcut-longest-route",
    path: "/insights/phd-shortcut-longest-route/",
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const url = new URL(route.path, baseUrl).toString();
      const response = await page.goto(url, { waitUntil: "networkidle" });
      const declineConsent = page.locator('[data-consent="denied"]');
      if (await declineConsent.isVisible()) {
        await declineConsent.click();
      }
      await page.evaluate(() => document.fonts.ready);

      const pageFacts = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));

      const screenshot = `${viewport.name}--${route.name}.png`;
      await page.screenshot({
        path: `${outputDirectory}/${screenshot}`,
        fullPage: true,
      });

      const result = {
        route: route.path,
        viewport: viewport.name,
        status: response?.status() ?? null,
        screenshot,
        ...pageFacts,
      };
      results.push(result);

      if (!response?.ok()) {
        throw new Error(`${url} returned ${result.status}`);
      }
      if (!pageFacts.h1) {
        throw new Error(`${url} has no H1`);
      }
      if (pageFacts.documentWidth > pageFacts.viewportWidth + 1) {
        throw new Error(
          `${url} overflows at ${viewport.name}: ` +
            `${pageFacts.documentWidth}px > ${pageFacts.viewportWidth}px`,
        );
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(
    `${outputDirectory}/report.json`,
    `${JSON.stringify(results, null, 2)}\n`,
  );
}

console.log(`Captured ${results.length} responsive review screenshots.`);
