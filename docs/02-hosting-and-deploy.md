# Hosting, boot and deploy

Seeded from the `sp-app` family's paid-for gotchas in projects-standard,
kept where they apply to this app. The dev page runs the loader below
(`STATE.md` says what is live); the `file://` demo is unaffected by any of it.

## The decided shape

- **One SharePoint page per version.** The page is the stable link a rep
  gets. It holds a web part with a small loader and nothing else.
- **Player in a library.** Today the single-file players themselves,
  loaded into a frame by `app/boot-fraud-guide.js`; after the content/theme
  split, `fraud-guide.app.js`, its CSS and any assets (the BMO copy's header
  photo becomes a file here, not a base64 token), as with every other app
  of this family.
- **The tool takes the whole window.** A rep opening the page sees the
  guide and nothing of SharePoint. See *Full page* below.
- **Content in a library.** The scenario JSON (`content/*.json`, once the
  split in `STATE.md` has happened) lives in a document library. The
  library's version history is the content history.
- **Binding in the page's properties.** The Site Pages library already
  carries a set of flexible per-app columns; this app uses them as below.
  `meta` in the JSON is the source for everything the columns do not name.
- **Its own site, for end users.** Not the DCS workbench. A dev page exists
  (one modern script web part, otherwise blank) and the library folder is
  agreed; both are in `environments.json`, never here. Production is not
  chosen; open question in `STATE.md`.

## Getting a page context

In order, with fallback:

1. `_spPageContextInfo`, present on classic and some modern pages. This is
   also where the page's own list item id comes from
   (`_spPageContextInfo.pageItemId`), which the binding lookup needs.
2. The modern Site Pages bundle:
   `spModuleLoader._bundledComponents[<feature id>].PageManager._instance.pageContext.legacyPageContext`
3. Path fallback: `location.origin` plus the first `/sites/<x>` or
   `/teams/<x>` segment.

The resolved web URL feeds the binding lookup and the content fetch. Do not
assume step 1.

## Boot

1. Resolve the web URL and the page item id as above.
2. Read the binding: one REST call to the Site Pages item, `$select` on the
   three columns.
3. Fetch the content file same-origin from the library.
4. Validate it with the same graph checks the fast test runs. A failure
   shows behind the scenes only; the rep sees the last good content if
   there is one, or a quiet "content unavailable" line if not.
5. Load order when a step is missing, so the same player serves every
   situation: page properties, then a `?content=` URL, then a sibling
   `content.js` that sets `window.FLOW` (works from `file://`), then the
   inline `#flow-data` block (the frozen single-file demo).

## Loading an .html player

A document library serves `.html` as a download (`Content-Disposition:
attachment`, `X-Download-Options: noopen`), so `<iframe src>` pointed at the
player stays blank. The loader fetches the player as text instead, lifts its
executable `<script>` blocks out, writes the rest into a `srcdoc` frame and
runs the scripts there with the frame's own `eval`. A `srcdoc` frame
inherits the page's CSP, which allows `'unsafe-eval'` but no inline script;
that is why the scripts are evaluated rather than left in the markup. The
bound content file is fetched, shape-checked, and set as `window.FLOW` in the
frame before the scripts run, so the player uses it through its ordinary
`window.FLOW` path; content that fails the check leaves the player on its
own inline block. The player's `?content=` boot is for hosting over plain
http and is not used on SharePoint (a `srcdoc` frame has no query string).
`tests/loader.mjs` serves its fixture with those same headers.

## Full page

`data-fullpage` on the host div:

| Value | What the rep gets |
| --- | --- |
| `takeover` (the snippet's default) | The frame in a fixed layer on `<body>` covering the whole window, above everything SharePoint draws; the page behind is `inert` and does not scroll; the frame takes focus so the number keys work at once. The frame scrolls, not the page. |
| `webview` | A redirect to SharePoint's own `?env=WebView`, with the frame in the page flow. On the dev page this also hides the chrome, but it costs a reload, changes the rep's URL, and the page scrolls rather than the tool. |
| `none` | The frame in the page flow below SharePoint's chrome, sized to the viewport or to the height the player reports, whichever is larger. |

Never in edit mode, which shows a one-line placeholder instead. `?fullpage=none`
on the page URL turns it off for one visit. The layer hangs off `<body>`, not
the host, because SharePoint's canvas has transformed ancestors that would
make a fixed child relative to them. When SPA navigation removes the host,
the layer goes and the page is live again.

**An author reaches edit mode with `?Mode=Edit`** on the page URL, since the
takeover covers SharePoint's Edit button (or opens the page with
`?fullpage=none` and uses the button). Not yet walked on the tenant.

## SPA navigation

SharePoint's modern pages are a SPA. Poll `location.pathname` (about 1.5s)
to detect navigation. Do not patch the History APIs; that fights
SharePoint's own router and loses. For a full-page tool this matters at
mount and unmount, not during use.

## Caching

SharePoint caches aggressively. "Stale after deploy" is the default
experience, not an anomaly. Library files carry a day's `max-age`, so:

- **The loader's URL** in the snippet carries a hash of the loader
  (`?v=<sha>`, stamped by `tools/render-webpart.mjs`). A changed loader
  means re-rendering and re-pasting the snippet.
- **The player and its content** are fetched with `cache: "no-cache"`: an
  unchanged file costs a 304 on its ETag, a republished one shows at once.
  `Ver` is therefore a label, not the cache-buster. Not yet confirmed
  against a republish; a manual gate in `STATE.md`.

Never ask a rep for a hard refresh.

## Page columns

The Site Pages library's flexible columns, and what this app reads in them.
The internal names are in `environments.json` under `pageColumns`, so the
loader never hardcodes them.

| Column | Holds | Read by the loader |
| --- | --- | --- |
| `ItemType` | `fraud-decision-support`, so the loader can refuse a page it was not meant for | yes |
| `Script` | Library-relative path of the player bundle to load | yes |
| `Config` | File name of the content JSON, in the app's library folder | yes |
| `Ver` | Content version. The candidate cache-buster: read in the same call as `Config`, appended to the fetch URL | yes |
| `AppName` | The frame's accessible title (the player's visible header comes from its content) | yes |
| `Value1` | Status: `draft` or `live`. A draft page renders with the placeholder banner regardless of content | yes |
| `Category` | The site's own grouping; the app does not read it | no |
| `Title` | The page title; SharePoint's | no |

The loader reads them with one `$select` on the page's own item, then
fetches `Config` from the folder its own script was served from. The
snippet's `data-columns` carries the internal names from `environments.json`;
a name the site does not have fails the whole `$select` (HTTP 400) and the
loader falls back to the snippet defaults without a word. A relative
`Script` or `Config` must be a plain path inside that folder; anything else
is refused.

## Environments

- `environments.json` is gitignored. It holds real tenant paths: tenant,
  site, page, library, folder and the column names above. Copy it from
  `environments.sample.json`, which is committed and holds the shape only.
- The per-environment `fraud-guide.webpart.html` embed snippets are
  generated from it, not hand-edited.
- No other file in git holds a real tenant path.

## The blank-in-view-mode class of bug

An app that works in edit mode and is blank in view mode is almost always
one of: a mount point below the fold that never gets measured; an
edit-mode-only global; or a boot that ran before the host chrome reflowed.
Check in that order. The BMO copy already skips its first-paint
`scrollIntoView` for a related reason (`state.ui.intro`).

## Deploy

What ships to the library folder named in `environments.json`, and how.

| File | Role | Ships when |
| --- | --- | --- |
| `app/boot-fraud-guide.js` | The loader the web part points at | It changes; then re-render and re-paste the snippet, whose URL carries its hash |
| `app/fraud-decision-support-bmo.html`, `app/fraud-decision-support.html` | The players, one per look. Loaded into a frame until the content/theme split makes them scripts | They change |
| `<player>.flow.json` | The content the page's `Config` column names. Extracted from a player's `#flow-data` block (`JSON.stringify(flow, null, 2)` plus a newline) until the split | Content changes |

1. Run the fast tier and `tests/loader.mjs` on both players.
2. Copy the changed files into the library folder's OneDrive mirror (the
   sp-env skill's copy path; the mirror path is in that skill's machine
   config, never here). Confirm arrival by hashing each file as served
   against the local copy; sync took under a minute on 2026-09-30. If sync
   is backed up, the sp-env direct upload is the fallback. The library
   keeps prior versions.
3. Verify in a browser as a rep would see it: the tool fills the window,
   the first topic is the start topic, and the footer shows the served
   content version. Not a test; a manual gate in `STATE.md`.

**One-time page setup** (once per page; a human does it on prod):

1. `node tools/render-webpart.mjs dev` prints the snippet with the real
   loader URL and column names. Paste it into the page's modern script web
   part and publish. The `data-*` attributes are defaults, so the page works
   before any column is set.
2. Set the page item's columns: `ItemType` = `fraud-decision-support`,
   `Script` and `Config` = the file names in the folder, `Ver` = the
   content version, `AppName`, `Value1` = `draft` or `live`. The columns
   override the defaults from then on.

On dev the paste can be done over REST instead of by hand:
`POST /_api/sitepages/pages(<id>)/checkoutpage`, then `savepageasdraft`
with the edited `CanvasContent1`, then `publish`. From that endpoint
`CanvasContent1` is a JSON array of controls; the Script Editor's markup is
`webPartData.properties.script` and `.scriptCode` (set both). From the list
item the same field is HTML with entity-encoded JSON; do not edit that one.

The loader's contract, for the split later: a `Script` ending in `.js` is
injected into the page with `window.__fraudGuideBinding` set first, and the
script mounts into `[data-fraud-guide]` itself. Nothing else in the loader
changes.
