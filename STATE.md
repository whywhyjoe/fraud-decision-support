# STATE — frd-decision-support

**Rewritten, never appended.** History lives in `LOG.md`. Cap: 150 lines — if
it is growing, something belongs in `LOG.md` or `docs/`.

Threads of work in progress: [`state/`](state/), one file per thread, kept by
the `project-state` skill.

## Where things stand

| | |
| --- | --- |
| **Version** | 0.1.0 — first demo build |
| **Deployed** | Nowhere. The file is opened locally. |
| **Last shipped** | 2026-09-16, wireframe v1 |
| **Content** | One scenario, 47 nodes, placeholder throughout |

## Next committed step

Demo it to the client and capture what they flag. The flag list on the debug
screen is the requirements intake; nothing else gets built until it has been
used once.

## Blocking

- [ ] Client demo has not happened.

## Manual gates

- [ ] Open the file from `file://` in the client's actual locked-down browser
      (not a dev machine) and confirm it renders and the copy button works.
      Clipboard on `file://` is a secure context in Chromium and Edge; not
      verified on whatever the client runs.

## Deferred by design

- **Persistence, backend, login, authoring UI, scenario picker, mobile
  layout, analytics.** Out of scope for a wireframe. The debug event log
  stands in for analytics so the client can see rewinds and lateral jumps are
  measurable.
- **Project profile in projects-standard.** This is the first demo wireframe;
  a profile is earned by the second. Lessons are in `LOG.md`.
- **SharePoint / sneakernet deployment.** Expected eventually. The single-file,
  no-`import`, no-CDN shape was chosen so that it needs no rework when that
  day comes. Nothing else has been done toward it.
- **Design pass.** The wireframe is grayscale and token-driven on purpose. A
  designer restyles by editing `:root` and targeting `data-role` attributes.

## Open questions

- **Should lateral jumps be limited to the current stage?** The panel opens
  on the current stage but lets the rep switch stage tabs. The brief said
  current stage only; the tab row is there to let the client react. Settled
  by the demo.
- **Does "I don't know yet" move to the next stage, or stay put?** Currently
  parks the node and moves to the stage's *not applicable* target, with a
  Return chip in the tray. Settled by the demo.
