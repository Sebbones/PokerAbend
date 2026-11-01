// Weggebliebene Spieler und Host: nach der Frist (hier ≈ 1 s statt 5 min) fliegen sie mit allen Daten raus.
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
  const dataDir = mkdtempSync(join(tmpdir(), 'poker-away-'));
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', PLAYER_TIMEOUT_MIN: '0.02' },
    stdio: 'pipe',
  });
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
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await wait(25); }
  throw new Error('Zeitüberschreitung');
}
async function table(names) {
  const all = [];
  const host = client();
  const created = await host.ask('create', { name: names[0], settings: { autoNext: false } });
  assert.ok(created.ok, created.error);
  host.token = created.token;
  all.push(host);
  for (const n of names.slice(1)) {
    const c = client();
    const r = await c.ask('join', { code: created.code, name: n });
    assert.ok(r.ok, r.error);
    c.token = r.token;
    all.push(c);
  }
  for (let i = 0; i < all.length; i++) assert.ok((await all[i].ask('sit', { seat: i })).ok);
  await until(() => all.every((c) => c.state?.seats.filter(Boolean).length === all.length));
  return { code: created.code, all };
}
const names = (s) => s.state.standings.map((p) => p.name).sort();

test('Spieler bleibt weg → nach der Frist entfernt, Platz frei', async () => {
  const { all: [a, b, c] } = await table(['Anna', 'Ben', 'Carla']);
  b.disconnect();
  await until(() => a.state.standings.some((p) => p.name === 'Ben' && !p.connected));
  await until(() => !names(a).includes('Ben'));
  assert.equal(a.state.seats[1], null, 'Bens Platz ist frei');
  assert.ok(a.state.log.some((l) => /Ben war .* weg und wurde entfernt/.test(l.text)));
  a.disconnect(); c.disconnect();
});

test('Kommt rechtzeitig zurück → bleibt mit Platz und Chips', async () => {
  const { code, all: [a, b] } = await table(['Anna', 'Ben']);
  const id = b.state.you.id;
  b.disconnect();
  await wait(300);
  const back = client();
  assert.ok((await back.ask('join', { code, token: b.token })).ok);
  await until(() => back.state?.you.id === id);
  await wait(1800); // länger als die Frist
  assert.ok(names(a).includes('Ben'));
  assert.equal(back.state.you.seat, 1);
  a.disconnect(); back.disconnect();
});

test('Host bleibt weg → wird entfernt, ein anderer wird Host', async () => {
  const { all: [a, b, c] } = await table(['Anna', 'Ben', 'Carla']);
  assert.equal(b.state.you.isHost, false);
  a.disconnect();
  await until(() => !names(b).includes('Anna'));
  await until(() => b.state.you.isHost || c.state.you.isHost);
  assert.ok(b.state.log.some((l) => /ist jetzt Host/.test(l.text)));
  b.disconnect(); c.disconnect();
});

test('Mitten in der Hand weg → foldet, verschwindet nach der Hand', async () => {
  const { all: [a, b, c] } = await table(['Anna', 'Ben', 'Carla']);
  assert.ok((await a.ask('start')).ok);
  await until(() => a.state.hand && !a.state.hand.done);
  c.disconnect();
  await until(() => a.state.log.some((l) => /Carla war .* weg/.test(l.text)));
  // Rest der Hand: alle folden bzw. checken, bis sie vorbei ist
  for (let k = 0; k < 20 && !a.state.hand.done; k++) {
    const turn = a.state.hand.toAct;
    const s = turn === 0 ? a : turn === 1 ? b : null;
    if (s) await s.ask('action', { type: 'fold' });
    await wait(80);
  }
  await until(() => a.state.hand.done);
  assert.ok((await a.ask('nextHand')).ok);
  await until(() => !names(a).includes('Carla'));
  assert.equal(a.state.seats[2], null);
  a.disconnect(); b.disconnect();
});

test('Alle weg → der Tisch wird gelöscht', async () => {
  const { code, all } = await table(['Anna', 'Ben']);
  for (const s of all) s.disconnect();
  await wait(3000);
  const late = client();
  const r = await late.ask('join', { code, name: 'Lena' });
  assert.equal(r.ok, false);
  assert.match(r.error, /gibt es nicht/);
  late.disconnect();
});
