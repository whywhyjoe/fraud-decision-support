// Render the web part snippet for one environment. Stdlib only.
//   node tools/render-webpart.mjs [dev|prod] [--script F] [--config F] [--ver V] [--name N]
// Reads environments.json (gitignored) and app/fraud-guide.webpart.sample.html,
// writes app/fraud-guide.webpart.html (gitignored) and prints it. The output
// is what goes into the page's script web part, once.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const envName = args.find((a) => !a.startsWith('--')) || 'dev';
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };

const envPath = join(root, 'environments.json');
if (!existsSync(envPath)) {
  console.error('environments.json is missing. Copy environments.sample.json and fill it in; it is gitignored.');
  process.exit(2);
}
const env = JSON.parse(readFileSync(envPath, 'utf8'))[envName];
if (!env || !env.site || !env.library || !env.folder) {
  console.error(`environments.json has no complete "${envName}" block (site, library, folder).`);
  process.exit(2);
}

const folderUrl = `${env.site}/${env.library}/${env.folder}`.replace(/\/+/g, '/');
const values = {
  BOOT_URL: `${folderUrl}/boot-fraud-guide.js`,
  SCRIPT: opt('--script', 'fraud-decision-support-bmo.html'),
  CONFIG: opt('--config', 'fraud-decision-support-bmo.flow.json'),
  VER: opt('--ver', '0.5'),
  DISPLAY_NAME: opt('--name', 'Fraud call guide'),
};

const sample = readFileSync(join(root, 'app', 'fraud-guide.webpart.sample.html'), 'utf8');
const out = sample
  .replace(/^<!--[\s\S]*?-->\n/, '')
  .replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in values)) throw new Error(`no value for {{${k}}}`); return values[k]; });

writeFileSync(join(root, 'app', 'fraud-guide.webpart.html'), out);
process.stdout.write(out);
