/* Deterministic browser checks for the Gurjas analytics event taxonomy.
   Google Analytics, Clarity and FormSubmit are mocked or blocked. The tests
   assert that outcome events require consent, successful enquiries are not
   inferred from a submit attempt, campaign values are allowlisted, and no
   user-entered form or research content appears in event parameters. */
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
    if (choice === null) localStorage.removeItem("gurjas.analyticsConsent.v1");
    else localStorage.setItem("gurjas.analyticsConsent.v1", choice);
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

async function testConsentBoundary(browser) {
  const { context, page } = await newPage(browser, "denied");
  await page.goto(new URL("?utm_source=private-test&utm_medium=email&utm_campaign=denied", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(150);
  check((await events(page, "campaign_landing")).length === 0, "declined analytics produces no campaign event");
  const stored = await page.evaluate(() => sessionStorage.getItem("gurjas.analyticsAttribution.v1"));
  check(stored === null, "declined analytics stores no campaign attribution");
  await context.close();
}

async function testAcceptanceAfterLanding(browser) {
  const { context, page } = await newPage(browser, null);
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "first-visit");
  url.searchParams.set("utm_medium", "referral-brief");
  url.searchParams.set("utm_campaign", "post-consent");
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  check((await events(page, "campaign_landing")).length === 0, "first visit is not measured before a consent choice");
  await page.click('[data-consent="granted"]');
  await waitForEvent(page, "campaign_landing");
  const recorded = (await events(page, "campaign_landing"))[0];
  check(recorded.campaign_source === "first-visit", "campaign context is measured only after explicit acceptance");
  await context.close();
}

async function testCampaignAllowlist(browser) {
  const { context, page } = await newPage(browser);
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "institutional-briefing");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "august-clinic");
  url.searchParams.set("unsafe_parameter", "must-not-be-recorded");
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await waitForEvent(page, "campaign_landing");
  const recorded = (await events(page, "campaign_landing"))[0];
  check(recorded.campaign_source === "institutional-briefing", "allowlisted campaign source is recorded after consent");
  check(recorded.campaign_medium === "email" && recorded.campaign_name === "august-clinic", "allowlisted campaign medium and name are recorded");
  check(!Object.hasOwn(recorded, "unsafe_parameter"), "unapproved query parameters are excluded");
  await context.close();
}

async function testSuccessfulEnquiry(browser) {
  const { context, page } = await newPage(browser);
  await page.route("https://formsubmit.co/ajax/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
  const url = new URL("contact/?service=research-methods", baseUrl);
  url.searchParams.set("utm_source", "methods-guide");
  url.searchParams.set("utm_medium", "organic-content");
  url.searchParams.set("utm_campaign", "sem-readiness");
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.fill("#cf-name", "Analytics Test Person");
  await page.fill("#cf-email", "analytics-test@example.invalid");
  await page.selectOption("#cf-cat", { label: "Scholar / Doctoral researcher" });
  await page.fill("#cf-msg", "A confidential research problem that must never enter analytics.");
  await page.click('#gcContactForm button[type="submit"]');
  await page.waitForSelector(".form-status.ok", { timeout: 10000 });
  await waitForEvent(page, "contact_form_success");

  const successes = await events(page, "contact_form_success");
  check(successes.length === 1, "one successful FormSubmit response produces one success event");
  const recorded = successes[0];
  check(recorded.service_slug === "research-methods", "successful enquiry retains the non-personal service context");
  check(recorded.campaign_source === "methods-guide" && recorded.campaign_name === "sem-readiness", "successful enquiry retains session campaign context");
  const serialised = JSON.stringify(recorded);
  check(!/Analytics Test Person|example\.invalid|confidential research problem/i.test(serialised), "success event excludes name, email and free-text enquiry content");
  await context.close();
}

async function testFailedDelivery(browser) {
  const { context, page } = await newPage(browser);
  await page.route("https://formsubmit.co/ajax/**", (route) => {
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto(new URL("contact/?service=impact-evaluation", baseUrl).href, { waitUntil: "domcontentloaded" });
  await page.fill("#cf-name", "Failure Test");
  await page.fill("#cf-email", "failure@example.invalid");
  await page.selectOption("#cf-cat", { label: "NGO or CSR programme" });
  await page.fill("#cf-msg", "This delivery is deliberately rejected by the fixture.");
  await page.click('#gcContactForm button[type="submit"]');
  await page.waitForSelector(".form-status.error", { timeout: 10000 });
  await waitForEvent(page, "contact_form_failure");
  check((await events(page, "contact_form_success")).length === 0, "a failed FormSubmit response is never counted as a successful enquiry");
  check((await events(page, "contact_form_failure")).length === 1, "delivery failure is recorded once for operational diagnosis");
  await context.close();
}

async function testContactChannels(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("contact/", baseUrl).href, { waitUntil: "domcontentloaded" });
  const phone = page.locator('a[href^="tel:"]').first();
  await phone.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { capture: true });
  });
  await phone.click();
  await waitForEvent(page, "phone_click");
  const channel = (await events(page, "contact_channel_click"))[0];
  check(channel && channel.channel === "phone", "telephone action is classified as a contact-channel handoff");
  check((await events(page, "phone_click")).length === 1, "telephone action has its own measurable event");
  await context.close();
}

async function testClinicHandoff(browser) {
  const { context, page } = await newPage(browser);
  await page.goto(new URL("services/institutional-research-integrity-clinic/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  const cta = page.locator('a[href*="contact/"][href*="service="]').first();
  await cta.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { capture: true });
  });
  await cta.click();
  await waitForEvent(page, "clinic_request");
  const request = (await events(page, "clinic_request"))[0];
  check(request.origin_path === "/services/institutional-research-integrity-clinic/", "clinic request records only its safe origin path");
  const handoff = (await events(page, "service_handoff"))[0];
  check(handoff && handoff.handoff_kind === "clinic", "clinic CTA is distinguished from a general service handoff");
  await context.close();
}

async function testToolExport(browser) {
  const { context, page } = await newPage(browser);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });
  await page.goto(new URL("tools/sem-sample-size-calculator/", baseUrl).href, {
    waitUntil: "domcontentloaded",
  });
  await page.click("#calc");
  await page.waitForSelector("#out:not([hidden])", { timeout: 10000 });
  await page.click("#copy");
  await waitForEvent(page, "tool_export");
  const recorded = (await events(page, "tool_export"))[0];
  check(recorded.tool_slug === "sem-sample-size-calculator", "tool export is attributed to the current tool");
  check(recorded.export_type === "copy", "copying a planning record is classified as a copy export");
  await context.close();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await testConsentBoundary(browser);
  await testAcceptanceAfterLanding(browser);
  await testCampaignAllowlist(browser);
  await testSuccessfulEnquiry(browser);
  await testFailedDelivery(browser);
  await testContactChannels(browser);
  await testClinicHandoff(browser);
  await testToolExport(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} analytics check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll analytics event checks passed.");
}
