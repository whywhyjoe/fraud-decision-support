# STATE — fraud-decision-support

**Rewritten, never appended.** History lives in `LOG.md`. Cap: 150 lines — if
it is growing, something belongs in `LOG.md` or `docs/`.

Threads of work in progress: [`state/`](state/), one file per thread, kept by
the `project-state` skill.

## Where things stand

| | |
| --- | --- |
| **Version** | 0.3.1 — v3 layout, content 0.4 (guidance in the topic register) |
| **Built** | Two players, the web part loader (0.2.0: srcdoc frame, full-window takeover), the snippet template and renderer. Loader proven in `tests/loader.mjs` against SharePoint's headers |
| **Live** | Dev page runs the BMO player full-window through loader 0.2.0, bound by the page's columns (page version 6.0, 2026-09-30). Library folder holds the loader, both players and both `flow.json` files, hash-checked. See `state/` |
| **Last shipped** | 2026-09-22, content 0.4 |
| **Content** | One scenario, 47 topics, placeholder throughout |
| **BMO copy** | `app/fraud-decision-support-bmo.html`, content 0.5 (richer guidance). The original stays greyscale at 0.4 |

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
- [ ] Open the dev page as a read-only rep, not an owner: the page-item
      lookup and the two library fetches must work with read rights.
- [ ] Republish a changed `flow.json` and reload the page normally: the
      change must show without a hard refresh (`no-cache` revalidation).
- [ ] An author gets into edit mode with `?Mode=Edit` and sees the
      placeholder, not the takeover.

## Deferred by design

- **Persistence, backend, login, authoring UI, scenario picker, mobile
  layout, analytics.** Out of scope for a demo. The event log behind the
  scenes stands in for analytics.
- **Case notes and captured facts.** Built in v1, removed in v2: not asked
  for, and they crowded a screen meant for quick decisions. Bring back only
  if the client asks; `LOG.md` says what they were.
- **SharePoint production deployment.** The dev page is live (see above);
  production waits until the feature set settles after the wider demo. Each
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
- **Design pass.** The original stays greyscale and token-driven on purpose.
  A first BMO-styled copy exists beside it; see `state/` for where it stands.

## Open questions

- **Which production site hosts it.** An end-user site of its own, not the
  DCS workbench, is decided. Dev has a page and a library folder, recorded
  in `environments.json` (gitignored; shape in `environments.sample.json`).
  Production is not chosen.
- **How a republished content JSON beats the cache on SharePoint.**
  Chosen for now: the loader fetches the player and content with
  `cache: "no-cache"` (an ETag revalidation per load), so `Ver` is a label.
  Open until the republish gate above is walked.

- **Should a rep be able to jump to a topic in another stage?** Only the
  current stage is listed; search reaches everything. Settled by the demo.
- **Where should "Come back to this later" go?** Currently the next stage's
  first question, with the skipped step marked and clickable. Settled by
  the demo.
