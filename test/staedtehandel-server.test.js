// V2-12 Städtehandel mit echtem Server: Lobby, Aufbau und Spielzüge per Socket, privater Spielstand, Neustart des Servers mitten im Spiel
// und Wiedereinstieg mit dem gespeicherten Token. Prüft, dass nach dem Neustart weitergespielt wird (Bots übernehmen wieder).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { freePort } from './free-port.js';

const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
const dataDir = mkdtempSync(join(tmpdir(), 'staedtehandel-'));
let server;
function start() {
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '' }, stdio: 'pipe',
  });
  return new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
}
const stopServer = () => new Promise((res) => { server.removeAllListeners('exit'); server.on('exit', res); server.kill(); });
before(start);
after(() => server.kill());

function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.state = null;
  s.on('state', (st) => { s.state = st; });
  s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r));
  return s;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await wait(25); }
  throw new Error('Zeitüberschreitung');
}
const saved = (code) => { try { return JSON.parse(readFileSync(join(dataDir, 'rooms.json'), 'utf8')).find((r) => r.code === code); } catch { return null; } };

test('Städtehandel: Spielstand mitten im Spiel überlebt einen Serverneustart, Geheimes bleibt geheim, danach geht es weiter', async () => {
  const a = client();
  const created = await a.ask('create', { game: 'staedtehandel', name: 'Anna', settings: { turnTime: 0 } });
  assert.ok(created.ok, created.error);
  assert.equal((await a.ask('sit')).ok, true);
  for (const difficulty of ['easy', 'hard']) assert.equal((await a.ask('addBot', { difficulty })).ok, true);
  assert.equal((await a.ask('start')).ok, true);
  await until(() => a.state?.g);

  // Aufbau: Siedlung und Straße setzen, wenn der Spieler dran ist (die Bots ziehen von selbst)
  const place = async () => {
    await until(() => a.state.turnId === a.state.you.id && a.state.g.stage === 'setup' || a.state.g.stage !== 'setup', 30000);
    if (a.state.g.stage !== 'setup') return false;
    const g = a.state.g, kind = g.legal.settlement.length ? 'settlement' : 'road';
    const at = (kind === 'settlement' ? g.legal.settlement : g.legal.road)[0];
    const r = await a.ask('ssBuild', { kind, at });
    assert.equal(r.ok, true, r.error);
    return true;
  };
  // zwei Siedlungen + zwei Straßen für den Menschen
  for (let i = 0; i < 4; i++) { await place(); await wait(120); }
  await until(() => a.state.g.stage !== 'setup', 40000);
  // Ein paar eigene Züge: Würfeln und beenden, bis genug passiert ist
  for (let turn = 0; turn < 3; turn++) {
    await until(() => a.state.turnId === a.state.you.id, 40000);
    if (a.state.g.stage === 'roll') assert.equal((await a.ask('ssRoll')).ok, true);
    await until(() => a.state.turnId !== a.state.you.id || ['main', 'robber', 'discard', 'steal'].includes(a.state.g.stage), 15000);
    for (let i = 0; i < 6 && a.state.turnId === a.state.you.id; i++) {
      const g = a.state.g;
      if (g.stage === 'discard' && g.discard[a.state.you.id]) { const cards = {}; let n = g.discard[a.state.you.id]; for (const r of Object.keys(g.hand)) while (n > 0 && (cards[r] || 0) < g.hand[r]) { cards[r] = (cards[r] || 0) + 1; n--; } await a.ask('ssDiscard', { cards }); }
      else if (g.stage === 'robber') await a.ask('ssRobber', { hex: g.legal.robber[0] });
      else if (g.stage === 'steal') await a.ask('ssSteal', { victim: g.legal.victims[0] });
      else if (g.stage === 'main') { assert.equal((await a.ask('ssEnd')).ok, true); break; }
      await wait(150);
    }
  }
  // Der Server hat den Spielstand mitten im Spiel gespeichert
  const before = a.state;
  await until(() => { const s = saved(created.code); return s?.extra?.s?.turnNo >= 1 && s.extra.s.stage !== 'setup'; }, 10000);
  const onDisk = saved(created.code);
  assert.equal(onDisk.extra.phase, 'playing');
  assert.ok(Array.isArray(onDisk.extra.s.deck), 'der Kartenstapel liegt nur im Speicherstand, nie in der Ansicht');
  assert.ok(!JSON.stringify(before.g).includes('"deck"'));
  const token = created.token;
  a.disconnect();
  await wait(300);
  const finalDisk = saved(created.code); // letzter gespeicherter Stand vor dem Beenden
  await stopServer();
  for (let k = 0; ; k++) { try { await start(); break; } catch (e) { if (k >= 4) throw e; await wait(300); } }

  const again = client();
  const joined = await again.ask('join', { code: created.code, token });
  assert.equal(joined.ok, true, joined.error);
  await until(() => again.state?.g, 10000);
  const g = again.state.g;
  assert.equal(again.state.phase, 'playing');
  assert.equal(again.state.you.id, before.you.id);
  assert.deepEqual(g.buildings, finalDisk.extra.s.buildings, 'Gebäude sind nach dem Neustart noch da');
  assert.deepEqual(g.roads, finalDisk.extra.s.roads);
  assert.deepEqual(g.hand, finalDisk.extra.s.res[before.you.id], 'die eigene Hand ist noch da');
  assert.equal(g.stage, finalDisk.extra.s.stage);
  assert.ok(Object.keys(g.buildings).length >= 6);
  // Es geht weiter: entweder ist ein Bot dran und zieht, oder der Mensch kann würfeln/beenden
  const turnBefore = g.turnNo;
  await until(() => again.state.g.turnNo > turnBefore || again.state.turnId === again.state.you.id, 40000);
  if (again.state.turnId === again.state.you.id && again.state.g.stage === 'roll') assert.equal((await again.ask('ssRoll')).ok, true);
  // Fremde Eingriffe bleiben nach dem Neustart wirkungslos
  const intruder = client();
  const j2 = await intruder.ask('join', { code: created.code, name: 'Gast' });
  assert.equal(j2.ok, true, j2.error);
  await until(() => intruder.state?.g, 5000);
  assert.equal(intruder.state.g.hand, null, 'Zuschauer sehen keine Rohstoffe');
  assert.equal((await intruder.ask('ssRoll')).ok, false);
  assert.equal((await intruder.ask('ssBuild', { kind: 'settlement', at: 0 })).ok, false);
  assert.equal((await intruder.ask('ssDiscard', { cards: { holz: 1 } })).ok, false);
  intruder.disconnect();
  again.disconnect();
});
