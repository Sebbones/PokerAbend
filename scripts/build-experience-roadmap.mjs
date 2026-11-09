// Erzeugt docs/design/game-experience-roadmap.json aus GAME_EXPERIENCE_ROADMAP.md (Quelle ist die Markdown-Datei).
import { readFileSync, writeFileSync } from 'node:fs';
const md = readFileSync('docs/design/GAME_EXPERIENCE_ROADMAP.md', 'utf8');
const vis = JSON.parse(readFileSync('docs/design/game-visual-roadmap.json', 'utf8'));
const visId = Object.fromEntries(vis.packages.map((p) => [p.game_id, p.id]));
const keys = { 'Welt': 'world', 'Figuren & Material': 'pieces_and_material', 'Sound': 'sound', 'Animation': 'animation', 'Highlight': 'highlight' };
const foundation = [...md.matchAll(/^### (EXP-F\d) · (.+)$/gm)].map(([, id, title]) => ({ id, title, status: 'planned' }));
const packages = md.split('\n#### ').slice(1).map((block) => {
  const [head, ...lines] = block.split('\n');
  const m = head.match(/^(EXP-\d{3}) · (.+?) \(`([^`]+)`\) · (P\d)/);
  if (!m) throw new Error('Unlesbarer Eintrag: ' + head);
  const entry = { id: m[1], game_id: m[3], game_name: m[2], priority: m[4], vis_id: visId[m[3]] || null, status: 'planned', implementation_commit: null };
  for (const line of lines) { const f = line.match(/^- \*\*(.+?):\*\* (.+)$/); if (f && keys[f[1]]) entry[keys[f[1]]] = f[2]; }
  return entry;
});
writeFileSync('docs/design/game-experience-roadmap.json', JSON.stringify({
  schema_version: 1, source: 'docs/design/GAME_EXPERIENCE_ROADMAP.md', generator: 'scripts/build-experience-roadmap.mjs',
  status_policy: 'Nur Planung. Ein Paket wird erst nach ausdrücklicher Freigabe seiner ID umgesetzt; danach status, implementation_commit und Nachweise eintragen.',
  foundation, packages,
}, null, 2) + '\n');
console.log(`${foundation.length} Fundament-Pakete, ${packages.length} Spielpakete`);
