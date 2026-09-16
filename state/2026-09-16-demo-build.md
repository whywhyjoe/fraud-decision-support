# State — demo build

Last touched: 2026-09-16
Mode: Joe
Branch: `claude/fraud-decision-support-demo-oalc9g`, pushed
State: v2 built, tested, committed. Waiting on the client demo.

## What this is

A single-file click-through demo of a guided call tool for bank fraud reps,
built to draw requirements out of a vague client. One scenario (unauthorised
card transactions), placeholder content throughout. The deliverable is
`app/fraud-decision-support.html`; `README.md` says what to show and in
what order.

## Done

- v2 replaced v1 the same day: smaller scope, the flow as the interface,
  legible type, no AI-design tells. `LOG.md` has the full list.
- Every interaction is covered by `tests/smoke.mjs`; content graph, CSS
  tokens and the typography floor by `tests/flow.test.mjs`.

## Next

- [ ] Run the demo in the order `README.md` gives. Have the client press
      **Something wrong with this step?** whenever they disagree; copy the
      *Feedback* section from **Behind the scenes** afterwards. That list is
      the requirements intake.
- [ ] Before the demo, open the file on a machine with the client's browser
      lockdown (see `STATE.md` manual gates).
- [ ] After the demo, settle the two open questions in `STATE.md` and
      delete whichever affordance loses.

## Landmines

- **Every CSS raw value must be a token**, and the fast test fails
  otherwise. Adding a rule means adding a `:root` variable first. Media
  queries are the one exception.
- **No uppercase, no letter-spacing, no font token under 14px.** Also
  test-enforced. The reasons are in `docs/00-overview.md`.
- **Only one stale set is kept.** A second back-and-change while a notice
  is showing discards the first set. Deliberate; the client may want more.
- **Inputs inside the rendered shell** need a `data-focus-key` if they
  re-render on `input`; render rebuilds the whole DOM on every dispatch.
- The reference repos (`xo`, `projects-standard`, `sp-sneakernet`) are read
  only for this work. Nothing in them was changed and nothing here depends
  on them at runtime.
