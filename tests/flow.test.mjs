// Fast tier. Pure checks on the single HTML file: the content graph is
// well-formed, and the CSS keeps every design value inside :root.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'app', 'fraud-decision-support.html'), 'utf8');

function extractFlow() {
  const m = html.match(/<script type="application\/json" id="flow-data">([\s\S]*?)<\/script>/);
  assert.ok(m, 'flow-data block present');
  return JSON.parse(m[1]);
}

const flow = extractFlow();
const nodeById = new Map(flow.nodes.map((n) => [n.id, n]));
const stageById = new Map(flow.stages.map((s) => [s.id, s]));
const CONTENT_TYPES = new Set(['ask', 'watch', 'never', 'escalate', 'resource']);
const RISKS = new Set([null, 'low', 'elevated', 'critical']);

test('ids are unique and start node exists', () => {
  assert.equal(nodeById.size, flow.nodes.length, 'duplicate node id');
  assert.equal(stageById.size, flow.stages.length, 'duplicate stage id');
  assert.ok(nodeById.has(flow.startNodeId), 'startNodeId resolves');
});

test('every node belongs to a stage and every stage has nodes', () => {
  for (const n of flow.nodes) assert.ok(stageById.has(n.stageId), `${n.id}: unknown stage ${n.stageId}`);
  for (const s of flow.stages) {
    assert.ok(flow.nodes.some((n) => n.stageId === s.id), `stage ${s.id} has no nodes`);
    assert.ok(nodeById.has(s.naNextNodeId), `stage ${s.id}: naNextNodeId ${s.naNextNodeId} missing`);
    assert.ok(nodeById.has(s.offScriptNodeId), `stage ${s.id}: offScriptNodeId ${s.offScriptNodeId} missing`);
    assert.equal(nodeById.get(s.offScriptNodeId).stageId, s.id, `stage ${s.id}: off-script node lives in another stage`);
  }
});

test('every answer, exit and park target resolves', () => {
  for (const n of flow.nodes) {
    for (const a of n.answers) assert.ok(nodeById.has(a.nextNodeId), `${n.id} -> ${a.nextNodeId} missing`);
    if (n.naNextNodeId) assert.ok(nodeById.has(n.naNextNodeId), `${n.id}: naNextNodeId missing`);
    if (n.parkNextNodeId) assert.ok(nodeById.has(n.parkNextNodeId), `${n.id}: parkNextNodeId missing`);
  }
});

test('terminal nodes have no answers; others have at least one', () => {
  for (const n of flow.nodes) {
    if (n.terminal) assert.equal(n.answers.length, 0, `${n.id} is terminal but has answers`);
    else assert.ok(n.answers.length >= 1 && n.answers.length <= 9, `${n.id} needs 1–9 answers (number keys)`);
  }
});

test('every node is reachable from the start node', () => {
  const seen = new Set();
  const queue = [flow.startNodeId];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = nodeById.get(id);
    const s = stageById.get(n.stageId);
    const targets = n.answers.map((a) => a.nextNodeId).concat([n.naNextNodeId || s.naNextNodeId, s.offScriptNodeId, n.parkNextNodeId || s.naNextNodeId]);
    targets.forEach((t) => queue.push(t));
  }
  const unreachable = flow.nodes.map((n) => n.id).filter((id) => !seen.has(id));
  assert.deepEqual(unreachable, [], 'unreachable nodes');
});

test('a resolution node is reachable from every node by answers alone', () => {
  const terminals = new Set(flow.nodes.filter((n) => n.terminal).map((n) => n.id));
  const memo = new Map();
  function reaches(id, stack = new Set()) {
    if (terminals.has(id)) return true;
    if (memo.has(id)) return memo.get(id);
    if (stack.has(id)) return false;
    stack.add(id);
    const ok = nodeById.get(id).answers.some((a) => reaches(a.nextNodeId, stack));
    stack.delete(id);
    memo.set(id, ok);
    return ok;
  }
  const dead = flow.nodes.map((n) => n.id).filter((id) => !reaches(id));
  assert.deepEqual(dead, [], 'nodes from which no resolution is reachable');
});

test('content blocks and risk values are well-formed', () => {
  for (const n of flow.nodes) {
    assert.ok(RISKS.has(n.risk), `${n.id}: bad risk ${n.risk}`);
    assert.ok(typeof n.prompt === 'string' && n.prompt.length > 0, `${n.id}: empty prompt`);
    assert.ok(typeof n.label === 'string' && n.label.length > 0, `${n.id}: empty label`);
    for (const c of n.content) {
      assert.ok(CONTENT_TYPES.has(c.type), `${n.id}: bad content type ${c.type}`);
      assert.ok(c.text, `${n.id}: empty content text`);
      if (c.type === 'resource') assert.ok(c.url, `${n.id}: resource without url`);
    }
  }
});

test('setsContext keys are declared context fields', () => {
  const keys = new Set(flow.contextFields.map((f) => f.key));
  for (const n of flow.nodes) for (const a of n.answers) {
    for (const k of Object.keys(a.setsContext || {})) assert.ok(keys.has(k), `${n.id}: setsContext.${k} not a context field`);
  }
});

test('scenario brief is met: critical nodes, never-say blocks, resource links', () => {
  const critical = flow.nodes.filter((n) => n.risk === 'critical');
  assert.ok(critical.length >= 2, 'at least two critical-risk nodes');
  const nevers = flow.nodes.flatMap((n) => n.content).filter((c) => c.type === 'never');
  assert.ok(nevers.length >= 3, 'several never-say blocks');
  const resources = new Set(flow.nodes.flatMap((n) => n.content).filter((c) => c.type === 'resource').map((c) => c.text));
  assert.ok(resources.size >= 4, 'at least four distinct resource links');
  assert.ok(flow.meta.disclaimer.includes('NOT BANK POLICY'));
});

test('CSS keeps raw values inside :root (designer restyles by tokens)', () => {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const rootEnd = style.indexOf('}', style.indexOf(':root {'));
  const rest = style.slice(rootEnd + 1);
  const offenders = [];
  rest.split('\n').forEach((line, i) => {
    if (/@media|@keyframes/.test(line)) return; // media queries cannot read custom properties
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) offenders.push(`hex colour: ${line.trim()}`);
    if (/\b\d+(\.\d+)?(px|rem|em|ms|vh|vw)\b/.test(line)) offenders.push(`raw length/time: ${line.trim()}`);
  });
  assert.deepEqual(offenders, []);
});

test('render logic contains no scenario strings', () => {
  const script = html.slice(html.lastIndexOf('<script>'));
  for (const n of flow.nodes) {
    assert.ok(!script.includes(n.prompt), `prompt of ${n.id} hardcoded in script`);
    for (const c of n.content) assert.ok(!script.includes(c.text), `content of ${n.id} hardcoded in script`);
  }
});
