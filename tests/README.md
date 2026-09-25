# Tests

One row per suite. Runtimes are measured, not guessed.

| Suite | Tier | Runtime | What it proves |
| --- | --- | --- | --- |
| `flow.test.mjs` | fast | 0.3s | The content graph is well-formed (unique ids, every target resolves, every question reachable, every question can reach an end of call), the brief's content minimums hold, the CSS keeps every raw value inside `:root`, no font token is under 14px, nothing is uppercase or letter-spaced, and no scenario string is hardcoded in the script. |
| `smoke.mjs` | full | 5s; 28s on the BMO copy, which waits out its animations | The file boots from `file://` in Chromium with no console errors, and every interaction the demo depends on works end to end: full path with connectors carrying the answers and the stages ahead counting down, jump from the box's topic list, back and changed answer with stale steps and undo, the two exits, find a question, coaching notes and number keys, the guidance half at equal width, feedback behind the scenes with a complete event log. Also no rendered text under 14px and no horizontal overflow at 900px. |

```
node --test tests/flow.test.mjs
NODE_PATH=$(npm root -g) node tests/smoke.mjs
```

Both test `app/fraud-decision-support.html` unless `APP` names another file
in `app/`, e.g. `APP=fraud-decision-support-bmo.html`. Run both files.

The smoke needs `playwright` resolvable by `require` and a Chromium it can
launch. With a globally installed Playwright, `NODE_PATH=$(npm root -g)` is
enough; set `CHROMIUM_PATH` to point at a specific binary. Nothing here is
part of the deliverable and nothing here is installed into the repo.
