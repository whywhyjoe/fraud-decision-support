# frd-decision-support

A click-through demo of a guided call tool for front-line bank fraud reps.
The rep works through one topic at a time; for each, the tool shows what to
check, what to watch for, what never to say, when to escalate, and where the
resources are. Because real calls wander, the rep can go back, change an
answer, jump to another topic in the stage, or skip one and return.

It exists to draw requirements out of a client who does not yet know what
they want. **Everything in it is placeholder. It is not bank policy**, and a
banner says so on every screen.

## Running it

Open `app/fraud-decision-support.html` in a browser. That is the whole
deployment: one file, no build, no server, no network, no storage. It works
from a `file://` URL inside a locked-down corporate browser.

## The screen

Two halves. On the left, the call as a flow: stage labels, the steps taken
as boxes joined by lines that carry the chosen answer, and the current topic
as the one large box with its answers forked beneath it in two columns. On
the right, the guidance for the current topic, as large as the flow itself:
never, escalate when, check or ask, watch for, resources.

## What to show, in order

1. **Answer through a call.** Number keys 1 to 9 work. Watch the flow grow
   down the left and the stages ahead fade in beneath it.
2. **Go back and change an answer.** Click any earlier box, or **Back** on
   the current one. Pick a different answer: the later steps stay on screen
   struck through, with a notice and **Undo**. Pick the same answer instead
   and the call simply carries on.
3. **Jump.** **Other topics in this stage** on the current box lists them;
   pick one to go straight there. The steps so far are kept and the jump is
   noted on the flow.
4. **Coaching notes.** Toggle it on: every topic gains *why this matters*
   and an example exchange. Same content, different mode.
5. **Find a topic.** Type `elder` in the search box for a customer who
   opens mid-story.
6. **Something wrong with this step?** Under every topic. Feedback lands on
   the **Behind the scenes** panel in the footer, with an event log that
   shows jumps and rewinds are measurable.

## The content model

All content is one JSON object in the `#flow-data` block near the top of the
HTML file. The page logic contains no scenario strings.

| Key | What it holds |
| --- | --- |
| `stages[]` | `id`, `order`, `label`, and where *none of these fit* and *come back later* go for that stage |
| `nodes[]` | one topic: `id`, `stageId`, `label` (the topic name), `prompt` (the question), `risk`, `content[]`, `answers[]`, plus coaching-only `why` and `dialogue[]` |
| `answers[]` | `label`, `nextNodeId` |
| `content[]` | `type` of `never`, `escalate`, `ask`, `watch` or `resource`, with `text` and (for resources) `url` |

Topics are written as knowledge-base entries ("Account takeover red
flags", "Bank impersonation") rather than script lines, so the same entry
can apply at more than one stage. Field-by-field reference:
[`docs/01-content-model.md`](docs/01-content-model.md).

## Adding a topic

1. Add an object to `nodes[]` with a unique `id`, an existing `stageId`, a
   `label`, a `prompt`, and one to nine `answers` pointing at existing ids.
   An end-of-call topic has `"terminal": true` and `"answers": []`.
2. Point at least one existing answer at it, or it is unreachable.
3. Run `node --test tests/flow.test.mjs`. It fails on a dangling id, an
   unreachable topic, or a topic with no route to an end of call.

## What is deliberately stubbed

- **Resource links** are `href="#"`.
- **Persistence.** State is in memory and is lost on reload. No storage, no
  backend, no login.
- **Analytics.** The event log behind the scenes stands in for it.
- **Authoring.** Content is edited in the file.
- **One scenario.** No scenario picker, no mobile layout, no accessibility
  work beyond semantic markup and keyboard operation.
- **Case notes and captured facts** were in the first cut and removed: the
  client has not said they want them, and they crowded the screen.

## Where to look

| | |
| --- | --- |
| How it works and why | [`docs/README.md`](docs/README.md) |
| Where things stand | [`STATE.md`](STATE.md) |
| What shipped when | [`LOG.md`](LOG.md) |
| Rules for agents | [`CLAUDE.md`](CLAUDE.md) |
| Tests | [`tests/README.md`](tests/README.md) |
