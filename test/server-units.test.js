// Kleine Server-Bausteine im selben Prozess: Betriebswerte (ops.js), Admin-Werkzeuge (admin-tools.js) und das Einlesen der .env (env.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSystemSampler, dataFiles, versionInfo } from '../server/ops.js';
import { createAdminTools } from '../server/admin-tools.js';

test('Betriebswerte: Systemwerte plausibel, Datendateien nach Größe, Verläufe zusammengefasst, Schlüsseldatei ohne Inhalt', () => {
  const stats = createSystemSampler().stats();
  assert.equal(stats.node, process.version);
  assert.ok(stats.uptimeSec >= 0 && stats.cpuPercent >= 0 && stats.memory.rss > 0);
  const dir = mkdtempSync(join(tmpdir(), 'poker-ops-'));
  writeFileSync(join(dir, 'a.json'), 'x'.repeat(50)); writeFileSync(join(dir, 'b.json'), 'x'.repeat(500)); writeFileSync(join(dir, 'c.tmp'), 'ignoriert');
  writeFileSync(join(dir, 'history-AB12.json'), 'x'.repeat(30)); writeFileSync(join(dir, 'history-CD34.json'), 'x'.repeat(30));
  mkdirSync(join(dir, 'unterordner'));
  const { files, total } = dataFiles(dir);
  assert.deepEqual(files.map((f) => f.name), ['b.json', 'history-*.json (2)', 'a.json'], 'nach Größe sortiert');
  assert.equal(total, 50 + 500 + 60);
  assert.deepEqual(dataFiles(join(dir, 'gibt-es-nicht')), { files: [], total: 0 }, 'fehlender Ordner ist kein Fehler');
  assert.deepEqual(versionInfo({ APP_COMMIT: ' ABCDEF1234567890 ' }).short, 'abcdef1');
  assert.equal(versionInfo({ APP_COMMIT: 'kein-hash' }).commit, '', 'ungültige Commit-Angabe wird verworfen');
});

// Attrappen für Rückblicke, Bestenliste und Konten
function tools(overrides = {}) {
  const calls = [];
  const accounts = {
    get: (id) => ({ id, gameId: id === 'a' ? '#AAAA' : '#BBBB', name: id === 'a' ? 'Anna' : 'Ben' }),
    byGameId: (g) => (g === '#AAAA' ? { id: 'a', name: 'Anna' } : g === '#BBBB' ? { id: 'b', name: 'Ben' } : null),
    search: (q) => [{ q }], merge: (...args) => calls.push(['accounts.merge', ...args]), audit: (...args) => calls.push(['audit', ...args]),
  };
  const leaderboard = {
    rankedTable: () => [{ owner: 'a', name: 'alt', points: 3 }], rankedSummary: () => ({ rounds: 1 }),
    adminRounds: ({ game, hiddenOnly, limit }) => [{ id: 'r1', game, hiddenOnly, limit, players: [{ account: 'a', name: 'Anna' }] }],
    setRoundHidden: (id, hidden) => (id === 'r1' ? { id, hidden } : null), merge: (...args) => calls.push(['leaderboard.merge', ...args]),
  };
  const reviews = { adminList: () => [{ id: 'v1' }], adminGet: (id) => ({ id }), setHidden: (id, hidden) => (id === 'v1' ? { id, hidden } : null) };
  return { calls, t: createAdminTools({ reviews, leaderboard, accounts, mergeAccounts: (...args) => calls.push(['mergeAccounts', ...args]), changed: () => calls.push(['changed']), ...overrides }) };
}
const status = (fn) => { try { fn(); } catch (e) { return e.status; } return null; };

test('Admin-Werkzeuge: Rückblicke und Runden ausblenden – nur echte Wahrheitswerte, unbekannte Einträge sind 404', () => {
  const { t, calls } = tools();
  assert.deepEqual(t.reviews.list(), { items: [{ id: 'v1' }] });
  assert.deepEqual(t.reviews.get('v1'), { id: 'v1' });
  assert.deepEqual(t.reviews.hide('v1', true), { id: 'v1', hidden: true });
  assert.equal(status(() => t.reviews.hide('v1', 'ja')), 400);
  assert.equal(status(() => t.reviews.hide('nix', true)), 404);
  assert.equal(status(() => tools({ reviews: null }).t.reviews.list()), 503, 'Archiv nicht lesbar');
  assert.deepEqual(t.rounds.hide('r1', false), { id: 'r1', hidden: false });
  assert.equal(status(() => t.rounds.hide('r1', 1)), 400);
  assert.equal(status(() => t.rounds.hide('nix', true)), 404);
  assert.ok(calls.some((c) => c[0] === 'changed'), 'Änderungen werden gespeichert');
});
test('Admin-Werkzeuge: Bestenliste und Rundenliste prüfen Auswahl, Spieler erscheinen nur mit Game-ID', () => {
  const { t } = tools();
  const board = t.leaderboard('poker', 'week');
  assert.equal(board.rows[0].name, 'Anna', 'aktueller Kontoname statt alter Name');
  assert.equal(board.rows[0].gameId, '#AAAA');
  assert.ok(!('owner' in board.rows[0]), 'interne Konto-ID verlässt den Server nicht');
  assert.equal(status(() => t.leaderboard('poker', 'quartal')), 400);
  assert.equal(status(() => t.leaderboard('x'.repeat(41), 'all')), 400);
  assert.equal(status(() => t.leaderboard(5, 'all')), 400);
  const rounds = t.rounds.list({ game: 'poker', hidden: true, limit: 5 });
  assert.equal(rounds.items[0].players[0].gameId, '#AAAA');
  assert.ok(!('account' in rounds.items[0].players[0]));
  assert.equal(status(() => t.rounds.list({ game: 7 })), 400);
  assert.deepEqual(t.players.search('x'.repeat(100)).items[0].q.length, 40, 'Suchtext wird gekürzt');
  assert.deepEqual(t.players.search(5).items, [{ q: '' }]);
});
test('Admin-Werkzeuge: Spieler zusammenführen – gültige Game-IDs, nicht dieselbe Person, beide müssen existieren', () => {
  const { t, calls } = tools();
  for (const [from, to] of [[1, 2], ['#AAAA', null], ['aaaa', '#BBBB'], ['#AAAA', '#BBB']]) assert.equal(status(() => t.players.merge(from, to)), 400, `${from} → ${to}`);
  assert.equal(status(() => t.players.merge('#AAAA', '#AAAA')), 400);
  assert.equal(status(() => t.players.merge('#AAAA', '#CCCC')), 404);
  assert.deepEqual(t.players.merge('#AAAA', '#BBBB'), { from: '#AAAA', to: '#BBBB', name: 'Ben' });
  assert.deepEqual(calls.map((c) => c[0]), ['accounts.merge', 'leaderboard.merge', 'mergeAccounts', 'audit', 'changed']);
});

test('.env einlesen: Kommentare, export, Anführungszeichen; bereits gesetzte Variablen gewinnen; POKER_NO_DOTENV schaltet ab', () => {
  const root = mkdtempSync(join(tmpdir(), 'poker-env-'));
  mkdirSync(join(root, 'server'));
  copyFileSync(new URL('../server/env.js', import.meta.url), join(root, 'server', 'env.js'));
  writeFileSync(join(root, '.env'), ['# Kommentar', '', 'A_PLAIN=eins', 'export B_EXPORT = zwei', 'C_QUOTED="drei vier"', "D_SINGLE='fünf'", 'E_COMMENT=sechs # Hinweis', 'F_EXISTS=aus-der-datei', 'kaputt ohne gleich', '1BAD=x'].join('\n'));
  const run = (env) => JSON.parse(spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify('file:///' + join(root, 'server', 'env.js').replaceAll('\\', '/'))}); console.log(JSON.stringify(Object.fromEntries(['A_PLAIN','B_EXPORT','C_QUOTED','D_SINGLE','E_COMMENT','F_EXISTS','1BAD'].map((k) => [k, process.env[k] ?? null]))))`], { env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env }, encoding: 'utf8' }).stdout);
  assert.deepEqual(run({ F_EXISTS: 'aus-docker' }), { A_PLAIN: 'eins', B_EXPORT: 'zwei', C_QUOTED: 'drei vier', D_SINGLE: 'fünf', E_COMMENT: 'sechs', F_EXISTS: 'aus-docker', '1BAD': null });
  assert.equal(run({ POKER_NO_DOTENV: '1' }).A_PLAIN, null);
});
