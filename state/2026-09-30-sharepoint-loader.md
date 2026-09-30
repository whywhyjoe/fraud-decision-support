# State — SharePoint loader

Last touched: 2026-09-30
Mode: Joe
Branch: `main` of `whywhyjoe/fraud-decision-support`, pushed
State: loader 0.3.0 live on dev and ready for the work tenant: three files, one page, a console preflight. Waiting on Joe's work-side deploy.

## What this is

Getting the demo onto the dev SharePoint page as a web part: a loader in
the library that the page's Script Editor reaches through an entry file,
the players and their content files in the same folder, and the page's own
columns binding the two. The method is `dcs-workbench-tools/docs/
01-hosting-and-boot.md` (tier L1); `docs/02-hosting-and-deploy.md` has what
is specific to this app and where it departs. `environments.json`
(gitignored) has the real paths.

## Done

- Loader 0.3.0: entry file in external mode, double-boot guard, curtain,
  nonce-stamped `srcdoc` frame (eval only as fallback), App-page edit-mode
  detection. `tests/loader.mjs` proves both script paths under SharePoint's
  headers; green on both players.
- Dev page is version 7.0: Script Editor with `useExternalScript` on the
  entry file. Library folder holds the entry, the loader, both players and
  both `flow.json` files, hash-checked.
- Walked live as Joe (site owner): nonce path runs, no CSP violations; the
  page picks up a new loader from an upload alone; edit mode in and out
  without a reload; a republished `flow.json` shows on an ordinary reload
  (tested with a changed version label, then restored and hash-checked).

## Next

- [ ] Joe deploys to the work tenant (FCUPortal `code` library) with
      `docs/02` *Deploying to the work tenant*, and pastes back the
      preflight report. If its verdict is not Ready, fix from the report.
      The client demo happens there, not on dev.
- [ ] The real run as a Read-only rep also happens there (Joe, 2026-09-30);
      permissions on dev are verified.

## Open questions

- **The snippet-default path has not been seen on the tenant.** The page's
  columns were set on 25 Sep, so the live page takes the column path. The
  default path is proven only in `tests/loader.mjs`. Joe to say if it matters.

## Companion documents

- `.scratch/old-2026-09-25/` — **reference only**, gitignored: the loader
  that was live before 2026-09-30 (`sp/`) and a node deploy script written
  for it (`deploy/`). Never committed. Superseded; a starting point at most
  when provisioning is built. Delete when that is done.
- `.scratch/TODO-sp-loader-harmony.md` — **parked**, uncommitted. The
  cross-repo proposal to make the DCS hosting doc canonical. Joe is moving
  it to his dev root; nothing here depends on it.

## Landmines

- **The dev page is an App page** (`SingleWebPartAppPage`). Its edit mode
  changes neither the URL nor the article-page authoring markers; the
  loader keys on the property pane and the Edit button turning into Save.
  `?Mode=Edit` is stripped and does nothing. An author gets in through
  `?fullpage=none`, then Edit. Save on an unchanged App page did not bump
  the version (7.0 before and after).
- **Production's CSP is unknown.** The loader needs a nonce on the page (its
  main path) or `'unsafe-eval'` (its fallback). The dev tenant has both.
- **A library serves `.html` as a download**, so a frame pointed at it is
  blank. The first committed loader did that and would never have worked;
  the DCS doc already said so. Check any new way of loading a library file
  against the served headers, not plain http.
- **Page state claimed in a state file can be stale.** This thread's first
  file said the web part was empty and the columns unset; both had been set
  on 25 Sep by a deploy script that was never committed (now in
  `.scratch/old-2026-09-25/`). Read the page item first.
- **`DisplayName` does not exist on the site; `AppName` does.** A `$select`
  naming a missing column fails the whole lookup (HTTP 400) and the loader
  falls back to the snippet defaults silently.
- **`/_api/sitepages/pages(id)/savepagedraft` is a 404**; it is
  `savepageasdraft`. `CanvasContent1` from that API is a JSON array; from
  `ListItemAllFields` it is HTML. A failed save leaves the page checked out;
  `publish` checks it back in.
- **`pageerror: undefined` twice on every load** is SharePoint's own.
- Hard rule 7 (no PowerShell) holds: the upload was a copy into the sp-env
  mirror, every check ran through the sp-env Playwright profile from node.
- **A rep sees only published page versions.** Site Pages keeps minor
  versions with drafts visible to authors only; a page left as a draft is
  invisible to Visitors while it looks fine to Joe. FCUPortal has no minor
  versions, so an uploaded file is live for everyone at once.
- **The binding lookup is by the page's server-relative path**, not
  `pageItemId`; a page reached through a redirect path does not bind.
- **Playwright on this machine**: not global; use
  `NODE_PATH=C:/dev/repos/sp-traffic-analytics/tools/node_modules`.
