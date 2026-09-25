# STATE — fraud-decision-support

**Rewritten, never appended.** History lives in `LOG.md`. Cap: 150 lines — if
it is growing, something belongs in `LOG.md` or `docs/`.

Threads of work in progress: [`state/`](state/), one file per thread, kept by
the `project-state` skill.

## Where things stand

| | |
| --- | --- |
| **Version** | 0.3.1 — v3 layout, content 0.4 (guidance in the topic register) |
| **Deployed** | Nowhere. The file is opened locally. |
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

## Deferred by design

- **Persistence, backend, login, authoring UI, scenario picker, mobile
  layout, analytics.** Out of scope for a demo. The event log behind the
  scenes stands in for analytics.
- **Case notes and captured facts.** Built in v1, removed in v2: not asked
  for, and they crowded a screen meant for quick decisions. Bring back only
  if the client asks; `LOG.md` says what they were.
- **Project profile in projects-standard.** First demo of its kind; a
  profile is earned by the second.
- **SharePoint / sneakernet deployment.** Decided in shape, not started,
  and waits until the feature set settles after the wider demo. Each
  version is its own SharePoint page; the content JSON lives in a document
  library; the page's library properties bind the two (content file name,
  content version, status) and nothing more, so `meta` in the JSON stays
  the source for everything else. The player reads the binding from its own
  page item (`_spPageContextInfo.pageItemId`) and fetches the file
  same-origin with a cache-busting version on the URL. The page holds a
  small loader; the player script, CSS and the photo live in the scripts
  library, not in a web part property. Precondition: the content and theme
  split (`content/*.json`, `config/theme.json`, load order page properties
  → URL → sibling script → inline block). The single-file, no-`import`,
  no-CDN shape was chosen so none of this needs rework in the player.
- **Design pass.** The original stays greyscale and token-driven on purpose.
  A first BMO-styled copy exists beside it; see `state/` for where it stands.

## Open questions

- **Should a rep be able to jump to a topic in another stage?** Only the
  current stage is listed; search reaches everything. Settled by the demo.
- **Where should "Come back to this later" go?** Currently the next stage's
  first question, with the skipped step marked and clickable. Settled by
  the demo.
