# State — SharePoint loader

Last touched: 2026-09-30
Mode: Joe
Branch: `main` of `whywhyjoe/fraud-decision-support`, pushed
State: loader 0.3.0 live on the dev page to the DCS L1 hosting method; three of four manual gates walked. Left: a read-only rep, and the production CSP check.

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

- [ ] The read-only rep gate in `STATE.md`: permissions are verified (see
      there); only a real run as a Read-only user is left. NewNerve Visitors
      is empty; Joe adds a user or opens the page as one. Access for the
      agent is not the issue: the sp-env profile is Joe's own, read-write.
- [ ] Decide what happens to the uncommitted 25 Sep files in the working
      tree (see *Open questions*).
- [ ] Then the client demo can use the dev page instead of `file://`.

## Open questions

- **The uncommitted 25 Sep files: keep, commit or delete?** Joe to decide.
  `sp/boot-fraud-guide.js` is the loader that was live until 2026-09-30;
  superseded. `deploy/deploy.mjs`, `deploy/env.mjs`, `deploy/verify.mjs` are
  a node deploy script (mirror or REST upload, hash parity, web part and
  page columns, verify) written against that older loader; the repo has no
  deploy script, so reworking it may beat deleting it. Untracked, untouched.
- **The snippet-default path has not been seen on the tenant.** The page's
  columns were set on 25 Sep, so the live page takes the column path. The
  default path is proven only in `tests/loader.mjs`. Joe to say if it matters.

## Companion documents

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
  on 25 Sep by the uncommitted `deploy/` script. Read the page item first.
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
