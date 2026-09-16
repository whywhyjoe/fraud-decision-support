# LOG — frd-decision-support

**Append-only.** One entry per ship or merge — not per session. Current state
is in `STATE.md`.

Newest first.

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
