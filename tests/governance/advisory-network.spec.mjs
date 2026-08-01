import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const failures = [];
const baseUrl = process.env.CANDIDATE_URL || "http://127.0.0.1:8000/";

function check(condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${message}`);
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const section = read("site/fragments/home-advisory.html");
const about = read("about/index.html");
const advisory = read("site/fragments/advisory-main.html");
const script = read("assets/advisory-network.js");
const builder = read("scripts/build_site.py");
const composition = read("scripts/advisory_composition.py");
const checker = read("scripts/check_build.py");

check(/home-advisory-network/.test(section), "homepage contains one dedicated advisory-network fragment");
check(/A growing international <em>advisory network\.<\/em>/i.test(section), "homepage leads with the approved international advisory headline");
check(/additional countries and disciplinary settings/i.test(section), "homepage states the intended geographic and disciplinary expansion");
check(/selective growth/i.test(section) && /not merely a prominent affiliation/i.test(section), "homepage frames expansion as selective rather than decorative");
check(/href="advisory\/"/.test(section), "homepage provides a direct route to the named Advisory Board page");
check(/href="governance\/"/.test(section), "homepage links the advisory message to governance boundaries");
check(/do not manage Gurjas/i.test(section) && /access confidential client material by default/i.test(section), "homepage publishes operational and confidentiality boundaries beside the advisory claim");
check(!/Sarvjeet|Gurdip|Aditya Madan/i.test(section), "homepage advisory block contains no individual adviser names");

check(/Operational leadership, strengthened by independent advice/i.test(about), "About page distinguishes operating leadership from advisory perspective");
check(/Client acceptance, confidentiality, scope, methods and final delivery remain the responsibility of the practice/i.test(about), "About page retains explicit practice accountability");

check(/Independent perspective, widening across borders/i.test(advisory), "Advisory page leads with the international direction");
check(/id="international-expansion"/.test(advisory), "Advisory page contains a stable international-expansion section");
check(/Complementary expertise/i.test(advisory) && /Geographic breadth/i.test(advisory) && /Evidence of contribution/i.test(advisory) && /Governance fit/i.test(advisory), "future appointments are governed by four published selection principles");
check(/not automatically receive confidential materials/i.test(advisory), "Advisory page denies default access to confidential client material");
check(/do not imply endorsement/i.test(advisory), "Advisory page preserves the non-endorsement boundary");
check(/Dr\. Sarvjeet Kaur Chatrath/.test(advisory) && /Dr\. Gurdip Singh Batra/.test(advisory) && /Aditya Madan/.test(advisory), "individual names remain confined to the full Advisory Board page");

check(/build_site_core\.py/.test(builder), "the established site builder is retained unchanged behind registered composition");
check(/compose_document/.test(builder) && /composed_paths/.test(builder), "the build applies only the registered page composition");
check(/home-advisory\.html/.test(composition) && /advisory-main\.html/.test(composition), "one shared module owns both governed static fragments");
check(/check_build_core/.test(checker) && /compose_document/.test(checker), "the unchanged core checker verifies the same declared composition");
check(/advisory_network_click/.test(script), "shared analytics defines a dedicated advisory-network event");
check(/origin_path/.test(script) && /destination_path/.test(script) && /destination_kind/.test(script), "advisory analytics use only safe route-level parameters");

async function browserChecks() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  try {
    const staticContext = await browser.newContext({ javaScriptEnabled: false });
    const staticHome = await staticContext.newPage();
    await staticHome.goto(baseUrl, { waitUntil: "domcontentloaded" });
    check(await staticHome.locator(".home-advisory-network").count() === 1, "homepage advisory network is present without JavaScript");
    check(await staticHome.locator(".home-advisory-network").isVisible(), "homepage advisory network remains visible without JavaScript");
    check(!/Sarvjeet|Gurdip|Aditya Madan/i.test(await staticHome.locator(".home-advisory-network").innerText()), "no-script homepage still withholds individual adviser names");
    const staticAdvisory = await staticContext.newPage();
    await staticAdvisory.goto(new URL("advisory/", baseUrl).href, { waitUntil: "domcontentloaded" });
    check(await staticAdvisory.locator("#international-expansion").isVisible(), "international expansion principles are static and visible without JavaScript");
    await staticContext.close();

    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem("gurjas.analyticsConsent.v1", "granted");
      window.__gtagEvents = [];
      window.gtag = function () { window.__gtagEvents.push(Array.from(arguments)); };
    });
    const page = await context.newPage();
    await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
    await page.route("https://www.clarity.ms/**", (route) => route.abort());
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    const link = page.locator('[data-advisory-link][data-advisory-destination="board"]').first();
    await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault(), { capture: true }));
    await link.click();
    await page.waitForFunction(() => (window.__gtagEvents || []).some((entry) => entry[0] === "event" && entry[1] === "advisory_network_click"));
    const recorded = await page.evaluate(() => {
      const event = (window.__gtagEvents || []).find((entry) => entry[0] === "event" && entry[1] === "advisory_network_click");
      return event ? event[2] : null;
    });
    check(recorded?.origin_path === "/", "advisory click records only the safe homepage origin");
    check(recorded?.destination_path === "/advisory/", "advisory click records the intended destination path");
    check(recorded?.destination_kind === "board", "advisory click distinguishes the board route");
    check(!/Sarvjeet|Gurdip|Aditya|email|message|name/i.test(JSON.stringify(recorded || {})), "advisory event contains no adviser identity or user-entered content");
    await context.close();
  } finally {
    await browser.close();
  }
}

await browserChecks();

if (failures.length) {
  console.error(`\n${failures.length} advisory governance check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll advisory governance checks passed.");
}
