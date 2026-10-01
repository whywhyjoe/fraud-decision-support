// Deploy to one environment: render the entry file, copy the files the page
// needs into the library folder's synced mirror, and check the copies. Stdlib
// only. OneDrive carries the files to the library; the page is not touched.
//   node tools/deploy.mjs [dev|prod] [--script F] [--config F | --no-config] [other render-webpart options]
// Needs "mirror" in that environment's block of environments.json: the local,
// synced folder that is the library folder (never committed; machine-specific).
// The folder must already exist: create it in the library and let it sync.
import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'app');
const args = process.argv.slice(2);
const envName = args.find((a) => !a.startsWith('--')) || 'dev';
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const die = (msg) => { console.error(msg); process.exit(2); };
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const envPath = join(root, 'environments.json');
if (!existsSync(envPath)) die('environments.json is missing. Copy environments.sample.json and fill it in; it is gitignored.');
const env = JSON.parse(readFileSync(envPath, 'utf8'))[envName] || {};
const mirror = env.mirror;
if (!mirror) die(`environments.json "${envName}" has no "mirror": the synced local folder that is the library folder.`);
if (!existsSync(mirror) || !statSync(mirror).isDirectory()) die(`mirror folder not found: ${mirror}\nCreate the folder in the library and let OneDrive sync it; this script does not create it.`);

// 1. The entry file, carrying the loader's hash. Its Script URL goes to stderr.
const render = spawnSync(process.execPath, [join(root, 'tools', 'render-webpart.mjs'), ...args], { encoding: 'utf8' });
if (render.status !== 0) { process.stderr.write(render.stderr || ''); die('render failed'); }

// 2. What the page needs: loader, entry, player, and the content file unless --no-config.
const player = opt('--script', 'fraud-decision-support-bmo.html');
const files = ['boot-fraud-guide.js', 'fraud-guide.webpart.html', player].map((name) => ({ name, from: join(app, name) }));
if (!args.includes('--no-config')) {
  const config = opt('--config', 'fraud-decision-support-bmo.flow.json');
  const source = join(app, config.replace(/\.flow\.json$/, '.html'));
  if (!existsSync(source)) die(`no player to extract ${config} from: ${source}`);
  const block = readFileSync(source, 'utf8').match(/<script type="application\/json" id="flow-data">([\s\S]*?)<\/script>/);
  if (!block) die(`${source} has no #flow-data block`);
  mkdirSync(join(root, '.scratch'), { recursive: true });
  const out = join(root, '.scratch', config);
  writeFileSync(out, JSON.stringify(JSON.parse(block[1]), null, 2) + '\n');
  files.push({ name: config, from: out });
}
for (const f of files) if (!existsSync(f.from)) die(`missing: ${f.from}`);

// 3. Copy and check each copy byte for byte.
for (const f of files) {
  const to = join(mirror, f.name);
  copyFileSync(f.from, to);
  if (sha(f.from) !== sha(to)) die(`copy does not match: ${to}`);
  console.log(`  copied ${f.name}`);
}
process.stderr.write(render.stderr || '');
console.log(`\n${files.length} files in ${mirror}. OneDrive syncs them to the library; reload the page once they show there.`);
