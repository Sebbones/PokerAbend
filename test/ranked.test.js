// V2-03: Ranked-Ergebnisse und historische Bestenlisten – Wertung, Bot-/Gast-Ausschluss, Idempotenz, Migration, Server-Schnittstelle.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createLeaderboard } from '../server/leaderboard.js';
import { createAccountStore } from '../server/account-store.js';
import { rankedReason, createRanked } from '../server/ranked.js';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';
import { seeded } from './sim-helpers.js';
import { freePort } from './free-port.js';

const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32);
const ID1 = '0123456789abcdef', ID2 = 'fedcba9876543210', ID3 = '1111111111111111';
const tmp = (p = 'ranked-') => mkdtempSync(join(tmpdir(), p));
const reg = new Set([A, B, C]);
const env = { isRegistered: (id) => reg.has(id), resolve: (id) => id };
const human = (accountId) => ({ bot: false, accountId });

test('Berechtigung: nur registrierte Menschen, mindestens zwei Konten, nie mit Bots oder Gästen', () => {
  assert.equal(rankedReason([human(A), human(B)], env), '');
  assert.equal(rankedReason([human(A), human(B), human(C)], env), '');
  assert.equal(rankedReason([human(A), { bot: true }], env), 'bots');
  assert.equal(rankedReason([human(A), human(B), { bot: true }], env), 'bots', 'ein Bot genügt, um die Runde zu sperren');
  assert.equal(rankedReason([human(A), human('d'.repeat(32))], env), 'gast', 'Konto ohne Discord-Verknüpfung ist ein Gast');
  assert.equal(rankedReason([human(A), human(null)], env), 'gast');
  assert.equal(rankedReason([human(A)], env), 'zu-wenige');
  assert.equal(rankedReason([human(A), human(A)], env), 'zu-wenige', 'zwei Plätze desselben Kontos sind nur ein Mensch');
  assert.equal(rankedReason([], env), 'zu-wenige');
  // Ein zusammengeführtes Konto zählt als dieselbe Person
  assert.equal(rankedReason([human(A), human(B)], { ...env, resolve: () => A }), 'zu-wenige');
});

test('Bots werden am Serverflag erkannt, nicht am Namen', () => {
  const lb = createLeaderboard(tmp());
  const ok = lb.recordRound({ id: ID1, game: 'maumau', ranked: true, players: [
    { accountId: A, name: 'Anna', win: true, points: 0 }, { accountId: B, name: 'Computer', win: false, points: 9 }] });
  assert.ok(ok);
  assert.equal(lb.round(ID1).ranked, true, 'ein Mensch namens „Computer“ ist kein Bot');
  lb.recordRound({ id: ID2, game: 'maumau', ranked: true, players: [
    { accountId: A, name: 'Anna', win: true, points: 0 }, { accountId: B, name: 'Ben', win: false, points: 9, bot: true }] });
  assert.equal(lb.round(ID2).ranked, false, 'ein Bot-Flag sperrt die Runde, selbst wenn der Server ranked behauptet');
  assert.equal(lb.round(ID2).reason, 'bots');
  assert.equal(lb.round(ID2).players.find((p) => p.n === 'Ben').a, null, 'Bots tragen nie eine Konto-ID');
  assert.deepEqual(lb.rankedTable('maumau').map((r) => [r.name, r.played]).sort(), [['Anna', 1], ['Computer', 1]], 'nur die gewertete Runde zählt');
});

test('Runden: Platzierung, Gleichstand, niedrigere Punkte besser, zu wenige Konten', () => {
  const lb = createLeaderboard(tmp());
  lb.recordRound({ id: ID1, game: 'maumau', ranked: true, players: [
    { accountId: A, name: 'Anna', win: false, points: 5 }, { accountId: B, name: 'Ben', win: true, points: 0 }, { accountId: C, name: 'Cara', win: false, points: 5 }] });
  const places = Object.fromEntries(lb.round(ID1).players.map((p) => [p.n, p.place]));
  assert.deepEqual(places, { Ben: 1, Anna: 2, Cara: 2 }, 'Gleichstand teilt den Platz');
  lb.recordRound({ id: ID2, game: 'kniffel', ranked: true, lowWins: true, players: [
    { accountId: A, name: 'Anna', win: false, points: 300 }, { accountId: B, name: 'Ben', win: false, points: 120 }] });
  assert.equal(lb.round(ID2).players.find((p) => p.n === 'Ben').place, 1, 'bei lowWins gewinnt die kleinere Zahl');
  lb.recordRound({ id: ID3, game: 'maumau', ranked: true, players: [{ accountId: A, name: 'Anna', win: true, points: 0 }] });
  assert.equal(lb.round(ID3).ranked, false, 'ein einzelnes Konto reicht nicht');
  assert.equal(lb.recordRound({ id: 'kein-id', game: 'maumau', players: [{ name: 'x' }] }), false, 'ungültige Runden-ID wird abgelehnt');
});

test('Idempotenz: dieselbe Runde zählt höchstens einmal, auch nach Neustart', () => {
  const dir = tmp();
  const lb = createLeaderboard(dir);
  const round = { id: ID1, game: 'maumau', ranked: true, players: [{ accountId: A, name: 'Anna', win: true, points: 0 }, { accountId: B, name: 'Ben', win: false, points: 4 }] };
  assert.equal(lb.recordRound(round), true);
  assert.equal(lb.recordRound(round), false);
  assert.equal(lb.rankedTable('maumau')[0].played, 1);
  lb.save();
  const again = createLeaderboard(dir);
  assert.equal(again.recordRound(round), false, 'auch nach dem Laden');
  assert.equal(again.roundCount(), 1);
  assert.equal(again.rankedTable('maumau').find((r) => r.name === 'Anna').played, 1);
});

test('Bestenlisten: pro Spiel, gesamt, Woche, Monat, alles; Sortierung und leere Zustände', () => {
  let date = new Date(2026, 9, 5, 12); // 5. Oktober
  const lb = createLeaderboard(tmp(), { now: () => date });
  const round = (id, game, aWins, extra = {}) => lb.recordRound({ id, game, ranked: true, ...extra, players: [
    { accountId: A, name: 'Anna', win: aWins, points: aWins ? 10 : 2 }, { accountId: B, name: 'Ben', win: !aWins, points: aWins ? 2 : 10 }] });
  round('1000000000000001', 'maumau', true);
  date = new Date(2026, 10, 3, 12); // 3. November (Dienstag)
  round('1000000000000002', 'maumau', false);
  round('1000000000000003', 'kniffel', false);
  date = new Date(2026, 10, 7, 12); // 7. November
  round('1000000000000004', 'maumau', false);
  assert.deepEqual(lb.rankedTable('maumau', 'all').map((r) => [r.name, r.played, r.wins]), [['Ben', 3, 2], ['Anna', 3, 1]]);
  assert.deepEqual(lb.rankedTable('maumau', 'month').map((r) => [r.name, r.played, r.wins]), [['Ben', 2, 2], ['Anna', 2, 0]], 'nur der laufende Kalendermonat');
  assert.deepEqual(lb.rankedTable('maumau', 'week').map((r) => [r.name, r.played]), [['Ben', 2], ['Anna', 2]], 'die letzten sieben Tage');
  date = new Date(2026, 10, 20, 12);
  assert.deepEqual(lb.rankedTable('maumau', 'week'), [], 'echte leere Zustände statt erfundener Spieler');
  assert.equal(lb.rankedTable('maumau', 'month').length, 2);
  const total = lb.rankedTable('all', 'all');
  assert.equal(total.find((r) => r.name === 'Ben').played, 4);
  assert.equal(total[0].points, null, 'Punkte verschiedener Spiele werden nie addiert');
  assert.deepEqual(lb.rankedTable('schocken', 'all'), []);
  assert.deepEqual(lb.rankedSummary('maumau', 'all'), { ranked: 3, notRanked: 0, reasons: {} });
});

test('Nicht gewertete Partien: nicht in Ranked, aber weiter in der Statistik; Gründe sichtbar', () => {
  const lb = createLeaderboard(tmp());
  lb.record('maumau', [{ name: 'Anna', win: true, points: 0, accountId: A }, { name: 'Ben', win: false, points: 3, accountId: B }]);
  lb.recordRound({ id: ID1, game: 'maumau', ranked: false, reason: 'gast', players: [{ accountId: A, name: 'Anna', win: true, points: 0 }, { accountId: B, name: 'Ben', win: false, points: 3 }] });
  assert.deepEqual(lb.rankedTable('maumau'), []);
  assert.equal(lb.table('maumau').find((r) => r.name === 'Anna').played, 1, 'die Statistik zählt die Partie');
  assert.deepEqual(lb.rankedSummary('maumau'), { ranked: 0, notRanked: 1, reasons: { gast: 1 } });
});

test('Kontozusammenführung: Ranked-Ergebnisse folgen dem Ziel-Konto', () => {
  const lb = createLeaderboard(tmp());
  lb.record('maumau', [{ name: 'Anna', accountId: A, win: true, points: 0 }]);
  lb.recordRound({ id: ID1, game: 'maumau', ranked: true, players: [{ accountId: A, name: 'Anna', win: true, points: 0 }, { accountId: B, name: 'Ben', win: false, points: 1 }] });
  lb.merge(A, C, 'Anna');
  const rows = lb.rankedTable('maumau');
  assert.equal(rows.filter((r) => r.name === 'Anna').length, 1);
  assert.equal(rows.find((r) => r.name === 'Anna').played, 1);
});

test('Migration: alter Bestand (schemaVersion 2) bleibt unverändert, Claim funktioniert, zweiter Start ändert nichts', () => {
  const dir = tmp('ranked-mig-');
  const old = { schemaVersion: 2, players: {
    anna: { name: 'Anna', games: { maumau: { played: 4, wins: 3, points: 12, months: { '2026-10': { played: 4, wins: 3, points: 12 } } } } },
    [A]: { name: 'Neu', games: { maumau: { played: 1, wins: 0, points: 2, months: { '2026-11': { played: 1, wins: 0, points: 2 } } } }, accountId: A },
  } };
  const file = join(dir, 'leaderboard.json');
  writeFileSync(file, JSON.stringify(old));
  const lb = createLeaderboard(dir);
  assert.ok(existsSync(`${file}.pre-v2-03`), 'Sicherung vor der Migration');
  assert.deepEqual(JSON.parse(readFileSync(`${file}.pre-v2-03`, 'utf8')), old);
  assert.equal(lb.roundCount(), 0, 'keine erfundenen Runden aus alten Namensdaten');
  assert.deepEqual(lb.rankedTable('maumau'), [], 'alter Bestand ist nie gewertet');
  assert.equal(lb.table('maumau').find((r) => r.name === 'Anna').played, 4, 'historische Statistik bleibt erreichbar');
  assert.deepEqual(lb.legacyNames().map((n) => n.name), ['Anna']);
  assert.deepEqual(lb.claim('Anna', B, 'Anna neu'), { ok: true, name: 'Anna' });
  assert.equal(lb.profile({ accountId: B, name: 'Anna neu' }).games[0].played, 4, 'Claim-Weg liefert die alten Zahlen');
  lb.save();
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(saved.schemaVersion, 3);
  assert.equal(saved.players.anna.games.maumau.played, 4, 'Name-Eintrag selbst unverändert');
  // Zweiter Start: nichts wird neu gesichert oder verändert
  const backupBefore = readFileSync(`${file}.pre-v2-03`, 'utf8');
  const second = createLeaderboard(dir);
  second.save();
  assert.equal(readFileSync(`${file}.pre-v2-03`, 'utf8'), backupBefore, 'Sicherung wird nie überschrieben');
  const resaved = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(resaved, saved, 'idempotent');
  assert.equal(second.table('maumau').find((r) => r.name === 'Anna neu' || r.name === 'Anna').played >= 1, true);
});

// ---------- Mit echten Räumen: Start → Einfrieren → Ergebnis / Abbruch ----------
function wired(gameId, { accountsOf, bots = 0, humans = 2 }) {
  const dir = tmp('ranked-room-');
  const accounts = createAccountStore(dir);
  const ids = [];
  for (let i = 0; i < humans; i++) { const id = accounts.newId(); accounts.ensure(id); ids.push(id); }
  const leaderboard = createLeaderboard(dir);
  let n = 0;
  const ranked = createRanked({ accounts, leaderboard, newId: () => (++n).toString(16).padStart(16, '0') });
  const room = GAMES[gameId].create('RNK' + Math.floor(Math.random() * 900 + 100), {}, (kind, data) => {
    if (kind === 'roundStart') ranked.freeze(room, data.ids);
    if (kind === 'roundAbort') ranked.abort(room);
    if (kind === 'result') { room.resultSeen = (room.resultSeen || 0) + 1; ranked.record(room, data); }
  });
  room.game = gameId;
  const players = ids.map((acc, i) => { const p = room.addPlayer('Mensch' + i, null); p.accountId = acc; room.sit(p.id); return p; });
  for (let i = 0; i < bots; i++) { const p = room.addPlayer('Computer' + i, null); p.bot = true; room.sit(p.id); }
  for (const [i, acc] of ids.entries()) if (accountsOf?.[i]) accounts.linkExternal(acc, 'discord', accountsOf[i]);
  return { room, leaderboard, accounts, players, ids, ranked };
}
function playOut(room, seed = 5) {
  const rng = seeded(seed);
  for (let i = 0; i < 4000 && room.phase === 'playing'; i++) BOTS.maumau(room, room.currentId, rng);
  assert.equal(room.phase, 'over');
}

test('Raum: zwei registrierte Menschen → gewertet und genau einmal verbucht', () => {
  const { room, leaderboard, ids } = wired('maumau', { accountsOf: ['d1', 'd2'] });
  room.start(room.hostId);
  assert.equal(room.rankedRound.reason, '');
  playOut(room);
  assert.equal(leaderboard.roundCount(), 1);
  const [round] = Object.values(JSON.parse(JSON.stringify({ r: leaderboard.round('0000000000000001') })));
  assert.equal(round.ranked, true);
  assert.deepEqual(round.players.map((p) => p.a).sort(), [...ids].sort());
  assert.equal(room.rankedRound, null, 'eingefrorene Runde ist verbraucht');
  assert.equal(leaderboard.rankedTable('maumau').length, 2);
});

test('Raum: Gäste → nicht gewertet, aber Runde mit Grund gespeichert', () => {
  const { room, leaderboard } = wired('maumau', { accountsOf: ['d1', null] });
  room.start(room.hostId); playOut(room, 8);
  const round = leaderboard.round('0000000000000001');
  assert.equal(round.ranked, false); assert.equal(round.reason, 'gast');
  assert.deepEqual(leaderboard.rankedTable('maumau'), []);
});

test('Raum: Mensch gegen Computer → nicht gewertet; Bot trägt keine Konto-ID', () => {
  const { room, leaderboard } = wired('maumau', { accountsOf: ['d1'], humans: 1, bots: 1 });
  room.start(room.hostId);
  assert.equal(room.rankedRound.reason, 'bots');
  playOut(room, 11);
  const round = leaderboard.round('0000000000000001');
  assert.equal(round.ranked, false); assert.equal(round.reason, 'bots');
  assert.equal(round.players.filter((p) => p.bot).length, 1);
  assert.ok(round.players.filter((p) => p.bot).every((p) => p.a === null));
  assert.deepEqual(leaderboard.rankedTable('maumau'), []);
});

test('Raum: Berechtigung ist beim Start eingefroren – späteres Verknüpfen ändert die laufende Runde nicht', () => {
  const { room, leaderboard, accounts, ids } = wired('maumau', { accountsOf: ['d1', null] });
  room.start(room.hostId);
  assert.equal(room.rankedRound.reason, 'gast');
  accounts.linkExternal(ids[1], 'discord', 'd2'); // mitten in der Runde registriert
  playOut(room, 3);
  assert.equal(leaderboard.round('0000000000000001').ranked, false, 'bleibt ungewertet');
});

test('Raum: abgebrochene Runde hinterlässt keinen Eintrag, nächste Runde bekommt eine neue ID', () => {
  const { room, leaderboard } = wired('maumau', { accountsOf: ['d1', 'd2'] });
  room.start(room.hostId);
  const first = room.rankedRound.id;
  room.abortRound(room.hostId);
  assert.equal(room.rankedRound, null);
  assert.equal(leaderboard.roundCount(), 0);
  room.start(room.hostId);
  assert.notEqual(room.rankedRound.id, first);
  playOut(room, 21);
  assert.equal(leaderboard.roundCount(), 1);
});

test('Raum: doppelt gemeldetes Ergebnis zählt nicht zweimal', () => {
  const { room, leaderboard, ranked } = wired('maumau', { accountsOf: ['d1', 'd2'] });
  room.start(room.hostId);
  const frozen = room.rankedRound;
  const entries = [...room.players.values()].map((p, i) => ({ name: p.name, win: i === 0, points: i })), ids = [...room.players.keys()];
  assert.equal(ranked.record(room, { entries, ids }), true);
  room.rankedRound = frozen; // Wiederholung mit derselben Runden-ID
  assert.equal(ranked.record(room, { entries, ids }), false);
  assert.equal(leaderboard.roundCount(), 1);
});

test('Raum: Ergebnis mit fremdem Spieler wird nicht gewertet', () => {
  const { room, leaderboard, ranked } = wired('maumau', { accountsOf: ['d1', 'd2'] });
  room.start(room.hostId);
  const late = room.addPlayer('Zuschauer', null); late.accountId = 'e'.repeat(32);
  const entries = [...room.players.values()].map((p) => ({ name: p.name, win: false, points: 0 })), ids = [...room.players.keys()];
  ranked.record(room, { entries, ids });
  assert.equal(leaderboard.round('0000000000000001').reason, 'teilnehmer');
  assert.equal(leaderboard.round('0000000000000001').ranked, false);
});

test('Anzeige: Vorschau und eingefrorener Stand für die Spieler', () => {
  const { room, ranked } = wired('maumau', { accountsOf: ['d1', 'd2'] });
  assert.deepEqual(ranked.state(room), { ranked: true, reason: '', frozen: false });
  room.start(room.hostId);
  assert.deepEqual(ranked.state(room), { ranked: true, reason: '', frozen: true });
  const guest = wired('maumau', { accountsOf: ['d1', null] });
  assert.equal(guest.ranked.state(guest.room).reason, 'gast');
});

// ---------- Mit dem Server: /api/ranked und Zustand ----------
const PORT = await freePort();
const dataDir = tmp('ranked-srv-');
const now = Date.now();
writeFileSync(join(dataDir, 'leaderboard.json'), JSON.stringify({ schemaVersion: 3, players: { [A]: { name: 'Anna', games: {}, accountId: A }, [B]: { name: 'Ben', games: {}, accountId: B }, alt: { name: 'Alt', games: { maumau: { played: 2, wins: 2, points: 0, months: { '2026-10': { played: 2, wins: 2, points: 0 } } } } } }, rounds: {
  [ID1]: { id: ID1, game: 'maumau', variant: 'classic', at: now, ranked: true, reason: '', players: [{ a: A, n: 'Anna', bot: false, win: true, pts: 0, place: 1 }, { a: B, n: 'Ben', bot: false, win: false, pts: 5, place: 2 }] },
  [ID2]: { id: ID2, game: 'maumau', variant: 'classic', at: now, ranked: false, reason: 'bots', players: [{ a: A, n: 'Anna', bot: false, win: true, pts: 0, place: 1 }, { a: null, n: 'Computer', bot: true, win: false, pts: 5, place: 2 }] },
} }));
let server;
before(async () => {
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500' }, stdio: 'pipe' });
  await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); }); server.on('exit', (c) => rej(new Error('Server beendet: ' + c))); });
});
after(() => server.kill());
const clients = [];
after(() => clients.forEach((c) => c.close()));
const client = () => { const s = io(`http://localhost:${PORT}`, { transports: ['websocket'], forceNew: true, reconnection: false }); s.state = null; s.on('state', (st) => { s.state = st; }); s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r)); clients.push(s); return s; };
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 25)); } throw new Error('Zeitüberschreitung'); };

test('Server: /api/ranked liefert nur qualifizierte Ergebnisse, Zusammenfassung und gültige Filter', async () => {
  const res = await fetch(`http://localhost:${PORT}/api/ranked?game=maumau&period=week`);
  const body = await res.json();
  assert.equal(body.view, 'ranked'); assert.equal(body.game, 'maumau'); assert.equal(body.period, 'week');
  assert.deepEqual(body.rows.map((r) => [r.name, r.played, r.wins]), [['Anna', 1, 1], ['Ben', 1, 0]]);
  assert.deepEqual(body.summary, { ranked: 1, notRanked: 1, reasons: { bots: 1 } });
  const all = await (await fetch(`http://localhost:${PORT}/api/ranked?game=all&period=nonsense`)).json();
  assert.equal(all.game, 'all'); assert.equal(all.period, 'all'); assert.equal(all.rows[0].points, null);
  const unknown = await (await fetch(`http://localhost:${PORT}/api/ranked?game=gibtsnicht`)).json();
  assert.equal(unknown.game, 'all');
  const none = await (await fetch(`http://localhost:${PORT}/api/ranked?game=schocken`)).json();
  assert.deepEqual(none.rows, []);
  const history = await (await fetch(`http://localhost:${PORT}/api/leaderboard?game=maumau`)).json();
  assert.equal(history.rows.find((r) => r.name === 'Alt').played, 2, 'historische Namensstatistik bleibt erreichbar');
});

test('Server: Spielzustand zeigt Gast-Tische und Computer-Tische als nicht gewertet', async () => {
  const a = client(), b = client();
  const t = await a.ask('create', { game: 'maumau', name: 'Anna' });
  assert.ok(t.ok);
  assert.ok((await b.ask('join', { code: t.code, name: 'Ben' })).ok);
  await a.ask('sit', {}); await b.ask('sit', {});
  await until(() => b.state?.ranked);
  assert.equal(b.state.ranked.ranked, false);
  assert.equal(b.state.ranked.reason, 'gast', 'Gäste ohne Discord sind nie gewertet');
  await a.ask('addBot', {});
  await until(() => a.state?.ranked?.reason === 'bots');
  assert.equal(a.state.ranked.reason, 'bots');
});
