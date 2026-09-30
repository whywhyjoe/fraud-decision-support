/*! boot-fraud-guide.js — the loader the page's web part points at.
 *
 *  What it does, in order:
 *   1. Waits for the host div (data-fraud-guide) and mounts it exactly once,
 *      re-mounting after SharePoint SPA navigation and when the page leaves
 *      edit mode. Same shape as bsp-sp-parts/_shared/dcs-part-boot.js: a
 *      guard attribute, a debounced MutationObserver, one bounded poll.
 *   2. Reads the page's own list item for the binding columns (ItemType,
 *      Script, Config, Ver, AppName, Value1). Host data-* attributes are the
 *      defaults when a column is empty, so a page works from the moment the
 *      snippet is pasted. data-columns maps them to the site's internal names.
 *   3. Loads the player. Script ending in .html: fetched as text, its inline
 *      scripts lifted out, the markup written into a srcdoc frame and the
 *      scripts run there with the frame's own eval, with the bound content
 *      set as window.FLOW first. Script ending in .js: injected script that
 *      mounts into the host itself (the shape after the content/theme split).
 *   4. Full page (data-fullpage): "takeover" lifts the frame into a fixed
 *      layer over the whole viewport and makes SharePoint's page inert behind
 *      it; "webview" redirects to SharePoint's own ?env=WebView; "none" keeps
 *      the frame in the page flow. Never in edit mode; ?fullpage=none on the
 *      page URL turns it off for one visit.
 *
 *  Why fetch + srcdoc + eval, not <iframe src>: a SharePoint library serves
 *  .html as a download (Content-Disposition: attachment, X-Download-Options:
 *  noopen), so a frame pointed at it stays blank. A srcdoc frame inherits the
 *  page's CSP, which forbids inline scripts but allows 'unsafe-eval'; the
 *  scripts are therefore run with eval, as the Script Editor runs its own.
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
  var COLUMNS = { itemType: 'ItemType', script: 'Script', config: 'Config', version: 'Ver', appName: 'AppName', status: 'Value1' };
  var TEXT = {
    frameTitle: 'Fraud call guide',
    editing: 'Fraud call guide is paused while you edit this page. Save or exit edit mode to use it.',
    unavailable: 'This tool is unavailable right now.'
  };
  var MIN_HEIGHT = 480;
  var TOP_LAYER = 2147483000;
  var SAFE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

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

  function queryParam(name) {
    try { return (new URLSearchParams(location.search).get(name) || '').toLowerCase(); } catch (e) { return ''; }
  }

  /* Column values are editable by any page author, so a relative name must be
     a plain library path: no scheme, no .., nothing that leaves the folder. */
  function resolveUrl(value) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value) || value.charAt(0) === '/') return value;
    if (!SAFE_NAME.test(value) || value.indexOf('..') !== -1) { debug('not a plain library path:', value); return null; }
    return baseUrl + '/' + value;
  }

  function withQuery(url, params) {
    var parts = [];
    Object.keys(params).forEach(function (k) { if (params[k] != null && params[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); });
    return parts.length ? url + (url.indexOf('?') >= 0 ? '&' : '?') + parts.join('&') : url;
  }

  /* Library files carry a day's max-age. no-cache revalidates with the ETag,
     so an unchanged file costs a 304 and a republished one shows at once. */
  function getText(url) {
    return fetch(url, { credentials: 'same-origin', cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(url + ' HTTP ' + r.status); return r.text(); });
  }

  /* ---------- binding: the page's own list item ---------- */
  function readBinding(host) {
    var cols = COLUMNS;
    try { if (host.getAttribute('data-columns')) cols = Object.assign({}, COLUMNS, JSON.parse(host.getAttribute('data-columns'))); } catch (e) { debug('data-columns is not JSON; using defaults'); }
    var keys = Object.keys(COLUMNS);
    var select = keys.map(function (k) { return cols[k]; }).join(',');
    var path = decodeURIComponent(location.pathname).replace(/'/g, "''");
    var url = webUrl() + "/_api/web/getFileByServerRelativeUrl('" + path + "')/ListItemAllFields?$select=" + select;
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json;odata=nometadata' } })
      .then(function (r) { if (!r.ok) throw new Error('page item HTTP ' + r.status); return r.json(); })
      .then(function (item) {
        var b = {};
        keys.forEach(function (k) { var v = item[cols[k]]; b[k] = v == null ? null : String(v).trim() || null; });
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
      appName: binding.appName || d.appName || '',
      status: (binding.status || d.status || 'draft').toLowerCase(),
      source: binding.script ? 'columns' : 'defaults'
    };
    out.scriptUrl = resolveUrl(out.script);
    out.configUrl = resolveUrl(out.config);
    return out;
  }

  /* Shape check only; the full graph checks run before every upload. Content
     that fails falls back to the player's own inline block. */
  function contentProblem(flow) {
    if (!flow || typeof flow !== 'object') return 'not an object';
    if (!flow.meta || typeof flow.meta !== 'object') return 'no meta';
    if (!Array.isArray(flow.stages) || !flow.stages.length) return 'no stages';
    if (!Array.isArray(flow.nodes) || !flow.nodes.length) return 'no nodes';
    var ids = {};
    for (var i = 0; i < flow.nodes.length; i++) {
      var id = flow.nodes[i] && flow.nodes[i].id;
      if (typeof id !== 'string' || ids[id]) return 'bad or duplicate question id at ' + i;
      ids[id] = true;
    }
    if (!ids[flow.startNodeId]) return 'startNodeId does not resolve';
    return null;
  }

  function loadContent(url) {
    if (!url) return Promise.resolve(null);
    return getText(url).then(function (text) {
      var flow = JSON.parse(text);
      var problem = contentProblem(flow);
      if (problem) throw new Error('content fails its checks: ' + problem);
      return flow;
    }).catch(function (e) { debug('bound content not used, the player falls back to its own:', e && e.message); return null; });
  }

  /* Parse the player without running it and lift its executable scripts out,
     so the frame's CSP does not block them. Data blocks stay in the markup. */
  function preparePlayer(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var scripts = [];
    [].slice.call(doc.querySelectorAll('script')).forEach(function (s) {
      var type = (s.getAttribute('type') || '').trim().toLowerCase();
      if (type && type !== 'text/javascript') return;
      scripts.push(s.textContent);
      s.parentNode.removeChild(s);
    });
    return { markup: '<!DOCTYPE html>' + doc.documentElement.outerHTML, scripts: scripts };
  }

  /* ---------- full page ---------- */
  function fullPageMode(host) {
    if (isEditMode() || queryParam('fullpage') === 'none') return 'none';
    return (host.dataset.fullpage || 'none').toLowerCase();
  }

  function ensureWebView() {
    try {
      var url = new URL(location.href);
      if ((url.searchParams.get('env') || '').toLowerCase() === 'webview') return false;
      url.searchParams.set('env', 'WebView');
      location.replace(url.href);
      return true;
    } catch (e) { return false; }
  }

  /* A fixed layer on <body>, not inside the host: SharePoint's canvas has
     transformed ancestors, which would make a fixed child relative to them. */
  function takeOver(host, frame) {
    var layer = document.createElement('div');
    layer.setAttribute('data-role', 'fraud-guide-layer');
    layer.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;margin:0;padding:0;background:Canvas;z-index:' + TOP_LAYER + ';';
    frame.style.height = '100%';
    layer.appendChild(frame);

    var inerted = [];
    [].slice.call(document.body.children).forEach(function (el) {
      if (el.tagName === 'SCRIPT' || el.hasAttribute('inert')) return;
      el.setAttribute('inert', '');
      inerted.push(el);
    });
    var root = document.documentElement;
    var overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.body.appendChild(layer);
    host.setAttribute('data-fullpage-active', 'takeover');

    return function release() {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      inerted.forEach(function (el) { el.removeAttribute('inert'); });
      root.style.overflow = overflow;
      host.removeAttribute('data-fullpage-active');
    };
  }

  /* ---------- mounting ---------- */
  function note(host, text, role) {
    host.textContent = '';
    var p = document.createElement('p');
    if (role) p.setAttribute('role', role);
    p.textContent = text;
    host.appendChild(p);
  }

  function quietUnavailable(host, why) { debug('unavailable:', why); note(host, TEXT.unavailable); }

  function sizeInFlow(frame) {
    var top = frame.getBoundingClientRect().top + window.pageYOffset;
    var avail = Math.max(MIN_HEIGHT, window.innerHeight - top);
    var posted = Number(frame.getAttribute('data-content-height')) || 0;
    frame.style.height = Math.max(avail, posted) + 'px';
  }

  function mountFrame(host, b, mode) {
    return Promise.all([getText(b.scriptUrl), loadContent(b.configUrl)]).then(function (got) {
      var player = preparePlayer(got[0]);
      var flow = got[1];
      host.setAttribute('data-content-source', flow ? 'config' : 'inline');
      host.setAttribute('data-content-version', flow && flow.meta.contentVersion ? flow.meta.contentVersion : '');

      var frame = document.createElement('iframe');
      frame.setAttribute('data-role', 'fraud-guide-frame');
      frame.setAttribute('title', b.appName || TEXT.frameTitle);
      frame.style.cssText = 'display:block;width:100%;border:0;margin:0;padding:0;';
      host.textContent = '';

      var release = null, onResize = null, onMessage = null;
      if (mode === 'takeover') {
        release = takeOver(host, frame);
        host.__fraudGuideRelease = release;
      } else {
        host.appendChild(frame);
        onResize = function () { sizeInFlow(frame); };
        onMessage = function (ev) {
          if (!ev.data || ev.data.type !== 'fraud-guide:height' || ev.source !== frame.contentWindow) return;
          frame.setAttribute('data-content-height', String(ev.data.height || 0));
          sizeInFlow(frame);
        };
        sizeInFlow(frame);
        window.addEventListener('resize', onResize);
        window.addEventListener('message', onMessage);
      }

      frame.addEventListener('load', function () {
        try {
          var w = frame.contentWindow;
          if (flow) w.FLOW = flow;
          player.scripts.forEach(function (code) { w.eval(code); });
          host.setAttribute('data-state', 'ready');
          if (mode === 'takeover') { try { frame.focus(); } catch (e) {} }
          debug('ready', b.source, host.getAttribute('data-content-source'), host.getAttribute('data-content-version'));
        } catch (e) {
          if (release) release();
          quietUnavailable(host, 'player failed to start: ' + (e && e.message ? e.message : e));
        }
      }, { once: true });
      frame.srcdoc = player.markup;

      /* Modern pages are a SPA: when the page swaps the host out, let go. */
      var timer = window.setInterval(function () {
        if (document.body.contains(host)) return;
        window.clearInterval(timer);
        if (release) release();
        if (onResize) window.removeEventListener('resize', onResize);
        if (onMessage) window.removeEventListener('message', onMessage);
        debug('unmounted');
      }, 1500);
    });
  }

  function mountScript(host, b) {
    window.__fraudGuideBinding = b;
    var s = document.createElement('script');
    s.src = withQuery(b.scriptUrl, { v: b.version });
    s.onerror = function () { quietUnavailable(host, 'player script failed to load ' + s.src); };
    document.head.appendChild(s);
  }

  function mountLive(host) {
    return readBinding(host).then(function (binding) {
      var b = settle(host, binding);
      if (b.itemType !== ITEM_TYPE) { debug('page ItemType is', b.itemType, 'not', ITEM_TYPE, '; not mounting'); return; }
      if (!b.scriptUrl) { debug('no usable Script column and no data-script default; not mounting'); return; }
      debug('mounting', b);
      host.setAttribute('data-binding-source', b.source);
      if (/\.html?(\?|$)/i.test(b.scriptUrl)) return mountFrame(host, b, fullPageMode(host));
      mountScript(host, b);
    }).catch(function (e) { quietUnavailable(host, 'mount failed: ' + (e && e.message)); });
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
      if (editing) {
        if (host.__fraudGuideRelease) { host.__fraudGuideRelease(); host.__fraudGuideRelease = null; }
        note(host, TEXT.editing, 'status');
        continue;
      }
      if (fullPageMode(host) === 'webview' && ensureWebView()) return;
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
  window.fraudGuideBoot = { remount: boot, mountAll: mountAll, isEditMode: isEditMode, version: '0.2.0' };
})();
