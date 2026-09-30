# State — SharePoint loader

Last touched: 2026-09-30
Mode: Joe
Branch: `main` of `whywhyjoe/fraud-decision-support`, pushed
State: loader 0.2.0 live on the dev page, full-window; first manual gate walked as the site owner. Three gates left, one needs a rep account.

## What this is

Getting the demo onto the dev SharePoint page as a web part: a loader in
the library that the page's script web part points at, the players and
their content files in the same folder, and the page's own columns binding
the two. `docs/02-hosting-and-deploy.md` has the procedure, the full-page
modes and the column mapping; `environments.json` (gitignored) has the real
paths.

## Done

- Loader 0.2.0 (`app/boot-fraud-guide.js`): player fetched as text into a
  `srcdoc` frame, content validated and handed over as `window.FLOW`,
  full-window takeover by default. `tests/loader.mjs` mimics SharePoint's
  headers and CSP; green on both players, and it fails the previous loader.
- Uploaded through the OneDrive mirror and hash-checked as served: the
  loader, both players, `fraud-decision-support.flow.json` (new) and
  `fraud-decision-support-bmo.flow.json` (unchanged).
- Snippet rendered and pasted over REST; page published as version 6.0.
  The 5.0 canvas is in the page's version history.
- Gate 1 walked in Playwright as Joe (site owner): binding read from the
  columns, content from `Config`, frame covers the 1400×900 window at every
  probed point, first answer advances, number keys work, frame scrolls and
  the page does not, `?fullpage=none` gives the in-page layout.

## Next

- [ ] Walk the three remaining gates in `STATE.md`: a read-only rep, a
      republished `flow.json` without a hard refresh, `?Mode=Edit` for an
      author. The rep gate needs an account with read rights only on the
      dev site; none is known to this repo. Ask Joe for one, or have Joe
      open the page as such a user.
- [ ] Decide what happens to the uncommitted 25 Sep files in the working
      tree (see *Open questions*).
- [ ] Then the client demo can use the dev page instead of `file://`.

## Open questions

- **The uncommitted 25 Sep files: keep, commit or delete?** Joe to decide.
  `sp/boot-fraud-guide.js` is the loader that was live until today (its
  technique is now in the committed loader). `deploy/deploy.mjs`,
  `deploy/env.mjs`, `deploy/verify.mjs` are a node deploy script (mirror or
  REST upload, hash parity, snippet, page columns, verify) written against
  that older loader and snippet shape; the repo has no deploy script, so
  it may be worth reworking rather than deleting. They are untracked and
  were left untouched.
- **The snippet-default path has not been seen on the tenant.** The page's
  columns were already set on 25 Sep, so the live page takes the column
  path. The default path is proven only in `tests/loader.mjs`. Proving it
  live means clearing the columns on this page or a second scratch page;
  neither was done. Joe to say if it matters.

## Landmines

What broke on the way to first light, 2026-09-30:

- **The committed loader could never have worked on SharePoint.** A library
  serves `.html` with `Content-Disposition: attachment`, so `<iframe src>`
  at the player is blank. Fixed by the fetch + `srcdoc` + `eval` technique;
  the test now serves the same headers. Any new way of loading a library
  file needs checking against the served headers, not plain http.
- **This thread's previous file was stale about the tenant.** It said the
  web part was empty and the columns unset. Both had been set on 25 Sep by
  the uncommitted `deploy/` script (page version 5.0). Read the page item
  (`ListItemAllFields`) before trusting a claim about page state.
- **`DisplayName` does not exist on the site; `AppName` does.** A `$select`
  naming a missing column fails the whole lookup with HTTP 400, and the
  loader falls back to the snippet defaults silently. The snippet now
  carries the names from `environments.json`.
- **`/_api/sitepages/pages(id)/savepagedraft` is a 404**; the endpoint is
  `savepageasdraft`. `CanvasContent1` from the sitepages API is a JSON
  array; from `ListItemAllFields` it is HTML. Edit the JSON one.
- **A failed save leaves the page checked out** to the caller. The first
  paste attempt did; the retry's `publish` checked it back in.
- **Swapping the loader breaks the page until the snippet is re-pasted**:
  the old snippet's host (`#fraud-guide-root`) is not the new one's
  (`[data-fraud-guide]`). Upload and paste in the same sitting.
- **`pageerror: undefined` twice on every load** is SharePoint's own, not
  the loader's; it was there with the 25 Sep loader too.
- Hard rule 7 (no PowerShell) holds for the repo. The sp-env skill's
  machine tooling is PowerShell and was not needed: the upload was a copy
  into the mirror and every check ran through the skill's Playwright
  profile from node.
- **`.html` from a document library** never renders directly on any site;
  that is not a custom-script setting. The frame technique above is the
  only route until the content/theme split makes the player a `.js`.
- **The binding lookup is by the page's server-relative path**
  (`getFileByServerRelativeUrl`), not `pageItemId`, because
  `_spPageContextInfo` is not reliably present on modern pages. A renamed
  page keeps working; a page reached through a redirect path does not.
- **Playwright on this machine**: not global; use
  `NODE_PATH=C:/dev/repos/sp-traffic-analytics/tools/node_modules`.
