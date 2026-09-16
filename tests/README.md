# Tests

One row per suite. Runtimes are measured, not guessed.

| Suite | Tier | Runtime | What it proves |
| --- | --- | --- | --- |
| `flow.test.mjs` | fast | 0.3s | The content graph is well-formed (unique ids, every target resolves, every node reachable, every node can reach a resolution), the brief's content minimums hold, the CSS keeps every raw value inside `:root`, and no scenario string is hardcoded in the script. |
| `smoke.mjs` | full | 2.6s | The file boots from `file://` in Chromium with no console errors, and the eight required interactions work end to end: full path, call note and copy, lateral jump, rewind (same answer walks forward, changed answer goes stale with notice and undo), all three exits and the unresolved tray, keyword jump, mode toggle and number keys, flag to debug screen with a complete event log. Also no horizontal overflow at 900px. |

```
node --test tests/flow.test.mjs
NODE_PATH=$(npm root -g) node tests/smoke.mjs
```

The smoke needs `playwright` resolvable by `require` and a Chromium it can
launch. With a globally installed Playwright, `NODE_PATH=$(npm root -g)` is
enough; set `CHROMIUM_PATH` to point at a specific binary. Nothing here is
part of the deliverable and nothing here is installed into the repo.
