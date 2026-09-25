# Hosting, boot and deploy

Seeded from the `sp-app` family's paid-for gotchas in projects-standard,
kept where they apply to this app. The SharePoint work has not started;
`STATE.md` says when it does. Until then the demo is opened from `file://`
and none of this runs.

## The decided shape

- **One SharePoint page per version.** The page is the stable link a rep
  gets. It holds a web part with a small loader and nothing else.
- **Player in a library.** `fraud-guide.app.js`, its CSS and any assets
  (the BMO copy's header photo becomes a file here, not a base64 token)
  live in a library on the site, as with every other app of this family.
- **Content in a library.** The scenario JSON (`content/*.json`, once the
  split in `STATE.md` has happened) lives in a document library. The
  library's version history is the content history.
- **Binding in the page's properties.** Three columns on the page item:
  content file name, content version, status. Nothing else; `meta` in the
  JSON is the source for everything else.
- **Its own site, for end users.** Not the DCS workbench. The site path is
  not chosen yet; it is an open question in `STATE.md`.

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

## SPA navigation

SharePoint's modern pages are a SPA. Poll `location.pathname` (about 1.5s)
to detect navigation. Do not patch the History APIs; that fights
SharePoint's own router and loses. For a full-page tool this matters at
mount and unmount, not during use.

## Caching

SharePoint caches aggressively. "Stale after deploy" is the default
experience, not an anomaly. Version the player bundle's path or query
string on every deploy. How a republished content JSON beats the cache is
an open question in `STATE.md`; do not assume a hard refresh, and never ask
a rep for one.

## Environments

- `environments.json` is gitignored. It holds real tenant paths.
- The per-environment `fraud-guide.webpart.html` embed snippets are
  generated, not hand-edited.
- The repo holds a `.sample.json` for any config, never the real one.

## The blank-in-view-mode class of bug

An app that works in edit mode and is blank in view mode is almost always
one of: a mount point below the fold that never gets measured; an
edit-mode-only global; or a boot that ran before the host chrome reflowed.
Check in that order. The BMO copy already skips its first-paint
`scrollIntoView` for a related reason (`state.ui.intro`).

## Deploy

Not yet written. When the SharePoint work starts, this section names the
files, the libraries, the order, and the verification step: a deploy that
cannot be verified is a deploy that silently half-happened. The sneakernet
pattern (dev tenant closed-loop, prod by copy and a human-run harness) is
the expected procedure.
