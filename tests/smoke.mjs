// Full tier. Opens the file from a file:// URL in Chromium and drives every
// interaction the demo depends on. Needs Playwright resolvable by `require`:
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
const here_ = async () => { const s = await state(); return s.path[s.cursor].nodeId; };
const answer = (i) => page.click(`[data-role="answer"][data-index="${i}"]`);
const ok = (name) => console.log(`  ✓ ${name}`);

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-role="question-card"]');
assert.match(await page.textContent('[data-role="placeholder-banner"]'), /not bank policy/i);
assert.equal(await here_(), 'verify-open');
assert.equal(await page.getAttribute('[data-role="stage"][data-stage-id="verify"]', 'data-state'), 'current');
ok('boots from file:// with the banner, the first question and stage 1 marked current');

// 1. Full path to an end-of-call card.
const route = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
for (const i of route) await answer(i);
assert.equal(await here_(), 'resolve-closed');
await page.waitForSelector('[data-role="end-card"]');
assert.equal((await state()).path.length, route.length + 1);
assert.equal(await page.locator('[data-role="step"][data-state="past"]').count(), route.length);
assert.equal(await page.getAttribute('[data-role="stage"][data-stage-id="verify"]', 'data-state'), 'done');
assert.equal(await page.getAttribute('[data-role="stage"][data-stage-id="act"]', 'data-state'), 'current');
ok('full path: 13 answers reach an end-of-call card; past steps and done stages render as such');

// 2. Jump within a stage from the stage track.
await page.click('[data-role="new-call"]');
assert.equal(await here_(), 'verify-open');
await page.click('[data-role="stage-button"][data-stage-id="verify"]');
await page.waitForSelector('[data-role="stage-questions"]');
await page.click('[data-role="stage-question"][data-node-id="verify-coached"]');
assert.equal(await here_(), 'verify-coached');
assert.equal(await page.getAttribute('[data-role="risk-line"]', 'data-risk'), 'critical');
let s = await state();
assert.equal(s.path[0].status, 'moved-on');
assert.equal(s.path[1].arrivedVia, 'jumped');
assert.match(await page.textContent('[data-role="step"][data-state="past"]'), /Moved on without answering/);
ok('jump: the stage track opens the stage\'s questions; jumping keeps the earlier step and notes it');

// 3. Back, then a changed answer: later steps kept as stale, with undo.
await page.click('[data-role="new-call"]');
for (const i of [0, 0, 1]) await answer(i); // -> triage-present
await page.click('[data-role="step-summary"][data-index="1"]');
assert.equal(await here_(), 'triage-open');
assert.equal(await page.locator('[data-role="step"][data-state="ahead"]').count(), 2);
assert.equal(await page.locator('[data-role="answer"][data-previous="true"]').count(), 1);
await page.waitForSelector('[data-role="revisit-line"]');
await answer(0); // same answer walks forward
assert.equal(await here_(), 'triage-ongoing');
assert.equal((await state()).stale, null);
await page.click('[data-role="back"]'); // Back button on the card
assert.equal(await here_(), 'triage-open');
await answer(1); // different answer
assert.equal(await here_(), 'triage-lost');
assert.match(await page.textContent('[data-role="stale-notice"]'), /2 later steps no longer apply/);
assert.equal(await page.locator('[data-role="step"][data-state="stale"] [data-role="step-summary"]').count(), 2);
await page.click('[data-role="stale-undo"]');
s = await state();
assert.equal(s.stale, null);
assert.equal(s.path.length, 4);
assert.equal(s.cursor, 1);
assert.equal(await page.locator('[data-role="stale-notice"]').count(), 0);
ok('back: same answer carries on; changed answer keeps 2 later steps struck through with a notice; undo restores');

// 4. The two other ways out of a question.
await page.click('[data-role="new-call"]');
await page.click('[data-role="later"]');
s = await state();
assert.equal(s.path[0].status, 'later');
assert.equal(await here_(), 'triage-open');
assert.match(await page.textContent('[data-role="step"][data-state="past"]'), /Skipped for now/);
await page.click('[data-role="none-of-these"]');
assert.equal(await here_(), 'triage-reanchor');
assert.equal(await page.locator('[data-role="none-of-these"]').count(), 0, 'no none-of-these on the none-of-these question');
await page.click('[data-role="step-summary"][data-index="0"]');
await answer(0); // answering the skipped question later marks it resolved and drops the later steps as stale
s = await state();
assert.equal(s.path[0].status, 'answered');
assert.equal(s.stale.steps.length, 2);
ok('other ways out: "come back later" skips on and is noted; "none of these fit" lands on the stage\'s catch-all question');

// 5. Find a question.
await page.click('[data-role="new-call"]');
await page.fill('[data-role="search-input"]', 'elder');
await page.waitForSelector('[data-role="search-result"]');
await page.press('[data-role="search-input"]', 'Enter');
assert.equal(await here_(), 'risk-elder');
assert.equal(await page.getAttribute('[data-role="stage"][data-stage-id="risk"]', 'data-state'), 'current');
assert.match(await page.textContent('[data-role="question-card"]'), /Jumped here from a search/);
ok('find: typing "elder" and Enter lands on the elder-exploitation question; the track follows');

// 6. Coaching notes and number keys.
await page.click('[data-role="coaching-toggle"]');
await page.waitForSelector('[data-role="coaching"]');
assert.match(await page.textContent('[data-role="coaching"]'), /Why this matters/);
await page.click('[data-role="coaching-toggle"]');
assert.equal(await page.locator('[data-role="coaching"]').count(), 0);
await page.click('[data-role="new-call"]');
await page.keyboard.press('2');
assert.equal(await here_(), 'verify-partial');
ok('coaching notes toggle on and off; number key 2 picks the second answer');

// 7. Guidance panel shows the grouped content for the current question.
const guide = await page.textContent('[data-role="guide"]');
assert.match(guide, /Say or ask/);
assert.match(guide, /Watch for/);
assert.match(guide, /Resources/);
assert.equal(await page.locator('[data-role="guide-item"]').count(), 3);
ok('guidance: the right-hand panel groups the current question\'s content by kind');

// 8. Feedback, visible behind the scenes with the event log.
await page.click('[data-role="feedback-link"]');
await page.check('[data-role="feedback-form"] input[value="missing"]');
await page.fill('[data-role="feedback-form"] textarea', 'Needs the one-time-code troubleshooting link');
await page.click('[data-role="feedback-form"] button[type="submit"]');
await page.click('[data-role="debug-toggle"]');
await page.waitForSelector('[data-role="feedback-list"] li');
assert.match(await page.textContent('[data-role="feedback-list"]'), /Partial verification[\s\S]*Missing a resource[\s\S]*one-time-code/);
const logText = await page.textContent('[data-role="event-log"]');
for (const ev of ['jump', 'back', 'stale', 'undo', 'later', 'none-of-these', 'feedback', 'coaching', 'new-call']) assert.match(logText, new RegExp(ev));
assert.match(await page.textContent('[data-role="state-json"]'), /"cursor"/);
ok('feedback lands behind the scenes, with a log that records every kind of move');

// Typography floor and layout sanity.
const tooSmall = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('#app *').forEach((el) => {
    if (!el.textContent.trim() || el.children.length) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 14) bad.push(`${el.tagName}.${el.className} ${fs}px`);
  });
  return bad;
});
assert.deepEqual(tooSmall, [], 'text below 14px');
await page.setViewportSize({ width: 900, height: 900 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.ok(overflow <= 0, `horizontal overflow at 900px: ${overflow}px`);
ok('no text under 14px; no horizontal overflow at 900px');

assert.deepEqual(errors, [], 'no console errors');
await browser.close();
console.log(`smoke passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
