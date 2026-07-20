/* Deterministic fixtures for the Literature-neighbour Journal Shortlist.
   Every OpenAlex call is mocked with page.route — this file must never
   depend on live network access, so it stays stable in CI regardless of
   OpenAlex availability or index drift. It locks in the source-type and
   ISSN guarantees that make the tool safe to promote: repository, preprint
   and book-platform sources must never render as journal recommendations. */
import { chromium } from "playwright";

const baseUrl = process.env.CANDIDATE_URL || "http://127.0.0.1:8000/";
const toolUrl = new URL("tools/journal-finder/", baseUrl).href;

const failures = [];
function check(condition, message) {
  console.log((condition ? "PASS" : "FAIL") + " — " + message);
  if (!condition) failures.push(message);
}

function source(id, name, type, issnL) {
  const entry = { id: "https://openalex.org/" + id, display_name: name, type };
  if (issnL) {
    entry.issn_l = issnL;
    entry.issn = [issnL];
  }
  return entry;
}

function groupEntry(id, name, count) {
  return { key: "https://openalex.org/" + id, key_display_name: name, count };
}

async function mockShortlistRoute(page, { groupBy, sourcesById }) {
  await page.route("https://api.openalex.org/**", (route) => {
    const url = route.request().url();
    if (url.includes("group_by=primary_location.source.id")) {
      route.fulfill({ json: { group_by: groupBy } });
    } else if (url.includes("/sources?filter=openalex:")) {
      route.fulfill({ json: { results: Object.values(sourcesById) } });
    } else {
      route.continue();
    }
  });
}

async function runShortlistSearch(page, query) {
  await page.goto(toolUrl, { waitUntil: "domcontentloaded" });
  await page.fill("#q", query);
  await page.click("#go");
}

async function testRepositoryAndIssnExclusion(browser) {
  const page = await browser.newPage();
  const sourcesById = {
    S1: source("S1", "Journal of Development Economics", "journal", "0304-3878"),
    S2: source("S2", "Zenodo", "repository"),
    S3: source("S3", "arXiv", "repository"),
    // SSRN genuinely carries an ISSN in OpenAlex despite being a repository —
    // this is deliberately the hardest case: it isolates the source.type
    // check from the ISSN check, so a regression of either one is caught
    // independently instead of the two conditions masking each other.
    S4: source("S4", "SSRN Electronic Journal", "repository", "1556-5068"),
    S5: source("S5", "Research Square", "repository"),
    S6: source("S6", "OAPEN Library", "repository"),
    S7: source("S7", "Preprints.org", "repository"),
    S8: source("S8", "World Development", "journal", "0305-750X"),
    S9: source("S9", "Journal Without a Recorded ISSN", "journal", null),
  };
  const groupBy = [
    groupEntry("S1", "Journal of Development Economics", 42),
    groupEntry("S2", "Zenodo", 999),
    groupEntry("S3", "arXiv", 800),
    groupEntry("S4", "SSRN Electronic Journal", 700),
    groupEntry("S5", "Research Square", 650),
    groupEntry("S6", "OAPEN Library", 500),
    groupEntry("S7", "Preprints.org", 400),
    groupEntry("S8", "World Development", 30),
    groupEntry("S9", "Journal Without a Recorded ISSN", 20),
  ];
  await mockShortlistRoute(page, { groupBy, sourcesById });
  await runShortlistSearch(page, "financial inclusion digital payments India");
  await page.waitForSelector("#out:not([hidden])", { timeout: 10000 });

  const rowCount = await page.locator("#rows > div").count();
  const allText = await page.locator("#rows").innerText();
  check(rowCount === 2, "exactly the two ISSN-bearing journal sources render (" + rowCount + " rendered)");
  check(!/zenodo/i.test(allText), "Zenodo is excluded");
  check(!/arxiv/i.test(allText), "arXiv is excluded");
  check(!/ssrn/i.test(allText), "SSRN is excluded");
  check(!/1556-5068/.test(allText), "SSRN's ISSN does not leak through even though it is a recorded field (isolates the type check from the ISSN check)");
  check(!/research square/i.test(allText), "Research Square is excluded");
  check(!/oapen/i.test(allText), "OAPEN is excluded");
  check(!/preprints\.org/i.test(allText), "Preprints.org is excluded");
  check(!/Journal Without a Recorded ISSN/.test(allText), "a journal-type source with no ISSN is excluded");
  check(/0304-3878/.test(allText) && /0305-750X/.test(allText), "surviving rows show their ISSNs");
  await page.close();
}

async function testSamplePapersToggle(browser) {
  const page = await browser.newPage();
  const sourcesById = { S1: source("S1", "Journal of Development Economics", "journal", "0304-3878") };
  const groupBy = [groupEntry("S1", "Journal of Development Economics", 42)];
  await mockShortlistRoute(page, { groupBy, sourcesById });
  await page.route("https://api.openalex.org/**", (route) => {
    const url = route.request().url();
    if (url.includes("primary_location.source.id:S1")) {
      route.fulfill({
        json: {
          results: [
            { id: "https://openalex.org/W1", doi: "https://doi.org/10.1000/x1", title: "Digital payments and financial inclusion in India", publication_year: 2024 },
            { id: "https://openalex.org/W2", doi: null, title: "Mobile money adoption among urban poor households", publication_year: 2023 },
            { id: "https://openalex.org/W3", doi: "https://doi.org/10.1000/x3", title: "JAM trinity and welfare delivery", publication_year: 2025 },
          ],
        },
      });
    } else {
      route.fallback();
    }
  });
  await runShortlistSearch(page, "financial inclusion digital payments India");
  await page.waitForSelector("#out:not([hidden])", { timeout: 10000 });

  const sampleButton = page.locator(".jf-sample").first();
  await sampleButton.click();
  await page.waitForFunction(() => {
    const box = document.querySelector(".jf-papers");
    return box && !box.hidden && box.innerHTML.length > 10;
  }, { timeout: 10000 });
  const papersText = await page.locator(".jf-papers").first().innerText();
  check(/Digital payments/.test(papersText), "first sample paper title renders");
  check(/2024/.test(papersText) && /2023/.test(papersText) && /2025/.test(papersText), "sample paper years render");
  check(/not an endorsement/i.test(papersText), "sample list carries the non-endorsement note");
  check((await sampleButton.textContent()).includes("Hide"), "button label flips to Hide after loading");

  await sampleButton.click();
  check(await page.locator(".jf-papers").first().isHidden(), "papers collapse on second click without refetching");
  await page.close();
}

async function testApiFailureState(browser) {
  const page = await browser.newPage();
  await page.route("https://api.openalex.org/**", (route) => {
    if (route.request().url().includes("group_by=primary_location.source.id")) {
      route.fulfill({ status: 500, body: "internal error" });
    } else {
      route.continue();
    }
  });
  await runShortlistSearch(page, "a query that triggers a simulated outage");
  await page.waitForFunction(() => {
    const status = document.getElementById("status");
    return status && /unavailable/i.test(status.textContent || "");
  }, { timeout: 10000 });
  check(true, "API failure shows the graceful unavailable message");
  check(await page.locator("#out").isHidden(), "results panel stays hidden on API failure");
  await page.close();
}

async function testNonePassedState(browser) {
  const page = await browser.newPage();
  const sourcesById = { S2: source("S2", "Zenodo", "repository") };
  const groupBy = [groupEntry("S2", "Zenodo", 999)];
  await mockShortlistRoute(page, { groupBy, sourcesById });
  await runShortlistSearch(page, "a query with only repository matches");
  await page.waitForFunction(() => {
    const status = document.getElementById("status");
    return status && /none passed the journal-type and ISSN checks/i.test(status.textContent || "");
  }, { timeout: 10000 });
  check(true, "'none passed the checks' empty state renders when only excluded sources match");
  check(await page.locator("#out").isHidden(), "results panel stays hidden when nothing passes the checks");
  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await testRepositoryAndIssnExclusion(browser);
  await testSamplePapersToggle(browser);
  await testApiFailureState(browser);
  await testNonePassedState(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} Journal Finder fixture check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll Journal Finder fixture checks passed.");
}
