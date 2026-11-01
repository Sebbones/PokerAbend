// Integrationstest: echter Server, drei Spieler über Socket.IO.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { freePort } from './free-port.js';

const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
let server;

before(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'poker-'));
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1' }, stdio: 'pipe' });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
});
after(() => server.kill());

function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.state = null;
  s.on('state', (st) => { s.state = st; });
  s.ask = (ev, data = {}) => new Promise((res) => s.emit(ev, data, res));
  return s;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await wait(20); }
  throw new Error('Zeitüberschreitung');
}

test('Drei Spieler spielen eine Hand – Karten bleiben geheim, Chips stimmen', async () => {
  const a = client(); const b = client(); const c = client();
  const created = await a.ask('create', { name: 'Anna', settings: { startStack: 1000, smallBlind: 5, bigBlind: 10, autoNext: false } });
  assert.ok(created.ok, created.error);
  const code = created.code;

  const jb = await b.ask('join', { code, name: 'Ben' });
  assert.ok(jb.ok);
  const dup = await c.ask('join', { code, name: 'ben' });
  assert.equal(dup.ok, false, 'Doppelter Name wird abgelehnt');
  assert.ok((await c.ask('join', { code, name: 'Carla' })).ok);

  assert.ok((await a.ask('sit', { seat: 0 })).ok);
  assert.ok((await b.ask('sit', { seat: 3 })).ok);
  assert.ok((await c.ask('sit', { seat: 6 })).ok);
  assert.equal((await b.ask('start')).ok, false, 'Nur der Host startet');
  assert.ok((await a.ask('start')).ok);

  await until(() => a.state?.hand && b.state?.hand && c.state?.hand);
  // Jeder sieht nur seine eigenen Karten
  for (const [s, seat] of [[a, 0], [b, 3], [c, 6]]) {
    for (const st of s.state.seats.filter(Boolean)) {
      if (st.seat === seat) assert.ok(st.cards.every((x) => x !== '??'));
      else assert.deepEqual(st.cards, ['??', '??']);
    }
  }
  const raw = JSON.stringify(b.state);
  for (const card of a.state.seats[0].cards) assert.ok(!raw.includes(`"${card}"`) || b.state.seats[3].cards.includes(card), 'Annas Karten tauchen bei Ben nicht auf');

  // Wer nicht dran ist, wird abgelehnt
  const bySeat = { 0: a, 3: b, 6: c };
  const turn = a.state.hand.toAct;
  const notTurn = Object.entries(bySeat).find(([s]) => Number(s) !== turn)[1];
  assert.equal((await notTurn.ask('action', { type: 'fold' })).ok, false);

  // Doppelt gesendete Aktion wird nur einmal ausgeführt
  const actor = bySeat[turn];
  await actor.ask('action', { type: 'call', id: 'x1' });
  const afterFirst = actor.state.log.length;
  await actor.ask('action', { type: 'call', id: 'x1' });
  await wait(50);
  assert.equal(actor.state.log.length, afterFirst);

  // Alle checken/callen bis die Hand vorbei ist
  let guard = 0;
  while (!a.state.hand.done && guard++ < 30) {
    const s = bySeat[a.state.hand.toAct];
    await until(() => s.state.legal);
    await s.ask('action', { type: s.state.legal.canCheck ? 'check' : 'call', id: 'g' + guard });
    await wait(30);
  }
  await until(() => a.state.hand.done);
  const total = a.state.seats.filter(Boolean).reduce((x, s) => x + s.stack, 0);
  assert.equal(total, 3000, 'Keine Chips erzeugt oder vernichtet');
  assert.ok(a.state.hand.result.pots.length >= 1);

  // Reconnect mit Token: gleicher Platz, gleiche Chips
  const stackBefore = b.state.seats[3].stack;
  b.disconnect();
  await until(() => a.state.seats[3].connected === false);
  const b2 = client();
  const re = await b2.ask('join', { code, token: jb.token });
  assert.ok(re.ok);
  await until(() => b2.state);
  assert.equal(b2.state.you.seat, 3);
  assert.equal(b2.state.seats[3].stack, stackBefore);

  // Zweiter Tab mit gleichem Token verdrängt den ersten
  let replaced = false;
  b2.on('replaced', () => { replaced = true; });
  const b3 = client();
  assert.ok((await b3.ask('join', { code, token: jb.token })).ok);
  await until(() => replaced);

  // Nächste Hand per Host, Button wandert
  const oldButton = a.state.hand.button;
  assert.ok((await a.ask('nextHand')).ok);
  await until(() => a.state.hand && !a.state.hand.done && a.state.hand.button !== oldButton);

  for (const s of [a, b2, b3, c]) s.disconnect();
});

test('Timeout: wer nicht handelt, checkt oder foldet automatisch', async () => {
  const a = client(); const b = client();
  const { code } = await a.ask('create', { name: 'Anna', settings: { turnTime: 1, autoNext: false } });
  await b.ask('join', { code, name: 'Ben' });
  await a.ask('sit', { seat: 0 }); await b.ask('sit', { seat: 1 });
  await a.ask('start');
  await until(() => a.state?.hand);
  await until(() => a.state.hand.done, 4000);
  assert.ok(a.state.log.some((l) => l.text.includes('Zeit abgelaufen')));
  a.disconnect(); b.disconnect();
});

test('Host hält an: Timer steht, niemand kann handeln, danach geht es weiter', async () => {
  const a = client(); const b = client();
  const { code } = await a.ask('create', { name: 'Anna', settings: { turnTime: 1, autoNext: false } });
  await b.ask('join', { code, name: 'Ben' });
  await a.ask('sit', { seat: 0 }); await b.ask('sit', { seat: 1 });
  await a.ask('start');
  await until(() => a.state?.hand);
  assert.equal((await b.ask('freeze')).ok, false, 'Nur der Host hält an');
  assert.ok((await a.ask('freeze')).ok);
  await until(() => a.state.frozen);
  const actor = a.state.hand.toAct === 0 ? a : b;
  const r = await actor.ask('action', { type: 'call' });
  assert.equal(r.ok, false, 'Während der Pause geht keine Aktion');
  await wait(1500); // länger als die Zugzeit
  assert.equal(a.state.hand.done, false, 'Timer läuft nicht ab');
  assert.ok(!a.state.log.some((l) => l.text.includes('Zeit abgelaufen')));
  assert.ok((await a.ask('freeze')).ok);
  await until(() => !a.state.frozen);
  await until(() => a.state.hand.done, 4000);
  assert.ok(a.state.log.some((l) => l.text.includes('Zeit abgelaufen')));
  a.disconnect(); b.disconnect();
});

