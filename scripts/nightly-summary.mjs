// Fasst die Teilberichte des nächtlichen Volllaufs zusammen (Markdown für die GitHub-Zusammenfassung).
// Jeder Teil hat `npm run test:all -- --only=… --shard=…` mit eigenem Berichtsordner ausgeführt und dort eine summary.json hinterlassen.
// Aufruf: node scripts/nightly-summary.mjs <Ordner mit den heruntergeladenen Teilberichten> [Zahl erwarteter Node-Teile] [Zahl erwarteter Browser-Teile]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'berichte';
const expectNode = Number(process.argv[3]) || 4;
const expectUi = Number(process.argv[4]) || 12;

function find(root, name, out = []) {
  let entries = [];
  try { entries = readdirSync(root); } catch { return out; }
  for (const entry of entries) {
    const path = join(root, entry);
    let stat; try { stat = statSync(path); } catch { continue; }
    if (stat.isDirectory()) find(path, name, out); else if (entry === name) out.push(path);
  }
  return out;
}

const sums = find(dir, 'summary.json').map((file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } }).filter(Boolean);
const node = sums.filter((s) => s.parts?.node), ui = sums.filter((s) => s.parts?.ui);
const total = (list, part, key) => list.reduce((n, s) => n + (s.parts[part][key] || 0), 0);
const longest = (list) => Math.max(0, ...list.map((s) => s.totalSeconds || 0));
const fmt = (seconds) => `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
const failed = ui.flatMap((s) => s.parts.ui.failedTests || []), flaky = ui.flatMap((s) => s.parts.ui.flakyTests || []);
const list = (items) => (items.length ? items.map((x) => `- ${x}`).join('\n') : '- keine');

console.log('## Nächtlicher Volllauf\n');
console.log('| Teil | Dateien/Teile | bestanden | fehlgeschlagen | übersprungen | längster Teil |\n| --- | ---: | ---: | ---: | ---: | ---: |');
console.log(`| Node-Tests | ${node.length}/${expectNode} | ${total(node, 'node', 'passed')} | ${total(node, 'node', 'failed')} | ${total(node, 'node', 'skipped')} | ${fmt(longest(node))} |`);
console.log(`| Browser (Playwright) | ${ui.length}/${expectUi} | ${total(ui, 'ui', 'passed')} | ${total(ui, 'ui', 'failed')} | ${total(ui, 'ui', 'skipped')} | ${fmt(longest(ui))} |`);
console.log(`\nGesamtdauer ≈ längster Teil: ${fmt(Math.max(longest(node), longest(ui)))} (Ziel: unter 40 Minuten)`);
const covered = node.filter((s) => s.coverage);
if (covered.length) console.log('\nCoverage der Teile: ' + covered.map((s) => `${s.shard}: ${s.coverage.lines} %`).join(' · ') + ' (die zusammengeführte Gesamt-Coverage steht im Bericht-Artefakt „nacht-coverage“)');
console.log(`\n### Fehlgeschlagene Browser-Prüfungen\n${list(failed)}\n`);
console.log(`### Wackelige Browser-Prüfungen (erst im Wiederholungsversuch grün)\n${list(flaky)}`);
const badNode = node.filter((s) => s.parts.node.failed > 0 || s.parts.node.exitCode !== 0).map((s) => `Node-Teil ${s.shard}`);
if (badNode.length) console.log(`\n### Rote Node-Teile\n${list(badNode)}`);
if (node.length < expectNode || ui.length < expectUi) console.log(`\n**Achtung:** Es fehlen Teilberichte (Node ${node.length}/${expectNode}, Browser ${ui.length}/${expectUi}) – ein Teil ist abgestürzt oder wurde abgebrochen.`);
