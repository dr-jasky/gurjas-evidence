import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.CANDIDATE_URL ?? "http://127.0.0.1:8000/";
const outputDirectory = "tests/visual/artifacts/doi-benchmark";
const route = "/research/benchmarks/aucr-dpi-inclusion/";
const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    const page = await context.newPage();
    const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${viewport.name} benchmark preview must return 200`);

    const declineConsent = page.locator('[data-consent="denied"]');
    if (await declineConsent.isVisible()) await declineConsent.click();

    const state = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent?.trim(),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      hasDoi: document.body.textContent?.includes("10.5281/zenodo.20860992"),
      hasPreviewBoundary: /methodology preview/i.test(document.body.textContent ?? ""),
    }));

    assert.ok(state.h1, `${viewport.name} benchmark preview requires a visible h1`);
    assert.ok(state.hasDoi, `${viewport.name} benchmark preview must display its DOI`);
    assert.ok(state.hasPreviewBoundary, `${viewport.name} benchmark preview must disclose preview status`);
    assert.ok(
      state.documentWidth <= state.viewportWidth,
      `${viewport.name} benchmark preview must not overflow horizontally`,
    );

    const screenshot = `${viewport.name}--aucr-dpi-inclusion-benchmark.png`;
    await page.screenshot({ path: `${outputDirectory}/${screenshot}`, fullPage: true });
    report.push({ route, viewport: viewport.name, status: response?.status(), screenshot, ...state });
    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${outputDirectory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log("DOI benchmark preview captured at desktop and mobile widths without horizontal overflow.");
