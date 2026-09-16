// Full tier. Opens the file from a file:// URL in Chromium and drives the
// eight must-work interactions. Needs Playwright resolvable by `require`:
//   NODE_PATH=$(npm root -g) node tests/smoke.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('playwright not resolvable. Run with NODE_PATH=$(npm root -g).'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, '..', 'app', 'fraud-decision-support.html')).href;
const t0 = Date.now();
const launch = { headless: true };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const state = () => page.evaluate(() => window.__frd.getState());
const currentNodeId = async () => (await state()).path[(await state()).cursor].nodeId;
const answer = async (i) => { await page.click(`[data-role="answer-button"][data-index="${i}"]`); };
const step = (name) => console.log(`  ✓ ${name}`);

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-role="node-card"]');
assert.match(await page.textContent('[data-role="placeholder-banner"]'), /not bank policy/i);
assert.equal(await currentNodeId(), 'verify-open');
step('boots from file:// with the placeholder banner and the start node');

// 1. Full path to a resolution node.
const route = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
for (const i of route) await answer(i);
assert.equal(await currentNodeId(), 'resolve-closed');
await page.waitForSelector('[data-role="terminal"]');
let s = await state();
assert.equal(s.context.verified, 'yes');
assert.equal(s.context.channel, 'card-not-present');
assert.equal(s.path.length, route.length + 1);
step('full path: 13 answers reach a resolution node, context captured on the way');

// 7. Call note.
await page.click('[data-role="note-button"]');
const note = await page.inputValue('[data-role="note-text"]');
assert.match(note, /PLACEHOLDER CONTENT/);
assert.match(note, /PATH TAKEN\n1\. \[Greeting & verification\] Identity check -> Passed in full/);
assert.match(note, /14\. \[Actions & close\] Resolved — closed -> END/);
assert.match(note, /Channel: card-not-present/);
await page.click('[data-role="note-copy"]');
await page.waitForSelector('[data-role="note-copy"]:has-text("Copied")');
step('call note lists the path and captured facts; copy button reports done');

// 2. Lateral jump.
await page.click('[data-role="reset-button"]');
assert.equal(await currentNodeId(), 'verify-open');
await page.click('[data-role="lateral-button"]');
await page.click('[data-role="lateral-item"][data-node-id="verify-coached"]');
assert.equal(await currentNodeId(), 'verify-coached');
assert.equal(await page.getAttribute('[data-role="risk-banner"]', 'data-risk'), 'critical');
assert.equal(await page.locator('[data-role="breadcrumb-chip"][data-arrived="lateral"]').count(), 1);
s = await state();
assert.equal(s.path[0].status, 'skipped');
step('lateral jump: reaches a sibling node without unwinding; chip marked "jumped"');

// 3. Rewind with a changed answer, stale steps, undo.
await page.click('[data-role="reset-button"]');
for (const i of [0, 0, 1]) await answer(i); // verify-open -> triage-open -> triage-ongoing -> triage-present
assert.equal(await currentNodeId(), 'triage-present');
await page.click('[data-role="breadcrumb-chip"][data-index="1"]');
assert.equal(await currentNodeId(), 'triage-open');
assert.equal(await page.locator('[data-role="breadcrumb-chip"][data-state="ahead"]').count(), 2);
assert.equal(await page.locator('[data-role="answer-button"][data-previous="true"]').count(), 1);
await answer(0); // same answer: walk forward, nothing invalidated
assert.equal(await currentNodeId(), 'triage-ongoing');
assert.equal((await state()).stale, null);
await page.click('[data-role="breadcrumb-chip"][data-index="1"]');
await answer(1); // different answer: downstream goes stale
assert.equal(await currentNodeId(), 'triage-lost');
const notice = await page.textContent('[data-role="stale-notice"]');
assert.match(notice, /2 later steps no longer apply/);
assert.equal(await page.locator('[data-role="breadcrumb-chip"][data-state="stale"]').count(), 2);
assert.equal((await state()).context.cardInPossession, 'no');
await page.click('[data-role="stale-undo"]');
s = await state();
assert.equal(s.stale, null);
assert.equal(s.path.length, 4);
assert.equal(s.cursor, 1);
assert.equal(s.context.cardInPossession, undefined);
assert.equal(await page.locator('[data-role="stale-notice"]').count(), 0);
step('rewind: same answer walks forward; changed answer marks 2 stale steps with notice; undo restores path and context');

// 4. No dead ends: park, not-applicable, off-script.
await page.click('[data-role="reset-button"]');
await page.click('[data-role="exit-park"]');
s = await state();
assert.equal(s.path[0].status, 'unresolved');
assert.deepEqual(s.unresolved, ['verify-open']);
assert.equal(await currentNodeId(), 'triage-open');
await page.waitForSelector('[data-role="unresolved-chip"]');
await page.click('[data-role="exit-offscript"]');
assert.equal(await currentNodeId(), 'triage-reanchor');
assert.equal(await page.locator('[data-role="exit-offscript"]').count(), 0, 'no off-script exit on the off-script node');
await page.click('[data-role="exit-na"]');
assert.equal(await currentNodeId(), 'scope-open');
await page.click('[data-role="unresolved-chip"]');
assert.equal(await currentNodeId(), 'verify-open');
await answer(0);
s = await state();
assert.deepEqual(s.unresolved, []);
assert.equal(s.path[0].status, 'resolved-later');
step('no dead ends: park -> unresolved tray, off-script -> re-anchor node, n/a -> next stage, return resolves the parked node');

// 5. Keyword jump.
await page.click('[data-role="reset-button"]');
await page.fill('[data-role="search-input"]', 'elder');
await page.waitForSelector('[data-role="search-result"]');
await page.press('[data-role="search-input"]', 'Enter');
assert.equal(await currentNodeId(), 'risk-elder');
assert.equal(await page.locator('[data-role="breadcrumb-chip"][data-arrived="search"]').count(), 1);
step('keyword jump: typing "elder" and Enter lands on the elder-exploitation node');

// 6. Mode toggle and number keys.
await page.click('[data-role="mode-toggle"] [data-mode="training"]');
await page.waitForSelector('[data-role="training-block"]');
assert.match(await page.textContent('[data-role="training-block"]'), /Why this matters/);
await page.click('[data-role="mode-toggle"] [data-mode="live"]');
assert.equal(await page.locator('[data-role="training-block"]').count(), 0);
await page.click('[data-role="reset-button"]');
await page.keyboard.press('2');
assert.equal(await currentNodeId(), 'verify-partial');
step('mode toggle: training adds why/dialogue; live mode number key 2 picks the second answer');

// 8. Flag this node, visible on the debug screen with the event log.
await page.click('[data-role="flag-button"]');
await page.check('[data-role="flag-form"] input[value="missing"]');
await page.fill('[data-role="flag-form"] textarea', 'Needs the OTP troubleshooting link');
await page.click('[data-role="flag-form"] button[type="submit"]');
await page.click('[data-role="debug-button"]');
await page.waitForSelector('[data-role="flag-list"] li');
assert.match(await page.textContent('[data-role="flag-list"]'), /Missing a resource[\s\S]*Partial verification[\s\S]*OTP troubleshooting/);
const logText = await page.textContent('[data-role="event-log"]');
for (const ev of ['lateral', 'rewind', 'stale', 'undo', 'park', 'search-jump', 'flag', 'mode']) assert.match(logText, new RegExp(ev));
assert.match(await page.textContent('[data-role="state-json"]'), /"cursor"/);
step('flag form appends to the list; debug screen shows flags, state JSON and a log with every event kind');

// Layout sanity at the 900px degrade point.
await page.setViewportSize({ width: 900, height: 900 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.ok(overflow <= 0, `horizontal overflow at 900px: ${overflow}px`);
step('no horizontal overflow at 900px');

assert.deepEqual(errors, [], 'no console errors');
await browser.close();
console.log(`smoke passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
