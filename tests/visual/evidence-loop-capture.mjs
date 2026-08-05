import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const baseUrl = process.env.CANDIDATE_URL ?? "http://127.0.0.1:8000/";
const outputDirectory = process.env.REVIEW_OUTPUT_DIR ?? "visual-review";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const blockingImpacts = new Set(["serious", "critical"]);
const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

const workflows = [
  {
    id: "research-design-selector",
    output: "#design-output",
    download: "#design-download",
    async complete(page) {
      await page.selectOption('[name="objective"]', "estimate-effect");
      await page.selectOption('[name="time_structure"]', "panel");
      await page.selectOption('[name="assignment"]', "non-random");
      await page.selectOption('[name="evidence_state"]', "piloted-measures");
      await page.check('[name="intervention"]');
      await page.check('[name="feasible_follow_up"]');
      await page.check('[name="comparison_group"]');
      await page.check('[name="sensitive_decision"]');
      await page.fill('[name="constraints"]', "Restricted sampling frame; independent methodological review required.");
      await page.click('#design-form button[type="submit"]');
    },
  },
  {
    id: "journal-evaluation-workflow",
    output: "#journal-output",
    download: "#journal-download",
    async complete(page) {
      await page.selectOption('[name="identity"]', "inconsistent");
      await page.selectOption('[name="indexing"]', "unavailable");
      await page.selectOption('[name="editorial"]', "not-checked");
      await page.selectOption('[name="policies"]', "inconsistent");
      await page.selectOption('[name="payment"]', "urgent-request");
      await page.check('[name="website_matches_registry"][value="false"]');
      await page.check('[name="contact_domain_matches"][value="false"]');
      await page.check('[name="reputational_decision"]');
      await page.click('#journal-form button[type="submit"]');
    },
  },
  {
    id: "evidence-pathway-navigator",
    output: "#pathway-output",
    download: "#pathway-download",
    async complete(page) {
      await page.selectOption('[name="request_type"]', "compliance-support");
      await page.selectOption('[name="evidence_state"]', "partial");
      await page.selectOption('[name="ownership"]', "unclear");
      await page.selectOption('[name="sensitivity"]', "restricted");
      await page.fill('[name="requested_output"]', "Governed evidence-gap memo for authorised review");
      await page.check('[name="decision_due"]');
      await page.check('[name="compliance_determination"]');
      await page.fill('[name="notes"]', "Records are distributed across units; authority must be documented before access.");
      await page.click('#pathway-form button[type="submit"]');
    },
  },
];

async function dismissConsent(page) {
  const decline = page.locator('[data-consent="denied"]');
  const appeared = await decline.waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false);
  if (appeared) await decline.click();
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    dimensions.documentWidth <= dimensions.viewportWidth + 1,
    `${label} must not create horizontal overflow (${dimensions.documentWidth}px > ${dimensions.viewportWidth}px)`,
  );
}

async function assertAccessible(page, label) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"],
      },
      resultTypes: ["violations"],
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
    }));
  });
  const blocking = violations.filter((violation) => blockingImpacts.has(violation.impact));
  assert.deepEqual(blocking, [], `${label} must have no serious or critical axe violations`);
}

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
      acceptDownloads: true,
    });

    const referencePage = await context.newPage();
    const referenceResponse = await referencePage.goto(new URL("/tools/reference-integrity-checker/", baseUrl), { waitUntil: "networkidle" });
    assert.equal(referenceResponse?.status(), 200, `${viewport.name} reference checker must load`);
    await dismissConsent(referencePage);
    const panel = referencePage.locator(".tool-evidence-loop");
    await panel.scrollIntoViewIfNeeded();
    assert.equal(await panel.count(), 1, `${viewport.name} must expose one evidence loop`);
    assert.equal(await panel.locator(".tool-evidence-loop__card").count(), 2, `${viewport.name} must expose two registered evidence cards`);
    await assertNoOverflow(referencePage, `${viewport.name} reference checker`);
    await referencePage.screenshot({
      path: `${outputDirectory}/${viewport.name}--reference-integrity-evidence-loop.png`,
      fullPage: true,
    });
    await referencePage.close();

    for (const workflow of workflows) {
      const page = await context.newPage();
      const route = new URL(`/tools/${workflow.id}/`, baseUrl);
      const response = await page.goto(route, { waitUntil: "networkidle" });
      assert.equal(response?.status(), 200, `${viewport.name} ${workflow.id} must load`);
      await dismissConsent(page);
      await page.evaluate(() => document.fonts.ready);
      await assertNoOverflow(page, `${viewport.name} ${workflow.id} initial`);
      await assertAccessible(page, `${viewport.name} ${workflow.id} initial`);
      await page.screenshot({
        path: `${outputDirectory}/${viewport.name}--${workflow.id}--initial.png`,
        fullPage: true,
      });

      await workflow.complete(page);
      const output = page.locator(workflow.output);
      await output.waitFor({ state: "visible" });
      await page.waitForTimeout(100);
      assert.equal(await output.locator(".decision-tool__record > h2").textContent(), "Decision record");
      assert.ok((await output.locator("pre").count()) >= 11, `${workflow.id} must render the governed record fields`);
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("decision-tool__output")), true, `${workflow.id} must focus the generated result`);
      await assertNoOverflow(page, `${viewport.name} ${workflow.id} result`);
      await assertAccessible(page, `${viewport.name} ${workflow.id} result`);

      const downloadPromise = page.waitForEvent("download");
      await page.click(workflow.download);
      const download = await downloadPromise;
      assert.match(download.suggestedFilename(), new RegExp(`^${workflow.id}-decision-record-\\d{4}-\\d{2}-\\d{2}\\.json$`));

      await page.screenshot({
        path: `${outputDirectory}/${viewport.name}--${workflow.id}--result.png`,
        fullPage: true,
      });
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log("Decision-workflow initial/result states and the reference evidence loop passed responsive, export and blocking accessibility review.");
