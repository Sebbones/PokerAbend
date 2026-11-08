// Listet die Dateien mit der geringsten Zeilenabdeckung (Standard: 20) aus reports/coverage/coverage-summary.json.
// Aufruf: node scripts/coverage-worst.mjs [Ordner] [Anzahl]
import { readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const dir = process.argv[2] || 'reports/coverage';
const count = Number(process.argv[3]) || 20;
const file = join(dir, 'coverage-summary.json');
if (!existsSync(file)) { console.error(`Keine Coverage-Zusammenfassung unter ${file}`); process.exit(2); }
const summary = JSON.parse(readFileSync(file, 'utf8'));
const rows = Object.entries(summary)
  .filter(([name]) => name !== 'total')
  .map(([name, v]) => ({ name: relative(resolve('.'), name).split(sep).join('/'), lines: v.lines.pct, uncovered: v.lines.total - v.lines.covered, total: v.lines.total }))
  .filter((r) => r.total > 0)
  .sort((a, b) => a.lines - b.lines || b.uncovered - a.uncovered)
  .slice(0, count);
const total = summary.total;
console.log(`Gesamt: ${total.lines.pct}% Zeilen, ${total.statements.pct}% Anweisungen, ${total.branches.pct}% Zweige, ${total.functions.pct}% Funktionen`);
console.log(`\nDie ${rows.length} Dateien mit der geringsten Zeilenabdeckung:`);
rows.forEach((r, i) => console.log(`${String(i + 1).padStart(2)}. ${String(r.lines).padStart(6)} %  ${String(r.uncovered).padStart(4)}/${r.total} Zeilen offen  ${r.name}`));
