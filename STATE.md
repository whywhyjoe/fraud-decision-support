# STATE — fraud-decision-support

**Rewritten, never appended.** History lives in `LOG.md`. Cap: 150 lines — if
it is growing, something belongs in `LOG.md` or `docs/`.

Threads of work in progress: [`state/`](state/), one file per thread, kept by
the `project-state` skill.

## Where things stand

| | |
| --- | --- |
| **Version** | 0.3.1 — v3 layout, content 0.4 (guidance in the topic register) |
| **Built** | Two single-file demos in `app/`, opened from `file://` |
| **Live** | Nothing. No tenant, site or library exists for it yet |
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
- [ ] Once hosted: the page-property binding resolves, the content fetch
      works in view mode for a rep with read-only rights, and a republished
      JSON shows without a hard refresh. Tenant only; not a test.

## Deferred by design

- **Persistence, backend, login, authoring UI, scenario picker, mobile
  layout, analytics.** Out of scope for a demo. The event log behind the
  scenes stands in for analytics.
- **Case notes and captured facts.** Built in v1, removed in v2: not asked
  for, and they crowded a screen meant for quick decisions. Bring back only
  if the client asks; `LOG.md` says what they were.
- **SharePoint / sneakernet deployment.** Decided in shape, not started,
  and waits until the feature set settles after the wider demo. Each
  version is its own SharePoint page; the content JSON lives in a document
  library; the page's library properties bind the two (content file name,
  content version, status) and nothing more, so `meta` in the JSON stays
  the source for everything else. The player reads the binding from its own
  page item (`_spPageContextInfo.pageItemId`) and fetches the file
  same-origin. The page holds a web part with a small loader; the player
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

- **Which site hosts it.** An end-user site of its own, not the DCS
  workbench, is decided; the tenant-relative site path is not. Every URL
  rule in `CLAUDE.md` waits on it.
- **How a republished content JSON beats the cache on SharePoint.** A
  version on the fetch URL only works if the player knows the version
  before it fetches, and a URL parameter cannot be relied on to reach the
  rep. Candidates: read the version from the page property and append it;
  read the item's modified stamp with the same REST call; or send
  `cache: "no-store"` on the fetch and accept the cost. Decide when the
  deployment work starts.

- **Should a rep be able to jump to a topic in another stage?** Only the
  current stage is listed; search reaches everything. Settled by the demo.
- **Where should "Come back to this later" go?** Currently the next stage's
  first question, with the skipped step marked and clickable. Settled by
  the demo.
