/*! boot-fraud-guide.js — the loader the page's web part points at.
 *
 *  What it does, in order:
 *   1. Waits for the host div (data-fraud-guide) and mounts it exactly once,
 *      re-mounting after SharePoint SPA navigation and when the page leaves
 *      edit mode. Same shape as bsp-sp-parts/_shared/dcs-part-boot.js: a
 *      guard attribute, a debounced MutationObserver, one bounded poll.
 *   2. Reads the page's own list item for the binding columns (Script,
 *      Config, Ver, DisplayName, Value1, ItemType). Host data-* attributes
 *      are the defaults when a column is empty, so a page works from the
 *      moment the snippet is pasted.
 *   3. Loads the player. Script ending in .html: an iframe sized to the
 *      viewport, with the content file and version on its query string.
 *      Script ending in .js: injected script that mounts into the host
 *      itself (the shape after the content/theme split).
 *
 *  Rules it keeps (CLAUDE.md): no ES import, no CDN, no page-relative URL
 *  (everything is resolved against the folder this file was served from or
 *  is tenant-relative), never fail loudly at the visitor (console.debug).
 *  Uses the house helpers when present (dcsOnSpaNavigation, __dcsIsEditMode)
 *  and stand-ins when absent, so it runs on any site.
 */
(function () {
  'use strict';

  var ID = 'fraud-guide';
  var LOG = '[fraud-guide]';
  var SELECTOR = '[data-fraud-guide]';
  var GUARD = 'data-fraud-guide-mounted';
  var ITEM_TYPE = 'fraud-decision-support';
  var COLUMNS = { itemType: 'ItemType', script: 'Script', config: 'Config', version: 'Ver', displayName: 'DisplayName', status: 'Value1' };

  var baseUrl = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.slice(0, src.lastIndexOf('/')) : null;
  })();
  if (!baseUrl) { return; }

  function debug() { try { console.debug.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {} }

  /* ---------- context ---------- */
  function webUrl() {
    var ctx = window._spPageContextInfo;
    if (ctx && ctx.webAbsoluteUrl) return ctx.webAbsoluteUrl;
    var m = location.pathname.match(/^(\/(sites|teams)\/[^\/]+)/i);
    return location.origin + (m ? m[1] : '');
  }

  function isEditMode() {
    try { if (typeof window.__dcsIsEditMode === 'function') return !!window.__dcsIsEditMode(); } catch (e) {}
    if (document.body && document.body.classList.contains('editmode')) return true;
    try {
      var q = new URLSearchParams(location.search);
      var m = (q.get('mode') || q.get('Mode') || '').toLowerCase();
      if (m === 'edit' || m === 'design') return true;
    } catch (e) {}
    return !!(document.querySelector('[data-automation-id="authoringCanvas"]') ||
      document.querySelector('[data-automation-id="pageCommandBarSaveButton"]') ||
      document.querySelector('[data-automation-id="pageCommandBarPublishButton"]'));
  }

  function resolveUrl(value) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value) || value.charAt(0) === '/') return value;
    return baseUrl + '/' + value;
  }

  function withQuery(url, params) {
    var parts = [];
    Object.keys(params).forEach(function (k) { if (params[k] != null && params[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); });
    return parts.length ? url + (url.indexOf('?') >= 0 ? '&' : '?') + parts.join('&') : url;
  }

  /* ---------- binding: the page's own list item ---------- */
  function readBinding(host) {
    var cols = COLUMNS;
    try { if (host.getAttribute('data-columns')) cols = Object.assign({}, COLUMNS, JSON.parse(host.getAttribute('data-columns'))); } catch (e) { debug('data-columns is not JSON; using defaults'); }
    var select = Object.keys(cols).map(function (k) { return cols[k]; }).join(',');
    var path = decodeURIComponent(location.pathname).replace(/'/g, "''");
    var url = webUrl() + "/_api/web/getFileByServerRelativeUrl('" + path + "')/ListItemAllFields?$select=" + select;
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json;odata=nometadata' } })
      .then(function (r) { if (!r.ok) throw new Error('page item HTTP ' + r.status); return r.json(); })
      .then(function (item) {
        var b = {};
        Object.keys(cols).forEach(function (k) { b[k] = item[cols[k]] || null; });
        return b;
      })
      .catch(function (e) { debug('binding unavailable, using host defaults:', e.message); return {}; });
  }

  function settle(host, binding) {
    var d = host.dataset;
    var out = {
      itemType: binding.itemType || d.itemType || ITEM_TYPE,
      script: binding.script || d.script || null,
      config: binding.config || d.config || null,
      version: binding.version || d.version || '',
      displayName: binding.displayName || d.displayName || '',
      status: (binding.status || d.status || 'draft').toLowerCase()
    };
    out.scriptUrl = resolveUrl(out.script);
    out.configUrl = resolveUrl(out.config);
    return out;
  }

  /* ---------- full page: SharePoint's own chrome-free view ---------- */
  function ensureFullPage(host) {
    if (host.dataset.fullpage !== 'webview' || isEditMode()) return false;
    try {
      var url = new URL(location.href);
      if ((url.searchParams.get('env') || '').toLowerCase() === 'webview') return false;
      url.searchParams.set('env', 'WebView');
      location.replace(url.href);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- mounting ---------- */
  function placeholder(host) {
    host.textContent = '';
    var p = document.createElement('p');
    p.setAttribute('role', 'status');
    p.textContent = 'Fraud call guide is paused while you edit this page. Save or exit edit mode to use it.';
    host.appendChild(p);
  }

  function quietUnavailable(host) {
    host.textContent = '';
    var p = document.createElement('p');
    p.textContent = 'This tool is unavailable right now.';
    host.appendChild(p);
  }

  function sizeFrame(frame) {
    var top = frame.getBoundingClientRect().top + window.pageYOffset;
    var avail = Math.max(480, window.innerHeight - top);
    var posted = Number(frame.getAttribute('data-content-height')) || 0;
    frame.style.height = Math.max(avail, posted) + 'px';
  }

  function mountFrame(host, b) {
    var frame = document.createElement('iframe');
    frame.setAttribute('data-role', 'fraud-guide-frame');
    frame.setAttribute('title', b.displayName || 'Fraud call guide');
    frame.style.width = '100%';
    frame.style.border = '0';
    frame.style.display = 'block';
    frame.src = withQuery(b.scriptUrl, { content: b.configUrl, v: b.version, status: b.status });
    host.textContent = '';
    host.appendChild(frame);
    sizeFrame(frame);
    window.addEventListener('resize', function () { sizeFrame(frame); });
    window.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.type !== 'fraud-guide:height' || ev.source !== frame.contentWindow) return;
      frame.setAttribute('data-content-height', String(ev.data.height || 0));
      sizeFrame(frame);
    });
  }

  function mountScript(host, b) {
    window.__fraudGuideBinding = b;
    var s = document.createElement('script');
    s.src = withQuery(b.scriptUrl, { v: b.version });
    s.onerror = function () { debug('player script failed to load', s.src); quietUnavailable(host); };
    document.head.appendChild(s);
  }

  function mountLive(host) {
    return readBinding(host).then(function (binding) {
      var b = settle(host, binding);
      if (b.itemType !== ITEM_TYPE) { debug('page ItemType is', b.itemType, 'not', ITEM_TYPE, '; not mounting'); return; }
      if (!b.scriptUrl) { debug('no Script column and no data-script default; not mounting'); return; }
      debug('mounting', b);
      if (/\.html?(\?|$)/i.test(b.scriptUrl)) mountFrame(host, b); else mountScript(host, b);
    }).catch(function (e) { debug('mount failed:', e && e.message); quietUnavailable(host); });
  }

  var pollTimer = null, pollUntil = 0, observer = null, debounceTimer = null;

  function mountAll() {
    var editing = isEditMode();
    var want = editing ? ID + ':edit' : ID;
    var hosts = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      if (host.getAttribute(GUARD) === want) continue;
      host.setAttribute(GUARD, want);
      if (editing) { placeholder(host); continue; }
      if (ensureFullPage(host)) return;
      mountLive(host);
    }
  }

  function schedulePoll(ms) {
    pollUntil = Math.max(pollUntil, Date.now() + ms);
    if (pollTimer) return;
    pollTimer = window.setInterval(function () {
      mountAll();
      if (Date.now() > pollUntil) { window.clearInterval(pollTimer); pollTimer = null; }
    }, 150);
  }

  function startObserving() {
    if (observer || !window.MutationObserver || !document.documentElement) return;
    observer = new MutationObserver(function () {
      if (debounceTimer) return;
      debounceTimer = window.setTimeout(function () { debounceTimer = null; mountAll(); }, 150);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function boot() { mountAll(); schedulePoll(30000); startObserving(); }

  /* SPA navigation: the house bus when present, else the family's pathname poll. */
  if (typeof window.dcsOnSpaNavigation === 'function') {
    window.dcsOnSpaNavigation(ID, function () { boot(); });
  } else {
    var lastPath = location.pathname;
    window.setInterval(function () {
      if (location.pathname !== lastPath) { lastPath = location.pathname; boot(); }
    }, 1500);
  }

  boot();
  window.fraudGuideBoot = { remount: boot, mountAll: mountAll, isEditMode: isEditMode, version: '0.1.0' };
})();
