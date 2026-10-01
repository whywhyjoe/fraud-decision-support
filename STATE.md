# STATE — fraud-decision-support

**Rewritten, never appended.** History lives in `LOG.md`. Cap: 150 lines — if
it is growing, something belongs in `LOG.md` or `docs/`.

Threads of work in progress: [`state/`](state/), one file per thread, kept by
the `project-state` skill.

## Where things stand

| | |
| --- | --- |
| **Version** | 0.3.1 — v3 layout, content 0.4 (guidance in the topic register) |
| **Built** | Two players, the web part loader (0.3.0, to the DCS L1 hosting method: entry file, nonce-stamped srcdoc frame, full-window takeover), the entry template and renderer. Loader proven in `tests/loader.mjs` against SharePoint's headers and CSP |
| **Live** | Dev page (an App page, version 9.0) runs the BMO player full-window through loader 0.3.0, its Script Editor in external mode on `fraud-guide.webpart.html`, bound by the page's columns. Library folder holds the entry, the loader, the BMO player and its `flow.json`, hash-checked 2026-10-01; the greyscale files were deleted the same day (site recycle bin). See `state/` |
| **Last shipped** | 2026-09-22, content 0.4 |
| **Content** | One scenario, 47 topics, placeholder throughout |
| **Player** | `app/fraud-decision-support-bmo.html`, content 0.5 (richer guidance). The greyscale original was deleted 2026-10-01 (Joe); it is in git history |

## Next committed step

Demo it to the client and capture what they flag. **Something wrong with
this step?** on every question is the requirements intake; nothing else gets
built until it has been used once.

## Blocking

- [ ] Client demo has not happened.

## Manual gates

- [ ] Open the file from `file://` in the client's actual locked-down browser
      (not a dev machine) and confirm it renders.
- [x] Dev page, first light (2026-09-30, as the site owner): the tool fills
      the window with no SharePoint chrome, answers and number keys work,
      the footer and `Behind the scenes` show the served content version,
      `?fullpage=none` gives the in-page layout back. The page columns were
      already set and override the snippet defaults (`AppName`, `Ver`).
- [x] Republished `flow.json` shows on an ordinary reload with a warm
      cache (2026-09-30).
- [x] Edit mode entered and left without a reload: placeholder while
      editing, the guide back after Save (2026-09-30). The author's way in
      is `?fullpage=none`, then Edit; `?Mode=Edit` does nothing on an App page.
- [x] Read-only rep on dev: permissions checked 2026-09-30 (Visitors reach
      the page item and every file, all inherited; Site Pages drafts are
      author-only, so the page must stay published). The real run as a
      Read-only user is left for production, by Joe's call.
- [ ] Work tenant, for the demo: deploy per `docs/02` *Deploying to the
      work tenant* and run `tools/preflight-console.js` on the page. It
      reports the one thing dev cannot tell us: whether the work page's
      script policy has a nonce or `'unsafe-eval'`. With neither the guide
      shows only its quiet unavailable line.

## Deferred by design

- **Persistence, backend, login, authoring UI, scenario picker, mobile
  layout, analytics.** Out of scope for a demo. The event log behind the
  scenes stands in for analytics.
- **Case notes and captured facts.** Built in v1, removed in v2: not asked
  for, and they crowded a screen meant for quick decisions. Bring back only
  if the client asks; `LOG.md` says what they were.
- **SharePoint production deployment.** The dev page is live (see above);
  production waits until the feature set settles after the wider demo.
  Until then it is the manual *One-time page setup* in `docs/02`; a
  sneakernet provisioning path (the sp-env harness's PnPjs `provision` and
  `verify` ops, which cover the Site Pages columns but not the page's
  column values or the external-mode web part) is deliberately not built
  for a light demo. Each
  version is its own SharePoint page; the content JSON lives in a document
  library; the page's library properties bind the two (content file name,
  content version, status) and nothing more, so `meta` in the JSON stays
  the source for everything else. The loader reads the binding from its own
  page item by the page's path and fetches the files same-origin. The page holds a web part with a small loader; the player
  script, CSS and assets live in a library, as with every other app. Hand
  edits to the JSON are guarded by the graph checks in the fast test, run
  before upload, and by a red line behind the scenes when loaded content
  fails them. Precondition: the content and theme
  split (`content/*.json`, `config/theme.json`, load order page properties
  → URL → sibling script → inline block). The single-file, no-`import`,
  no-CDN shape was chosen so none of this needs rework in the player.
- **Design pass.** The BMO look is the design; it stays token-driven so a
  further pass is a restyle. See `state/` for where it stands.

## Open questions

- **Which production site hosts it long-term.** An end-user site of its
  own, not the DCS workbench, is decided but not chosen. For the demo, Joe
  deploys to the work tenant's FCUPortal `code` library (2026-09-30);
  `docs/02` has the steps.

- **Should a rep be able to jump to a topic in another stage?** Only the
  current stage is listed; search reaches everything. Settled by the demo.
- **Where should "Come back to this later" go?** Currently the next stage's
  first question, with the skipped step marked and clickable. Settled by
  the demo.
