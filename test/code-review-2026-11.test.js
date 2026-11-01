// Regressionstests der Code-Review vom 01.11.2026 (docs/code-review-2026-11-01.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createLeaderboard } from '../server/leaderboard.js';
import { createPresence } from '../server/presence.js';
import { GAMES } from '../games/index.js';
import { BaseRoom } from '../server/base-room.js';
import { freePort } from './free-port.js';

test('Bestenliste: eine unlesbare Datei wird gesichert, bevor die nächste Speicherung sie ersetzt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lb-corrupt-'));
  const broken = '{"players":{"anna":{"name":"Anna","games":{"maumau":{"played":7';
  writeFileSync(join(dir, 'leaderboard.json'), broken);
  const originalError = console.error; console.error = () => {};
  try {
    const lb = createLeaderboard(dir);
    lb.record('maumau', [{ name: 'Ben', win: true, points: 0 }]);
    lb.save();
  } finally { console.error = originalError; }
  const backups = readdirSync(dir).filter((f) => f.startsWith('leaderboard.json.unlesbar-'));
  assert.equal(backups.length, 1, 'Sicherung der unlesbaren Datei fehlt');
  assert.equal(readFileSync(join(dir, backups[0]), 'utf8'), broken);
  assert.equal(JSON.parse(readFileSync(join(dir, 'leaderboard.json'), 'utf8')).players.ben.name, 'Ben');
});

test('Bestenliste: gültiges JSON mit falscher Struktur wird ebenfalls gesichert; intakte und fehlende Dateien nicht', () => {
  const wrong = mkdtempSync(join(tmpdir(), 'lb-wrong-'));
  writeFileSync(join(wrong, 'leaderboard.json'), '["kein","Objekt"]');
  createLeaderboard(wrong);
  assert.equal(readdirSync(wrong).filter((f) => f.includes('unlesbar')).length, 1);
  const ok = mkdtempSync(join(tmpdir(), 'lb-ok-'));
  const lb = createLeaderboard(ok); lb.record('maumau', [{ name: 'Anna', win: true, points: 1 }]); lb.save();
  createLeaderboard(ok); createLeaderboard(mkdtempSync(join(tmpdir(), 'lb-none-')));
  assert.deepEqual(readdirSync(ok), ['leaderboard.json']);
});

test('Presence: „zuletzt online“ ist begrenzt, auch wenn ein Browser ständig neue Namen meldet', () => {
  const p = createPresence({ delay: 1e9, setTimer: () => 1, clearTimer: () => {} });
  for (let i = 0; i < 1000; i++) p.update('tab', { name: `Name${i}`, avatar: '🦉', visible: true, active: true });
  p.update('tab', { name: 'Letzter', avatar: '🦉', visible: true, active: true });
  const { recent } = p.snapshot();
  assert.ok(recent.length <= 200, `${recent.length} Einträge`);
  assert.ok(recent.some((r) => r.name === 'Name999'), 'die neuesten Einträge bleiben erhalten');
  assert.ok(!recent.some((r) => r.name === 'Name0'), 'die ältesten fallen zuerst weg');
});

test('Raum: Namen müssen Text sein (kein „[object Object]“)', () => {
  const room = new BaseRoom('TEST1');
  for (const name of [{ a: 1 }, ['x'], 12, true, null]) assert.throws(() => room.addPlayer(name), /Namen/);
  assert.equal(room.addPlayer('Anna').name, 'Anna');
});

test('Zeichenspiele: der Abstimm-Befehl ist nur dort wirksam, wo es ihn gibt', () => {
  for (const id of ['malen-raten', 'kritzelpost', 'bildunterschrift']) {
    const room = GAMES[id].create('VOTE1', {}, () => {});
    const p = room.addPlayer('Anna'); room.sit?.(p.id);
    try {
      try { GAMES[id].events.vote(room, p, { key: 'x', choice: 0 }); } catch (error) { assert.doesNotMatch(error.message, /is not a function/, id); }
    } finally { room.dispose(); }
  }
});

// ---------- echter Server ----------
let server, URL;
before(async () => {
  const port = await freePort(); URL = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: mkdtempSync(join(tmpdir(), 'review-')), POKER_NO_DOTENV: '1' }, stdio: 'pipe' });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
});
after(() => server?.kill());
function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.ask = (ev, data = {}) => new Promise((res) => s.emit(ev, data, res));
  return s;
}

test('Server: Objekt-Eigenschaftsnamen sind keine Spiele (switchGame, create, Bestenliste)', async () => {
  const a = client();
  try {
    for (const game of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      const created = await a.ask('create', { game, name: 'Anna' });
      assert.equal(created.ok, false, game);
      assert.equal(created.error, 'Dieses Spiel gibt es nicht', game);
    }
    assert.ok((await a.ask('create', { game: 'maumau', name: 'Anna' })).ok);
    for (const game of ['__proto__', 'constructor']) {
      const switched = await a.ask('switchGame', { game });
      assert.equal(switched.ok, false);
      assert.equal(switched.error, 'Dieses Spiel gibt es nicht', game);
    }
    for (const game of ['__proto__', 'constructor']) {
      const board = await (await fetch(`${URL}/api/leaderboard?game=${game}`)).json();
      assert.equal(board.game, 'poker', 'unbekannte Namen fallen auf das Standardspiel zurück');
    }
  } finally { a.close(); }
});

test('Server: Einstellungen und Namen vom falschen Typ erzeugen verständliche Antworten', async () => {
  const a = client();
  try {
    for (const settings of ['abc', 5, true, ['x']]) {
      const created = await a.ask('create', { game: 'poker', name: `P${String(settings).length}`, settings });
      assert.ok(created.ok, `settings=${JSON.stringify(settings)}: ${created.error}`);
      await a.ask('leave');
    }
    const bad = await a.ask('create', { game: 'maumau', name: { a: 1 } });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /Namen/);
  } finally { a.close(); }
});
