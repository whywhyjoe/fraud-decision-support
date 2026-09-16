# frd-decision-support

A click-through wireframe of a guided decision-support tool for front-line
bank fraud reps. A demo to provoke requirements, not production software.

`docs/` is how it works and why (read `docs/README.md` first); `STATE.md` is
where things stand right now.

## Work in progress — read before anything else

`state/` holds one dated file per live thread of work. The procedure is the
**`project-state` skill** — read it at the start of any session in this repo. It
is not `xo-handoff` and `.xo-handoffs/`; don't cross-file them.

- **Read every file in `state/` before the first edit**, then ask: pick a thread
  up, or work on something else? Ask even if the user opened with a request.
- **Any session that changed anything updates its thread's file before
  reporting completion**, and commits it with the work.
- **Check `git log -3 -- state/` and re-read the file before editing it.** More
  than one session may be in this repo; a file that contradicts the user in chat
  is stale.
- **A finished thread's file is deleted** once what outlives it has been promoted.

## Hard rules

1. **One self-contained HTML file.** `app/fraud-decision-support.html` opens
   from `file://` in a locked-down browser. No build step, no npm in the
   deliverable, no framework, no CDN, no ES `import`, no network, no storage.
   Dev-only tooling (the tests) is fine; it never ships.
2. **Content lives only in the `#flow-data` JSON block.** The render logic
   contains no scenario strings. UI chrome labels live in the one `UI_TEXT`
   table. A test enforces the first; keep the second by habit.
3. **Every design value is a token in `:root`.** No raw colours, lengths or
   durations anywhere else in the CSS (media queries excepted). Grayscale
   only; red, amber and green are reserved for risk severity. A test enforces
   it. This is what makes the designer's pass a restyle, not a rebuild.
4. **Render is pure: state in, DOM out.** One `render()` per `dispatch()`.
   No DOM mutation in handlers. Every interactive element and content region
   carries a stable `data-role`.
5. **The placeholder banner stays.** Nobody in a demo may mistake this for
   real procedure.
6. **Not a Windows environment.** Nothing here may depend on PowerShell or
   `.cmd` tooling.

## Layout

| Path | What it is |
| --- | --- |
| `app/fraud-decision-support.html` | The deliverable. Styles, content, shell, logic, in that order. |
| `docs/` | Durable reference. Start at `docs/README.md`. |
| `tests/` | Fast content/CSS checks and one browser smoke. See `tests/README.md`. |
| `state/` | Live threads of work. |

## Where things go

- **Generated documents** — reviews, analyses, plans, write-ups — go in
  `.scratch/` (gitignored) and are **never committed**. They reach `docs/`
  only by explicit promotion, rewritten, with an index row.
- **What's left to do** goes in `STATE.md`, which is rewritten, never appended;
  a thread of work in progress gets its own file in `state/`.
- **What shipped** goes in `LOG.md`, which is appended, never rewritten.
- **No `.md` at the repo root** beyond README, CLAUDE, STATE and LOG.

## Tests

```
node --test tests/flow.test.mjs                  # fast tier, <1s
NODE_PATH=$(npm root -g) node tests/smoke.mjs    # full tier, Chromium, ~3s
```

---

Scaffolded by hand from [projects-standard](https://github.com/whywhyjoe/projects-standard)
0.2.0, `_base` shape. No profile exists for a demo wireframe and none was
invented (a profile is earned by the second project of its kind). This file
wins over the shared method for this repo.
