// Full tier. Proves the web part loader end to end without a tenant: a
// fake page with the snippet, served over http together with the player,
// the loader and a content file. What SharePoint would supply (the page
// item's columns) is absent, so the loader falls back to the host's data-*
// defaults; that path is the one a freshly pasted snippet takes.
//   NODE_PATH=$(npm root -g) node tests/loader.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { readFileSync, mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('playwright not resolvable. Run with NODE_PATH=$(npm root -g).'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const player = process.env.APP || 'fraud-decision-support-bmo.html';
const t0 = Date.now();

// Fixture: the served folder, as the library folder would be.
const dir = mkdtempSync(join(tmpdir(), 'fraud-guide-'));
copyFileSync(join(app, 'boot-fraud-guide.js'), join(dir, 'boot-fraud-guide.js'));
copyFileSync(join(app, player), join(dir, player));
const inline = JSON.parse(readFileSync(join(app, player), 'utf8').match(/<script type="application\/json" id="flow-data">([\s\S]*?)<\/script>/)[1]);
inline.meta.contentVersion += ' (served)';
writeFileSync(join(dir, 'content.json'), JSON.stringify(inline));
writeFileSync(join(dir, 'page.html'), `<!doctype html><html><body><h1>Fake page</h1>
<div data-fraud-guide data-script="${player}" data-config="content.json" data-version="9.9" data-fullpage="none"></div>
<script src="boot-fraud-guide.js"></script></body></html>`);
writeFileSync(join(dir, 'edit.html'), `<!doctype html><html><body class="editmode">
<div data-fraud-guide data-script="${player}"></div><script src="boot-fraud-guide.js"></script></body></html>`);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
  try {
    const body = readFileSync(join(dir, name));
    res.writeHead(200, { 'content-type': types[extname(name)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const launch = { headless: true };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
const ok = (name) => console.log(`  ✓ ${name}`);

await page.goto(`${base}/page.html`, { waitUntil: 'domcontentloaded' });
const frame = await page.waitForSelector('iframe[data-role="fraud-guide-frame"]', { state: 'attached' });
const src = await frame.getAttribute('src');
assert.match(src, new RegExp(`${player.replace('.', '\\.')}\\?content=.*content\\.json&v=9\\.9&status=draft`));
ok('no page columns: the loader mounts a frame from the snippet defaults, with content, version and status on the URL');

const inner = page.frames().find((f) => f.url().includes(player));
await inner.waitForSelector('[data-role="question-card"]');
assert.match(await inner.evaluate(() => window.__frd.flow.meta.contentVersion), /\(served\)$/);
ok('the player boots from ?content=, not from its inline block');

await page.waitForFunction(() => Number(document.querySelector('iframe[data-role="fraud-guide-frame"]').getAttribute('data-content-height')) > 0);
assert.ok(parseInt(await page.evaluate(() => document.querySelector('iframe[data-role="fraud-guide-frame"]').style.height), 10) >= 480);
ok('the player reports its height and the loader sizes the frame');

assert.equal(await page.evaluate(() => document.querySelector('[data-fraud-guide]').getAttribute('data-fraud-guide-mounted')), 'fraud-guide');
await page.evaluate(() => window.fraudGuideBoot.mountAll());
assert.equal(await page.locator('iframe[data-role="fraud-guide-frame"]').count(), 1);
ok('mounting again is a no-op: the guard holds');

await page.goto(`${base}/edit.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-fraud-guide] p[role="status"]');
assert.equal(await page.locator('iframe').count(), 0);
ok('edit mode: a placeholder, no player');

assert.deepEqual(errors, [], 'no console errors beyond the expected 404 for the page item');
await browser.close();
server.close();
console.log(`loader test passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
