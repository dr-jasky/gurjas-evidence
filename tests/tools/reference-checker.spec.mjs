/* Deterministic fixtures for the Reference & DOI Integrity Checker.
   Every Crossref call is mocked with page.route — this must never depend
   on live network access. It locks in: a resolving DOI whose recorded
   fields match the pasted reference, a DOI carrying a recorded retraction,
   a DOI that 404s in Crossref, a DOI-less reference resolved by candidate
   search, and a 429 rate-limit response. */
import { chromium } from "playwright";

const baseUrl = process.env.CANDIDATE_URL || "http://127.0.0.1:8000/";
const toolUrl = new URL("tools/reference-integrity-checker/", baseUrl).href;

const failures = [];
function check(condition, message) {
  console.log((condition ? "PASS" : "FAIL") + " — " + message);
  if (!condition) failures.push(message);
}

function crossrefWork(message) {
  return { message };
}

async function testResolvingMatchAndRetraction(browser) {
  const page = await browser.newPage();
  await page.route("https://api.crossref.org/**", (route) => {
    const url = route.request().url();
    if (url.includes("/works/10.1000/match")) {
      route.fulfill({
        json: crossrefWork({
          title: ["Digital payments and financial inclusion in India"],
          author: [{ family: "Singh" }],
          issued: { "date-parts": [[2024]] },
        }),
      });
    } else if (url.includes("/works/10.1000/retracted")) {
      route.fulfill({
        json: crossrefWork({
          title: ["A withdrawn study on capital flows"],
          author: [{ family: "Kaur" }],
          issued: { "date-parts": [[2019]] },
          "update-to": [
            { type: "retraction", label: "Retraction", updated: { DOI: "10.1000/retraction-notice", "date-parts": [[2021, 3, 4]] } },
          ],
        }),
      });
    } else {
      route.continue();
    }
  });
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill(
    "#refs",
    "Singh, J. (2024). Digital payments and financial inclusion in India. https://doi.org/10.1000/match\n" +
      "Kaur, G. (2019). A withdrawn study on capital flows. https://doi.org/10.1000/retracted",
  );
  await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#rows > article").length >= 2, { timeout: 15000 });

  const row1 = await page.locator("#rows > article").nth(0).innerText();
  check(/Resolved in Crossref/.test(row1), "matching reference resolves");
  check(/Matches your text/.test(row1), "title/author/year compare as matches for the aligned reference");
  check(/No post-publication updates recorded in Crossref/.test(row1), "clean DOI shows the explicit no-updates sentence, not a bare negative");

  const row2 = await page.locator("#rows > article").nth(1).innerText();
  check(/Post-publication updates recorded in Crossref/.test(row2), "retraction record surfaces");
  check(/Retraction/.test(row2), "retraction label renders");
  await page.close();
}

async function testFieldMismatch(browser) {
  const page = await browser.newPage();
  await page.route("https://api.crossref.org/**", (route) => {
    if (route.request().url().includes("/works/10.1000/mismatch")) {
      route.fulfill({
        json: crossrefWork({
          title: ["An entirely different recorded title about coral reefs"],
          author: [{ family: "Nakamura" }],
          issued: { "date-parts": [[2010]] },
        }),
      });
    } else {
      route.continue();
    }
  });
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill("#refs", "Singh, J. (2024). Digital payments in India. https://doi.org/10.1000/mismatch");
  await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#rows > article").length >= 1, { timeout: 15000 });
  const text = await page.locator("#rows > article").first().innerText();
  check(/Differs from your text/.test(text), "mismatched title/author/year report as differs, not a silent match");
  check(/Verify against the publisher record/.test(text), "mismatch carries a manual-verification next action");
  await page.close();
}

async function testNotFound(browser) {
  const page = await browser.newPage();
  await page.route("https://api.crossref.org/**", (route) => {
    if (route.request().url().includes("/works/10.1000/missing")) {
      route.fulfill({ status: 404, body: "not found" });
    } else {
      route.continue();
    }
  });
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill("#refs", "A reference with a dead DOI. https://doi.org/10.1000/missing");
  await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#rows > article").length >= 1, { timeout: 15000 });
  const text = await page.locator("#rows > article").first().innerText();
  check(/DOI not found in Crossref \(404\)/.test(text), "404 renders as an explicit not-found state");
  check(/DataCite/.test(text), "404 guidance mentions non-Crossref registrars rather than implying the work is fake");
  await page.close();
}

async function testNoDoiCandidates(browser) {
  const page = await browser.newPage();
  await page.route("https://api.crossref.org/**", (route) => {
    if (route.request().url().includes("query.bibliographic")) {
      route.fulfill({
        json: {
          message: {
            items: [
              { title: ["A closely related candidate paper"], author: [{ family: "Rao" }], published: { "date-parts": [[2022]] }, DOI: "10.1000/candidate1" },
              { title: ["A second possible match"], author: [{ family: "Iyer" }], published: { "date-parts": [[2021]] }, DOI: "10.1000/candidate2" },
            ],
          },
        },
      });
    } else {
      route.continue();
    }
  });
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill("#refs", "A reference typed out in full with no DOI anywhere in the text at all.");
  await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#rows > article").length >= 1, { timeout: 15000 });
  const text = await page.locator("#rows > article").first().innerText();
  check(/No DOI found in text/.test(text), "DOI-less reference is labelled correctly");
  check(/Possible matches.*verify manually/s.test(text), "candidates are labelled for manual verification");
  check(/A closely related candidate paper/.test(text), "first candidate renders");
  check(/A second possible match/.test(text), "second candidate renders");
  check(/none selected automatically/.test(text), "candidate list states explicitly that none was auto-selected");
  await page.close();
}

async function testRateLimit(browser) {
  const page = await browser.newPage();
  await page.route("https://api.crossref.org/**", (route) => {
    if (route.request().url().includes("/works/10.1000/limited")) {
      route.fulfill({ status: 429, body: "rate limited" });
    } else {
      route.continue();
    }
  });
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill("#refs", "A reference that will be rate-limited. https://doi.org/10.1000/limited");
  await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#rows > article").length >= 1, { timeout: 15000 });
  const text = await page.locator("#rows > article").first().innerText();
  check(/Rate-limited/.test(text), "429 renders as an explicit rate-limited state, not a silent failure");
  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await testResolvingMatchAndRetraction(browser);
  await testFieldMismatch(browser);
  await testNotFound(browser);
  await testNoDoiCandidates(browser);
  await testRateLimit(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} Reference & DOI Integrity Checker fixture check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll Reference & DOI Integrity Checker fixture checks passed.");
}
