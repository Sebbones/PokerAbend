// Runde abbrechen (Host-Menü „Spiel“) und Tisch schließen: kein Wertungseintrag, alles zurück auf den Stand vor der Runde.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';
import { seeded, INVARIANTS, PLAN } from './sim-helpers.js';
import { freePort } from './free-port.js';

// ---------- Raum-Ebene: in jedem Rundenspiel mitten in der Runde abbrechen ----------
for (const [id, plan] of Object.entries(PLAN)) {
  test(`Abbrechen ${GAMES[id].name}: Runde ohne Wertung weg, Stand wie vorher, neue Runde startet sauber`, () => {
    const rng = seeded(777 + id.length);
    for (let n = 0; n < 40; n++) {
      const [lo, hi] = plan.players;
      const count = lo + Math.floor(rng() * (hi - lo + 1));
      const options = Object.fromEntries((GAMES[id].options || []).map((o) => {
        if (o.type === 'bool') return [o.key, rng() < 0.5];
        let max = o.max;
        if (id === 'maumau' && o.key === 'handSize') max = Math.min(max, Math.floor(((count > 5 ? 64 : 32) - 1) / count));
        if (id === 'stapelrennen' && o.key === 'stockSize') max = Math.min(max, Math.floor(162 / count) - 5);
        return [o.key, o.min + Math.floor(rng() * (max - o.min + 1))];
      }));
      if (id === 'blackjack') { options.minBet = Math.max(1, Math.min(options.minBet, Math.floor(options.startStack / 5))); options.maxBet = Math.max(options.maxBet, options.minBet); }
      const room = GAMES[id].create('ABR' + n, { ...plan.settings, ...options }, () => {});
      if ('roll' in room) room.roll = () => Math.floor(rng() * 6) + 1;
      const ids = Array.from({ length: count }, (_, k) => { const p = room.addPlayer('Bot' + k, null); room.sit(p.id); return p.id; });
      const host = room.hostId;
      const before = { scores: { ...room.scores }, wins: { ...room.wins }, roundNo: room.roundNo };
      room.start(ids[0]);
      const stopAt = Math.floor(rng() * 12); // 0 = gleich nach dem Start
      for (let k = 0; k < stopAt && room.phase === 'playing'; k++) BOTS[id](room, room.currentId, rng);
      if (room.phase !== 'playing') { room.dispose(); continue; } // Runde war schon zu Ende
      const other = ids.find((x) => x !== host);
      if (other) assert.throws(() => room.abortRound(other), /Host/, 'Nur der Host darf abbrechen');
      room.abortRound(host);
      assert.equal(room.phase, 'lobby');
      assert.equal(room.roundNo, before.roundNo, 'abgebrochene Runde zählt nicht');
      assert.deepEqual(room.scores, before.scores, 'keine Punkte');
      assert.deepEqual(room.wins, before.wins, 'kein Sieger');
      assert.equal(room.result, null);
      assert.equal(room.currentId, null);
      INVARIANTS[id](room);
      assert.throws(() => room.abortRound(host), /keine Runde/, 'ohne laufende Runde nichts zu tun');
      // Nach dem Abbruch geht eine neue Runde ganz normal und endet
      room.start(host);
      let k = 0;
      while (room.phase === 'playing') { BOTS[id](room, room.currentId, rng); if (++k > plan.maxSteps) assert.fail(`${id}: Runde nach Abbruch endet nicht`); }
      assert.equal(room.phase, 'over');
      room.dispose();
    }
  });
}

test('Abbrechen Blackjack: Einsätze (auch geteilt, verdoppelt, versichert) kommen zurück, die Bank bleibt unverändert', () => {
  const rng = seeded(4242);
  for (let n = 0; n < 60; n++) {
    const room = GAMES.blackjack.create('BJ' + n, { insurance: true }, () => {});
    const ids = [0, 1, 2].map((k) => { const p = room.addPlayer('S' + k, null); room.sit(p.id); return p.id; });
    const stacks = { ...room.stacks };
    room.start(ids[0]);
    const stopAt = Math.floor(rng() * 8);
    for (let k = 0; k < stopAt && room.phase === 'playing'; k++) BOTS.blackjack(room, room.currentId, rng);
    if (room.phase !== 'playing') { room.dispose(); continue; }
    const bank = room.bank;
    room.abortRound(ids[0]);
    assert.equal(room.bank, bank, 'Bank unverändert');
    assert.equal(room.onTable(), 0);
    assert.deepEqual(room.stacks, stacks, 'Chips zurück');
    INVARIANTS.blackjack(room);
    room.dispose();
  }
});

test('Abbrechen Poker: Einsätze der Hand gehen zurück, die Chipsumme bleibt gleich, danach wartet der Tisch', () => {
  for (let n = 0; n < 30; n++) {
    const room = GAMES.poker.create('PK' + n, {}, () => {});
    const ids = [0, 1, 2, 3].map((k) => { const p = room.addPlayer('P' + k, null); room.sit(p.id, k); return p.id; });
    const total = room.table.totalChips();
    const stacks = ids.map((id) => room.chipsOf(room.players.get(id)));
    room.start(ids[0]);
    assert.ok(room.handRunning);
    for (let k = 0; k < n % 7 && room.handRunning; k++) {
      const h = room.table.hand;
      const p = room.playerAt(h.toAct);
      const L = room.table.legal(h.toAct);
      room.act(p.id, k % 3 === 0 && L.canRaise ? { type: 'raise', amount: L.minRaiseTo ?? L.maxTo } : k % 3 === 1 ? { type: 'fold' } : { type: L.canCheck ? 'check' : 'call' });
    }
    if (!room.handRunning) { room.dispose(); continue; }
    room.abortRound(room.hostId);
    assert.equal(room.handRunning, false);
    assert.equal(room.table.totalChips(), total, 'Chipsumme');
    assert.deepEqual(ids.map((id) => room.chipsOf(room.players.get(id))), stacks, 'Chips zurück');
    assert.equal(room.table.handNo, 0, 'Handzähler wie vorher');
    room.start(room.hostId);
    assert.ok(room.handRunning, 'Neustart geht');
    room.dispose();
  }
});

// ---------- Mit dem Server: Rechte, Tisch schließen ----------
const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
const dataDir = mkdtempSync(join(tmpdir(), 'poker-abort-'));
let server;
before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500' }, stdio: 'pipe',
  });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
});
after(() => server.kill());

const clients = [];
function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.state = null; s.closed = null;
  s.on('state', (st) => { s.state = st; });
  s.on('closed', (c) => { s.closed = c; });
  s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r));
  clients.push(s);
  return s;
}
after(() => clients.forEach((c) => c.close()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await wait(25); }
  throw new Error('Zeitüberschreitung');
}
async function table(game, names = ['Anna', 'Ben']) {
  const cs = names.map(() => client());
  const t = await cs[0].ask('create', { game, name: names[0] });
  assert.ok(t.ok);
  for (let i = 1; i < cs.length; i++) assert.ok((await cs[i].ask('join', { code: t.code, name: names[i] })).ok);
  for (const c of cs) await c.ask('sit', { seat: undefined });
  return { cs, code: t.code };
}

test('Server: Runde abbrechen nur durch den Host; Log „Runde vom Host abgebrochen“', async () => {
  const { cs: [a, b] } = await table('maumau');
  await a.ask('start');
  await until(() => b.state?.phase === 'playing');
  const no = await b.ask('abortRound');
  assert.equal(no.ok, false);
  assert.match(no.error, /Host/);
  assert.equal(b.state.phase, 'playing');
  const ok = await a.ask('abortRound');
  assert.ok(ok.ok);
  await until(() => b.state?.phase === 'lobby');
  assert.ok(JSON.stringify(b.state).includes('Runde vom Host abgebrochen'));
});

test('Server: Tisch schließen – nur der Host, alle bekommen „closed“, Code ist frei', async () => {
  const { cs: [a, b], code } = await table('maumau');
  await a.ask('start');
  const no = await b.ask('closeTable');
  assert.equal(no.ok, false);
  assert.ok((await a.ask('closeTable')).ok);
  await until(() => b.closed && a.closed);
  assert.equal(b.closed.text, 'Der Host hat den Tisch geschlossen');
  const j = await client().ask('join', { code, name: 'Neu' });
  assert.equal(j.ok, false);
  const again = await client().ask('create', { game: 'maumau', name: 'Neu' });
  assert.ok(again.ok);
});

test('Abbrechen Partyspiele: Stufe und Timer sind weg, Punkte der Partie verworfen, neue Partie startet', () => {
  for (const id of ['schlagfertig', 'werhatdasgesagt', 'schaetzmeister']) {
    const room = GAMES[id].create('PT' + id.length, {}, () => {});
    const ids = [0, 1, 2].map((k) => { const p = room.addPlayer('G' + k, null); room.sit(p.id); return p.id; });
    room.start(ids[0]);
    assert.equal(room.phase, 'playing');
    room.abortRound(ids[0]);
    assert.equal(room.phase, 'lobby');
    assert.equal(room.stage, null);
    assert.equal(room.turnTimer, null);
    assert.deepEqual(room.scores, {});
    room.start(ids[0]);
    assert.equal(room.phase, 'playing', id);
    room.dispose();
  }
});
