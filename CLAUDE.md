# fraud-decision-support

A guided call tool for front-line bank fraud reps: one question at a time,
with the guidance for each. Today a click-through demo to provoke
requirements; its destination is a buildless SharePoint app for end users,
hosted full-page in a page web part on its own site, not part of the DCS
workbench.

`docs/` is how it works and why (read `docs/README.md` first); `STATE.md` is
where things stand right now, including what is built versus what is live.

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
   from `file://` in a locked-down browser. Its BMO-styled copy,
   `app/fraud-decision-support-bmo.html`, is held to every rule here too. No build step, no npm in the
   deliverable, no framework, no CDN, no ES `import`, no network, no storage.
   Dev-only tooling (the tests) is fine; it never ships.
2. **Content lives only in the `#flow-data` JSON block.** The render logic
   contains no scenario strings. UI chrome labels live in the one `UI_TEXT`
   table. A test enforces the first; keep the second by habit.
3. **Every design value is a token in `:root`.** No raw colours, lengths or
   durations anywhere else in the CSS (media queries excepted). Grayscale
   only in the original; the BMO copy uses the BMO palette. In both, red,
   amber and green are reserved for risk severity (BMO red: roundel only). A test enforces
   it. This is what makes the designer's pass a restyle, not a rebuild.
4. **Render is pure: state in, DOM out.** One `render()` per `dispatch()`.
   No DOM mutation in handlers. Every interactive element and content region
   carries a stable `data-role`.
5. **Legible, rounded, plain.** Nothing under 14px. No uppercase or
   letter-spaced labels, no pills or tags, no coloured left borders, no
   eyebrow lines. Corners rounded. On screen say question, step, stage:
   never node. The fast test enforces the size floor and the uppercase ban;
   `docs/00-overview.md` says why.
6. **The placeholder banner stays.** Nobody in a demo may mistake this for
   real procedure.
7. **Not a Windows environment.** Nothing here may depend on PowerShell or
   `.cmd` tooling.

The `sp-app` family rules also hold. The first is already rule 1; the rest
bite when the SharePoint work starts (`STATE.md`, deferred by design):

8. **No URL in this repo is authoritative.** Production locations live in
   the page's properties and the site's config, set after deployment. Every
   URL the app fetches is tenant-relative or fully qualified from config,
   never page-relative. The site path is not chosen yet; when you need a
   real one, ask.
9. **Never fail loudly at the visitor.** Every failure path degrades and
   logs to `console.debug`. A rep on a call never sees a red bar; content
   that fails validation shows behind the scenes only.
10. **Writes carry a digest.** If the app ever writes (feedback, events),
    `POST /_api/contextinfo` first, cached until shortly before expiry, and
    `keepalive: true` on the write. See `docs/03-sharepoint-data.md`.

## Layout

| Path | What it is |
| --- | --- |
| `app/fraud-decision-support.html` | The deliverable. Styles, content, shell, logic, in that order. |
| `app/fraud-decision-support-bmo.html` | The same demo in the BMO look, with richer guidance (content 0.5). A copy, not a build output. |
| `docs/` | Durable reference. Start at `docs/README.md`. |
| `tests/` | Fast content/CSS checks and one browser smoke. See `tests/README.md`. |
| `state/` | Live threads of work. |

When the SharePoint work starts the `sp-app` shape applies beside `app/`:
`fraud-guide.app.js` and CSS served from a library, a generated
`fraud-guide.webpart.html` embed snippet per environment, `boot-fraud-guide.js`
to find context and load content, and `deploy/`. `docs/02-hosting-and-deploy.md`
has the decided shape; none of those files exist yet.

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
NODE_PATH=$(npm root -g) node tests/smoke.mjs    # full tier, Chromium, ~5s
```

Prefix either with `APP=fraud-decision-support-bmo.html` to test the BMO copy.

---

Scaffolded from [projects-standard](https://github.com/whywhyjoe/projects-standard)
0.2.0, profile `sp-app` (started on the `_base` shape as a demo wireframe on
2026-09-16; moved to `sp-app` on 2026-09-25 once the destination was
decided). This file wins over the shared method for this repo.
