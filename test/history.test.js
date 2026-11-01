// Verlauf: Kategorien für die Filter, Hände als Gruppen, 500 Hände, übersteht einen Neustart.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { Room, HISTORY_HANDS } from '../games/poker/room.js';
import { freePort } from './free-port.js';

function room(names = ['Anna', 'Ben']) {
  const r = new Room('TESTX', { autoNext: false, turnTime: 0 }, () => {});
  const ids = names.map((n, i) => { const p = r.addPlayer(n, null); r.sit(p.id, i); return p.id; });
  return { r, ids };
}
const turn = (r) => r.playerAt(r.table.hand.toAct);
const stop = (r) => { r.clock.clearTimeout(r.turnTimer); r.clock.clearTimeout(r.nextTimer); r.clock.clearTimeout(r.nudgeTimer); };

test('Einträge haben Kategorie und Hand', () => {
  const { r, ids } = room();
  r.start(ids[0]);
  while (r.handRunning) { const L = r.table.legal(r.table.hand.toAct); r.act(turn(r).id, { type: L.canCheck ? 'check' : 'call' }); }
  r.react(ids[1], 'GG');
  const by = (cat) => r.log.filter((e) => e.cat === cat);
  assert.ok(r.log.some((e) => e.cat === 'hand' && e.text === 'Hand #1' && e.hand === 1));
  assert.ok(by('system').some((e) => e.text === 'Anna ist da' && e.hand === 0), 'vor der ersten Hand');
  assert.ok(by('action').some((e) => /zahlt Big Blind/.test(e.text)));
  assert.ok(by('action').some((e) => /checkt|callt/.test(e.text)));
  assert.deepEqual(by('cards').map((e) => e.text.split(':')[0]), ['Flop', 'Turn', 'River']);
  assert.ok(by('win').some((e) => / (gewinnt|teilen sich) /.test(e.text)));
  assert.deepEqual(by('react').map((e) => e.text), ['Ben: GG']);
  // Nummern steigen lückenlos, historyAfter liefert nur Neues
  r.log.forEach((e, i) => assert.equal(e.n, i + 1));
  const last = r.logSeq;
  r.say('noch was');
  assert.deepEqual(r.historyAfter(last).map((e) => e.text), ['noch was']);
  assert.equal(r.historyAfter(0).length, r.log.length);
  stop(r);
});

test(`Verlauf behält die letzten ${HISTORY_HANDS} Hände`, () => {
  const { r, ids } = room();
  r.start(ids[0]);
  for (let k = 0; k < HISTORY_HANDS + 30; k++) {
    while (r.handRunning) r.act(turn(r).id, { type: 'fold' });
    r.nextHand(ids[0]);
  }
  const no = r.table.handNo;
  assert.equal(no, HISTORY_HANDS + 31);
  assert.ok(r.log[0].hand >= no - HISTORY_HANDS + 1, 'älteste Hand: ' + r.log[0].hand);
  assert.ok(r.log.some((e) => e.text === `Hand #${no - HISTORY_HANDS + 1}`), 'Hand am Rand des Fensters noch da');
  assert.ok(!r.log.some((e) => e.text === 'Hand #1'));
  stop(r);
});

test('Alter Spielstand: Einträge ohne Nummer und Kategorie werden übernommen', () => {
  const r = Room.restore({
    code: 'ALTE1', settings: {}, hostId: 'a', button: 0, handNo: 4, players: [],
    log: [{ text: 'Hand #4', kind: 'hand' }, { text: 'Anna gewinnt 200', kind: 'win' }, { text: 'Anna setzt 100', kind: 'bet' }],
  }, () => {});
  assert.deepEqual(r.log.slice(0, 3).map((e) => [e.n, e.cat, e.hand]), [[1, 'hand', 4], [2, 'win', 4], [3, 'action', 4]]);
  assert.equal(r.log.at(-1).text, 'Server neu gestartet – Host startet weiter');
  assert.equal(r.logSeq, 4);
});

// ---------- Mit Server: ganzer Verlauf auf Anfrage, übersteht einen Neustart ----------
const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
const dataDir = mkdtempSync(join(tmpdir(), 'poker-hist-'));
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
async function until(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await wait(25); }
  throw new Error('Zeitüberschreitung');
}

test('Ganzer Verlauf per „history“, auch nach einem Neustart', async () => {
  const a = client(); const b = client();
  const c = await a.ask('create', { name: 'Anna', settings: { autoNext: false } });
  const j = await b.ask('join', { code: c.code, name: 'Ben' });
  await a.ask('sit', { seat: 0 }); await b.ask('sit', { seat: 1 });
  await a.ask('start');
  for (const s of [a, b]) s.emit('react', { text: 'GG' });
  // Reaktionen haben keine Antwort – warten, bis beide im Verlauf stehen (sonst zählt der Test unten falsch)
  await until(() => (a.state?.log || []).filter((l) => l.cat === 'react').length === 2);
  await until(() => a.state?.legal || b.state?.legal);
  const actor = a.state.legal ? a : b;
  await actor.ask('action', { type: 'fold', id: 'x1' });
  await until(() => a.state.hand.done);
  const all = await a.ask('history', { after: 0 });
  assert.ok(all.ok);
  assert.ok(all.entries.some((e) => e.text === 'Hand #1'));
  assert.ok(all.entries.some((e) => e.cat === 'react'));
  assert.equal(all.seq, all.entries.at(-1).n);
  const later = await a.ask('history', { after: all.seq - 2 });
  assert.equal(later.entries.length, 2);
  // Ein Fremder ohne Tisch bekommt nichts
  const x = client();
  assert.equal((await x.ask('history', {})).ok, false);
  // Existing files can still contain a snapshot from before Ben joined or the
  // hand ended. Wait for the completed debounced save, not an arbitrary delay.
  await until(() => {
    try {
      const saved = JSON.parse(readFileSync(join(dataDir, 'rooms.json'), 'utf8')).find((r) => r.code === c.code);
      const history = JSON.parse(readFileSync(join(dataDir, `history-${c.code}.json`), 'utf8'));
      return saved?.handNo === 1 && saved.players.some((p) => p.token === j.token) && history.some((e) => e.cat === 'win');
    } catch { return false; }
  }, 5000);
  for (const s of [a, b, x]) s.disconnect();
  await stopServer();
  // Windows gibt den Port manchmal erst kurz nach dem Beenden frei
  for (let k = 0; ; k++) { try { await start(); break; } catch (e) { if (k >= 4) throw e; await wait(300); } }
  const again = client();
  const joined = await again.ask('join', { code: c.code, token: j.token });
  assert.equal(joined.ok, true, joined.error);
  const back = await again.ask('history', { after: 0 });
  assert.ok(back.entries.some((e) => e.text === 'Hand #1'), 'Verlauf ist noch da');
  assert.ok(back.entries.some((e) => /gewinnt/.test(e.text)));
  assert.ok(back.entries.slice(-3).some((e) => e.text === 'Ben ist wieder online'));
  again.disconnect();
});
