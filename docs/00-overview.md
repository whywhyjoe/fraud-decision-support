# frd-decision-support — overview

## What this is

A click-through demo of a guided call tool for front-line bank fraud reps.
The rep answers one question at a time; each question shows what to say,
what to watch for, what never to say, when to escalate, and links to
resources. Because real calls do not follow a script, the rep can go back,
change an answer, jump to another question, or skip one and return.

It is built to provoke requirements from a client who is vague on them. It
is not production software and its content is not bank policy.

## The non-negotiables

- **One file, opens from `file://`, no network.** The client's browser is
  locked down. Anything that needs a server, a CDN, a build, or `import`
  does not run there. This is also the shape a SharePoint Script Editor Web
  Part can host later, unchanged.
- **Placeholder banner, always visible.** The content reads convincingly on
  purpose. Without the banner someone will screenshot it into a procedure.
- **Content only in `#flow-data`.** The client will change the content and
  the shape of the flow. Both must be possible by editing JSON, without
  touching the logic. Chrome labels live in the one `UI_TEXT` table.
- **Design values only in `:root`; greyscale except risk colours.** The
  designer's pass has to be a restyle. Every colour, size, radius and
  duration is a token, and every element that matters has a `data-role`.
- **Legible at a glance, no AI-design tells.** Nothing under 14px. No
  uppercase or letter-spaced labels, no pills, no coloured left borders, no
  eyebrow lines. Corners are rounded (the client's design system). Tests
  enforce the size floor and the uppercase ban.
- **Pure render.** `dispatch(action)` mutates state and calls `render()`
  once. Handlers only translate DOM events into actions. That is what makes
  going back, undo, and the state dump behind the scenes trustworthy.
- **Plain words on screen.** Question, step, stage. Never node.

## How the pieces fit

The file has four parts in order: `<style>` (tokens, then rules), the
`#flow-data` JSON block, an empty `#app` shell, and one script.

**State** is a single object:

| Field | Meaning |
| --- | --- |
| `path[]` | Every step taken, in order. A step is `{ nodeId, arrivedVia, answer, status }`. |
| `cursor` | Index into `path` of the question on screen. Going back moves the cursor; it does not shorten the path. |
| `stale` | `null`, or the steps invalidated by the last forward move from a rewound position, with a snapshot for undo. |
| `coaching` | Whether coaching notes are shown. |
| `feedback[]`, `log[]` | What the behind-the-scenes panel shows. |
| `ui` | Which stage's question list is open, the search text, panels. |

**Step status** is how a question was left: `open` (on screen now, or
ahead of a rewound cursor), `answered`, `none` (none of these fit), `later`
(come back to this later), `resolved-later` (skipped, then answered on a
return visit), or `moved-on` (left by a jump without an answer).

**`arrivedVia`** is how a question was reached: `start`, `answer`, `none`,
`later`, `jumped` (from a stage's question list), `searched`. The step list
and the card header say it in words.

**The stage track** derives from the current question's stage: earlier
stages are done, later ones to come. Clicking a stage opens its question
list; picking one is the jump.

**Going back** is the behaviour the demo exists for. Clicking an earlier
step, or **Back**, sets `cursor = i`; later steps render dashed and dim.
Choosing the *same* answer again advances the cursor along the existing
path. Choosing anything else, or taking either exit or a jump, calls
`invalidateDownstream()`: the steps after the cursor move to `stale.steps`,
a snapshot of path and cursor is kept, and the notice with **Undo** renders
until undone or dismissed.

**Render** builds an HTML string from state and assigns it to `#app`. Focus
is captured before and restored after by `data-focus-key`, which is what
lets the search box filter on every keystroke through a full re-render.

## Decisions

### Second cut is smaller than the brief — 2026-09-16
Call-note generation, the captured-facts strip, the third exit, the lateral
panel's stage tabs, the unresolved tray and the live/training split were
built in v1 and removed. **Rejected:** keeping them behind toggles. The
client has not asked for any of it, and each one added a control to a screen
meant for quick decisions. **Costs:** the brief's "case note" and "context
fields" are gone from the data model; `LOG.md` records what they looked
like if the client asks.

### The flow is the interface — 2026-09-16
A stage track across the top and the steps as a vertical chain, with the
current question as the one large card. **Rejected:** breadcrumb chips plus
a separate lateral panel (v1), which described the path instead of showing
it. **Costs:** long calls scroll; the current card scrolls itself into view
on each move.

### Content as a JSON script block — 2026-09-16
`<script type="application/json" id="flow-data">` rather than a JS literal.
**Rejected:** `const FLOW = {...}`, which the tests could not parse without
evaluating the page. **Costs:** no comments inside the content.

### Stale steps are kept, not deleted — 2026-09-16
A changed answer moves later steps to `stale`, shown struck through, with a
snapshot for undo. **Rejected:** truncating silently, which is what every
flowchart tool does. **Costs:** only one stale set is kept; a second change
while a notice shows discards the first set.

### Exits are stage-level — 2026-09-16
Each stage names where *none of these fit* and *come back later* go.
**Rejected:** ids on every question. **Costs:** authoring a question means
knowing its stage's defaults.

### Full re-render with focus restore — 2026-09-16
**Rejected:** targeted DOM patching, which is the scattered mutation the
brief forbade. **Costs:** the feedback form's draft text lives in the DOM
until submit; any input that re-renders on `input` needs a `data-focus-key`.

## Paid-for gotchas

- **Claude's default UI has recognisable tells** and the first cut had all
  of them: 12px uppercase tracked labels, pill tags on everything, coloured
  left borders on content blocks, a stat-banner row. The web has checklists
  of these ("AI design slop", "Claude design tells"); the non-negotiables
  above encode the ones that applied. A test now fails on uppercase and on
  any font token under 14px.
- **`fullPage` screenshots in Playwright draw the fixed banner at the scroll
  offset** and can catch the 120ms fade mid-frame, so the current card looks
  dim. Neither is real; a viewport screenshot after a short wait is right.
- **`node --test tests/`** does not work on Node 22 with a directory
  argument; name the file.
