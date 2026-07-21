import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const baseUrl = process.env.A11Y_BASE_URL ?? "http://127.0.0.1:8000/";
const outputDirectory = process.env.A11Y_REPORT_DIR ?? "accessibility-review";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const axeVersion = require("axe-core/package.json").version;
const blockingImpacts = new Set(["serious", "critical"]);
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

function sitemapRoutes() {
  const xml = readFileSync("_site/sitemap.xml", "utf8");
  const routes = [...xml.matchAll(/<loc>https:\/\/gurjas\.org([^<]*)<\/loc>/g)]
    .map((match) => match[1] || "/");
  routes.push("/404.html");
  return [...new Set(routes)].sort((left, right) => left.localeCompare(right));
}

function compactViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  };
}

async function runAxe(page, axeSource, route, viewport, state) {
  const injected = await page.evaluate(() => Boolean(globalThis.axe));
  if (!injected) {
    await page.addScriptTag({ content: axeSource });
  }
  const raw = await page.evaluate(async ({ tags }) => {
    if (!globalThis.axe) {
      throw new Error("axe-core was not injected");
    }
    return globalThis.axe.run(document, {
      runOnly: { type: "tag", values: tags },
      resultTypes: ["violations", "incomplete"],
    });
  }, { tags: wcagTags });

  const violations = raw.violations.map(compactViolation);
  const incomplete = raw.incomplete.map(compactViolation);
  const blocking = violations.filter((item) => blockingImpacts.has(item.impact));
  return {
    route,
    viewport: viewport.name,
    state,
    violations,
    incomplete,
    blockingCount: blocking.length,
    blockingNodeCount: blocking.reduce((sum, item) => sum + item.nodes.length, 0),
  };
}

async function dismissConsent(page) {
  const decline = page.locator('[data-consent="denied"]');
  const appeared = await decline
    .waitFor({ state: "visible", timeout: 1500 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await decline.click();
  }
}

async function auditDynamicStates(page, axeSource, route, viewport) {
  const results = [];

  if (route === "/") {
    const guide = page.locator("[data-site-guide]");
    if (!(await guide.isVisible()) && viewport.name === "mobile") {
      const menu = page.locator(".nav-btn");
      if (await menu.isVisible()) {
        await menu.click();
      }
    }
    if (await guide.isVisible()) {
      await guide.click();
      await page.locator("#gurjas-site-guide").waitFor({ state: "visible" });
      results.push(await runAxe(page, axeSource, route, viewport, "site-guide-open"));
      await page.keyboard.press("Escape");
    }

    const preferences = page.locator("[data-cookie-preferences]");
    if (await preferences.isVisible()) {
      await preferences.click();
      await page.locator("#gurjas-consent").waitFor({ state: "visible" });
      results.push(await runAxe(page, axeSource, route, viewport, "cookie-preferences-open"));
      const deny = page.locator('[data-consent="denied"]');
      if (await deny.isVisible()) {
        await deny.click();
      }
    }
  }

  if (route === "/services/") {
    const indiaTab = page.locator("#evidence-tab-india");
    if (await indiaTab.isVisible()) {
      await indiaTab.click();
      results.push(await runAxe(page, axeSource, route, viewport, "evidence-india-panel"));
    }

    const deliveryTab = page.locator("#engagement-tab-4");
    if (await deliveryTab.isVisible()) {
      await deliveryTab.click();
      results.push(await runAxe(page, axeSource, route, viewport, "engagement-delivery-panel"));
    }
  }

  if (route === "/tools/sem-sample-size-calculator/") {
    const calculate = page.locator("#calc");
    if (await calculate.isVisible()) {
      await calculate.click();
      await page.locator("#out").waitFor({ state: "visible" });
      results.push(await runAxe(page, axeSource, route, viewport, "calculated-result"));
    }
  }

  if (route === "/tools/research-readiness-triage/") {
    await page.selectOption("#track", "evaluation");
    await page.selectOption("#stage", { label: "Design and planning" });
    const controls = page.locator(".triage-item");
    for (let index = 0; index < await controls.count(); index += 1) {
      const value = index < 2 ? "missing" : index < 5 ? "partial" : "evidenced";
      await controls.nth(index).locator(`input[value="${value}"]`).check();
    }
    await page.locator('#triage button[type="submit"]').click();
    await page.locator("#triage-output").waitFor({ state: "visible" });
    results.push(await runAxe(page, axeSource, route, viewport, "triage-result"));
  }

  if (route === "/tools/apc-invoice-triage/") {
    // Only the optional APC lookup calls a live API; the register itself
    // is entirely local, so this state can be audited deterministically.
    await page.selectOption("#paymentMethod", "crypto");
    await page.locator('input[name="acceptance"][value="no"]').check();
    await page.locator('input[name="payee"][value="no"]').check();
    await page.click('#triage-form button[type="submit"]');
    await page.locator("#out").waitFor({ state: "visible" });
    results.push(await runAxe(page, axeSource, route, viewport, "invoice-register-result"));
  }

  return results;
}

function markdownReport(results) {
  const blocking = results.filter((result) => result.blockingCount > 0);
  const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
  const totalIncomplete = results.reduce((sum, result) => sum + result.incomplete.length, 0);
  const lines = [
    "# Gurjas accessibility review",
    "",
    `- Axe core: ${axeVersion} (pinned in the lockfile)`,
    `- Audited states: ${results.length}`,
    `- WCAG rule tags: ${wcagTags.join(", ")}`,
    `- Violations reported: ${totalViolations}`,
    `- Incomplete/manual-review findings: ${totalIncomplete}`,
    `- States with serious or critical violations: ${blocking.length}`,
    "",
  ];

  if (blocking.length === 0) {
    lines.push("No serious or critical axe violations were detected.", "");
  } else {
    lines.push("## Blocking findings", "");
    for (const result of blocking) {
      lines.push(`### ${result.viewport} · ${result.route} · ${result.state}`, "");
      for (const violation of result.violations.filter((item) => blockingImpacts.has(item.impact))) {
        lines.push(
          `- **${violation.impact}: ${violation.id}** — ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? "" : "s"})`,
        );
      }
      lines.push("");
    }
  }

  lines.push(
    "Automated checks do not replace keyboard, screen-reader, zoom, high-contrast, cognitive-load or user testing.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

mkdirSync(outputDirectory, { recursive: true });
const routes = sitemapRoutes();
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
      const url = new URL(route, baseUrl).toString();
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response?.ok()) {
        throw new Error(`${url} returned ${response?.status() ?? "no response"}`);
      }
      await dismissConsent(page);
      await page.evaluate(() => document.fonts.ready);
      results.push(await runAxe(page, axeSource, route, viewport, "initial"));
      results.push(...await auditDynamicStates(page, axeSource, route, viewport));
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${outputDirectory}/axe-results.json`, `${JSON.stringify(results, null, 2)}\n`);
writeFileSync(`${outputDirectory}/summary.md`, markdownReport(results));

const blockingResults = results.filter((result) => result.blockingCount > 0);
console.log(
  `Axe audited ${results.length} route/state/viewports; ` +
  `${blockingResults.length} contain serious or critical violations.`,
);
if (blockingResults.length > 0) {
  process.exitCode = 1;
}
