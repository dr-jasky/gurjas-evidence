/* Browser checks for the consented Research Library and tool journey.
   Google Analytics and external services are blocked; only the local event
   contract is inspected. No research inputs or personal values are supplied. */
import { chromium } from "playwright";

const baseUrl = process.env.CANDIDATE_URL || "http://127.0.0.1:8000/";
const failures = [];

function check(condition, message) {
  console.log((condition ? "PASS" : "FAIL") + " — " + message);
  if (!condition) failures.push(message);
}

async function newPage(browser, consent = "granted") {
  const context = await browser.newContext();
  await context.addInitScript((choice) => {
    localStorage.setItem("gurjas.analyticsConsent.v1", choice);
    window.__gtagEvents = [];
    window.gtag = function () {
      window.__gtagEvents.push(Array.from(arguments));
    };
  }, consent);
  const page = await context.newPage();
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
  await page.route("https://www.clarity.ms/**", (route) => route.abort());
  return { context, page };
}

async function events(page, name) {
  return page.evaluate((eventName) => {
    return (window.__gtagEvents || [])
      .filter((entry) => entry[0] === "event" && entry[1] === eventName)
      .map((entry) => entry[2] || {});
  }, name);
}

async function waitForEvent(page, name) {
  await page.waitForFunction((eventName) => {
    return (window.__gtagEvents || []).some(
      (entry) => entry[0] === "event" && entry[1] === eventName,
    );
  }, name, { timeout: 10000 });
}

async function testLibraryEntryView(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("knowledge/library/sem-sample-size-planning/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await waitForEvent(page, "library_entry_view");
  const recorded = (await events(page, "library_entry_view"))[0];
  check(recorded.entry_slug === "sem-sample-size-planning", "Library entry view records only the governed entry slug");
  check(recorded.origin_path === "/knowledge/library/sem-sample-size-planning/", "Library entry view records a same-origin pathname without a query string");
  check(Object.keys(recorded).sort().join(",") === "entry_slug,origin_path", "Library entry view exposes no unregistered parameters");
  await context.close();
}

async function testToolViewAndAction(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("tools/sem-sample-size-calculator/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await waitForEvent(page, "tool_view");
  const view = (await events(page, "tool_view"))[0];
  check(view.tool_slug === "sem-sample-size-calculator", "Tool view records the current governed tool slug");
  await page.click("#calc");
  await waitForEvent(page, "tool_action");
  const action = (await events(page, "tool_action"))[0];
  check(action.tool_slug === "sem-sample-size-calculator", "Recognised action remains attributed to the current tool");
  check(action.action_type === "calculate", "Primary calculation is classified without reading inputs or results");
  check(Object.keys(action).sort().join(",") === "action_type,tool_slug", "Tool action exposes only its allowlisted classification fields");
  await context.close();
}

async function testToolEvidenceOpen(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("tools/sem-sample-size-calculator/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  const evidenceLink = page.locator(".tool-evidence-loop__card").first();
  await evidenceLink.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { capture: true });
  });
  await evidenceLink.click();
  await waitForEvent(page, "tool_evidence_open");
  const recorded = (await events(page, "tool_evidence_open"))[0];
  check(recorded.tool_slug === "sem-sample-size-calculator", "Evidence open is attributed to the originating tool");
  check(recorded.entry_slug === "sem-sample-size-planning", "Evidence open identifies the governed Library destination");
  check(recorded.destination_path === "/knowledge/library/sem-sample-size-planning/", "Evidence open stores only the destination pathname");
  await context.close();
}

async function testLibraryToPractical(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("knowledge/library/sem-sample-size-planning/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  const practicalLink = page.locator('a[href*="tools/sem-sample-size-calculator/"]').first();
  await practicalLink.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { capture: true });
  });
  await practicalLink.click();
  await waitForEvent(page, "library_to_practical");
  const recorded = (await events(page, "library_to_practical"))[0];
  check(recorded.entry_slug === "sem-sample-size-planning", "Library handoff is attributed to the source entry");
  check(recorded.destination_kind === "tool" && recorded.destination_slug === "sem-sample-size-calculator", "Library handoff identifies the practical destination without user content");
  check(recorded.destination_path === "/tools/sem-sample-size-calculator/", "Library handoff stores no query string or external URL");
  await context.close();
}

async function testConsentBoundary(browser) {
  const { context, page } = await newPage(browser, "denied");
  await page.goto(new URL("knowledge/library/doi-record-verification/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(150);
  check((await events(page, "library_entry_view")).length === 0, "declined analytics records no Library journey event");
  await page.goto(new URL("tools/reference-integrity-checker/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(150);
  check((await events(page, "tool_view")).length === 0, "declined analytics records no tool journey event");
  await context.close();
}

async function testUnsafeCampaignToken(browser) {
  const { context, page } = await newPage(browser);
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "person@example.invalid");
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);
  check((await events(page, "campaign_landing")).length === 0, "email-like campaign values are discarded rather than transmitted");
  await context.close();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await testLibraryEntryView(browser);
  await testToolViewAndAction(browser);
  await testToolEvidenceOpen(browser);
  await testLibraryToPractical(browser);
  await testConsentBoundary(browser);
  await testUnsafeCampaignToken(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} research-journey analytics check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll privacy-safe research-journey analytics checks passed.");
}
