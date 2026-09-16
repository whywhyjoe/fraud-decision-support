# LOG — frd-decision-support

**Append-only.** One entry per ship or merge — not per session. Current state
is in `STATE.md`.

Newest first.

---

## 2026-09-16 — demo v2: the flow is the interface

Reworked after review of v1. The first cut was too complex for what the
client has said so far, and it had the recognisable Claude-default look.

Removed: call-note generation, the captured-facts strip and `setsContext`,
the third exit, stage tabs on the lateral panel, the unresolved tray, the
live/training mode split, breadcrumb chips. Kept: going back with stale
steps and undo, jumping, find a question, feedback, behind the scenes.

Changed: a stage track across the top and the steps as a vertical chain,
with the current question as the one large card. Jumping is clicking a
stage on the track. Training mode became a *Coaching notes* toggle. The
three exits became two links under the answers. Every word on screen is
question, step or stage.

Typography and shape, after checking the published lists of AI-design
tells: 16px body, 14px floor, sentence case everywhere, no tracked labels,
no pills, no coloured left borders, 10–14px radii per the client's design
system, greyscale with red and amber only for risk. The fast test now
enforces the size floor and the uppercase ban.

Data model: stage keys renamed to `skipToNodeId` and `noneOfTheseNodeId`;
`contextFields` and node-level exit overrides dropped. Content unchanged
apart from the five *none of these fit* questions.

---

## 2026-09-16 — wireframe v1

First build of the demo: one self-contained HTML file with one scenario
(inbound call, customer reports unauthorised card transactions), 5 stages and
47 nodes of placeholder content, and the eight interactions the brief
required: full path, lateral jump, rewind with stale-and-undo, three exits on
every node, keyword jump, live/training mode, call-note generation, and
flag-this-node with a debug screen.

Departures from the build brief, and why:

- **47 nodes rather than 20–25.** Five are per-stage *off-script* re-anchor
  nodes (the brief wanted off-script to "route somewhere sensible"; a node
  per stage is what sensible turned out to mean), six are distinct resolution
  nodes so that every ending reads differently in the call note.
- **Exits are declared on the stage, not the node.** Each stage names where
  *not applicable* and *off-script* go; a node can override. Otherwise every
  node would carry the same two ids.
- **Lateral panel has stage tabs.** Opens on the current stage as the brief
  asked, but the rep can switch. Left in so the client can say which they
  want. See `STATE.md`.
- **Content is a `<script type="application/json">` block**, not a JS
  object literal. Same thing to a reader, but it is real JSON, so the tests
  parse it without evaluating the page.
- **A `UI_TEXT` table** holds the chrome labels (button names, headings).
  The brief said "zero content strings hardcoded in the render logic"; the
  table keeps it that way for chrome as well as scenario content.

Invented for this first project of its kind, for a future profile to extract:
the fast-tier test shape for a single-file app (extract the JSON, check the
graph; extract the CSS, check the tokens), and the Playwright smoke driven
through `window.__frd.getState()` rather than screen-scraping.

Scaffolded by hand from projects-standard 0.2.0, `_base` shape, no profile.
