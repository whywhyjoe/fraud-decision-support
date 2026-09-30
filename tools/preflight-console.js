/* Fraud call guide — preflight for a SharePoint page. Reads only; changes nothing.
 *
 * Open the guide's page in view mode, open the browser console (F12), paste
 * this whole file, press Enter. It prints a JSON report and copies it to the
 * clipboard, for JSFiddle or chat. "verdict" is the one line to read first.
 *
 * It answers what a tenant can differ on: whether the page's script policy
 * lets the player run (a nonce, or 'unsafe-eval' as the fallback), whether
 * the loader and player are reachable from this page, whether the page's
 * binding columns exist, and what the loader itself reported.
 */
(async function () {
  var out = { at: new Date().toISOString(), page: location.pathname + location.search, checks: {} };
  var put = function (k, v) { out.checks[k] = v; };
  var J = { credentials: 'same-origin', cache: 'no-store' };

  /* 1. Script policy of this page. */
  try {
    var r = await fetch(location.href, J);
    var csp = r.headers.get('content-security-policy') || '';
    var src = (csp.match(/script-src[^;]*/) || [''])[0];
    put('policy', {
      present: !!csp,
      nonce: /'nonce-/.test(src),
      unsafeEval: /'unsafe-eval'/.test(src),
      unsafeInline: /'unsafe-inline'/.test(src),
      nonceOnPage: !!((document.querySelector('script[nonce]') || document.querySelector('style[nonce]') || {}).nonce)
    });
  } catch (e) { put('policy', 'could not read: ' + e.message); }

  /* 2. What the loader reported. */
  var host = document.querySelector('[data-fraud-guide]');
  var d = host ? host.dataset : {};
  put('host', host ? {
    state: d.state || '(not ready)', scripts: d.scripts || null, binding: d.bindingSource || null,
    contentSource: d.contentSource || null, contentVersion: d.contentVersion || null,
    fullpage: d.fullpageActive || 'none', mounted: host.getAttribute('data-fraud-guide-mounted'),
    note: (host.innerText || '').slice(0, 120) || null,
    defaults: { script: d.script || null, config: d.config || null, fullpage: d.fullpage || null }
  } : null);
  put('loader', window.fraudGuideBoot ? { version: window.fraudGuideBoot.version, editMode: window.fraudGuideBoot.isEditMode() } : null);

  /* 3. The files, from where this page actually fetched the loader. */
  var seen = performance.getEntriesByType('resource').map(function (e) { return e.name; });
  var loaderUrl = seen.filter(function (n) { return /\/boot-fraud-guide\.js(\?|$)/.test(n); })[0] || null;
  var entryUrl = seen.filter(function (n) { return /\/fraud-guide\.webpart\.html(\?|$)/.test(n); })[0] || null;
  put('fetched', { entry: entryUrl, loader: loaderUrl });
  if (loaderUrl) {
    var folder = loaderUrl.split('?')[0].replace(/\/[^\/]*$/, '/');
    var names = ['boot-fraud-guide.js', 'fraud-guide.webpart.html'];
    if (d.script && !/^(https?:)?\//.test(d.script)) names.push(d.script);
    if (d.config && !/^(https?:)?\//.test(d.config)) names.push(d.config);
    var files = {};
    for (var i = 0; i < names.length; i++) {
      try {
        var f = await fetch(folder + names[i], J);
        files[names[i]] = f.status + (f.ok ? ' ' + (await f.blob()).size + ' bytes' : '');
      } catch (e) { files[names[i]] = 'error: ' + e.message; }
    }
    put('files', { folder: folder, status: files });
  }

  /* 4. The page's binding columns (optional: missing ones mean the defaults are used). */
  try {
    var web = location.origin + ((location.pathname.match(/^\/(sites|teams)\/[^\/]+/i) || [''])[0]);
    var path = decodeURIComponent(location.pathname).replace(/'/g, "''");
    var c = await fetch(web + "/_api/web/getFileByServerRelativeUrl('" + path + "')/ListItemAllFields?$select=ItemType,Script,Config,Ver,AppName,Value1",
      { credentials: 'same-origin', headers: { accept: 'application/json;odata=nometadata' } });
    put('columns', c.ok ? await c.json() : 'HTTP ' + c.status + (c.status === 400 ? ': not all six columns exist on this site; the snippet defaults are used (fine for a demo)' : ''));
  } catch (e) { put('columns', 'could not read: ' + e.message); }

  /* Verdict. */
  var p = out.checks.policy || {};
  if (!host) out.verdict = 'No [data-fraud-guide] on this page: the Script Editor is not in external mode on the entry file, or the entry file did not load (see fetched).';
  else if (d.state === 'ready') out.verdict = 'Ready: the guide runs here (' + d.scripts + ' path, content ' + (d.contentSource || '?') + ').';
  else if (p.present && !p.nonceOnPage && !p.unsafeEval) out.verdict = 'Blocked by the page policy: no nonce on the page and no unsafe-eval. The loader cannot run the player on this site.';
  else if (!loaderUrl) out.verdict = 'The entry loaded but the loader was never fetched: check the <script src> in fraud-guide.webpart.html and that the file is in the folder.';
  else out.verdict = 'Not ready: read host.note and files; the console lines starting [fraud-guide] (enable Verbose) say why.';

  var json = JSON.stringify(out, null, 2);
  try { if (typeof copy === 'function') copy(json); } catch (e) {}
  console.log(json);
  return out.verdict;
})();
