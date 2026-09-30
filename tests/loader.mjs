// Full tier. Proves the web part loader end to end without a tenant: a
// fake page with the snippet, served over http together with the player,
// the loader and a content file. The server behaves as a SharePoint library
// does where it matters: .html is sent as a download, and pages carry a CSP
// with no 'unsafe-inline'. The takeover page's CSP allows only 'self' and a
// nonce (no eval), so the nonce path is proven on its own; the in-flow page's
// allows eval and has no nonce, which proves the fallback. What SharePoint would
// supply (the page item's columns) is absent, so the loader falls back to
// the host's data-* defaults; that path is the one a freshly pasted snippet
// takes.
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
const host = (fullpage) => `<div data-fraud-guide data-script="${player}" data-config="content.json" data-version="9.9" data-fullpage="${fullpage}"></div>`;
const NONCE = 't3stn0nce';
const shell = (body, cls = '', nonce = '') => `<!doctype html><html><body class="${cls}"><header data-role="sp-chrome"><h1>Fake page</h1><a href="#">Site nav</a></header>
${nonce ? `<script nonce="${nonce}">window.__hostScriptRan = true;</script>` : ''}
${body}
<script src="boot-fraud-guide.js"></script></body></html>`;
writeFileSync(join(dir, 'page.html'), shell(host('takeover'), '', NONCE));
writeFileSync(join(dir, 'inflow.html'), shell(host('none')));
writeFileSync(join(dir, 'edit.html'), shell(`<div data-fraud-guide data-script="${player}"></div>`, 'editmode'));

// As SharePoint: .html from the library is an attachment the browser will
// not render; pages carry a CSP with no 'unsafe-inline'.
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const pages = new Set(['page.html', 'inflow.html', 'edit.html']);
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
  try {
    const body = readFileSync(join(dir, name));
    const headers = { 'content-type': types[extname(name)] || 'application/octet-stream' };
    if (name === 'page.html') headers['content-security-policy'] = `script-src 'self' 'nonce-${NONCE}'`;
    else if (pages.has(name)) headers['content-security-policy'] = "script-src 'self' 'unsafe-eval'";
    else if (extname(name) === '.html') Object.assign(headers, { 'content-disposition': `attachment; filename="${name}"`, 'x-download-options': 'noopen' });
    res.writeHead(200, headers);
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

const frameSel = 'iframe[data-role="fraud-guide-frame"]';
await page.goto(`${base}/page.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-fraud-guide][data-state="ready"]', { state: 'attached' });
const mounted = await page.evaluate((sel) => {
  const f = document.querySelector(sel);
  const h = document.querySelector('[data-fraud-guide]');
  return { src: f.getAttribute('src'), srcdoc: !!f.getAttribute('srcdoc'), binding: h.dataset.bindingSource, source: h.dataset.contentSource, scripts: h.dataset.scripts };
}, frameSel);
assert.equal(mounted.src, null);
assert.ok(mounted.srcdoc);
assert.equal(mounted.binding, 'defaults');
assert.equal(mounted.source, 'config');
ok('no page columns: the loader mounts from the snippet defaults, fetching the player as text into a srcdoc frame (a library serves .html as a download)');

const inner = page.frames().find((f) => f !== page.mainFrame());
await inner.waitForSelector('[data-role="question-card"]');
assert.match(await inner.evaluate(() => window.__frd.flow.meta.contentVersion), /\(served\)$/);
assert.equal(mounted.scripts, 'nonce');
ok('nonce path: under a CSP with a nonce and no eval, the player runs with the host nonce and boots from the bound content, not its inline block');

const cover = await page.evaluate((sel) => {
  const layer = document.querySelector('[data-role="fraud-guide-layer"]');
  const r = document.querySelector(sel).getBoundingClientRect();
  const top = document.elementFromPoint(640, 20);
  return {
    parent: !!layer && layer.parentNode === document.body, box: [r.left, r.top, r.width, r.height],
    covered: !!top && top.getAttribute('data-role') === 'fraud-guide-frame',
    inert: document.querySelector('[data-role="sp-chrome"]').closest('[inert]') !== null,
    overflow: document.documentElement.style.overflow,
  };
}, frameSel);
assert.ok(cover.parent, 'the layer is a child of <body>');
assert.deepEqual(cover.box, [0, 0, 1280, 900]);
assert.ok(cover.covered, 'the frame is on top at the header');
assert.ok(cover.inert, 'the page behind is inert');
assert.equal(cover.overflow, 'hidden');
ok('takeover: the frame covers the whole window, the page behind is inert and does not scroll');

assert.equal(await page.evaluate(() => document.querySelector('[data-fraud-guide]').getAttribute('data-fraud-guide-mounted')), 'fraud-guide');
await page.evaluate(() => window.fraudGuideBoot.mountAll());
assert.equal(await page.locator(frameSel).count(), 1);
await page.addScriptTag({ url: `${base}/boot-fraud-guide.js` });
assert.equal(await page.locator(frameSel).count(), 1);
assert.equal(await page.locator('[data-role="fraud-guide-layer"]').count(), 1);
assert.equal(await page.locator('[data-role="fraud-guide-curtain"]').count(), 0);
ok('mounting again is a no-op, and a second evaluation of the loader (a web part re-render) adds nothing');

// An App page enters edit mode with no reload and no URL change; its
// property pane is the signal. Leaving edit mode brings the guide back.
await page.evaluate(() => { const d = document.createElement('div'); d.id = 'fake-pane'; d.setAttribute('data-automation-id', 'showPane'); document.body.appendChild(d); });
await page.waitForSelector('[data-fraud-guide] p[role="status"]');
assert.equal(await page.locator('[data-role="fraud-guide-layer"]').count(), 0);
assert.equal(await page.locator(frameSel).count(), 0);
assert.equal(await page.locator('[inert]').count(), 0);
await page.evaluate(() => document.getElementById('fake-pane').remove());
await page.waitForSelector(`[data-role="fraud-guide-layer"] ${frameSel}`, { state: 'attached' });
await page.waitForFunction((sel) => { const f = document.querySelector(sel); return f && f.contentWindow && typeof f.contentWindow.__fraudGuideStart === 'function'; }, frameSel);
ok("edit mode entered without a reload (an App page's property pane): the takeover lets go and a placeholder shows; leaving it brings the guide back");

await page.evaluate(() => document.querySelector('[data-fraud-guide]').remove());
await page.waitForFunction(() => !document.querySelector('[data-role="fraud-guide-layer"]') && !document.querySelector('[inert]'));
ok('SPA navigation away (host removed): the layer goes and the page is live again');

await page.goto(`${base}/inflow.html?fullpage=none`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-fraud-guide][data-state="ready"]', { state: 'attached' });
await page.waitForFunction((sel) => Number(document.querySelector(sel).getAttribute('data-content-height')) > 0, frameSel);
assert.equal(await page.locator('[data-role="fraud-guide-layer"]').count(), 0);
assert.ok(parseInt(await page.evaluate((sel) => document.querySelector(sel).style.height, frameSel), 10) >= 480);
assert.equal(await page.evaluate(() => document.querySelector('[data-fraud-guide]').dataset.scripts), 'eval');
ok("eval fallback and fullpage none: with no nonce on the page the player runs by eval, the frame stays in the page flow and the player's reported height sizes it");

await page.goto(`${base}/edit.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-fraud-guide] p[role="status"]');
assert.equal(await page.locator('iframe').count(), 0);
assert.equal(await page.locator('[data-role="fraud-guide-layer"]').count(), 0);
ok('edit mode: a placeholder, no player, no takeover');

assert.deepEqual(errors, [], 'no console errors beyond the expected 404 for the page item');
await browser.close();
server.close();
console.log(`loader test passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
