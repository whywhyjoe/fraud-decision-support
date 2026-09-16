# frd-decision-support — overview

## What this is

A click-through wireframe of a guided decision-support tool for front-line
bank fraud reps. The rep follows prompts choose-your-own-adventure style;
each node shows what to ask, what to watch for, what never to say, when to
escalate, and links to resources. Because real calls do not follow a script,
the rep can back up, change an answer, jump sideways, or park a question.

It is a demo built to provoke requirements from a client who is vague on
them. It is not production software and its content is not bank policy.

## The non-negotiables

- **One file, opens from `file://`, no network.** The client's browser is
  locked down. Anything that needs a server, a CDN, a build, or `import`
  does not run there. This is also the shape a SharePoint Script Editor Web
  Part can host later, unchanged.
- **Placeholder banner, always visible.** The content reads convincingly on
  purpose. Without the banner someone will screenshot it into a procedure.
- **Content only in `#flow-data`.** The client will change the content and
  the shape of the flow. Both must be possible by editing JSON, without
  touching the logic.
- **Design values only in `:root`; grayscale except risk colours.** The
  designer's pass has to be a restyle. Every colour, spacing, radius, font
  size and duration is a token, and every interactive element or region has
  a stable `data-role` to target.
- **Pure render.** `dispatch(action)` mutates state and calls `render()`
  once. Handlers only translate DOM events into actions. That is what makes
  rewind, undo and the debug screen's state dump trustworthy.

## How the pieces fit

The file has four parts in order: `<style>` (tokens, then rules), the
`#flow-data` JSON block, an empty `#app` shell, and one script.

**State** is a single object:

| Field | Meaning |
| --- | --- |
| `path[]` | Every step taken, in order. A step is `{ nodeId, arrivedVia, answer, status, exit }`. |
| `cursor` | Index into `path` of the node on screen. Rewinding moves the cursor; it does not shorten the path. |
| `stale` | `null`, or the steps invalidated by the last forward move from a rewound position, with a snapshot for undo. |
| `context` | The captured facts strip. Set by answers (`setsContext`) or edited inline. |
| `unresolved[]` | Node ids parked with *I don't know yet*. |
| `flags[]`, `log[]` | The flag list and the event log the debug screen shows. |
| `ui` | Which panels are open, the search text, the mode. |

**Step status** is how a node was left: `open` (on screen now or ahead of a
rewound cursor), `answered`, `exit` (with `exit` of `na` or `offscript`),
`unresolved` (parked), `resolved-later` (parked, then answered on a return
visit), or `skipped` (left by a lateral, search or return jump without an
answer).

**`arrivedVia`** is how a node was reached: `start`, `answer`, `lateral`,
`search`, `return`, `exit-na`, `exit-offscript`, `park`. The breadcrumb tags
chips with it, and the call note labels lines with it.

**Rewind** is the behaviour the demo exists for. Clicking chip *i* sets
`cursor = i`; the later chips render dashed ("ahead"). Choosing the *same*
answer again advances the cursor along the existing path. Choosing anything
else, or taking any exit or jump, calls `invalidateDownstream()`: the steps
after the cursor move to `stale.steps`, a snapshot of path, cursor, context
and unresolved is kept, and the notice with **Undo** renders until undone or
dismissed. Undo restores the snapshot wholesale, so context set by the new
answer is also reverted.

**Render** builds an HTML string from state and assigns it to `#app`. Focus
is captured before and restored after by `data-focus-key`, which is what
lets the search box filter on every keystroke through a full re-render.

## Decisions

### Content as a JSON script block — 2026-09-16
`<script type="application/json" id="flow-data">` rather than a JS literal.
**Rejected:** `const FLOW = {...}` — reads the same but is not parseable
without evaluating the page, so the tests could not check the graph.
**Costs:** no comments inside the content; the fence comment above the block
carries the guidance instead.

### Stale steps are kept, not deleted — 2026-09-16
A changed answer moves downstream steps to `stale`, rendered struck-through,
with a snapshot for undo. **Rejected:** truncating the path silently, which
is what every flowchart tool does and what the client's reps will hate.
**Costs:** a second list to render and to include in the call note; only one
stale set is kept, so a second rewind discards the first set.

### Exits are stage-level with node override — 2026-09-16
Each stage names `naNextNodeId` and `offScriptNodeId`; a node may override
the first and add `parkNextNodeId`. **Rejected:** three ids on every node
(45 copies of the same two values). **Costs:** authoring a node means knowing
its stage's defaults; `01-content-model.md` spells them out.

### One off-script re-anchor node per stage — 2026-09-16
"Customer went off-script" lands on a node whose answers route back into the
stage. **Rejected:** a single global off-script node, which would have had to
route to every stage and say nothing useful about any of them. **Costs:**
five more nodes to author.

### Full re-render with focus restore — 2026-09-16
The whole shell is rebuilt on every dispatch. **Rejected:** targeted DOM
patching, which is faster and is exactly the scattered mutation the brief
forbade. **Costs:** inputs must commit on `change` (not `input`) or carry a
`data-focus-key`; the flag form's draft text lives in the DOM until submit.

## Paid-for gotchas

- **`fullPage` screenshots in Playwright draw the fixed banner at the scroll
  offset**, not at the top. It looks like the banner has slid down over the
  header. It has not; a viewport screenshot shows it correctly.
- **`node --test tests/`** does not work on Node 22 with a directory
  argument; name the file.
