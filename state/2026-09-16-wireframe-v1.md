# State — wireframe v1

Last touched: 2026-09-16
Mode: Joe
Branch: `claude/fraud-decision-support-demo-oalc9g`, pushed
State: v1 built, tested, committed. Waiting on the client demo.

## What this is

A single-file click-through wireframe of a guided decision-support tool for
bank fraud reps, built to draw requirements out of a vague client. One
scenario (unauthorised card transactions), placeholder content throughout.
The deliverable is `app/fraud-decision-support.html`; `README.md` says how to
demo it.

## Done

- All eight required interactions work and are covered by `tests/smoke.mjs`.
- Content graph and CSS token discipline are enforced by `tests/flow.test.mjs`.
- Docs, STATE, LOG on the projects-standard `_base` shape, by hand.

## Next

- [ ] Run the demo in the order `README.md` gives (full path → lateral →
      rewind). Have the client press **Flag this node** whenever they
      disagree; export the flag list from the debug screen afterwards by
      copying the *Flagged nodes* section. That list is the requirements
      intake.
- [ ] Before the demo, open the file on a machine with the client's browser
      lockdown (see `STATE.md` manual gates). Clipboard on `file://` is the
      one thing that might not work there; the note is still selectable.
- [ ] After the demo, decide the two open questions in `STATE.md` (lateral
      jumps across stages; where *I don't know yet* moves on to) and delete
      whichever affordance loses.

## Open questions

None blocking. The two in `STATE.md` are for the client.

## Landmines

- **Every CSS raw value must be a token**, and the fast test fails otherwise.
  Adding a rule means adding a `:root` variable first. Media queries are the
  one exception.
- **Only one stale set is kept.** A second rewind-and-change while a notice
  is showing discards the first set (logged as `stale`, the old notice is
  replaced). Deliberate for the wireframe; the client may want a history.
- **Inputs inside the rendered shell must commit on `change`** (or carry
  `data-focus-key`); render rebuilds the whole DOM on every dispatch.
- The reference repos (`xo`, `projects-standard`, `sp-sneakernet`) are read
  only for this work. Nothing in them was changed and nothing here depends
  on them at runtime.
