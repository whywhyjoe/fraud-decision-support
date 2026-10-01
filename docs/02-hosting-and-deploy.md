# Hosting, boot and deploy

The method is the DCS Workbench one, tier L1 (a full-page app):
`dcs-workbench-tools/docs/01-hosting-and-boot.md`. Read it before changing
how the guide loads. This file holds what is specific to this app and where
it departs from that method. The dev page runs the loader below (`STATE.md`
says what is live); the `file://` demo is unaffected by any of it.

## The decided shape

- **One SharePoint page per version.** The page is the stable link a rep
  gets. It is an App page (`SingleWebPartAppPage`) holding one Modern Script
  Editor in external mode, whose Script URL names the entry file
  `fraud-guide.webpart.html` in the library. Nothing else is on the page.
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
player stays blank. The loader fetches the player as text, splices the bound
content (fetched and shape-checked) into its `#flow-data` block, and writes
it into a `srcdoc` frame. A `srcdoc` frame inherits the page's CSP, which has
no `'unsafe-inline'`, so the loader stamps the host page's nonce on the
player's scripts and styles, as DCSPad does. On a page with no nonce the
scripts are lifted out instead and run with the frame's `eval`; the dev
tenant allows `'unsafe-eval'`, production is unverified. Content that fails
the check leaves the player on its own inline block. The host div's
`data-scripts` says which path ran (`nonce` on the dev page, 2026-09-30).
The player's `?content=` boot is for plain http hosting and is not used on
SharePoint. `tests/loader.mjs` serves SharePoint's headers and proves both
paths: a nonce-only CSP with no eval, and an eval-only CSP with no nonce.

## Full page

`data-fullpage` on the host div:

| Value | What the rep gets |
| --- | --- |
| `takeover` (the snippet's default) | A curtain over the whole window as soon as the loader runs, then the frame in its place: a fixed layer on `<body>` above everything SharePoint draws, the page behind `inert` and not scrolling, focus in the frame so the number keys work at once. The frame scrolls, not the page. |
| `webview` | A redirect to SharePoint's own `?env=WebView`, with the frame in the page flow. On the dev page this also hides the chrome, but it costs a reload, changes the rep's URL, and the page scrolls rather than the tool. |
| `none` | The frame in the page flow below SharePoint's chrome, sized to the viewport or to the height the player reports, whichever is larger. |

The layer hangs off `<body>`, not the host, because SharePoint's canvas has
transformed ancestors that would make a fixed child relative to them. When
SPA navigation removes the host, the layer goes and the page is live again.
DCS L1 pins under the suite bar instead; covering it was asked for.

**Edit mode.** Never taken over: a one-line placeholder instead, and the
guide comes back when edit mode ends, without a reload (walked on the dev
page 2026-09-30). An App page edits with no URL change, so the signals are
DOM ones: its property pane (`data-automation-id="showPane"`,
`"propertyPaneClose"`) and the command bar's Edit button turning into Save,
beside the article-page signals the house `fcu-standard.js` uses. The house
`__dcsIsEditMode()` itself is not called: its stored edit intent never clears
(`bsp-sp-parts/dev/vendor/fcu-standard-additions.js`, item 6).

**An author gets to edit mode through `?fullpage=none`**, then SharePoint's
Edit button, since the takeover covers it. `?Mode=Edit` does not work on an
App page: SharePoint strips it and opens the page in view mode.

## SPA navigation

SharePoint's modern pages are a SPA. The loader uses the house
`dcsOnSpaNavigation` bus when the page has it, and otherwise polls the URL
(path and query, about 1.5s). It does not patch the History APIs itself,
which DCS does for edit mode: an App page's edit mode leaves the URL alone,
so the patch would not see it, and the MutationObserver does. For a
full-page tool this matters at mount and unmount, not during use.

## Caching

SharePoint caches aggressively. "Stale after deploy" is the default
experience, not an anomaly. Library files carry a day's `max-age`, so:

- **The entry file** is fetched by the web part itself with its own
  `?pnp=<timestamp>`, so it is never stale.
- **The loader's URL** in the entry file carries a hash of the loader
  (`?v=<sha>`, stamped by `tools/render-webpart.mjs`). A changed loader
  means rendering and uploading the entry file again; the page is not edited.
- **The player and its content** are fetched with `cache: "no-cache"`: an
  unchanged file costs a revalidation (about 300 bytes), a republished one
  shows on the next ordinary load. Confirmed on the dev page 2026-09-30.
  `Ver` is therefore a label, not the cache-buster. DCS stamps `?v=` from
  `Last-Modified` instead; for two fetched files, revalidation is enough.

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
| `Ver` | Content version. A label: the fetch revalidates, so it is not the cache-buster | yes |
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
- The per-environment `fraud-guide.webpart.html` entry files are
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
| `app/fraud-guide.webpart.html` | The entry file the web part's Script URL names. Generated, gitignored | The loader changes (its URL carries the loader's hash), or the snippet defaults do |
| `app/boot-fraud-guide.js` | The loader | It changes; always with a fresh entry file |
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

1. `node tools/render-webpart.mjs dev` writes the entry file with the real
   loader URL and column names, and prints the Script URL. Upload the entry
   file with the rest. In the page's Modern Script Editor, turn on *Use
   external script* and set *Script URL* to the printed URL; publish. The
   `data-*` attributes are defaults, so the page works before any column is
   set. From then on the page is never edited for a deploy.
2. Set the page item's columns: `ItemType` = `fraud-decision-support`,
   `Script` and `Config` = the file names in the folder, `Ver` = the
   content version, `AppName`, `Value1` = `draft` or `live`. The columns
   override the defaults from then on.

On dev the web part can be set over REST instead of by hand:
`POST /_api/sitepages/pages(<id>)/checkoutpage`, then `savepageasdraft`
with the edited `CanvasContent1`, then `publish`. From that endpoint
`CanvasContent1` is a JSON array of controls; the Script Editor's settings
are in `webPartData.properties`: `useExternalScript: true` and
`externalScript: <URL>` for the entry, and `script` / `scriptCode` for inline
markup (kept equal to the entry file, so turning external mode off still
works). From the list item the same field is HTML with entity-encoded JSON;
do not edit that one.

## Deploying to the work tenant (the demo)

The lightest deploy: three files and one page. No content file (the player
carries its content) and no page columns (the entry file's defaults serve).
The work machine has git, Node and the synced FCUPortal folders; the work
tenant has no PnP PowerShell, so every SharePoint step is in the browser.
Where it lives: the FCUPortal site's `code` library, folder
`fraud-decision-support` (sp-env's `code` root on the work tenant).

1. Once: `environments.json` (gitignored). Copy `environments.sample.json`
   if it is not there, and fill the `prod` block: `tenant`, `site`, `library`
   (`code`), `folder` (`fraud-decision-support`), `page`, and `mirror`: the
   synced local folder that is the library folder, with forward slashes.
2. Once: create the `fraud-decision-support` folder in the library in the
   browser and let it sync. The deploy does not create it.
3. Every deploy: run `deploy\deploy.cmd`. It runs `git pull`, then
   `node tools/deploy.mjs prod --no-config`, which renders
   `app/fraud-guide.webpart.html`, copies the three files (loader, BMO
   player, entry file) into `mirror`, checks each copy and prints the
   Script URL. Wait for the files to show in the library.
4. If you want the content checks first: `node --test tests/flow.test.mjs`
   with `APP=fraud-decision-support-bmo.html`.
5. One-time page: a page holding only the Modern Script Editor (an App page,
   like dev). In its settings: *Use external script* on, *Script URL* = the
   URL printed in step 3, *Remove padding* on. Publish. A draft page is invisible
   to readers.
6. Open the page in view mode. Paste `tools/preflight-console.js` into the
   browser console; it prints and copies a JSON report whose `verdict` says
   whether the guide runs, and if not, why (the page's script policy, a
   missing file, the entry not loaded). Paste it to JSFiddle or chat.

To edit the page later: open it with `?fullpage=none`, then Edit.
Every redeploy, loader or player, is step 3 alone; the page is not
touched again.

The loader's contract, for the split later: a `Script` ending in `.js` is
injected into the page with `window.__fraudGuideBinding` set first, and the
script mounts into `[data-fraud-guide]` itself. Nothing else in the loader
changes.
