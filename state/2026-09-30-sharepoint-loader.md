# State — SharePoint loader

Last touched: 2026-09-30
Mode: Joe
Branch: `main` of `whywhyjoe/fraud-decision-support`, pushed
State: loader and players built and tested locally; nothing uploaded to the dev library yet; the page's web part is empty.

## What this is

Getting the demo onto the dev SharePoint page as a web part: a loader in
the library that the page's script web part points at, the players booting
from a content file in the same folder, and the page's own columns binding
the two. `docs/02-hosting-and-deploy.md` has the procedure and the column
mapping; `environments.json` (gitignored) has the real paths.

## Done

- `app/boot-fraud-guide.js`, the `?content=` boot in both players,
  `app/fraud-guide.webpart.sample.html` + `tools/render-webpart.mjs`,
  `tests/loader.mjs`. All green locally, both players.
- The dev library folder already holds `fraud-decision-support-bmo.flow.json`,
  byte-identical to the BMO player's inline content, so it needs no upload.

## Next

- [ ] Upload to the dev folder: `boot-fraud-guide.js` (replaces the 25 Sep
      file; the library keeps the old version), both players, and
      `fraud-decision-support.flow.json` (extract it with the one-liner in
      `tests/loader.mjs`, or take it from the deploy bundle the build
      session sent). The build session could not: the Microsoft 365
      connector has `Files.Read.All` only. Granting `Files.ReadWrite.All`
      admin consent to that connector's app would let a session do it.
- [ ] `node tools/render-webpart.mjs dev`, paste the output into the page's
      modern script web part, publish.
- [ ] Open the page as a rep and walk the first manual gate in `STATE.md`.
      Record what broke in *Landmines* here; the blank-in-view-mode list
      in `docs/02` is where to look first.
- [ ] Set the page columns and walk the second gate.

## Open questions

- **Column internal names.** The loader selects `ItemType, Script, Config,
  Ver, DisplayName, Value1` by those names. If the site's internal names
  differ from the display names, set `data-columns` on the host
  (`{"script":"InternalName", …}`) or fix `COLUMNS` in the loader.
- **What was the 25 Sep `boot-fraud-guide.js` in the folder?** 9,810 bytes,
  not in git, unreadable from the build session (the connector refuses
  JavaScript). If it was yours and matters, pull it from version history
  before it is replaced.

## Landmines

- **`.html` from a document library renders only on a site that allows
  custom script.** The dev site has a script web part, so it does. A site
  without it serves the file as a download and the frame stays blank; that
  is the case for the content/theme split to solve, not a loader bug.
- **`data-fullpage="webview"` redirects the page** to `?env=WebView` on
  first load. It never fires in edit mode, and never when the parameter is
  already present, so there is no loop; but an author who lands on the page
  in view mode is redirected too. Set it to `none` in the snippet if that
  is unwelcome.
- **The binding lookup is by the page's server-relative path**
  (`getFileByServerRelativeUrl`), not `pageItemId`, because
  `_spPageContextInfo` is not reliably present on modern pages. A renamed
  page keeps working; a page reached through a redirect path does not.
- **Playwright kills.** `pkill -f "http.server 8646"` kills the shell that
  ran it if the pattern is in that shell's own command line. `tests/loader.mjs`
  runs its own node http server for that reason.
