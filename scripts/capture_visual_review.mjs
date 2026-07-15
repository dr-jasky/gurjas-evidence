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
