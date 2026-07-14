import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const candidateRoot = new URL(process.env.CANDIDATE_URL || "http://127.0.0.1:8000/");
const baselineRoot = new URL(
  process.env.BASELINE_URL || process.env.PRODUCTION_URL || "https://gurjas.org/",
);
const approved = /^(1|true|yes)$/i.test(process.env.VISUAL_APPROVED || "");
const maxDiffRatio = Number(process.env.MAX_VISUAL_DIFF_RATIO || "0.001");
const artifactDir = path.resolve("tests/visual/artifacts");

const routes = [
  { name: "home", route: "/" },
  { name: "not-found", route: "/404.html" },
  { name: "services", route: "/services/" },
  { name: "people", route: "/people/" },
  { name: "tools", route: "/tools/" },
  { name: "contact", route: "/contact/" },
  {
    name: "flagship-article",
    route: "/insights/how-to-identify-a-predatory-journal/",
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000, fullPage: true },
  { name: "tablet", width: 1024, height: 900, fullPage: false },
  { name: "mobile", width: 390, height: 844, fullPage: true },
];

const stabilizationCss = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }
  .rv {
    opacity: 1 !important;
    transform: none !important;
  }
  #gurjas-consent {
    display: none !important;
  }
`;

function targetUrl(root, route) {
  return new URL(route.replace(/^\//, ""), root).href;
}

async function gotoWithRetry(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await page.waitForTimeout(750 * attempt);
    }
  }
  throw lastError;
}

async function capture(page, url, fullPage) {
  await gotoWithRetry(page, url);
  await page.addStyleTag({ content: stabilizationCss });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
    ),
  }));

  return {
    image: await page.screenshot({ fullPage, type: "png" }),
    overflow: Math.max(0, layout.scrollWidth - layout.clientWidth),
  };
}

function normalize(left, right) {
  const width = Math.max(left.width, right.width);
  const height = Math.max(left.height, right.height);

  function copy(source) {
    const result = new PNG({ width, height });
    result.data.fill(255);
    PNG.bitblt(source, result, 0, 0, source.width, source.height, 0, 0);
    return result;
  }

  return { left: copy(left), right: copy(right), width, height };
}

function markdownSummary(results) {
  const lines = [
    "# Visual comparison",
    "",
    `Candidate: ${candidateRoot.href}`,
    `Baseline: ${baselineRoot.href}`,
    `Approval override: ${approved ? "present" : "absent"}`,
    "",
    "| Page | Viewport | Difference | Horizontal overflow | Result |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  for (const result of results) {
    lines.push(
      `| ${result.page} | ${result.viewport} | ${(result.diffRatio * 100).toFixed(3)}% | ${result.overflow}px | ${result.status} |`,
    );
  }

  lines.push(
    "",
    "A difference above the configured threshold fails the pull request unless the `visual-change-approved` label is present. Review the baseline, candidate and diff images before applying that label.",
    "",
  );
  return lines.join("\n");
}

await rm(artifactDir, { force: true, recursive: true });
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
let unexpected = 0;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      colorScheme: "light",
      deviceScaleFactor: 1,
      locale: "en-IN",
      reducedMotion: "reduce",
      timezoneId: "Asia/Kolkata",
      viewport: { width: viewport.width, height: viewport.height },
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem("gurjas.analyticsConsent.v1", "denied");
      } catch {}

      let seed = 0x4755524a;
      Math.random = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
      };
    });

    try {
      for (const route of routes) {
        const baselinePage = await context.newPage();
        const candidatePage = await context.newPage();
        const key = `${route.name}-${viewport.name}`;

        try {
          const [baseline, candidate] = await Promise.all([
            capture(
              baselinePage,
              targetUrl(baselineRoot, route.route),
              viewport.fullPage,
            ),
            capture(
              candidatePage,
              targetUrl(candidateRoot, route.route),
              viewport.fullPage,
            ),
          ]);

          const baselinePng = PNG.sync.read(baseline.image);
          const candidatePng = PNG.sync.read(candidate.image);
          const normalized = normalize(baselinePng, candidatePng);
          const diff = new PNG({
            height: normalized.height,
            width: normalized.width,
          });
          const diffPixels = pixelmatch(
            normalized.left.data,
            normalized.right.data,
            diff.data,
            normalized.width,
            normalized.height,
            { includeAA: false, threshold: 0.01 },
          );
          const diffRatio = diffPixels / (normalized.width * normalized.height);
          const overflow = candidate.overflow;
          const changed = diffRatio > maxDiffRatio;
          const hasOverflow = overflow > 1;
          const status = changed || hasOverflow
            ? approved && changed && !hasOverflow
              ? "approved visual change"
              : "review required"
            : "match";

          if (changed || hasOverflow) {
            await Promise.all([
              writeFile(
                path.join(artifactDir, `${key}-baseline.png`),
                PNG.sync.write(normalized.left),
              ),
              writeFile(
                path.join(artifactDir, `${key}-candidate.png`),
                PNG.sync.write(normalized.right),
              ),
              writeFile(
                path.join(artifactDir, `${key}-diff.png`),
                PNG.sync.write(diff),
              ),
            ]);
          }

          if (hasOverflow || (changed && !approved)) unexpected += 1;
          results.push({
            diffPixels,
            diffRatio,
            overflow,
            page: route.name,
            status,
            viewport: viewport.name,
          });
          console.log(
            `${key}: ${(diffRatio * 100).toFixed(3)}% different, ${overflow}px overflow — ${status}`,
          );
        } finally {
          await Promise.all([baselinePage.close(), candidatePage.close()]);
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
  path.join(artifactDir, "manifest.json"),
  `${JSON.stringify({ approved, baseline: baselineRoot.href, maxDiffRatio, results }, null, 2)}\n`,
);
await writeFile(
  path.join(artifactDir, "summary.md"),
  markdownSummary(results),
);

if (unexpected > 0) {
  console.error(
    `Visual safety check found ${unexpected} unapproved regression or overflow issue(s).`,
  );
  process.exit(1);
}
