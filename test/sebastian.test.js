// Easter Egg „Waiting for Sebastian“: Namenserkennung und Anzeige für alle am Tisch.
// Eigener Server, damit das Limit für neue Tische nicht mit server.test.js kollidiert.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { isSebastian } from '../games/poker/sebastian.js';
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


test('Sebastian-Namen werden erkannt', () => {
  for (const n of ['Seb', 'Sebi', 'Sebbi', 'Sebby', 'Sebbones', 'Sebastian', 'SEBBONES', '  sebi  ', 'Sebi123', 'Seb_01', 'Seb-Bones', 'seb.bones', 'Sebastian 2']) {
    assert.equal(isSebastian(n), true, n);
  }
});

test('Andere Namen lösen nichts aus', () => {
  for (const n of ['Max', 'Anna', 'Sebastiano', 'Sebastian Müller', 'Basti', 'Se', 'Bones', 'Sebbo', 'Webi', '', null, undefined, '123']) {
    assert.equal(isSebastian(n), false, String(n));
  }
});

// ---------- Easter Egg „Waiting for Sebastian“ ----------
async function table3(names) {
  const [h, ...rest] = names;
  const host = client();
  const created = await host.ask('create', { name: h, settings: { autoNext: false } });
  assert.ok(created.ok, created.error);
  const { code } = created;
  const others = [];
  for (const n of rest) { const c = client(); c.join = await c.ask('join', { code, name: n }); others.push(c); }
  const all = [host, ...others];
  for (let i = 0; i < all.length; i++) assert.ok((await all[i].ask('sit', { seat: i })).ok);
  return { code, all };
}
const sebIds = (s) => (s.state?.sebs || []).map((x) => x.id);

test('Sebastian: Pause per Knopf zeigt allen das Meme, „Bin wieder da“ beendet es', async () => {
  const { all: [a, sebi, max] } = await table3(['Anna', 'Sebi', 'Max']);
  assert.ok((await sebi.ask('sitOut', { value: true })).ok);
  const id = sebi.state.you.id;
  await until(() => [a, sebi, max].every((s) => sebIds(s).includes(id)));
  assert.equal(a.state.sebs[0].name, 'Sebi');
  // Max pausiert: normale Pause, kein Meme
  assert.ok((await max.ask('sitOut', { value: true })).ok);
  await until(() => a.state.seats[2].sittingOut);
  assert.deepEqual(sebIds(a), [id]);
  // Sebi kommt zurück → Meme weg bei allen
  assert.ok((await sebi.ask('sitOut', { value: false })).ok);
  await until(() => [a, sebi, max].every((s) => sebIds(s).length === 0));
  for (const s of [a, sebi, max]) s.disconnect();
});

test('Sebastian: Varianten, zwei gleichzeitig, Nachzügler und Reconnect', async () => {
  const { code, all: [a, seb, bones] } = await table3(['Sebastian', 'Sebi123', 'SEBBONES']);
  await seb.ask('sitOut', { value: true });
  await bones.ask('sitOut', { value: true });
  await until(() => sebIds(a).length === 2);
  assert.deepEqual(new Set(a.state.sebs.map((s) => s.name)), new Set(['Sebi123', 'SEBBONES']));
  // Nachzügler sieht den Zustand sofort
  const late = client();
  assert.ok((await late.ask('join', { code, name: 'Lena' })).ok);
  await until(() => sebIds(late).length === 2);
  // Reconnect mit Token: Zustand bleibt
  const token = seb.join.token;
  seb.disconnect();
  const again = client();
  assert.ok((await again.ask('join', { code, token })).ok);
  await until(() => sebIds(again).length === 2 && again.state.you.name === 'Sebi123');
  // Einer kommt zurück, der andere bleibt
  await bones.ask('sitOut', { value: false });
  await until(() => sebIds(a).length === 1);
  assert.equal(a.state.sebs[0].name, 'Sebi123');
  // Aufstehen beendet die Pause-Anzeige
  await again.ask('stand');
  await until(() => sebIds(a).length === 0);
  // Sebastian selbst (Host, Platz 0) pausiert auch → wird erkannt
  await a.ask('sitOut', { value: true });
  await until(() => sebIds(late).length === 1 && late.state.sebs[0].name === 'Sebastian');
  for (const s of [a, bones, late, again]) s.disconnect();
});

test('Sebastian: in einem anderen Raum erscheint nichts', async () => {
  const one = await table3(['Anna', 'Sebi']);
  const two = await table3(['Max', 'Seb']);
  await one.all[1].ask('sitOut', { value: true });
  await until(() => sebIds(one.all[0]).length === 1);
  await wait(200);
  assert.equal(sebIds(two.all[0]).length, 0, 'Raum 2 bleibt leer');
  for (const s of [...one.all, ...two.all]) s.disconnect();
});
