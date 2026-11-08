// Fasst die Teilberichte des nächtlichen Volllaufs zusammen (Markdown für die GitHub-Zusammenfassung).
// Aufruf: node scripts/nightly-summary.mjs <Ordner mit playwright-*.json und node-*.xml>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'berichte';
const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
const flaky = [];
const failed = [];
let total = 0;
let shards = 0;

function walk(suite) {
  for (const s of suite.suites || []) walk(s);
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      total += 1;
      const label = `${t.projectName} › ${spec.file}:${spec.line} › ${spec.title}`;
      if (t.status === 'flaky') flaky.push(label);
      else if (t.status === 'unexpected') failed.push(label);
    }
  }
}

for (const f of files.filter((n) => /^playwright-\d+\.json$/.test(n))) {
  try {
    walk({ suites: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).suites });
    shards += 1;
  } catch { failed.push(`Bericht ${f} nicht lesbar`); }
}

let nodeFailures = 0;
let nodeTests = 0;
let nodeShards = 0;
for (const f of files.filter((n) => /^node-\d+\.xml$/.test(n))) {
  const xml = fs.readFileSync(path.join(dir, f), 'utf8');
  nodeShards += 1;
  const m = xml.match(/<testsuites[^>]*>/);
  if (m) {
    nodeTests += Number((m[0].match(/tests="(\d+)"/) || [])[1] || 0);
    nodeFailures += Number((m[0].match(/failures="(\d+)"/) || [])[1] || 0);
  }
}

const list = (items) => (items.length ? items.map((x) => `- ${x}`).join('\n') : '- keine');
console.log(`## Nächtlicher Volllauf\n`);
console.log(`- Node-Tests: ${nodeTests} in ${nodeShards}/4 Teilen, Fehler: ${nodeFailures}`);
console.log(`- Browser-Prüfungen: ${total} in ${shards}/12 Teilen, fehlgeschlagen: ${failed.length}, wackelig: ${flaky.length}\n`);
console.log(`### Fehlgeschlagene Browser-Prüfungen\n${list(failed)}\n`);
console.log(`### Wackelige Browser-Prüfungen (erst im Wiederholungsversuch grün)\n${list(flaky)}`);
if (shards < 12 || nodeShards < 4) console.log(`\n**Achtung:** Es fehlen Teilberichte (Browser ${shards}/12, Node ${nodeShards}/4).`);
