// Render the web part snippet for one environment. Stdlib only.
//   node tools/render-webpart.mjs [dev|prod] [--script F] [--config F] [--ver V] [--name N] [--fullpage takeover|webview|none]
// Reads environments.json (gitignored) and app/fraud-guide.webpart.sample.html,
// writes app/fraud-guide.webpart.html (gitignored) and prints it. That file is
// the entry: upload it to the library folder beside the loader, and point the
// page's Script Editor at it in external mode (the URL goes to stderr). Re-run
// and re-upload whenever the loader changes; the page itself is not edited.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const folderUrl = `${env.site}/${env.library}/${env.folder}`.replace(/\/+/g, '/');
const loaderHash = createHash('sha256').update(readFileSync(join(root, 'app', 'boot-fraud-guide.js'))).digest('hex').slice(0, 10);

// The loader reads these six; environments.json names their internal names.
const pc = typeof env.pageColumns === 'object' ? env.pageColumns : {};
const keys = ['itemType', 'script', 'config', 'version', 'appName', 'status'];
const columns = Object.fromEntries(keys.filter((k) => pc[k]).map((k) => [k, pc[k]]));

const fullpage = opt('--fullpage', 'takeover');
if (!['takeover', 'webview', 'none'].includes(fullpage)) { console.error(`--fullpage must be takeover, webview or none, not ${fullpage}`); process.exit(2); }

const values = {
  BOOT_URL: attr(`${folderUrl}/boot-fraud-guide.js?v=${loaderHash}`),
  SCRIPT: attr(opt('--script', 'fraud-decision-support-bmo.html')),
  CONFIG: attr(opt('--config', 'fraud-decision-support-bmo.flow.json')),
  VER: attr(opt('--ver', '0.5')),
  APP_NAME: attr(opt('--name', 'Fraud call guide')),
  COLUMNS: attr(JSON.stringify(columns)),
  FULLPAGE: fullpage,
};

const sample = readFileSync(join(root, 'app', 'fraud-guide.webpart.sample.html'), 'utf8');
const out = sample
  .replace(/^<!--[\s\S]*?-->\n/, '')
  .replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in values)) throw new Error(`no value for {{${k}}}`); return values[k]; });

writeFileSync(join(root, 'app', 'fraud-guide.webpart.html'), out);
process.stdout.write(out);
if (env.tenant) console.error(`
Script Editor, external mode, Script URL:
${env.tenant.replace(/\/+$/, '')}${folderUrl}/fraud-guide.webpart.html`);
