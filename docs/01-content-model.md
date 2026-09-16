# Content model

All content is the one JSON object in the `#flow-data` block of
`app/fraud-decision-support.html`. Edit it there. `node --test
tests/flow.test.mjs` checks the result in under a second.

The word for one screen in the data is `node`, kept from the build brief.
On screen it is a **topic** (its `label`) that asks one **question** (its
`prompt`); a visited topic is a **step**; a group of topics is a **stage**.

Write labels as knowledge-base entries, not script lines: "Account takeover
red flags", "Bank impersonation", "Household use possible". Write prompts
as the assessment question a rep answers: "Were unauthorised profile
changes found?" Write answers as findings, not quotes: "Shared a code or
passcode", not "Says they read out a code".

## Top level

```
{
  "meta":        { "scenario", "contentVersion", "disclaimer" },
  "stages":      [ ... ],
  "startNodeId": "verify-open",
  "nodes":       [ ... ]
}
```

`meta.disclaimer` is the footer line. `meta.scenario` is the header subtitle.

## Stage

```
{ "id": "triage", "order": 2, "label": "Triage",
  "skipToNodeId": "scope-open", "noneOfTheseNodeId": "triage-reanchor" }
```

| Field | Rule |
| --- | --- |
| `order` | Stages render on the track and number in this order. |
| `skipToNodeId` | Where **Come back to this later** moves on to for every question in the stage. Usually the next stage's first question. |
| `noneOfTheseNodeId` | Where **None of these fit** goes. Must be a question *in this stage*; that question does not show the link itself. Its answers route back into the stage. |

## Question (`nodes[]`)

```
{
  "id": "triage-ongoing", "stageId": "triage",
  "label": "Still happening?",
  "prompt": "Is it still happening — anything today, or pending?",
  "risk": null,
  "why": "…",                                            // coaching notes only
  "dialogue": [ { "who": "customer", "text": "…" } ],   // coaching notes only
  "content": [ { "type": "ask", "text": "…" } ],
  "answers": [ { "label": "Yes — today or pending", "nextNodeId": "triage-block-now" } ]
}
```

| Field | Rule |
| --- | --- |
| `id` | Unique. Convention: `<stage>-<slug>`. |
| `label` | The topic name. Used in the flow's boxes, the stage's topic list, the guidance header and search. |
| `prompt` | The one question on screen. Searchable. |
| `risk` | `null`, `"low"`, `"elevated"` or `"critical"`. Elevated and critical draw a line above the prompt and a coloured dot in the stage's question list. Low draws nothing. |
| `content[]` | Zero or more blocks, see below. Rendered in the guidance panel grouped by type, loudest first. |
| `answers[]` | One to nine (number keys), or empty with `"terminal": true`. |
| `why` | Coaching notes: the *why this matters* paragraph. Optional. |
| `dialogue[]` | Coaching notes: an example exchange. `who` is `customer` or `rep`. Optional. |
| `terminal` | `true` marks an end of call: no answers, an *End of call* block. |

## Answer

```
{ "label": "Card not present", "nextNodeId": "scope-open" }
```

## Content block

| `type` | Heading | Rendered as | Use for |
| --- | --- | --- | --- |
| `never` | Never | Dark filled block, loudest | What must not be said or done. |
| `escalate` | Escalate when | Red-outlined block | The condition that ends the rep's involvement. |
| `ask` | Check or ask | Plain block | What to establish, and suggested wording where it helps. |
| `watch` | Watch for | Shaded block | Signals to listen for. |
| `resource` | Resources | A link block. Needs `url`. All are `#` for now. | A procedure, guide or tool. |

Order within a group is authoring order. Groups render in the order above.
The heading carries the type; write the text as a full sentence anyway, so
it also reads correctly in a plain-text export later.

## What the tests refuse

- A duplicate id, a dangling `nextNodeId`, or a stage target that does not
  exist.
- A question unreachable from `startNodeId` (by answers or the two stage
  exits).
- A non-terminal question from which no end of call can be reached by
  answers alone: a dead end even if the exits get out of it.
- A terminal question with answers, or a non-terminal with none or more
  than nine.
- Fewer than two critical questions, three never blocks, or four distinct
  resource links: the brief's minimums.
