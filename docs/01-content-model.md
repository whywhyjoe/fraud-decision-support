# Content model

All content is the one JSON object in the `#flow-data` block of
`app/fraud-decision-support.html`. Edit it there. `node --test
tests/flow.test.mjs` checks the result in under a second.

## Top level

```
{
  "meta":          { "scenario", "contentVersion", "disclaimer" },
  "stages":        [ ... ],
  "contextFields": [ ... ],
  "startNodeId":   "verify-open",
  "nodes":         [ ... ]
}
```

`meta.disclaimer` is printed in the footer and at the top of every call
note. `meta.scenario` is the header subtitle.

## Stage

```
{ "id": "triage", "order": 2, "label": "Triage",
  "naNextNodeId": "scope-open", "offScriptNodeId": "triage-reanchor" }
```

| Field | Rule |
| --- | --- |
| `order` | Stages render and number in this order. |
| `naNextNodeId` | Where **Not applicable** goes for every node in the stage, unless the node overrides. Also the default for **I don't know yet**. Usually the next stage's entry node. |
| `offScriptNodeId` | Where **Customer went off-script** goes. Must be a node *in this stage*. That node does not show the off-script exit itself. |

## Node

```
{
  "id": "triage-ongoing", "stageId": "triage",
  "label": "Still happening?",
  "prompt": "Is it still happening — anything today, or pending?",
  "risk": null,
  "why": "…",                      // training mode only
  "dialogue": [ { "who": "customer", "text": "…" } ],   // training mode only
  "content": [ { "type": "ask", "text": "…" } ],
  "answers": [ { "label": "Yes — today or pending", "nextNodeId": "triage-block-now" } ]
}
```

| Field | Rule |
| --- | --- |
| `id` | Unique. Convention: `<stage>-<slug>`. |
| `label` | Short. Used in breadcrumb chips, the lateral list, search results and the call note. |
| `prompt` | The one question on screen. Searchable. |
| `risk` | `null`, `"low"`, `"elevated"` or `"critical"`. Draws the banner and colours the card border; critical also gets a line in the call note. |
| `content[]` | Zero or more blocks, see below. Rendered in the right rail grouped by type, loudest first. |
| `answers[]` | One to nine (number keys), or empty with `"terminal": true`. |
| `why` | Training mode: the "why this matters" expander. Optional. |
| `dialogue[]` | Training mode: sample exchange. `who` is `customer` or `rep`. Optional. |
| `terminal` | `true` marks a resolution node: no answers, an *End of call* block with the call-note button. |
| `naNextNodeId` | Optional override of the stage's *not applicable* target. |
| `parkNextNodeId` | Optional override of where *I don't know yet* moves on to. |

## Answer

```
{ "label": "Card not present", "nextNodeId": "scope-open",
  "setsContext": { "channel": "card-not-present" } }
```

`setsContext` writes into the captured-facts strip when chosen. Every key
must be a declared context field. The value is written verbatim, so for a
`select` field it must be one of that field's `options`.

## Content block

| `type` | Rendered as | Use for |
| --- | --- | --- |
| `never` | Inverted (black) block, loudest | What must not be said. |
| `escalate` | Red-bordered block | The condition that ends the rep's involvement. |
| `ask` | Plain block with "Ask:" | The words to use, or what to capture. |
| `watch` | Shaded block with "Watch for:" | Signals to listen for. |
| `resource` | Dashed block, one link | A procedure, guide or tool. Needs `url`. All are `#` for now. |

Order within a group is authoring order. Groups render in the order above.

## Context field

```
{ "key": "channel", "label": "Channel", "type": "select",
  "options": ["", "card-present", "card-not-present", "mixed", "unknown"] }
```

`type` is `select` (needs `options`, first one usually empty for "unset")
or `text`. Fields render in declaration order, are always editable inline,
and are all listed in the call note whether set or not.

## What the tests refuse

- A duplicate id, a dangling `nextNodeId`, or a stage target that does not
  exist.
- A node unreachable from `startNodeId` (by answers, exits or parking).
- A non-terminal node from which no terminal node can be reached by answers
  alone: that is a dead end even if the exits get out of it.
- A terminal node with answers, or a non-terminal with none or more than
  nine.
- A `setsContext` key that is not a context field.
- Fewer than two critical nodes, three never-say blocks, or four distinct
  resource links — the brief's minimums.
