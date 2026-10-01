# Tests

One row per suite. Runtimes are measured, not guessed.

| Suite | Tier | Runtime | What it proves |
| --- | --- | --- | --- |
| `flow.test.mjs` | fast | 0.3s | The content graph is well-formed (unique ids, every target resolves, every question reachable, every question can reach an end of call), the brief's content minimums hold, the CSS keeps every raw value inside `:root`, no font token is under 14px, nothing is uppercase or letter-spaced, and no scenario string is hardcoded in the script. |
| `loader.mjs` | full | 3s | The web part loader end to end over http, without a tenant, served as SharePoint serves it (`.html` as a download, no `'unsafe-inline'`): from the snippet defaults when the page-item lookup fails, the player is fetched into a `srcdoc` frame and boots from the bound content file; under a nonce-only CSP with no eval it runs by the host nonce, under an eval-only CSP with no nonce by eval; `takeover` covers the whole window with the page behind inert; mounting again and a second evaluation of the loader add nothing; an App page's edit mode entered without a reload suspends the takeover and leaving it brings the guide back; removing the host releases the takeover; with no content file the player runs on its own content; `fullpage=none` keeps the frame in the flow sized by the player's reported height; a page loaded in edit mode shows a placeholder. |
| `smoke.mjs` | full | 25s; it waits out the BMO player's animations | The file boots from `file://` in Chromium with no console errors, and every interaction the demo depends on works end to end: full path with finished stages folded to a line with their answers (opening one shows its steps and connectors), the guidance pinned and fitting the window, and the stages ahead counting down, jump from the box's topic list, back and changed answer with stale steps and undo, the two exits, find a question, coaching notes and number keys, the guidance half at equal width, feedback behind the scenes with a complete event log. Also no rendered text under 14px and no horizontal overflow at 900px. |

```
node --test tests/flow.test.mjs
NODE_PATH=$(npm root -g) node tests/smoke.mjs
NODE_PATH=$(npm root -g) node tests/loader.mjs
```

They test `app/fraud-decision-support-bmo.html` unless `APP` names another
file in `app/`.

**Fast tier budget: 30s.** If it creeps past, move something to full; do not
raise the budget. A check that does not need the DOM does not get a browser.

The smoke needs `playwright` resolvable by `require` and a Chromium it can
launch. With a globally installed Playwright, `NODE_PATH=$(npm root -g)` is
enough; set `CHROMIUM_PATH` to point at a specific binary. Nothing here is
part of the deliverable and nothing here is installed into the repo.

## Browser-suite rules

- Suites run in parallel when there is more than one; they share only
  read-only static files.
- No `waitUntil: 'networkidle'`: use `domcontentloaded` plus the explicit
  wait you already need.
- No `waitForTimeout`: wait on the real condition. The BMO copy's animation
  waits are Playwright's own actionability checks, not sleeps.

## Not tested here

Live tenant behaviour (the page-property binding, the same-origin content
fetch, caching after a republish, permissions) can only be verified in a
tenant. That checklist is in `../STATE.md` under **Manual gates**.
