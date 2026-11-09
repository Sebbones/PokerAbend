// Erzeugt docs/design/game-experience-roadmap.json aus GAME_EXPERIENCE_ROADMAP.md (Quelle ist die Markdown-Datei).
import { readFileSync, writeFileSync } from 'node:fs';
const md = readFileSync('docs/design/GAME_EXPERIENCE_ROADMAP.md', 'utf8');
const vis = JSON.parse(readFileSync('docs/design/game-visual-roadmap.json', 'utf8'));
const visId = Object.fromEntries(vis.packages.map((p) => [p.game_id, p.id]));
const keys = { 'Welt': 'world', 'Figuren & Material': 'pieces_and_material', 'Sound': 'sound', 'Animation': 'animation', 'Highlight': 'highlight' };
const foundation = [...md.matchAll(/^### (EXP-F\d) · (.+)$/gm)].map((match) => {
  const [, id, title] = match, block = md.slice(match.index + match[0].length).split(/\n###? /, 1)[0];
  const status = block.match(/^- \*\*Status:\*\* (planned|done)$/m)?.[1] || 'planned';
  if (status !== 'done') return { id, title, status };
  const implementation_commit = block.match(/^- \*\*Implementierungscommit:\*\* `([a-f0-9]{40})`$/m)?.[1];
  const evidence = [...(block.match(/^- \*\*Nachweise:\*\* (.+)$/m)?.[1] || '').matchAll(/`([^`]+)`/g)].map(m => m[1]);
  if (!implementation_commit || !evidence.length) throw new Error(id + ': done braucht Commit und Nachweise');
  return { id, title, status, implementation_commit, evidence };
});
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
