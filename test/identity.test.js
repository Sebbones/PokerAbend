// V2-01 Plattformidentität: Gast-Cookie, Game-ID, Geräte verbinden, Übernahme alter Statistiken, Migration, Bots, Raumbindung.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createAccountStore, GAME_ID, CODE_ALPHABET } from '../server/account-store.js';
import { createIdentity, GUEST_COOKIE } from '../server/identity.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { createPresence } from '../server/presence.js';
import { backupBeforeIdentityMigration } from '../server/data-migration.js';
import { createTicketStore } from '../server/tickets.js';
import { createPlanStore } from '../server/evening-plans.js';
import { createBoardStore } from '../games/monopoly/boards.js';
import { BaseRoom } from '../server/base-room.js';
import { addBot } from '../server/bots.js';
import { GAMES } from '../games/index.js';
import { freePort } from './free-port.js';

const tmp = (name) => mkdtempSync(join(tmpdir(), `${name}-`));
const quiet = (fn) => { const e = console.error; console.error = () => {}; try { return fn(); } finally { console.error = e; } };

// ---------- Cookie ----------
test('Gast-Cookie: signiert, fälschungssicher, abgelaufene und kaputte Werte zählen nicht', () => {
  let t = 1_800_000_000_000;
  const identity = createIdentity({ secret: 'geheim', now: () => t });
  const id = 'a'.repeat(32), value = identity.issue(id);
  assert.equal(identity.verify(value), id);
  assert.equal(identity.verify(value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null, 'veränderte Signatur');
  assert.equal(identity.verify(value.replace(id, 'b'.repeat(32))), null, 'fremde ID mit alter Signatur');
  assert.equal(createIdentity({ secret: 'anders', now: () => t }).verify(value), null, 'anderer Schlüssel');
  for (const bad of [undefined, null, 42, '', 'x', 'a.b.c', `${id}.${t}.`, `bot_${'a'.repeat(28)}.${t + 1e9}.x`, 'x'.repeat(500)]) assert.equal(identity.verify(bad), null);
  t += 181 * 864e5;
  assert.equal(identity.verify(value), null, 'nach 180 Tagen abgelaufen');
  assert.throws(() => identity.issue('bot_1234'), /Ungültige/, 'Bots bekommen kein Gast-Cookie');
  const header = identity.cookie(value, { secure: true });
  assert.match(header, /^pa_guest=/); assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.match(header, /Secure/); assert.match(header, /Max-Age=15552000/);
});

// ---------- Konten ----------
test('Konten: Game-ID kollisionsgeprüft, stabil nach Neustart, Namen sind nicht die Identität', () => {
  const dir = tmp('acc');
  const store = createAccountStore(dir);
  const ids = Array.from({ length: 3000 }, () => store.ensure(store.newId()).gameId);
  assert.equal(new Set(ids).size, ids.length, 'jede Game-ID nur einmal');
  assert.ok(ids.every((g) => GAME_ID.test(g) && [...g.slice(1)].every((c) => CODE_ALPHABET.includes(c))));
  const a = store.ensure(store.newId()), twin = store.ensure(store.newId());
  store.touch(a.id, { name: 'Anna', avatar: '🦊' }); store.touch(twin.id, { name: 'Anna', avatar: '🐻' });
  assert.notEqual(a.id, twin.id, 'zwei gleiche Namen = zwei Konten'); assert.notEqual(a.gameId, twin.gameId);
  store.save();
  const again = createAccountStore(dir);
  assert.equal(again.get(a.id).gameId, a.gameId); assert.equal(again.byGameId(a.gameId).id, a.id);
  again.touch(a.id, { name: 'Anna Neu' });
  assert.equal(again.get(a.id).gameId, a.gameId, 'Umbenennen ändert die Game-ID nicht');
  assert.equal(JSON.parse(readFileSync(join(dir, 'accounts.json'), 'utf8')).schemaVersion, 1);
});

test('Konten: nur vom Server erzeugte IDs; Bots, kaputte und fremde Werte werden abgelehnt', () => {
  const store = createAccountStore(tmp('acc-bad'));
  for (const bad of ['bot_abcdef0123', 'x', '', null, {}, 'g'.repeat(32), 'A'.repeat(32), '__proto__', 'a'.repeat(33)]) assert.equal(store.ensure(bad), null, String(bad));
  assert.equal(store.count(), 0);
});

test('Konten: unlesbare oder zu neue Datei wird gesichert statt überschrieben', () => {
  for (const content of ['{"schemaVersion":1,"accounts":{"a":', '[]', JSON.stringify({ schemaVersion: 99, accounts: {} })]) {
    const dir = tmp('acc-broken');
    writeFileSync(join(dir, 'accounts.json'), content);
    const store = quiet(() => createAccountStore(dir));
    assert.ok(store.ensure(store.newId()));
    store.save();
    const backups = readdirSync(dir).filter((f) => f.startsWith('accounts.json.unlesbar-'));
    assert.equal(backups.length, 1, content); assert.equal(readFileSync(join(dir, backups[0]), 'utf8'), content);
  }
});

test('Konten: Vorbereitung für Discord – eine externe Identität hängt an genau einem Konto', () => {
  const store = createAccountStore(tmp('acc-ext'));
  const a = store.ensure(store.newId()), b = store.ensure(store.newId());
  store.linkExternal(a.id, 'discord', '123456789');
  assert.equal(store.findExternal('discord', '123456789'), a.id);
  assert.throws(() => store.linkExternal(b.id, 'discord', '123456789'), /anderen Konto/);
  assert.throws(() => store.linkExternal(a.id, 'Discord!', 'x'), /Ungültige/);
  store.merge(b.id, a.id);
  assert.equal(store.get(b.id).id, a.id, 'zusammengeführtes Konto zeigt auf das Ziel');
});

// ---------- Geräte-Codes ----------
test('Geräte-Code: 6 Zeichen, einmalig, 10 Minuten gültig, ein aktiver Code je Konto', () => {
  let t = 1_800_000_000_000;
  const identity = createIdentity({ secret: 's', now: () => t });
  const a = 'a'.repeat(32), b = 'b'.repeat(32);
  const { code } = identity.createLinkCode(a);
  assert.match(code, new RegExp(`^[${CODE_ALPHABET}]{6}$`));
  assert.equal(identity.redeemLinkCode(code.toLowerCase().replace(/^(...)/, '$1-')), a, 'Schreibweise mit Bindestrich und Kleinbuchstaben');
  assert.equal(identity.redeemLinkCode(code), null, 'einmalig');
  const second = identity.createLinkCode(a).code, third = identity.createLinkCode(a).code;
  assert.equal(identity.redeemLinkCode(second), null, 'ein neuer Code ersetzt den alten');
  t += 10 * 60000 + 1;
  assert.equal(identity.redeemLinkCode(third), null, 'nach 10 Minuten abgelaufen');
  t += 1; const fresh = identity.createLinkCode(b).code; t += 9 * 60000;
  assert.equal(identity.redeemLinkCode(fresh), b, 'nach 9 Minuten noch gültig');
  for (const bad of ['', 'ABC', '0O1IL!', 'ABCDEFG', null, 12, {}]) assert.equal(identity.redeemLinkCode(bad), null);
});

// ---------- Bestenliste ----------
const ID_A = 'a1'.repeat(16), ID_B = 'b2'.repeat(16);
const rowsOf = (lb) => lb.table('maumau').map((r) => `${r.name}:${r.played}/${r.wins}`).sort();
test('Bestenliste: gleiche Namen sind zwei Personen, Umbenennen behält die Statistik, Bots zählen nie', () => {
  const lb = createLeaderboard(tmp('lb-id'));
  lb.record('maumau', [{ name: 'Anna', accountId: ID_A, win: true, points: 5 }, { name: 'Anna', accountId: ID_B, win: false, points: 1 }, { name: 'Bot 1', bot: true, win: false, points: 0 }]);
  assert.deepEqual(rowsOf(lb), ['Anna:1/0', 'Anna:1/1']);
  lb.record('maumau', [{ name: 'Annabelle', accountId: ID_A, win: true, points: 5 }]);
  assert.deepEqual(rowsOf(lb), ['Anna:1/0', 'Annabelle:2/2'], 'neuer Name, alte Siege bleiben');
  assert.equal(lb.profile({ accountId: ID_A, name: 'Annabelle' }).games[0].wins, 2);
  assert.equal(lb.profile({ accountId: ID_B, name: 'Anna' }).games[0].wins, 0);
  assert.ok(!lb.names().includes('Bot 1'));
});

test('Bestenliste: Version 2 wird gespeichert, ein Stand von vor V2-01 bleibt unverändert lesbar', () => {
  const dir = tmp('lb-v1');
  const v1 = { players: { anna: { name: 'Anna', games: { maumau: { played: 3, wins: 2, points: 9, months: { '2026-10': { played: 3, wins: 2, points: 9 } } } } } } };
  writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify(v1));
  const lb = createLeaderboard(dir);
  assert.deepEqual(rowsOf(lb), ['Anna:3/2']);
  lb.record('maumau', [{ name: 'Anna', accountId: ID_A, win: true, points: 1 }]); lb.save();
  const saved = JSON.parse(readFileSync(join(dir, 'leaderboard.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 2);
  assert.deepEqual(saved.players.anna, v1.players.anna, 'der alte Eintrag ist nicht verändert worden');
  assert.deepEqual(rowsOf(lb), ['Anna:1/1', 'Anna:3/2'], 'bis zur Übernahme getrennt');
});

test('Alte Statistik übernehmen: wer zuerst kommt, bekommt sie; Verwaltung macht es rückgängig', () => {
  const dir = tmp('lb-claim');
  writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify({ players: { tobi: { name: 'Tobi', games: { maumau: { played: 4, wins: 3, points: 0, months: {} } } }, zero: { name: 'Leer', games: {} } } }));
  const lb = createLeaderboard(dir);
  assert.deepEqual(lb.legacyNames().map((n) => n.name), ['Tobi'], 'nur Namen mit gespielten Partien');
  assert.equal(lb.claim('TOBI', ID_A, 'Neuer Tobi').ok, true);
  assert.equal(lb.claim('tobi', ID_B, 'Anderer').ok, false, 'zweiter Versuch scheitert');
  assert.equal(lb.claim('gibt es nicht', ID_B).ok, false);
  assert.equal(lb.claim('tobi', 'kaputt').ok, false);
  assert.deepEqual(lb.legacyNames(), []);
  assert.deepEqual(rowsOf(lb), ['Neuer Tobi:4/3'], 'unter dem aktuellen Namen des Kontos');
  lb.record('maumau', [{ name: 'Neuer Tobi', accountId: ID_A, win: true, points: 0 }]);
  assert.deepEqual(rowsOf(lb), ['Neuer Tobi:5/4']);
  assert.equal(lb.profile({ accountId: ID_A, name: 'x' }).games[0].played, 5);
  assert.equal(lb.claims().length, 1);
  assert.equal(lb.unclaim('tobi').claimedBy, ID_A);
  assert.equal(lb.unclaim('tobi'), null, 'nur einmal rückgängig');
  assert.deepEqual(rowsOf(lb), ['Neuer Tobi:1/1', 'Tobi:4/3']);
  assert.equal(lb.claim('tobi', ID_B, 'B').ok, true, 'danach neu übernehmbar');
});

test('Zweites Gerät: Statistik des alten Kontos und seine Übernahmen gehören danach dem Ziel', () => {
  const dir = tmp('lb-merge');
  writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify({ players: { max: { name: 'Max', games: { maumau: { played: 2, wins: 1, points: 0, months: {} } } } } }));
  const lb = createLeaderboard(dir);
  lb.record('maumau', [{ name: 'Laptop', accountId: ID_A, win: true, points: 0 }, { name: 'Handy', accountId: ID_B, win: true, points: 0 }]);
  lb.claim('max', ID_B, 'Handy');
  assert.equal(lb.merge(ID_B, ID_A, 'Laptop'), true);
  assert.deepEqual(rowsOf(lb), ['Laptop:4/3']);
  lb.save();
  assert.deepEqual(rowsOf(createLeaderboard(dir)), ['Laptop:4/3'], 'überlebt einen Neustart');
  assert.equal(lb.merge(ID_A, ID_A), false);
});

// ---------- Sicherung und Rückfall ----------
test('Migration: Sicherung vor V2-01 einmalig, nichts wird verändert, Rückfall liefert den alten Stand', () => {
  const dir = tmp('migrate');
  const files = { 'leaderboard.json': '{"players":{"a":{"name":"A","games":{}}}}', 'tickets.json': '{"version":1,"nextId":1,"tickets":[]}', 'rooms.json': '[]' };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  const first = backupBeforeIdentityMigration(dir);
  assert.equal(first.created, true); assert.deepEqual([...first.files].sort(), Object.keys(files).sort());
  for (const [name, content] of Object.entries(files)) assert.equal(readFileSync(join(dir, 'backups', 'pre-v2-01', name), 'utf8'), content);
  assert.ok(!existsSync(join(dir, 'backups', 'pre-v2-01.tmp')), 'kein halber Ordner');
  // Danach verändert das neue Format die Hauptdatei – die Sicherung bleibt wie sie war
  const lb = createLeaderboard(dir); lb.record('maumau', [{ name: 'Neu', accountId: ID_A, win: true, points: 0 }]); lb.save();
  assert.equal(backupBeforeIdentityMigration(dir).created, false, 'zweiter Start sichert nicht erneut');
  assert.equal(readFileSync(join(dir, 'backups', 'pre-v2-01', 'leaderboard.json'), 'utf8'), files['leaderboard.json']);
  // Rückfall: Sicherung zurückkopieren
  copyFileSync(join(dir, 'backups', 'pre-v2-01', 'leaderboard.json'), join(dir, 'leaderboard.json'));
  assert.deepEqual(createLeaderboard(dir).table('maumau'), []); assert.deepEqual(createLeaderboard(dir).names(), ['A']);
  assert.deepEqual(backupBeforeIdentityMigration(tmp('fresh')), { created: false, files: [] }, 'frische Installation: nichts zu sichern');
});

// ---------- Presence, Bots, Räume, Speicher ----------
test('Presence: Personen laufen über die Game-ID; zwei gleiche Namen sind zwei Einträge', () => {
  const p = createPresence({ delay: 1e9, setTimer: () => 1, clearTimer: () => {}, location: () => ({ kind: 'home' }) });
  const me = { name: 'Anna', avatar: '🦊', visible: true, active: true };
  p.update('tab1', me, '#AAAA'); p.update('tab2', me, '#BBBB'); p.update('tab3', { ...me, name: 'Anna Neu' }, '#AAAA');
  const { online } = p.snapshot();
  assert.deepEqual(online.map((o) => o.key).sort(), ['#AAAA', '#BBBB']);
  assert.ok(!JSON.stringify(online).includes(ID_A));
  p.update('legacy', { ...me, name: 'Ohne Konto' });
  assert.ok(p.snapshot().online.some((o) => o.key === 'ohne konto'), 'ohne Konto weiter über den Namen');
});

test('Bots: eigene ID mit Präfix, nie ein Konto, in keiner Ansicht eine Konto-ID', () => {
  const room = GAMES.maumau.create('BOT01', {}, () => {}); room.game = 'maumau';
  const human = room.addPlayer('Anna'); human.accountId = ID_A; room.sit(human.id);
  const bot = addBot(room, human.id);
  assert.match(bot.id, /^bot_[a-f0-9]{10}$/); assert.equal(bot.bot, true); assert.equal(bot.accountId, undefined);
  assert.match(room.addPlayer('Mensch').id, /^[a-f0-9]{12}$/);
  assert.equal(createAccountStore(tmp('acc-bot')).ensure(bot.id), null);
  assert.equal(JSON.stringify(room.view(human.id)).includes(ID_A), false, 'die Konto-ID steht in keiner Ansicht');
  room.dispose();
});

test('Besitz in Tickets, Planungen und Monopoly-Brettern wandert mit der ID (rebind)', () => {
  const dir = tmp('rebind'), old = 'd4'.repeat(16);
  const person = { id: old, name: 'Anna', avatar: '🦊' };
  const tickets = createTicketStore({ dir, games: ['maumau'] });
  const t = tickets.create({ title: 'Ein Wunsch', description: 'Bitte mehr Spiele einbauen', type: 'idea', game: '' }, person);
  assert.equal(tickets.detail(t.id, { id: old }).canEdit, true);
  assert.ok(tickets.rebind(old, ID_A) >= 1);
  assert.equal(tickets.detail(t.id, { id: ID_A }).canEdit, true); assert.equal(tickets.detail(t.id, { id: old }).canEdit, false);
  assert.equal(createTicketStore({ dir, games: ['maumau'] }).detail(t.id, { id: ID_A }).canEdit, true, 'gespeichert');
  const plans = createPlanStore({ dir, games: [{ id: 'maumau', name: 'Mau-Mau' }] });
  assert.equal(plans.rebind(old, ID_A), 0, 'ohne Treffer keine Änderung');
  const boards = createBoardStore(dir);
  const names = Array.from({ length: boards.get('default').names.length }, (_, i) => `Straße ${i}`);
  const saved = boards.save({ title: 'Mein Brett', names }, old);
  assert.equal('creator' in saved, false, 'Ersteller-ID verlässt den Server nicht');
  assert.ok(boards.list().every((b) => !('creator' in b)));
  boards.save({ title: 'Brett 2', names }, ID_B);
  assert.equal(boards.rebind(ID_B, ID_A), 1);
  assert.equal(createBoardStore(dir).list().length, 3);
});

test('BaseRoom: Menschen behalten ihre IDs, Namen bleiben Pflicht', () => {
  const room = new BaseRoom('ROOM1');
  assert.match(room.addPlayer('Anna').id, /^[a-f0-9]{12}$/);
  assert.throws(() => room.addPlayer({}), /Namen/);
});

// ---------- Echter Server ----------
let server, URL, dataDir, port;
const SECRET = 'test-secret-identity';
async function startServer() {
  port = port || await freePort(); URL = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500', SESSION_SECRET: SECRET, ADMIN_PASSWORD: 'adminpw' }, stdio: 'pipe' });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
  server.removeAllListeners('exit');
}
const stopServer = () => new Promise((res) => { server.once('exit', res); server.kill('SIGTERM'); });
before(async () => {
  dataDir = tmp('identity-server');
  writeFileSync(join(dataDir, 'leaderboard.json'), JSON.stringify({ players: { oma: { name: 'Oma', games: { maumau: { played: 6, wins: 5, points: 0, months: {} } } } } }));
  await startServer();
});
after(() => server?.kill());

const sockets = [];
after(() => sockets.forEach((s) => s.close()));
// Ein „Browser“: Cookie-Topf plus Aufrufe
function browser() {
  const jar = {};
  const take = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } };
  const header = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  const b = {
    jar, header,
    async get(path) { const res = await fetch(URL + path, { headers: { cookie: header() }, redirect: 'manual' }); take(res); return res; },
    async post(path, body = {}, extra = {}) { const res = await fetch(URL + path, { method: 'POST', headers: { cookie: header(), 'content-type': 'application/json', 'x-requested-with': 'spieleabend', ...extra }, body: JSON.stringify(body) }); take(res); return res; },
    async me() { return (await b.get('/api/identity')).json(); },
    socket() {
      const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: header() ? { cookie: header() } : {} });
      s.state = null; s.on('state', (st) => { s.state = st; });
      s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r));
      sockets.push(s); return s;
    },
  };
  return b;
}
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 20)); } throw new Error('Zeitüberschreitung'); };
async function visit() { const b = browser(); await b.get('/'); return b; }

test('Server: der erste Seitenaufruf vergibt Cookie und Game-ID, Reload und Neustart behalten sie', async () => {
  const b = await visit();
  assert.ok(b.jar[GUEST_COOKIE], 'Cookie gesetzt');
  const first = await b.me();
  assert.match(first.gameId, GAME_ID);
  assert.equal((await b.me()).gameId, first.gameId, 'Reload');
  assert.ok(!JSON.stringify(first).includes(b.jar[GUEST_COOKIE].split('.')[0]), 'die interne ID steht nicht in der Antwort');
  const setCookie = (await b.get('/')).headers.getSetCookie().find((c) => c.startsWith('pa_guest='));
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/);
  await new Promise((r) => setTimeout(r, 600)); // verzögertes Speichern abwarten (SIGTERM speichert unter Windows nicht)
  await stopServer(); await startServer();
  assert.equal((await b.me()).gameId, first.gameId, 'nach Neustart derselbe');
  const accounts = JSON.parse(readFileSync(join(dataDir, 'accounts.json'), 'utf8'));
  assert.equal(accounts.schemaVersion, 1); assert.ok(Object.keys(accounts.accounts).length >= 1);
});

test('Server: gefälschtes oder fremd signiertes Cookie gibt keine Identität', async () => {
  const real = await visit(), mine = await real.me();
  const id = real.jar[GUEST_COOKIE].split('.')[0];
  const other = createIdentity({ secret: 'falscher-schluessel' });
  for (const forged of [other.issue(id), real.jar[GUEST_COOKIE].replace(/.$/, 'x'), `${id}.9999999999999.abc`, 'a'.repeat(32), real.jar[GUEST_COOKIE] + 'x']) {
    const b = browser(); b.jar[GUEST_COOKIE] = forged;
    const body = await (await b.get('/api/identity')).json();
    assert.notEqual(body.gameId, mine.gameId, 'Fälschung bekommt nicht die Identität');
    assert.notEqual(b.jar[GUEST_COOKIE], forged, 'es wird ein neues, echtes Cookie ausgestellt');
  }
  const noHeader = await fetch(URL + '/api/identity/claim', { method: 'POST', headers: { cookie: real.header(), 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noHeader.status, 403, 'ohne Seitenkopf keine Schreibaktion');
});

test('Server: Gerät verbinden – Code einmalig, falsche Codes scheitern, Raten wird gebremst', async () => {
  const laptop = await visit(), phone = await visit();
  const a = await laptop.me(), b = await phone.me();
  assert.notEqual(a.gameId, b.gameId);
  const { code } = await (await laptop.post('/api/identity/link/create')).json();
  assert.match(code, /^[A-Z2-9]{6}$/);
  const ok = await phone.post('/api/identity/link/redeem', { code: code.toLowerCase() });
  assert.equal(ok.status, 200);
  assert.equal((await phone.me()).gameId, a.gameId, 'beide Geräte sind dieselbe Person');
  assert.equal(phone.jar[GUEST_COOKIE].split('.')[0], laptop.jar[GUEST_COOKIE].split('.')[0]);
  const third = await visit();
  assert.equal((await third.post('/api/identity/link/redeem', { code })).status, 400, 'zweite Einlösung scheitert');
  const attacker = await visit(); let blocked = 0;
  for (let i = 0; i < 12; i++) { const r = await attacker.post('/api/identity/link/redeem', { code: 'AAAAAA' }); if (r.status === 429) blocked++; }
  assert.ok(blocked >= 3, `Raten wird gebremst (${blocked} gesperrt)`);
  const fresh = (await (await laptop.post('/api/identity/link/create')).json()).code;
  assert.equal((await attacker.post('/api/identity/link/redeem', { code: fresh })).status, 429, 'auch ein richtiger Code hilft nicht während der Sperre');
});

test('Server: Statistik hängt am Konto – gleiche Namen sind zwei Personen, Umbenennen behält sie, Bots zählen nicht', async () => {
  const x = await visit(), y = await visit();
  const sx = x.socket(), sy = y.socket();
  const created = await sx.ask('create', { game: 'viergewinnt', name: 'Zoe' });
  assert.ok(created.ok);
  const clash = await sy.ask('join', { code: created.code, name: 'Zoe' });
  assert.equal(clash.ok, false, 'derselbe Name am selben Tisch bleibt verboten');
  assert.ok((await sy.ask('join', { code: created.code, name: clash.suggestion })).ok);
  await sx.ask('sit'); await sy.ask('sit');
  assert.ok((await sx.ask('start')).ok);
  // Wer anfängt, spielt immer Spalte 0 (vier übereinander) und gewinnt; der andere setzt in Spalte 1
  const players = [sx, sy]; let first;
  if ((await sx.ask('drop', { col: 0 })).ok) first = 0; else { assert.ok((await sy.ask('drop', { col: 0 })).ok); first = 1; }
  for (let i = 1; i < 7; i++) {
    const r = await players[(first + i) % 2].ask('drop', { col: i % 2 === 1 ? 1 : 0 });
    assert.ok(r.ok, JSON.stringify(r));
  }
  let board;
  await until(async () => true);
  for (let i = 0; i < 50; i++) { board = await (await fetch(`${URL}/api/leaderboard?game=viergewinnt`)).json(); if (board.rows.length === 2) break; await new Promise((r) => setTimeout(r, 40)); }
  assert.equal(board.rows.length, 2, 'Zoe und Zoe 2 sind zwei Zeilen'); assert.equal(board.rows.filter((r) => r.wins === 1).length, 1);
  const winner = players[first], winnerBrowser = first === 0 ? x : y;
  await winner.ask('leave');
  const renamed = winnerBrowser.socket();
  assert.ok((await renamed.ask('create', { game: 'viergewinnt', name: 'Zoe Neu' })).ok);
  const progress = await (await winnerBrowser.get('/api/achievements?me=1')).json();
  assert.equal(progress.name, 'Zoe Neu'); assert.equal(progress.stats.wins, 1, 'Erfolge hängen am Konto, nicht am Namen');
  assert.ok((await renamed.ask('addBot')).ok);
  await until(() => renamed.state?.bots?.length);
  assert.ok(renamed.state.bots.every((b) => /^bot_[a-f0-9]{10}$/.test(b.id)), JSON.stringify(renamed.state.bots));
});

test('Server: Reconnect über die Konto-ID, fremdes Token gilt nicht, Bindung überlebt einen Neustart', async () => {
  const x = await visit(), intruder = await visit();
  const sx = x.socket();
  const created = await sx.ask('create', { game: 'maumau', name: 'Rita' });
  assert.ok(created.ok);
  sx.close();
  const back = x.socket();
  const viaId = await back.ask('join', { code: created.code, name: 'egal' });
  assert.ok(viaId.ok, JSON.stringify(viaId)); assert.equal(viaId.token, created.token, 'dieselbe Person, derselbe Platz – ohne Token');
  const thief = intruder.socket();
  const stolen = await thief.ask('join', { code: created.code, name: 'Dieb', token: created.token });
  assert.ok(stolen.ok && stolen.token !== created.token, 'mit fremdem Cookie hilft das Token nicht – es gibt einen eigenen Platz');
  thief.close(); back.close();
  const second = x.socket(); const c2 = await second.ask('create', { game: 'maumau', name: 'Rita' }); assert.ok(c2.ok);
  await new Promise((r) => setTimeout(r, 600));
  await stopServer(); await startServer();
  const rooms = JSON.parse(readFileSync(join(dataDir, 'rooms.json'), 'utf8'));
  const saved = rooms.find((r) => r.code === c2.code);
  assert.ok(saved && Object.keys(saved.playerAccounts).length === 1, 'Konto-Bindung gespeichert');
  assert.ok(rooms.every((r) => Object.keys(r.playerAccounts || {}).every((pid) => !pid.startsWith('bot_'))), 'Bots stehen nie in den Konto-Bindungen');
  const hijack = await intruder.socket().ask('join', { code: c2.code, name: 'Dieb2', token: c2.token });
  assert.ok(hijack.ok && hijack.token !== c2.token, 'auch nach dem Neustart gilt das Token nur für das eigene Konto');
  const rejoin = await x.socket().ask('join', { code: c2.code, name: 'Rita', token: c2.token });
  assert.ok(rejoin.ok && rejoin.token === c2.token, 'alte Tokens funktionieren weiter');
});

test('Server: Clients ohne Cookie spielen wie bisher (alte Tokens, Namen)', async () => {
  const connect = () => { const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false }); sockets.push(s); return (ev, d) => new Promise((r) => s.emit(ev, d, r)); };
  const created = await connect()('create', { game: 'maumau', name: 'Ohne' });
  assert.ok(created.ok);
  const rejoin = await connect()('join', { code: created.code, token: created.token });
  assert.ok(rejoin.ok && rejoin.token === created.token);
});

test('Server: alte Statistik übernehmen – erster gewinnt, Verwaltung kann zurücknehmen, Sicherung liegt vor', async () => {
  assert.ok(existsSync(join(dataDir, 'backups', 'pre-v2-01', 'leaderboard.json')), 'Sicherung vor der Migration');
  const a = await visit(), b = await visit();
  const list = await (await a.get('/api/identity/legacy')).json();
  assert.ok(list.names.some((n) => n.name === 'Oma' && n.played === 6));
  assert.equal((await a.post('/api/identity/claim', { name: 'oma' })).status, 200);
  assert.equal((await b.post('/api/identity/claim', { name: 'Oma' })).status, 409, 'wer zuerst übernimmt, bekommt sie');
  assert.equal((await a.me()).claimed[0], 'Oma');
  const board = await (await fetch(`${URL}/api/leaderboard?game=maumau`)).json();
  assert.ok(board.rows.some((r) => r.played === 6 && r.wins === 5));
  const admin = browser();
  assert.equal((await admin.post('/admin/api/login', { password: 'adminpw' })).status, 200);
  const status = await (await admin.get('/admin/api/status')).json();
  assert.equal(status.claims.length, 1); assert.equal(status.claims[0].gameId, (await a.me()).gameId);
  assert.ok(!JSON.stringify(status.claims).match(/[a-f0-9]{32}/), 'keine interne ID in der Admin-Antwort');
  assert.equal((await b.post('/admin/api/identity/claims/undo', { key: 'oma' })).status, 401, 'ohne Admin-Anmeldung nicht');
  assert.equal((await admin.post('/admin/api/identity/claims/undo', { key: 'oma' })).status, 200);
  assert.equal((await b.post('/api/identity/claim', { name: 'Oma' })).status, 200, 'nach dem Zurücknehmen frei');
  const log = (await (await admin.get('/admin/api/status')).json()).log;
  assert.ok(log.some((l) => l.action === 'Statistik-Zuordnung rückgängig'));
});
