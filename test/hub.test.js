// Startseite (Hub): Namensvorschlag beim Beitreten, offene Tische (ohne Geheimes), Beitritt per Klick.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { GAMES } from '../games/index.js';

let URL;
const dataDir = mkdtempSync(join(tmpdir(), 'poker-hub-'));
let server;
async function startTestServer(dir,createLimit='500') {
  const child=spawn(process.execPath,['--input-type=module','-e',`
    const {http}=await import('./server/index.js');
    const ready=()=>console.log('TEST_READY:'+http.address().port);
    if(http.listening)ready();else http.once('listening',ready);
  `],{
    env: { ...process.env, PORT:'0', DATA_DIR:dir, POKER_NO_DOTENV:'1', SITE_PASSWORD:'', CREATE_LIMIT:createLimit }, stdio:'pipe',
  });
  let output='';
  const url=await new Promise((res,rej)=>{
    const timer=setTimeout(()=>{child.kill();rej(new Error('Serverstart zu langsam: '+output));},15000);
    child.stderr.on('data',(d)=>{output+=d;});
    child.stdout.on('data',(d)=>{output+=d;const match=output.match(/TEST_READY:(\d+)/);if(match){clearTimeout(timer);res('http://localhost:'+match[1]);}});
    child.once('error',(e)=>{clearTimeout(timer);rej(e);});
    child.once('exit',(c)=>{clearTimeout(timer);rej(new Error('Server beendet: '+c+' '+output));});
  });
  return {process:child,url};
}
before(async () => {
  // The OS allocates a free port; abort.test.js may run in parallel in the old range.
  const started=await startTestServer(dataDir);server=started.process;URL=started.url;
});
after(() => server.kill());

const clients = [];
function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.state = null; s.lobby = null; s.lobbyCount = 0;
  s.on('state', (st) => { s.state = st; });
  s.on('lobby', (l) => { s.lobby = l; s.lobbyCount++; });
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

test('Name am Tisch vergeben: der Server schlägt einen freien vor („Tobi 2“), statt nur abzulehnen', async () => {
  const a = client(); const b = client(); const c = client();
  const t = await a.ask('create', { game: 'maumau', name: 'Tobi' });
  assert.ok(t.ok);
  const r1 = await b.ask('join', { code: t.code, name: 'tobi' }); // Groß/Klein egal
  assert.equal(r1.ok, false);
  assert.equal(r1.suggestion, 'tobi 2');
  assert.match(r1.error, /vergeben/);
  const r2 = await b.ask('join', { code: t.code, name: r1.suggestion });
  assert.ok(r2.ok);
  const r3 = await c.ask('join', { code: t.code, name: 'Tobi' });
  assert.equal(r3.suggestion, 'Tobi 3', 'zählt hoch, bis frei');
});

test('Namensvorschlag: höchstens 16 Zeichen, auch bei langen Namen', () => {
  const r = GAMES.maumau.create('NAMEN', {}, () => {});
  r.addPlayer('Abcdefghijklmnop', null); // 16 Zeichen
  assert.throws(() => r.addPlayer('abcdefghijklmnop', null), (e) => e.extra.suggestion === 'abcdefghijklmn 2' && e.extra.suggestion.length <= 16);
  assert.equal(r.uniqueName('Abcdefghijklmnop'), 'Abcdefghijklmn 2');
  r.dispose();
});

// ---------- Offene Tische ----------
const KEYS = ['category', 'code', 'game', 'gameName', 'host', 'max', 'seats', 'status', 'watchers'];
test('Liste der offenen Tische: nur Unbedenkliches – keine Tokens, IDs, Karten oder Spielstände', async () => {
  const sub = client();
  const a = client(); const b = client(); const c = client();
  const t1 = await a.ask('create', { game: 'maumau', name: 'Anna', avatar: '🐻' });
  const t2 = await b.ask('create', { game: 'poker', name: 'Ben', avatar: '🦊', settings: {} });
  await c.ask('join', { code: t1.code, name: 'Cara' });
  await a.ask('sit'); await c.ask('sit');
  await a.ask('start'); // Karten sind verteilt
  const r = await sub.ask('lobby');
  assert.ok(r.ok);
  const tables = r.tables.filter((t) => [t1.code, t2.code].includes(t.code));
  assert.equal(tables.length, 2);
  for (const t of tables) assert.deepEqual(Object.keys(t).sort(), KEYS, 'genau diese Felder');
  const json = JSON.stringify(r.tables);
  for (const secret of [t1.token, t2.token, a.state.you.id, '"hand"', '"cards"', '"token"', '"socketId"', '"hands"', '"deck"']) assert.ok(!json.includes(secret), `Liste verrät ${secret}`);
  const mau = tables.find((t) => t.code === t1.code);
  assert.deepEqual(mau.seats.map((s) => s.name).sort(), ['Anna', 'Cara']);
  assert.equal(mau.max, 8);
  assert.equal(mau.host.name, 'Anna');
  assert.equal(mau.gameName, 'Mau-Mau');
  assert.match(mau.status, /Runde #1 läuft/);
  assert.equal(tables.find((t) => t.code === t2.code).max, 9);
  for (const s of mau.seats) assert.deepEqual(Object.keys(s).sort(), ['avatar', 'bot', 'name']);
});

test('Private Tische fehlen in der Liste; nur der Host darf den Schalter umlegen; Änderung kommt live', async () => {
  const sub = client(); const host = client(); const other = client();
  const t = await host.ask('create', { game: 'muehle', name: 'Hanna' });
  await other.ask('join', { code: t.code, name: 'Otto' });
  const first = await sub.ask('lobby');
  assert.ok(first.tables.some((x) => x.code === t.code), 'öffentlich');
  assert.equal((await other.ask('unlisted', { value: true })).ok, false, 'kein Host');
  sub.lobby = null; sub.lobbyCount = 0;
  assert.ok((await host.ask('unlisted', { value: true })).ok);
  await until(() => host.state?.unlisted === true);
  await until(() => sub.lobby, 3000);
  assert.ok(!sub.lobby.some((x) => x.code === t.code), 'privat: weg aus der Liste');
  assert.ok((await sub.ask('lobby')).tables.every((x) => x.code !== t.code));
  assert.ok((await client().ask('join', { code: t.code, name: 'Paul' })).ok, 'Beitritt per Code geht weiter');
  sub.lobby = null;
  await host.ask('unlisted', { value: false });
  await until(() => sub.lobby, 3000);
  assert.ok(sub.lobby.some((x) => x.code === t.code), 'wieder sichtbar');
});

test('Live-Aktualisierung höchstens einmal pro Sekunde, auch bei vielen Änderungen', async () => {
  const sub = client();
  await sub.ask('lobby');
  sub.lobbyCount = 0;
  const hosts = [];
  for (let i = 0; i < 6; i++) { const h = client(); await h.ask('create', { game: 'kniffel', name: 'Host' + i }); hosts.push(h); }
  await until(() => sub.lobbyCount >= 1, 3000);
  await wait(1300);
  assert.ok(sub.lobbyCount <= 2, `${sub.lobbyCount} Meldungen für 6 neue Tische (gedrosselt)`);
  assert.ok(sub.lobby.filter((t) => t.gameName === 'Kniffel').length >= 6);
  sub.lobby = null;
  hosts[0].close(); // der einzige Mensch geht
  await until(() => sub.lobby, 3000);
  assert.equal(sub.lobby.filter((t) => t.gameName === 'Kniffel').length, hosts.length - 1, 'ohne Menschen online fehlt der Tisch');
});

test('Beitritt per Klick: ohne Code-Eingabe, mit Profil; Platz einnehmen; Namensvorschlag', async () => {
  const host = client(); const guest = client(); const guest2 = client();
  const t = await host.ask('create', { game: 'viergewinnt', name: 'Hella' });
  const list = (await guest.ask('lobby')).tables;
  const row = list.find((x) => x.code === t.code);
  assert.ok(row);
  const j = await guest.ask('join', { code: row.code, name: 'Gina', avatar: '🐸' });
  assert.ok(j.ok);
  assert.ok((await guest.ask('sit')).ok, 'Dazusetzen');
  await until(() => guest.state?.players.some((p) => p.name === 'Gina' && p.seated));
  const j2 = await guest2.ask('join', { code: row.code, name: 'Gina' });
  assert.equal(j2.suggestion, 'Gina 2');
});

test('„Weiterspielen“: peek liefert den Tisch nur mit gültigem Token – auch private', async () => {
  const host = client(); const x = client();
  const t = await host.ask('create', { game: 'schocken', name: 'Hugo' });
  await host.ask('unlisted', { value: true });
  const mine = await x.ask('peek', { code: t.code, token: t.token });
  assert.equal(mine.found, true);
  assert.equal(mine.gameName, 'Schocken');
  assert.deepEqual(Object.keys(mine).filter((k) => !['ok', 'found'].includes(k)).sort(), [...KEYS].sort());
  assert.ok(!JSON.stringify(mine).includes(t.token));
  assert.equal((await x.ask('peek', { code: t.code, token: 'falsch' })).found, false);
  assert.equal((await x.ask('peek', { code: 'ZZZZZ', token: t.token })).found, false);
  assert.equal((await x.ask('peek', { code: t.code })).found, false);
});

test('Rate-Limit: Dauerfeuer auf die Liste wird gebremst', async () => {
  const s = client();
  const answers = await Promise.all(Array.from({ length: 80 }, () => s.ask('lobby')));
  assert.ok(answers.some((a) => a.ok === false && /Langsam/.test(a.error)), 'zu viele Anfragen abgelehnt');
});

test('Privat-Schalter übersteht einen Neustart; Spielwechsel behält ihn', async () => {
  let restartUrl;
  const dir = mkdtempSync(join(tmpdir(), 'poker-hub2-'));
  const start = async () => {
    const started=await startTestServer(dir,'6');restartUrl=started.url;return started.process;
  };
  const connect = () => { const s = io(restartUrl, { transports: ['websocket'], forceNew: true, reconnection: false }); s.state = null; s.on('state', (st) => { s.state = st; }); s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r)); return s; };
  let p = await start();
  const host = connect();
  const t = await host.ask('create', { game: 'maumau', name: 'Rita' });
  await host.ask('unlisted', { value: true });
  await host.ask('switchGame', { game: 'farbenchaos' });
  await wait(700); // Speichern ist um 300 ms verzögert
  host.close();
  p.kill();
  await wait(300);
  p = await start();
  try {
    const sub = connect();
    const r = await sub.ask('lobby');
    assert.ok(r.tables.every((x) => x.code !== t.code), 'privat und ohne Menschen: nicht in der Liste');
    const back = connect();
    const j = await back.ask('join', { code: t.code, name: 'Rita', token: t.token });
    assert.ok(j.ok, 'wiedererkannt');
    assert.equal(j.game, 'farbenchaos');
    await until(() => back.state);
    assert.equal(back.state.unlisted, true, 'bleibt privat');
    const watcher = connect();
    assert.ok((await watcher.ask('lobby')).tables.every((x) => x.code !== t.code), 'auch mit Mensch online nicht gelistet');
    [sub, back, watcher].forEach((c) => c.close());
  } finally { p.kill(); }
});

// ---------- Spielmetadaten für die Spieleliste ----------
import { gameList, PLANNED } from '../games/index.js';
test('Jedes Spiel bringt Spielerzahl, Dauer und Spielbild mit – passend zu den Regeln des Raums', () => {
  for (const g of gameList()) {
    assert.ok(Number.isInteger(g.minPlayers) && Number.isInteger(g.maxPlayers) && g.minPlayers >= 1 && g.minPlayers <= g.maxPlayers, `${g.id}: Spielerzahl`);
    assert.ok(Number.isInteger(g.duration) && g.duration > 0 && g.duration <= 180, `${g.id}: Dauer`);
    assert.match(g.art, /^<svg class="game-art" viewBox="0 0 64 64"[^>]*>.*<\/svg>$/s, `${g.id}: Spielbild`);
    assert.ok(!/<script|on\w+=|href=|<image|<foreignObject/i.test(g.art), `${g.id}: Spielbild ohne Skripte und externe Bilder`);
    // stimmt mit dem Raum überein (Poker: Plätze am Tisch)
    const r = GAMES[g.id].create('META', {}, () => {});
    const [lo, hi] = ['poker', 'omaha'].includes(g.id) ? [2, r.settings.maxPlayers] : [r.opts.minPlayers, r.opts.maxPlayers];
    assert.equal(g.maxPlayers, hi, `${g.id}: maxPlayers`);
    assert.equal(g.minPlayers, lo, `${g.id}: minPlayers`);
    r.dispose();
  }
});


// ---------- Geplante Spiele (Backlog) ----------
test('Geplante Spiele und Funktionen lassen sich nicht hosten oder auswählen; /me liefert nur Spiele, ohne Funktionen', async () => {
  const c = client();
  const games = PLANNED.filter((e) => e.type !== 'feature');
  const features = PLANNED.filter((e) => e.type === 'feature');
  for (const e of [games[0], games.at(-1), features[0], features.at(-1)]) {
    const r = await c.ask('create', { game: e.id, name: 'Test' });
    assert.equal(r.ok, false, `${e.id} lässt sich hosten`);
    assert.match(r.error, /noch nicht|Liste der geplanten/, e.id);
  }
  assert.match((await c.ask('create', { game: 'gibt-es-nicht', name: 'Test' })).error, /gibt es nicht/, 'unbekannt bleibt unbekannt');
  // Spielwechsel zu einem geplanten Spiel
  const host = client();
  await host.ask('create', { game: 'maumau', name: 'Hella' });
  const sw = await host.ask('switchGame', { game: games[0].id });
  assert.equal(sw.ok, false);
  assert.match(sw.error, /noch nicht/);
  // Die Startseite bekommt Spiele (mit Status), aber keine Funktionen
  const me = await (await fetch(URL + '/me')).json();
  assert.equal(me.planned.length, games.length);
  assert.ok(me.planned.every((p) => p.type !== 'feature' && ['next', 'planned'].includes(p.status) && Array.isArray(p.rules)));
  assert.ok(!me.planned.some((p) => features.some((f) => f.id === p.id)), 'Funktionen sind nicht dabei');
  assert.deepEqual(me.planned.filter((p) => p.status === 'next').map((p) => p.id).sort(), PLANNED.filter((e) => e.status === 'next' && e.type !== 'feature').map((e) => e.id).sort(), 'nur „next“ steht im Katalog; der Rest auf der Roadmap');
  assert.ok(me.games.every((g) => !me.planned.some((p) => p.id === g.id)));
});
