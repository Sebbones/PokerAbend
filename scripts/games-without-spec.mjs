// Welche Spiele haben noch keine eigene Playwright-Spec? Liest die Spieleliste aus games/ und sucht in test/ui/*.spec.js und games/<spiel>/ui.spec.js.
// Als „eigene Spec“ zählt eine Datei, die das Spiel namentlich enthält (Kennung als eigenes Wort im Text oder im Dateinamen) – ausgenommen die
// Sammel-Specs, die alle Spiele der Reihe nach durchlaufen (sonst hätte jedes Spiel automatisch eine).
// Aufruf: node scripts/games-without-spec.mjs [--json]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GAMES } from '../games/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const GENERIC = new Set(['visual-p1.spec.js', 'language.spec.js', 'smoke.spec.js', 'game-design.spec.js', 'bots.spec.js', 'visual-roadmap.spec.js', 'look.spec.js',
  'lobby-menu.spec.js', 'bug-review.spec.js', 'leave.spec.js', 'game-pause.spec.js', 'history.spec.js', 'roadmap-presence.spec.js', 'bot-difficulty.spec.js', 'settings.spec.js',
  'ui-redesign.spec.js', 'visual-p3-tables.spec.js', 'home-reference.spec.js', 'new-games.spec.js', 'party-program.spec.js', 'profile.spec.js', 'achievements.spec.js',
  'realtime.spec.js', 'game-flow.spec.js']);

export function specFiles() {
  const files = readdirSync(root + 'test/ui').filter((f) => f.endsWith('.spec.js') && !GENERIC.has(f)).map((f) => ({ file: `test/ui/${f}`, text: readFileSync(root + 'test/ui/' + f, 'utf8') }));
  for (const d of readdirSync(root + 'games', { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(`${root}games/${d.name}/ui.spec.js`)) files.push({ file: `games/${d.name}/ui.spec.js`, text: readFileSync(`${root}games/${d.name}/ui.spec.js`, 'utf8') });
  }
  return files;
}
const escape = (id) => id.replace(/[-]/g, '[-]');
export function gamesWithoutSpec() {
  const files = specFiles();
  return Object.keys(GAMES).filter((id) => {
    const word = new RegExp(`(^|[^a-z0-9-])${escape(id)}($|[^a-z0-9-])`);
    return !files.some((f) => f.file.includes(id) || word.test(f.text));
  }).sort();
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const missing = gamesWithoutSpec();
  if (process.argv.includes('--json')) console.log(JSON.stringify(missing));
  else console.log(`${missing.length} von ${Object.keys(GAMES).length} Spielen ohne eigene Spec:\n${missing.join(' ')}`);
}
