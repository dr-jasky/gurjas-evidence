import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.REVIEW_BASE_URL ?? "http://127.0.0.1:8000";
const outputDirectory = process.env.REVIEW_OUTPUT_DIR ?? "visual-review";

const routes = [
  { name: "home", path: "/" },
  { name: "not-found", path: "/404.html" },
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
  { name: "advisory-board", path: "/advisory/" },
  { name: "people", path: "/people/" },
  { name: "publications", path: "/publications/" },
  { name: "research-tools", path: "/tools/" },
  { name: "apc-checker", path: "/tools/apc-checker/" },
  { name: "grant-deadline-tracker", path: "/tools/grant-deadline-tracker/" },
  { name: "journal-finder", path: "/tools/journal-finder/" },
  { name: "naac-readiness-scorecard", path: "/tools/naac-readiness-scorecard/" },
  { name: "phd-timeline-planner", path: "/tools/phd-timeline-planner/" },
  { name: "predatory-journal-checker", path: "/tools/predatory-journal-checker/" },
  { name: "reliability-validity-kit", path: "/tools/reliability-validity-kit/" },
  { name: "sem-sample-size-calculator", path: "/tools/sem-sample-size-calculator/" },
  { name: "resource-centre", path: "/resources/" },
  {
    name: "insights-directory",
    path: "/insights/",
  },
  {
    name: "verify-a-journal-2026",
    path: "/insights/verify-a-journal-2026/",
  },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

async function verifySiteGuide(page, viewportName) {
  const guide = page.locator("[data-site-guide]");
  if (!(await guide.isVisible())) {
    const menu = page.locator(".nav-btn");
    const initialMenu = await page.evaluate(() => ({
      expanded: document.querySelector(".nav-btn")?.getAttribute("aria-expanded"),
      label: document.querySelector(".nav-btn")?.getAttribute("aria-label"),
      text: document.querySelector(".nav-btn")?.textContent?.trim(),
    }));
    if (initialMenu.expanded !== "false" || initialMenu.label !== "Open primary navigation" || initialMenu.text !== "Menu") {
      throw new Error(`${viewportName} mobile navigation did not begin in its closed state`);
    }

    await menu.click();
    await guide.waitFor({ state: "visible" });
    const openMenu = await page.evaluate(() => ({
      expanded: document.querySelector(".nav-btn")?.getAttribute("aria-expanded"),
      label: document.querySelector(".nav-btn")?.getAttribute("aria-label"),
      navOpen: document.querySelector("#nav")?.classList.contains("open"),
      text: document.querySelector(".nav-btn")?.textContent?.trim(),
    }));
    if (openMenu.expanded !== "true" || openMenu.label !== "Close primary navigation" || !openMenu.navOpen || openMenu.text !== "Close") {
      throw new Error(`${viewportName} mobile navigation did not expose its open state clearly`);
    }
    await page.screenshot({
      path: `${outputDirectory}/${viewportName}--site-guide-menu.png`,
      fullPage: false,
    });
  }

  await guide.click();
  const panel = page.locator("#gurjas-site-guide");
  await panel.waitFor({ state: "visible" });
  await page.waitForTimeout(100);

  const openState = await page.evaluate(() => ({
    expanded: document.querySelector("[data-site-guide]")?.getAttribute("aria-expanded"),
    focused: document.activeElement?.id,
    modal: document.querySelector("#gurjas-site-guide")?.getAttribute("aria-modal"),
  }));
  if (openState.expanded !== "true" || openState.focused !== "gcIn" || openState.modal !== "true") {
    throw new Error(`${viewportName} site guide did not open with its focus and dialog state intact`);
  }

  await page.screenshot({
    path: `${outputDirectory}/${viewportName}--site-guide.png`,
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden" });
  const closedState = await page.evaluate(() => ({
    expanded: document.querySelector("[data-site-guide]")?.getAttribute("aria-expanded"),
    focusIsMenu: document.activeElement?.classList.contains("nav-btn"),
    focusIsGuide: document.activeElement?.hasAttribute("data-site-guide"),
    menuExpanded: document.querySelector(".nav-btn")?.getAttribute("aria-expanded"),
    menuLabel: document.querySelector(".nav-btn")?.getAttribute("aria-label"),
    menuText: document.querySelector(".nav-btn")?.textContent?.trim(),
  }));
  const expectedFocus = viewportName === "mobile" ? closedState.focusIsMenu : closedState.focusIsGuide;
  const menuRestored = viewportName !== "mobile" || (
    closedState.menuExpanded === "false" &&
    closedState.menuLabel === "Open primary navigation" &&
    closedState.menuText === "Menu"
  );
  if (closedState.expanded !== "false" || !expectedFocus || !menuRestored) {
    throw new Error(`${viewportName} site guide did not close and restore focus correctly`);
  }

  if (viewportName === "mobile") {
    const menu = page.locator(".nav-btn");
    const closedCorrectly = async (mustHaveFocus = false) => page.evaluate((needsFocus) => {
      const button = document.querySelector(".nav-btn");
      return button?.getAttribute("aria-expanded") === "false" &&
        button?.getAttribute("aria-label") === "Open primary navigation" &&
        button?.textContent?.trim() === "Menu" &&
        !document.querySelector("#nav")?.classList.contains("open") &&
        (!needsFocus || document.activeElement === button);
    }, mustHaveFocus);

    await menu.click();
    await page.keyboard.press("Escape");
    if (!(await closedCorrectly(true))) {
      throw new Error("mobile navigation did not close, relabel and restore focus on Escape");
    }

    await menu.click();
    await page.locator("main").evaluate((main) => main.click());
    if (!(await closedCorrectly())) {
      throw new Error("mobile navigation did not close and relabel after an outside click");
    }

    await menu.click();
    const viewport = page.viewportSize();
    await page.setViewportSize({ width: 1000, height: viewport?.height ?? 844 });
    await page.waitForTimeout(50);
    if (!(await closedCorrectly())) {
      throw new Error("mobile navigation remained open after crossing the desktop breakpoint");
    }
    await page.setViewportSize({ width: viewport?.width ?? 390, height: viewport?.height ?? 844 });
  }
}

async function verifyCookiePreferences(page, viewportName) {
  const preferences = page.locator("[data-cookie-preferences]");
  if ((await preferences.count()) !== 1) {
    throw new Error(`${viewportName} must expose exactly one cookie-preferences control`);
  }

  await preferences.click();
  const notice = page.locator("#gurjas-consent");
  await notice.waitFor({ state: "visible" });
  const state = await page.evaluate(() => ({
    describedBy: document.querySelector("#gurjas-consent")?.getAttribute("aria-describedby"),
    focusedChoice: document.activeElement?.getAttribute("data-consent"),
    modal: document.querySelector("#gurjas-consent")?.getAttribute("aria-modal"),
    role: document.querySelector("#gurjas-consent")?.getAttribute("role"),
  }));
  if (state.role !== "region" || state.describedBy !== "gurjas-consent-desc" || state.modal !== null || state.focusedChoice !== "granted") {
    throw new Error(`${viewportName} cookie preferences did not open with the expected accessible state`);
  }

  await page.screenshot({
    path: `${outputDirectory}/${viewportName}--cookie-preferences.png`,
    fullPage: false,
  });
  await notice.locator('[data-consent="denied"]').click();
  await notice.waitFor({ state: "detached" });
}

async function verifyEvidenceDashboard(page, viewportName) {
  const dashboard = page.locator("[data-evidence-dashboard]");
  const tabs = dashboard.locator('[role="tab"]');
  const globalPanel = dashboard.locator("#evidence-panel-global");
  const indiaPanel = dashboard.locator("#evidence-panel-india");
  if ((await dashboard.count()) !== 1 || (await tabs.count()) !== 2) {
    throw new Error(`${viewportName} services dashboard is missing its two-tab evidence interface`);
  }
  if (!(await globalPanel.isVisible()) || (await indiaPanel.isVisible())) {
    throw new Error(`${viewportName} services dashboard did not begin on the global evidence panel`);
  }

  const indiaTab = dashboard.locator("#evidence-tab-india");
  await indiaTab.click();
  if ((await globalPanel.isVisible()) || !(await indiaPanel.isVisible())) {
    throw new Error(`${viewportName} services dashboard did not switch to the India evidence panel`);
  }
  await page.screenshot({
    path: `${outputDirectory}/${viewportName}--services-evidence-india.png`,
    fullPage: true,
  });

  await indiaTab.press("ArrowLeft");
  if (!(await globalPanel.isVisible()) || (await indiaPanel.isVisible())) {
    throw new Error(`${viewportName} services dashboard arrow-key navigation failed`);
  }
}

async function verifyEngagementPipeline(page, viewportName) {
  const pipeline = page.locator("[data-engagement-pipeline]");
  const tabs = pipeline.locator('[role="tab"]');
  const firstPanel = pipeline.locator("#engagement-stage-1");
  const deliveryPanel = pipeline.locator("#engagement-stage-4");
  const reviewPanel = pipeline.locator("#engagement-stage-5");
  if ((await pipeline.count()) !== 1 || (await tabs.count()) !== 5) {
    throw new Error(`${viewportName} services pipeline is missing its five-stage interface`);
  }
  if (!(await firstPanel.isVisible()) || (await deliveryPanel.isVisible())) {
    throw new Error(`${viewportName} services pipeline did not begin on the diagnostic stage`);
  }

  const deliveryTab = pipeline.locator("#engagement-tab-4");
  await deliveryTab.click();
  if ((await firstPanel.isVisible()) || !(await deliveryPanel.isVisible())) {
    throw new Error(`${viewportName} services pipeline did not switch to the delivery stage`);
  }
  await page.screenshot({
    path: `${outputDirectory}/${viewportName}--services-engagement-delivery.png`,
    fullPage: true,
  });

  await deliveryTab.press("ArrowRight");
  if (!(await reviewPanel.isVisible())) {
    throw new Error(`${viewportName} services pipeline arrow-key navigation failed`);
  }
  await pipeline.locator("#engagement-tab-5").press("Home");
  if (!(await firstPanel.isVisible())) {
    throw new Error(`${viewportName} services pipeline Home-key navigation failed`);
  }
}

async function verifyToolResult(page, viewportName) {
  const action = page.locator("#calc");
  const output = page.locator("#out");
  if ((await action.count()) !== 1 || (await page.locator(".tool-progress").count()) !== 1) {
    throw new Error(`${viewportName} SEM calculator is missing its enhanced action state`);
  }
  await action.click();
  await output.waitFor({ state: "visible" });
  await page.waitForTimeout(80);
  const state = await page.evaluate(() => ({
    recommended: document.querySelector("#rec")?.textContent?.trim(),
    resultClass: document.querySelector("#out")?.classList.contains("is-revealed"),
    processing: document.querySelector(".tool-input-surface")?.classList.contains("is-processing"),
  }));
  if (!state.recommended || state.recommended === "—" || !state.resultClass || !state.processing) {
    throw new Error(`${viewportName} SEM calculator did not expose a complete result state`);
  }
  await page.screenshot({
    path: `${outputDirectory}/${viewportName}--sem-calculator-result.png`,
    fullPage: true,
  });
}

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

      if (route.name === "home") {
        await verifySiteGuide(page, viewport.name);
        await verifyCookiePreferences(page, viewport.name);
      }
      if (route.name === "services") {
        await verifyEvidenceDashboard(page, viewport.name);
        await verifyEngagementPipeline(page, viewport.name);
      }
      if (route.name === "sem-sample-size-calculator") {
        await verifyToolResult(page, viewport.name);
      }

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
