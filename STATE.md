# STATE — frd-decision-support

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
- **SharePoint / sneakernet deployment.** Expected eventually. The
  single-file, no-`import`, no-CDN shape was chosen so it needs no rework
  then. Nothing else has been done toward it.
- **Design pass.** Greyscale and token-driven on purpose. A designer restyles
  by editing `:root` and targeting `data-role` attributes.

## Open questions

- **Should a rep be able to jump to a topic in another stage?** Only the
  current stage is listed; search reaches everything. Settled by the demo.
- **Where should "Come back to this later" go?** Currently the next stage's
  first question, with the skipped step marked and clickable. Settled by
  the demo.
