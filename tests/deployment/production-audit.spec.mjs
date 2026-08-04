import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const releasePath = path.resolve('_site/release.json');
assert.ok(fs.existsSync(releasePath), 'the generated site must expose release.json');
const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
assert.equal(release.schemaVersion, 1, 'release manifest schema must remain governed');
assert.equal(release.site, 'https://gurjas.org/', 'release manifest must identify the canonical site');
assert.match(release.sourceCommit, /^[0-9a-f]{40}$/, 'release manifest must expose a full source commit');
assert.ok(release.sourceDate, 'release manifest must expose the source commit date');
assert.equal(release.navigationVersion, 2, 'release manifest must bind the governed navigation version');

const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
assert.match(pagesWorkflow, /scripts\/verify_production\.py/, 'Pages deployment must run the reusable production verifier');
assert.match(pagesWorkflow, /EXPECTED_SHA:\s*\$\{\{ github\.sha \}\}/, 'Pages verification must bind the exact workflow commit');
assert.match(pagesWorkflow, /production-audit\.json/, 'Pages verification must retain a machine-readable report');

const scheduledWorkflow = fs.readFileSync('.github/workflows/production-audit.yml', 'utf8');
assert.match(scheduledWorkflow, /schedule:/, 'production drift detection must run on a schedule');
assert.match(scheduledWorkflow, /https:\/\/gurjas\.org\//, 'scheduled audit must inspect the canonical production domain');
assert.match(scheduledWorkflow, /scripts\/verify_production\.py/, 'scheduled audit must use the same verifier as deployment');

const port = 48000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}/`;
const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', '_site'], {
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The local server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('local production-audit fixture server did not start');
}

const reportPath = path.join(os.tmpdir(), `gurjas-production-audit-${process.pid}.json`);
const mismatchReportPath = path.join(os.tmpdir(), `gurjas-production-audit-mismatch-${process.pid}.json`);

try {
  await waitForServer();
  const passed = spawnSync(
    'python',
    [
      'scripts/verify_production.py',
      '--base-url', baseUrl,
      '--expected-sha', release.sourceCommit,
      '--attempts', '1',
      '--delay', '0',
      '--timeout', '5',
      '--report', reportPath,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(passed.status, 0, `local production audit must pass:\n${passed.stdout}\n${passed.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.status, 'passed', 'successful audit report must be explicit');
  assert.equal(report.expectedCommit, release.sourceCommit, 'audit must preserve the exact expected commit');
  assert.equal(report.actualCommit, release.sourceCommit, 'audit must report the exact deployed commit');

  const mismatched = spawnSync(
    'python',
    [
      'scripts/verify_production.py',
      '--base-url', baseUrl,
      '--expected-sha', '0000000000000000000000000000000000000000',
      '--attempts', '1',
      '--delay', '0',
      '--timeout', '5',
      '--report', mismatchReportPath,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(mismatched.status, 1, 'a stale or wrong deployed commit must fail closed');
  const mismatch = JSON.parse(fs.readFileSync(mismatchReportPath, 'utf8'));
  assert.equal(mismatch.status, 'failed', 'mismatch report must be explicit');
  assert.equal(mismatch.actualCommit, release.sourceCommit, 'mismatch report must expose the deployed commit for diagnosis');
} finally {
  server.kill('SIGTERM');
  for (const file of [reportPath, mismatchReportPath]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

console.log(`Production provenance and drift detection passed for ${release.sourceCommit}.`);
