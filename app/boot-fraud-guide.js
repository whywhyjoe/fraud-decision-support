/*! boot-fraud-guide.js — the loader the page's web part points at.
 *
 *  Built to the DCS Workbench hosting method (dcs-workbench-tools/docs/
 *  01-hosting-and-boot.md, tier L1: a full-page app), with the mount shape of
 *  bsp-sp-parts/_shared/dcs-part-boot.js. Where this file departs from them
 *  it says so.
 *
 *  Entry: the Script Editor's external Script URL points at the generated
 *  fraud-guide.webpart.html in the library (a host div and one <script src>
 *  to this file, stamped with its hash). Changing this file means
 *  re-rendering and re-uploading that entry file, never editing the page.
 *
 *  What it does, in order:
 *   1. Double-boot guard: the web part re-runs its scripts on re-render; a
 *      second evaluation only asks the first to re-mount.
 *   2. Waits for the host div (data-fraud-guide) and mounts it exactly once,
 *      re-mounting after SPA navigation and when the page leaves edit mode:
 *      a guard attribute, a debounced MutationObserver, one bounded poll.
 *      Edit mode (?Mode=Edit, /_layouts/, or SharePoint's authoring DOM,
 *      including an App page's property pane) gets a one-line placeholder
 *      and never the takeover; leaving it re-mounts. Departure from DCS: no
 *      History API patching, which an App page would not trip anyway (its
 *      edit mode leaves the URL alone); the observer sees the DOM change.
 *   3. Reads the page's own list item for the binding columns (ItemType,
 *      Script, Config, Ver, AppName, Value1). Host data-* attributes are the
 *      defaults when a column is empty. data-columns maps them to the site's
 *      internal names.
 *   4. In takeover mode, paints a curtain over the window before anything is
 *      fetched, so a cold SharePoint load never shows the bare page.
 *   5. Loads the player. Script ending in .html: fetched as text (a library
 *      serves .html as a download, so <iframe src> stays blank), the bound
 *      content spliced into its #flow-data block, the host page's CSP nonce
 *      stamped on its scripts and styles, and the result written into a
 *      srcdoc frame, which inherits the page's CSP. On a page with no nonce
 *      the scripts are lifted out instead and run with the frame's eval
 *      (the dev tenant's CSP allows 'unsafe-eval'; prod is unverified).
 *      Script ending in .js: injected script that mounts into the
 *      host itself (the shape after the content/theme split).
 *   6. Full page (data-fullpage): "takeover" holds the frame in a fixed layer
 *      over the whole window, SharePoint's page inert behind it (departure
 *      from DCS L1, which leaves the suite bar showing: asked for);
 *      "webview" redirects to SharePoint's ?env=WebView; "none" keeps the
 *      frame in the page flow. ?fullpage=none on the page URL turns it off
 *      for one visit.
 *
 *  Rules it keeps (CLAUDE.md): no ES import, no CDN, no page-relative URL,
 *  never fail loudly at the visitor (console.debug and one quiet line;
 *  departure from DCS, which paints the error). Uses the house helpers when
 *  present (dcsOnSpaNavigation) and stand-ins when absent.
 */
(function () {
  'use strict';

  if (window.fraudGuideBoot && typeof window.fraudGuideBoot.remount === 'function') {
    window.fraudGuideBoot.remount();
    return;
  }

  var ID = 'fraud-guide';
  var LOG = '[fraud-guide]';
  var SELECTOR = '[data-fraud-guide]';
  var GUARD = 'data-fraud-guide-mounted';
  var ITEM_TYPE = 'fraud-decision-support';
  var COLUMNS = { itemType: 'ItemType', script: 'Script', config: 'Config', version: 'Ver', appName: 'AppName', status: 'Value1' };
  var TEXT = {
    frameTitle: 'Fraud call guide',
    loading: 'Opening the call guide…',
    editing: 'Fraud call guide is paused while you edit this page. Save or exit edit mode to use it.',
    unavailable: 'This tool is unavailable right now.'
  };
  var MIN_HEIGHT = 480;
  var TOP_LAYER = 2147483000;
  var CURTAIN_STYLE = 'margin:0;padding:24px;font:16px/1.5 "Segoe UI",system-ui,sans-serif;color:CanvasText;';
  var SAFE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;
  var PLAYER_ENTRY = '__fraudGuideStart';
  /* SharePoint's authoring DOM. The first three are the article-page signals
     the house detector (fcu-standard.js) uses. An App page
     (SingleWebPartAppPage, as the dev page is) edits with no URL change and
     none of those: its signals, seen 2026-09-30, are the property pane
     controls and the command bar's Edit button becoming Save. */
  var EDIT_DOM = [
    '[data-automation-id="authoringCanvas"]',
    '[data-automation-id="pageCommandBarSaveButton"]',
    '[data-automation-id="pageCommandBarPublishButton"]',
    '[data-automation-id="showPane"]',
    '[data-automation-id="propertyPaneClose"]',
    'button[role="menuitem"][name="Save"]'
  ].join(',');

  var self = document.currentScript;
  var baseUrl = self && self.src ? self.src.slice(0, self.src.lastIndexOf('/')) : null;
  if (!baseUrl) { return; }

  function debug() { try { console.debug.apply(console, [LOG].concat([].slice.call(arguments))); } catch (e) {} }

  /* ---------- context ---------- */
  function webUrl() {
    var ctx = window._spPageContextInfo;
    if (ctx && ctx.webAbsoluteUrl) return ctx.webAbsoluteUrl;
    var m = location.pathname.match(/^(\/(sites|teams)\/[^\/]+)/i);
    return location.origin + (m ? m[1] : '');
  }

  /* Not the house __dcsIsEditMode: its stored edit intent never clears
     (bsp-sp-parts/dev/vendor/fcu-standard-additions.js, item 6), which would
     leave the guide suspended for the rest of the tab. Its signals are here. */
  function isEditMode() {
    if (/\/_layouts\//i.test(location.pathname)) return true;
    if (document.body && document.body.classList.contains('editmode')) return true;
    var m = queryParam('mode');
    if (m === 'edit' || m === 'design') return true;
    return !!document.querySelector(EDIT_DOM);
  }

  /* Case-insensitive on the name too: SharePoint writes Mode=Edit. */
  function queryParam(name) {
    try {
      var found = '';
      new URLSearchParams(location.search).forEach(function (v, k) { if (!found && k.toLowerCase() === name) found = v; });
      return found.toLowerCase();
    } catch (e) { return ''; }
  }

  /* The host page's CSP nonce: from this script's own element, else any
     element SharePoint stamped. Read the property; the attribute is blanked. */
  function hostNonce() {
    if (self && self.nonce) return self.nonce;
    var el = document.querySelector('script[nonce]') || document.querySelector('style[nonce]');
    return (el && el.nonce) || '';
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
     that fails leaves the player on its own inline block. */
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
    }).catch(function (e) { debug('bound content not used, the player keeps its own:', e && e.message); return null; });
  }

  /* Parse the player without running it, splice the bound content into its
     #flow-data block, and stamp the host nonce so its scripts may run in the
     srcdoc frame. Without a nonce the executable scripts come out of the
     markup and run by eval once the frame has loaded. */
  function preparePlayer(html, flow) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if (flow) {
      var block = doc.getElementById('flow-data');
      if (block) block.textContent = JSON.stringify(flow).replace(/</g, '\\u003c');
      else debug('player has no #flow-data block; bound content not used');
    }
    var nonce = hostNonce();
    var scripts = [];
    [].slice.call(doc.querySelectorAll('script')).forEach(function (s) {
      var type = (s.getAttribute('type') || '').trim().toLowerCase();
      var runs = !type || type === 'text/javascript';
      if (runs) scripts.push(s.textContent);
      if (nonce) s.setAttribute('nonce', nonce);
      else if (runs) s.parentNode.removeChild(s); /* no nonce: run by eval, not refused by the CSP */
    });
    if (nonce) [].slice.call(doc.querySelectorAll('style')).forEach(function (s) { s.setAttribute('nonce', nonce); });
    return { markup: '<!DOCTYPE html>' + doc.documentElement.outerHTML, scripts: scripts, nonce: !!nonce };
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
     transformed ancestors, which would make a fixed child relative to them.
     Put up with a curtain first; the frame replaces it when it is ready. */
  function takeOver(host) {
    var layer = document.createElement('div');
    layer.setAttribute('data-role', 'fraud-guide-layer');
    layer.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;margin:0;padding:0;background:Canvas;z-index:' + TOP_LAYER + ';';
    var curtain = document.createElement('p');
    curtain.setAttribute('data-role', 'fraud-guide-curtain');
    curtain.setAttribute('role', 'status');
    curtain.style.cssText = CURTAIN_STYLE;
    curtain.textContent = TEXT.loading;
    layer.appendChild(curtain);

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

    var released = false;
    function release() {
      if (released) return;
      released = true;
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      inerted.forEach(function (el) { el.removeAttribute('inert'); });
      root.style.overflow = overflow;
      host.removeAttribute('data-fullpage-active');
      if (host.__fraudGuideRelease === release) host.__fraudGuideRelease = null;
    }
    host.__fraudGuideRelease = release;
    return {
      release: release,
      show: function (frame) { frame.style.height = '100%'; layer.replaceChild(frame, curtain); }
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

  function sizeInFlow(frame) {
    var top = frame.getBoundingClientRect().top + window.pageYOffset;
    var avail = Math.max(MIN_HEIGHT, window.innerHeight - top);
    var posted = Number(frame.getAttribute('data-content-height')) || 0;
    frame.style.height = Math.max(avail, posted) + 'px';
  }

  function mountFrame(host, b, cover) {
    function fail(why) {
      if (cover) cover.release();
      debug('unavailable:', why);
      note(host, TEXT.unavailable);
    }

    return Promise.all([getText(b.scriptUrl), loadContent(b.configUrl)]).then(function (got) {
      if (cover && !host.__fraudGuideRelease) return; /* released while fetching: edit mode or navigation */
      var flow = got[1];
      var player = preparePlayer(got[0], flow);
      host.setAttribute('data-content-source', flow ? 'config' : 'inline');
      host.setAttribute('data-content-version', flow && flow.meta.contentVersion ? flow.meta.contentVersion : '');

      var frame = document.createElement('iframe');
      frame.setAttribute('data-role', 'fraud-guide-frame');
      frame.setAttribute('title', b.appName || TEXT.frameTitle);
      frame.style.cssText = 'display:block;width:100%;border:0;margin:0;padding:0;';
      host.textContent = '';

      var onResize = null, onMessage = null;
      if (cover) {
        cover.show(frame);
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
          var how = 'nonce';
          if (!player.nonce) {
            /* No nonce on this page: run the lifted scripts with the frame's
               eval, which SharePoint's CSP allows ('unsafe-eval'). */
            how = 'eval';
            player.scripts.forEach(function (code) { w.eval(code); });
          }
          if (typeof w[PLAYER_ENTRY] !== 'function') throw new Error('the player did not start');
          host.setAttribute('data-state', 'ready');
          host.setAttribute('data-scripts', how);
          if (cover) { try { frame.focus(); } catch (e) {} }
          debug('ready', b.source, host.getAttribute('data-content-source'), host.getAttribute('data-content-version'), how);
        } catch (e) {
          fail('player failed to start: ' + (e && e.message ? e.message : e));
        }
      }, { once: true });
      frame.srcdoc = player.markup;

      /* Modern pages are a SPA: when the page swaps the host out, let go. */
      var timer = window.setInterval(function () {
        if (document.body.contains(host)) return;
        window.clearInterval(timer);
        if (cover) cover.release();
        if (onResize) window.removeEventListener('resize', onResize);
        if (onMessage) window.removeEventListener('message', onMessage);
        debug('unmounted');
      }, 1500);
    }).catch(function (e) { fail('mount failed: ' + (e && e.message)); });
  }

  function mountScript(host, b) {
    window.__fraudGuideBinding = b;
    var s = document.createElement('script');
    s.src = withQuery(b.scriptUrl, { v: b.version });
    var nonce = hostNonce();
    if (nonce) s.nonce = nonce;
    s.onerror = function () { debug('unavailable: player script failed to load', s.src); note(host, TEXT.unavailable); };
    document.head.appendChild(s);
  }

  /* The curtain goes up before the page item is read, so the rep never sees
     the bare page; anything that stops the mount takes it down again. */
  function mountLive(host) {
    var cover = fullPageMode(host) === 'takeover' ? takeOver(host) : null;
    function stop() { if (cover) cover.release(); }
    return readBinding(host).then(function (binding) {
      var b = settle(host, binding);
      if (b.itemType !== ITEM_TYPE) { stop(); debug('page ItemType is', b.itemType, 'not', ITEM_TYPE, '; not mounting'); return; }
      if (!b.scriptUrl) { stop(); debug('no usable Script column and no data-script default; not mounting'); return; }
      if (isEditMode() || (cover && !host.__fraudGuideRelease)) { stop(); return; } /* edit mode began while the binding was read */
      debug('mounting', b);
      host.setAttribute('data-binding-source', b.source);
      if (/\.html?(\?|$)/i.test(b.scriptUrl)) return mountFrame(host, b, cover);
      stop();
      mountScript(host, b);
    }).catch(function (e) { stop(); debug('unavailable: mount failed:', e && e.message); note(host, TEXT.unavailable); });
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
        if (host.__fraudGuideRelease) host.__fraudGuideRelease();
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

  /* SPA navigation: the house bus when present, else the family's pathname
     poll. Edit mode keeps the pathname and changes the query, so the poll
     watches the whole URL. */
  if (typeof window.dcsOnSpaNavigation === 'function') {
    window.dcsOnSpaNavigation(ID, function () { boot(); });
  } else {
    var lastUrl = location.pathname + location.search;
    window.setInterval(function () {
      var now = location.pathname + location.search;
      if (now !== lastUrl) { lastUrl = now; boot(); }
    }, 1500);
  }

  window.fraudGuideBoot = { remount: boot, mountAll: mountAll, isEditMode: isEditMode, version: '0.3.0' };
  boot();
})();
