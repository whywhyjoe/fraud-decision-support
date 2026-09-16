# frd-decision-support

A click-through wireframe of a guided decision-support tool for front-line
bank fraud reps: part call flowchart, part just-in-time training. It exists to
provoke requirements from a client who does not yet know what they want.

**Everything in it is placeholder. It is not bank policy** and the page says
so on a banner that cannot be dismissed.

## Running it

Open `app/fraud-decision-support.html` in a browser. That is the whole
deployment: one file, no build, no server, no network, no storage. It works
from a `file://` URL inside a locked-down corporate browser.

## The three interactions to demo first

Do them in this order. The third one is the point of the demo.

1. **Full path.** Live mode, keys `1` through `9`. Take the obvious answer at
   every node until you reach a resolution node, then press **Call note** and
   show the assembled case note.
2. **Lateral jump.** Start over. On the first node press **Jump to another
   answer in this stage** and pick *Possible coaching on the line*. The path
   is kept, the chip is marked *jumped*, and the node is critical-risk.
3. **Rewind with a changed answer.** Start over, answer three or four nodes,
   then click the second breadcrumb chip. Choose a *different* answer. The
   later steps go struck-through in the breadcrumb and a notice says how many
   no longer apply, with **Undo**. Click Undo. Then do it again and choose the
   *same* answer: the path is walked forward and nothing is invalidated.

Then, if there is time: **I don't know yet** parks a node in an *Unresolved*
tray; the search box jumps mid-story (try `elder`); **Training** adds *why
this matters* and sample dialogue to every node; **Flag this node** feeds the
**Debug** screen, which also shows an event log of lateral jumps and rewinds.

## The data model

All content is one JSON object in the `#flow-data` block near the top of the
HTML file. The render logic contains no scenario strings.

| Key | What it holds |
| --- | --- |
| `stages[]` | `id`, `order`, `label`, plus where a stage's *not applicable* and *off-script* exits go |
| `nodes[]` | `id`, `stageId`, `label` (short, for chips), `prompt`, `risk`, `content[]`, `answers[]`, and training-only `why` and `dialogue[]` |
| `answers[]` | `label`, `nextNodeId`, optional `setsContext` |
| `content[]` | `type` of `ask`, `watch`, `never`, `escalate` or `resource`, with `text` and (for resources) `url` |
| `contextFields[]` | the editable facts strip: `key`, `label`, `type`, `options` |

Full field reference and authoring rules: [`docs/01-content-model.md`](docs/01-content-model.md).

## Adding a node

1. Add an object to `nodes[]` with a unique `id`, an existing `stageId`, a
   `label`, a `prompt`, and one to nine `answers` pointing at existing ids.
   A resolution node has `"terminal": true` and `"answers": []`.
2. Point at least one existing answer at it, or it is unreachable.
3. Run `node --test tests/flow.test.mjs`. It fails on a dangling id, an
   unreachable node, or a node with no route to a resolution.

The three exits (*not applicable*, *off-script*, *I don't know yet*) come for
free from the stage; a node can override the first with `naNextNodeId` and
the third with `parkNextNodeId`.

## What is deliberately stubbed

- **Resource links** are `href="#"`.
- **Persistence.** State is in memory and is lost on reload. There is no
  localStorage, no backend, no login.
- **Analytics.** The debug screen's event log stands in for it.
- **Authoring.** Content is edited in the file. No UI for it.
- **One scenario.** No scenario picker, no mobile layout, no accessibility
  work beyond semantic markup and keyboard operation.
- **Flags** go to an in-memory list on the debug screen, nowhere else.

## Where to look

| | |
| --- | --- |
| How it works and why | [`docs/README.md`](docs/README.md) |
| Where things stand | [`STATE.md`](STATE.md) |
| What shipped when | [`LOG.md`](LOG.md) |
| Rules for agents | [`CLAUDE.md`](CLAUDE.md) |
| Tests | [`tests/README.md`](tests/README.md) |
