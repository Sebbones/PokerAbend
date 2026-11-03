// Schnelle Tests (unter ca. 60 s): alle Node-Tests außer Simulationen und Langläufern.
// Alles zusammen läuft weiterhin mit `npm test`; die Langläufer zusätzlich nachts in der CI.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Simulationen und Tests mit langen Wartezeiten (je > 10 s) und das Restore-Skript (startet mehrere Server, braucht bash)
export const SLOW = ['schach.test.js', 'bot-difficulty-strength.test.js', 'simulation.test.js', 'engine.test.js', 'variants.test.js', 'abort.test.js', 'werbinich.test.js', 'away.test.js', 'restore-test.test.js']; // Chess includes perft and complete bot games.

const files = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.js') && !SLOW.includes(f)).sort().map((f) => join('test', f));
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
