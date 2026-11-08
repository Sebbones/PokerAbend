// npm run test:all:docker – dasselbe wie `npm run test:all`, aber im offiziellen Playwright-Image (gleiche Browser wie in der CI, unabhängig vom eigenen Rechner).
// Das Image wird passend zur installierten @playwright/test-Version gewählt (mcr.microsoft.com/playwright:v<Version>-noble).
// Der Projektordner wird eingebunden (Berichte landen im normalen Ordner reports/); node_modules liegt in einem eigenen Docker-Volume,
// damit die Windows-/macOS-Pakete des eigenen Rechners nicht mit denen im Linux-Container kollidieren.
// Alle weiteren Argumente gehen an test:all, z. B.:  npm run test:all:docker -- --only=ui -- -g "Blackjack"
//
// SICHERHEIT: Es wird nur ein LOKALER Docker-Dienst benutzt (Named Pipe bzw. Unix-Socket). Ist als aktiver Docker-Kontext ein entfernter Server
// eingestellt (ssh://, tcp://), wird er ignoriert – die Tests dürfen nie auf einem Server oder gar dem Produktivsystem laufen.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(root, 'node_modules', '@playwright', 'test', 'package.json'), 'utf8')).version;
const image = process.env.PLAYWRIGHT_IMAGE || `mcr.microsoft.com/playwright:v${version}-noble`;
const volume = 'pokerabend-docker-node-modules';
const TAB = String.fromCharCode(9);

const docker = (argv) => spawnSync('docker', argv, { encoding: 'utf8' });
const listed = docker(['context', 'ls', '--format', `{{.Name}}${TAB}{{.DockerEndpoint}}`]);
const contexts = (listed.stdout || '').split(/\r?\n/).filter(Boolean).map((line) => {
  const [name, endpoint = ''] = line.split(TAB);
  return { name: name.replace(/\*$/, '').trim(), endpoint: endpoint.trim() };
});
const isLocal = (c) => /^(npipe|unix):/.test(c.endpoint);
const candidates = [process.env.TEST_ALL_DOCKER_CONTEXT, 'desktop-linux', 'default', ...contexts.filter(isLocal).map((c) => c.name)].filter(Boolean);
let context = null;
for (const name of [...new Set(candidates)]) {
  const known = contexts.find((c) => c.name === name);
  if (!known || !isLocal(known)) continue; // nur bekannte, lokale Kontexte – entfernte nie
  const probe = docker(['--context', name, 'info', '--format', '{{.ServerVersion}}']);
  if (!probe.error && probe.status === 0) { context = name; break; }
}
if (!context) {
  console.error('Kein lokaler Docker-Dienst erreichbar. Bitte Docker Desktop starten und noch einmal versuchen.');
  const remote = contexts.filter((c) => !isLocal(c)).map((c) => c.name);
  if (remote.length) console.error(`(Entfernte Docker-Kontexte (${remote.join(', ')}) werden hier bewusst nie verwendet.)`);
  process.exit(2);
}

const quote = (a) => `'${a.replace(/'/g, "'\\''")}'`;
const extra = process.argv.slice(2).map(quote).join(' ');
console.log(`Docker-Kontext: ${context} (lokal)\nPlaywright ${version} → Image ${image}\n(Der erste Lauf lädt das Image, ca. 2 GB, und installiert die Pakete im Volume ${volume}.)\n`);
const child = spawn('docker', [
  '--context', context, 'run', '--rm', '--init', '--ipc=host',
  '-e', 'CI=1', '-e', 'PLAYWRIGHT_CHANNEL=chromium',
  '-v', `${root}:/work`, '-v', `${volume}:/work/node_modules`, '-w', '/work',
  image, 'sh', '-c', `npm ci --no-audit --no-fund && npm run test:all -- ${extra}`,
], { stdio: 'inherit' });
child.on('error', (error) => { console.error(error.message); process.exit(2); });
child.on('exit', (code) => process.exit(code ?? 1));
