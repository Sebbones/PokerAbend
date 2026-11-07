// V2-17 (Admin-Moderation) und V2-07 (Tickets, Planungen, Rückblicke, Presence an die Spieler-Identität).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createAccountStore } from '../server/account-store.js';
import { createIdentity, GUEST_COOKIE } from '../server/identity.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { createTicketStore } from '../server/tickets.js';
import { createPlanStore } from '../server/evening-plans.js';
import { createReviewStore, reviewFromRoom } from '../server/evening-reviews.js';
import { createPresence } from '../server/presence.js';
import { rebindGameIds } from '../server/rebind.js';
import { GAMES } from '../games/index.js';
import { freePort } from './free-port.js';

const SECRET = 'test-secret-v2-17-07', ADMIN = 'admin-v2-17-pw';
const ANNA = 'a1'.repeat(16), BEN = 'b2'.repeat(16), CARA = 'c3'.repeat(16), OLD = 'd4'.repeat(32 / 2);
const REVIEW = '11111111-2222-3333-4444-555555555555', PRIVATE_REVIEW = '66666666-7777-8888-9999-000000000000';
const ROUND = 'f'.repeat(16), ROUND2 = 'e'.repeat(16);
let server, URL, dataDir, gid = {};

function seed(dir) {
  const accounts = createAccountStore(dir);
  for (const [key, id, name] of [['anna', ANNA, 'Anna'], ['ben', BEN, 'Ben'], ['cara', CARA, 'Cara']]) { gid[key] = accounts.ensure(id).gameId; accounts.touch(id, { name, avatar: '🦊' }); }
  accounts.save();
  const lb = createLeaderboard(dir);
  const players = (a, b) => [{ accountId: a, name: a === ANNA ? 'Anna' : 'Ben', win: true, points: 10 }, { accountId: b, name: 'Ben', win: false, points: 4 }];
  lb.recordRound({ id: ROUND, game: 'maumau', ranked: true, players: players(ANNA, BEN) });
  lb.recordRound({ id: ROUND2, game: 'maumau', ranked: true, players: players(ANNA, BEN) });
  lb.save();
  // Altbestand: Ticket und Planung ohne Spieler-ID, Rückblicke ohne gameId
  const tickets = createTicketStore({ dir, games: Object.keys(GAMES) });
  tickets.create({ title: 'Altes Ticket', description: 'Ein Ticket aus der Zeit vor den Konten.', type: 'idea', game: '' }, { id: 'ab'.repeat(16), name: 'Oma', avatar: '🦉' });
  const review = (id, name, priv) => ({ id, name, mode: 'abend', status: 'done', private: priv, startedAt: 1, endedAt: 2, updatedAt: 3, planned: 1,
    players: [{ name: 'Anna', avatar: '🦊' }, { name: 'Ben', avatar: '🦊' }],
    stations: [{ index: 0, game: 'maumau', gameName: 'Mau-Mau', at: 2, scoreLabel: 'Punkte', lowWins: false, values: [{ player: 'p0', raw: 3, points: 5, won: true }, { player: 'p1', raw: 1, points: 2, won: false }] }] });
  writeFileSync(join(dir, 'evening-reviews.json'), JSON.stringify({ version: 1, evenings: [review(REVIEW, 'Öffentlicher Abend', false), review(PRIVATE_REVIEW, 'Privater Abend', true)] }));
}
async function start() {
  const port = await freePort(); URL = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500', SESSION_SECRET: SECRET, ADMIN_PASSWORD: ADMIN, TICKET_ADMIN_PASSWORD: 'ticket-admin-pw', TRUST_PROXY: '1' }, stdio: 'pipe' });
  await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); }); server.on('exit', (c) => rej(new Error('Server beendet: ' + c))); });
  server.removeAllListeners('exit');
}
before(async () => { dataDir = mkdtempSync(join(tmpdir(), 'v2-17-07-')); seed(dataDir); await start(); });
after(() => { sockets.forEach((s) => s.close()); server?.kill(); });

const sockets = [];
let ipCounter = 0;
function browser(accountId = null) {
  const jar = {}, ip = `10.1.0.${++ipCounter}`; // jeder „Browser“ hat eine eigene Adresse, damit sich die Limits der Tests nicht überlagern
  if (accountId) jar[GUEST_COOKIE] = createIdentity({ secret: SECRET }).issue(accountId);
  const take = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (/Max-Age=0/.test(c)) delete jar[kv.slice(0, i)]; else jar[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } };
  const header = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  const send = async (method, path, body, extra = {}) => { const res = await fetch(URL + path, { method, headers: { cookie: header(), 'x-forwarded-for': ip, ...(body ? { 'content-type': 'application/json' } : {}), 'x-requested-with': 'spieleabend', ...extra }, body: body ? JSON.stringify(body) : undefined }); take(res); return res; };
  const b = { jar,
    get: (p) => send('GET', p), post: (p, body = {}, extra) => send('POST', p, body, extra), patch: (p, body = {}) => send('PATCH', p, body), del: (p) => send('DELETE', p),
    json: async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) }),
    socket() { const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: header() } }); s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r)); sockets.push(s); return s; } };
  return b;
}
async function admin() { const b = browser(); assert.equal((await b.post('/admin/api/login', { password: ADMIN })).status, 200); return b; }

// ---------- V2-17: Schutz ----------
test('V2-17: alle Moderations-Endpunkte brauchen die Admin-Anmeldung, Schreibzugriffe zusätzlich Header und JSON', async () => {
  const anon = browser();
  for (const [method, path] of [['GET', '/admin/api/reviews'], ['GET', '/admin/api/leaderboard'], ['GET', '/admin/api/rounds'], ['GET', '/admin/api/players'], ['GET', '/admin/api/tickets'], ['GET', '/admin/api/log'],
    ['POST', `/admin/api/reviews/${REVIEW}/hide`], ['POST', `/admin/api/rounds/${ROUND}/hide`], ['POST', '/admin/api/players/merge'], ['PATCH', '/admin/api/tickets/1'], ['DELETE', '/admin/api/tickets/1']]) {
    const res = await (method === 'GET' ? anon.get(path) : method === 'POST' ? anon.post(path, { hidden: true }) : method === 'PATCH' ? anon.patch(path, {}) : anon.del(path));
    assert.equal(res.status, 401, `${method} ${path}`);
  }
  const a = await admin();
  assert.equal((await a.post('/admin/api/rounds/' + ROUND + '/hide', { hidden: true }, { 'x-requested-with': 'fremd' })).status, 403, 'ohne Admin-Seiten-Header');
  const res = await fetch(URL + '/admin/api/players/merge', { method: 'POST', headers: { cookie: Object.entries(a.jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; '), 'x-forwarded-for': '10.9.9.9', 'x-requested-with': 'spieleabend', 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415);
  // Das Gruppen-/Ticket-Admin-Cookie ersetzt die Admin-Anmeldung nicht
  const ticketAdmin = browser(); await ticketAdmin.post('/api/tickets/admin/login', { password: 'ticket-admin-pw' });
  assert.equal((await ticketAdmin.get('/admin/api/tickets')).status, 401);
});

test('V2-17: Login-Rate-Limit sperrt nach 8 Fehlversuchen, auch mit richtigem Passwort', async () => {
  const b = browser();
  let last;
  for (let i = 0; i < 8; i++) { last = await b.post('/admin/api/login', { password: 'falsch' }); assert.equal(last.status, 401); }
  const blocked = await b.post('/admin/api/login', { password: ADMIN });
  assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

// ---------- V2-17: Rückblicke ----------
test('V2-17: Rückblicke ansehen, ausblenden und einblenden; öffentlich verschwinden sie, bleiben aber gespeichert', async () => {
  const a = await admin(), pub = browser();
  const list = (await a.json(await a.get('/admin/api/reviews'))).data.items;
  assert.deepEqual(list.map((r) => r.id).sort(), [PRIVATE_REVIEW, REVIEW].sort(), 'die Verwaltung sieht auch private Abende');
  assert.equal((await pub.json(await pub.get('/api/evenings'))).data.total, 1, 'öffentlich nur der öffentliche Abend');
  assert.equal((await a.post(`/admin/api/reviews/${REVIEW}/hide`, { hidden: 'ja' })).status, 400);
  assert.equal((await a.post(`/admin/api/reviews/${'0'.repeat(8)}-0000-0000-0000-000000000000/hide`, { hidden: true })).status, 404);
  assert.equal((await a.post(`/admin/api/reviews/${REVIEW}/hide`, { hidden: true })).status, 200);
  assert.equal((await pub.json(await pub.get('/api/evenings'))).data.total, 0);
  assert.equal((await pub.get(`/api/evenings/${REVIEW}`)).status, 404, 'Direktlink ebenfalls weg');
  assert.equal((await a.get(`/admin/api/reviews/${REVIEW}`)).status, 200, 'Verwaltung sieht weiter');
  const stored = JSON.parse(readFileSync(join(dataDir, 'evening-reviews.json'), 'utf8')).evenings.find((r) => r.id === REVIEW);
  assert.equal(stored.hidden, true); assert.equal(stored.stations.length, 1, 'nichts gelöscht');
  assert.equal((await a.post(`/admin/api/reviews/${REVIEW}/hide`, { hidden: false })).status, 200);
  assert.equal((await pub.json(await pub.get('/api/evenings'))).data.total, 1);
});

// ---------- V2-17: Bestenliste und Partien ----------
test('V2-17: eine falsche Partie ausblenden nimmt sie aus Bestenliste, Profilzahlen und Erfolgen; Einblenden stellt sie her', async () => {
  const a = await admin(), pub = browser();
  const before = (await a.json(await a.get('/admin/api/leaderboard?game=maumau&period=all'))).data;
  assert.equal(before.rows.find((r) => r.gameId === gid.anna).played, 2);
  assert.equal(before.rows.find((r) => r.gameId === gid.anna).name, 'Anna');
  assert.equal(JSON.stringify(before).includes(ANNA), false, 'keine interne Konto-ID in der Antwort');
  const rounds = (await a.json(await a.get('/admin/api/rounds?game=maumau'))).data.items;
  assert.equal(rounds.length, 2); assert.ok(rounds[0].players.every((p) => p.gameId === gid.anna || p.gameId === gid.ben));
  assert.equal((await a.post(`/admin/api/rounds/${ROUND}/hide`, { hidden: true })).status, 200);
  assert.equal((await a.json(await a.get('/admin/api/leaderboard?game=maumau&period=all'))).data.rows.find((r) => r.gameId === gid.anna).played, 1);
  assert.equal((await pub.json(await pub.get('/api/ranked?game=maumau'))).data.rows.find((r) => r.gameId === gid.anna).played, 1, 'auch die öffentliche Rangliste');
  assert.equal((await a.json(await a.get('/admin/api/rounds?hidden=1'))).data.items.length, 1);
  assert.equal((await a.post('/admin/api/rounds/nicht-vorhanden/hide', { hidden: true })).status, 404);
  assert.equal((await a.post(`/admin/api/rounds/${ROUND}/hide`, { hidden: true })).status, 200, 'wiederholtes Ausblenden ist harmlos');
  assert.equal((await a.post(`/admin/api/rounds/${ROUND}/hide`, { hidden: false })).status, 200);
  assert.equal((await a.json(await a.get('/admin/api/leaderboard?game=maumau&period=all'))).data.rows.find((r) => r.gameId === gid.anna).played, 2);
  const file = JSON.parse(readFileSync(join(dataDir, 'leaderboard.json'), 'utf8'));
  assert.equal(file.rounds[ROUND].hidden, undefined, 'Flag wieder entfernt, Datei persistiert');
  assert.equal((await a.get('/admin/api/leaderboard?game=maumau&period=jahr')).status, 400);
});

// ---------- V2-17 + V2-07: Spieler zusammenführen, Tickets ----------
test('V2-07: Ticket und Planung nehmen Name, Avatar und Spieler-ID vom Konto statt aus der Anfrage; gleicher Name gibt keine Rechte', async () => {
  const anna = browser(ANNA), fake = browser(CARA);
  const s = anna.socket(); await new Promise((r) => s.on('connect', r)); await s.ask('presence', { name: 'Anna', avatar: '🦊', visible: true });
  const c = fake.socket(); await new Promise((r) => c.on('connect', r)); await c.ask('presence', { name: 'Cara', avatar: '🦊', visible: true });
  const made = await anna.json(await anna.post('/api/tickets', { name: 'Chef der Welt', avatar: '🐲', title: 'Neues Ticket von Anna', description: 'Eine Beschreibung mit genug Zeichen.', type: 'bug', game: '' }));
  assert.equal(made.status, 201);
  assert.equal(made.data.ticket.author.name, 'Anna', 'der freie Name aus der Anfrage zählt mit Konto nicht');
  assert.equal(made.data.ticket.author.gameId, gid.anna);
  assert.equal(JSON.stringify(made.data).includes(ANNA), false);
  // Ein anderes Konto mit gleichem Anzeigenamen übernimmt nichts
  await c.ask('presence', { name: 'Anna', avatar: '🦊', visible: true });
  const imposter = browser(CARA);
  const edit = await imposter.json(await imposter.patch(`/api/tickets/${made.data.ticket.id}`, { title: 'Übernommen!', revision: made.data.ticket.revision }));
  assert.equal(edit.status, 403, 'Namensgleichheit ist keine Berechtigung');
  const list = (await anna.json(await anna.get('/api/tickets'))).data.tickets.find((t) => t.id === made.data.ticket.id);
  assert.equal(list.canEdit, true);
  const plan = await anna.json(await anna.post('/api/plans', { name: 'Herrscher', title: 'Spieleabend im Dezember', slots: [Date.now() + 5 * 864e5], games: ['maumau'] }));
  assert.equal(plan.status, 201); assert.equal(plan.data.plan.owner.name, 'Anna'); assert.equal(plan.data.plan.owner.gameId, gid.anna);
  assert.equal((await imposter.json(await imposter.patch(`/api/plans/${plan.data.plan.id}`, { action: 'cancel', revision: 1 }))).status, 403);
  // Versteckte Konten zeigen keine Spieler-ID
  assert.equal((await anna.post('/api/profile/privacy', { hidden: true })).status, 200);
  const quiet = await anna.json(await anna.post('/api/tickets', { title: 'Anonymes Ticket von Anna', description: 'Ohne öffentliche Spieler-ID.', type: 'idea', game: '' }));
  assert.equal(quiet.data.ticket.author.gameId, undefined);
  assert.equal(quiet.data.ticket.author.name, 'Anna');
});

test('V2-17: Spieler suchen und zusammenführen – Ergebnisse, Tickets und Rückblicke folgen, Rechte folgen mit', async () => {
  const a = await admin(), cara = browser(CARA);
  const found = (await a.json(await a.get('/admin/api/players?q=' + encodeURIComponent(gid.cara)))).data.items;
  assert.equal(found.length, 1); assert.equal(found[0].gameId, gid.cara); assert.equal(JSON.stringify(found).includes(CARA), false);
  // Cara legt ein Ticket an, danach wird Cara mit Ben zusammengeführt
  const t = await cara.json(await cara.post('/api/tickets', { title: 'Ticket von Cara', description: 'Wird später auf Ben übertragen.', type: 'idea', game: '' }));
  assert.equal(t.status, 201); assert.equal(t.data.ticket.author.gameId, gid.cara);
  for (const body of [{}, { from: gid.cara }, { from: gid.cara, to: gid.cara }, { from: 'ABC', to: gid.ben }, { from: '#ZZZZZ', to: gid.ben }]) assert.ok([400, 404].includes((await a.post('/admin/api/players/merge', body)).status), JSON.stringify(body));
  assert.equal((await a.post('/admin/api/players/merge', { from: gid.cara, to: gid.ben })).status, 200);
  assert.equal((await a.post('/admin/api/players/merge', { from: gid.cara, to: gid.ben })).status, 404, 'das alte Konto gibt es als eigene Person nicht mehr');
  assert.equal((await a.json(await a.get('/admin/api/players?q=' + encodeURIComponent(gid.cara)))).data.items.length, 0);
  const view = (await cara.json(await cara.get('/api/tickets'))).data.tickets.find((x) => x.title === 'Ticket von Cara');
  assert.equal(view.author.gameId, gid.ben, 'Autor zeigt auf die bestehende Person'); assert.equal(view.canEdit, true, 'das alte Gerät behält das Recht an seinem Ticket');
  const log = (await a.json(await a.get('/admin/api/log'))).data.entries;
  assert.ok(log.some((l) => l.action === 'Spieler zusammengeführt' && l.detail.includes(gid.cara) && l.detail.includes(gid.ben)));
});

test('V2-17: Tickets in /admin bearbeiten – Status, Kommentar, Löschen; Altbestand bleibt erhalten; alles im Protokoll', async () => {
  const a = await admin();
  const list = (await a.json(await a.get('/admin/api/tickets'))).data;
  const old = list.tickets.find((t) => t.title === 'Altes Ticket');
  assert.ok(old, 'Ticket ohne Spieler-ID wird weiter angezeigt'); assert.equal(old.author.name, 'Oma'); assert.equal(old.author.gameId, undefined);
  assert.equal(old.canDelete, true);
  assert.equal((await a.patch(`/admin/api/tickets/${old.id}`, { status: 'planned', revision: old.revision + 5 })).status, 409);
  assert.equal((await a.patch(`/admin/api/tickets/${old.id}`, { status: 'kaputt', revision: old.revision })).status, 400);
  const changed = (await a.json(await a.patch(`/admin/api/tickets/${old.id}`, { status: 'planned', revision: old.revision }))).data.ticket;
  assert.equal(changed.status, 'planned');
  const detail = (await a.json(await a.get(`/admin/api/tickets/${old.id}`))).data.ticket;
  assert.deepEqual(detail.history.map((h) => [h.from, h.to, h.by]), [['new', 'planned', 'Admin']]);
  const commented = (await a.json(await a.post(`/admin/api/tickets/${old.id}/comments`, { text: 'Kommt im nächsten Update.' }))).data.ticket;
  assert.equal(commented.comments[0].author.name, 'Admin');
  assert.equal((await a.del(`/admin/api/tickets/${old.id}/comments/${commented.comments[0].id}`)).status, 200);
  assert.equal((await a.post(`/admin/api/tickets/${old.id}/comments`, { text: '' })).status, 400);
  // Das öffentliche Board zeigt den Status
  assert.equal((await browser().json(await browser().get(`/api/tickets/${old.id}`))).data.ticket.status, 'planned');
  assert.equal((await a.del('/admin/api/tickets/9999')).status, 404);
  assert.equal((await a.del(`/admin/api/tickets/${old.id}`)).status, 200);
  assert.equal((await a.get(`/admin/api/tickets/${old.id}`)).status, 404);
  const actions = (await a.json(await a.get('/admin/api/log'))).data.entries.map((l) => l.action);
  for (const wanted of ['Angemeldet', 'Rückblick ausgeblendet', 'Rückblick eingeblendet', 'Partie ausgeblendet', 'Partie eingeblendet', 'Ticket bearbeitet', 'Ticket kommentiert', 'Ticket-Kommentar gelöscht', 'Ticket gelöscht']) assert.ok(actions.includes(wanted), wanted);
  assert.ok(actions.includes('Anmeldung fehlgeschlagen'));
  const persisted = JSON.parse(readFileSync(join(dataDir, 'admin-log.json'), 'utf8'));
  assert.ok(persisted.some((l) => l.action === 'Ticket gelöscht'), 'Protokoll liegt auf der Platte');
});

test('V2-17: Update ankündigen bleibt unverändert nutzbar', async () => {
  const a = await admin();
  assert.equal((await a.post('/admin/api/update', { minutes: 5 })).status, 200);
  assert.equal((await a.json(await a.get('/admin/api/status'))).data.update.due, false);
  assert.equal((await a.del('/admin/api/update')).status, 200);
});

// ---------- V2-07: Bausteine ----------
test('V2-07: Rückblick-Spieler tragen die Game-ID; alte Rückblicke ohne bleiben gültig; Zusammenführen und Löschen folgen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'v2-07-reviews-'));
  const room = { unlisted: false, partyProgram: { id: REVIEW, config: { name: 'Abend', mode: 'abend' }, status: 'done', plan: [{}], roster: [{ id: 'r1', name: 'Anna', avatar: '🦊', team: null }, { id: 'r2', name: 'Gast', avatar: '🦊', team: null }], scores: {}, startedAt: 1, endedAt: 2,
    results: [{ index: 0, game: 'maumau', at: 2, scoreLabel: 'Punkte', lowWins: false, points: { r1: 3, r2: 1 }, raw: { r1: 3, r2: 1 }, winners: ['r1'] }] } };
  const r = reviewFromRoom(room, GAMES, 5, (id) => (id === 'r1' ? '#ABCD' : null));
  assert.equal(r.players[0].gameId, '#ABCD'); assert.equal(r.players[1].gameId, undefined);
  assert.equal(reviewFromRoom(room, GAMES, 5, () => 'kein gültiges Format').players[0].gameId, undefined, 'nur gültige Game-IDs');
  const store = createReviewStore({ dir, games: GAMES, gameIdOf: (_room, id) => (id === 'r1' ? '#ABCD' : null) });
  store.capture(room);
  assert.equal(store.get(REVIEW).players[0].gameId, '#ABCD');
  assert.equal(store.rebindGameId('#ABCD', '#WXYZ'), 1); assert.equal(store.get(REVIEW).players[0].gameId, '#WXYZ');
  assert.equal(store.rebindGameId('#WXYZ', null), 1); assert.equal(store.get(REVIEW).players[0].gameId, undefined);
  // Ausgeblendet bleibt ausgeblendet, auch wenn der Raum den Stand später erneut meldet
  store.setHidden(REVIEW, true); store.capture(room); store.capture({ ...room, unlisted: true });
  assert.equal(store.list().total, 0); assert.throws(() => store.get(REVIEW), /nicht gefunden/);
  assert.equal(createReviewStore({ dir, games: GAMES }).adminList()[0].hidden, true, 'nach Neustart weiter ausgeblendet');
});

test('V2-07: Ticket- und Planungsspeicher – gameId optional, rebind trifft nur gameId-Felder, alter Bestand lädt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'v2-07-stores-'));
  const tickets = createTicketStore({ dir, games: Object.keys(GAMES) });
  const t = tickets.create({ title: '#ABCD', description: 'Titel gleicht einer Game-ID, bleibt unberührt.', type: 'idea', game: '' }, { id: 'ab'.repeat(16), name: 'Anna', avatar: '🦊', gameId: '#ABCD' });
  assert.equal(t.author.gameId, '#ABCD');
  assert.equal(tickets.create({ title: 'Zweites Ticket', description: 'Mit ungültiger Game-ID im Akteur.', type: 'idea', game: '' }, { id: 'ab'.repeat(16), name: 'Anna', gameId: '<script>' }).author.gameId, undefined);
  assert.equal(tickets.rebindGameId('#ABCD', '#WXYZ'), 1);
  const again = createTicketStore({ dir, games: Object.keys(GAMES) });
  assert.equal(again.detail(t.id, {}).author.gameId, '#WXYZ'); assert.equal(again.detail(t.id, {}).title, '#ABCD');
  const plans = createPlanStore({ dir, games: Object.values(GAMES) });
  const p = plans.create({ title: 'Plan mit Spieler-ID', slots: [Date.now() + 864e5 * 3], games: ['maumau'] }, { id: 'cd'.repeat(16), name: 'Anna', avatar: '🦊', gameId: '#WXYZ' });
  assert.equal(p.owner.gameId, '#WXYZ'); assert.equal(plans.rebindGameId('#WXYZ', null), 1);
  assert.equal(createPlanStore({ dir, games: Object.values(GAMES) }).detail(p.id, {}).owner.gameId, undefined);
  assert.deepEqual(rebindGameIds({ a: { gameId: '#A' }, b: ['#A', { gameId: '#B' }] }, '#A', '#C').value, { a: { gameId: '#C' }, b: ['#A', { gameId: '#B' }] });
});

test('V2-07: Presence – dieselbe Person in zwei Tabs ist eine Zeile, gleichnamige Konten sind zwei, versteckte fehlen', () => {
  let t = 1_000_000;
  const presence = createPresence({ now: () => t, setTimer: () => null, location: () => ({ kind: 'home' }), visibleFor: (key) => key !== '#HIDD' });
  presence.update('s1', { name: 'Anna', avatar: '🦊' }, '#ABCD'); presence.update('s2', { name: 'Anna (Handy)', avatar: '🦊' }, '#ABCD');
  presence.update('s3', { name: 'Anna', avatar: '🦊' }, '#WXYZ'); presence.update('s4', { name: 'Still', avatar: '🦊' }, '#HIDD');
  const keys = presence.snapshot().online.map((p) => p.key).sort();
  assert.deepEqual(keys, ['#ABCD', '#WXYZ'], 'Namensgleichheit verschmilzt keine Personen, versteckte Konten fehlen');
  assert.equal(JSON.stringify(presence.snapshot()).includes(ANNA), false);
});

test('V2-17: ausgeblendete Runden zählen weder für Erfolgsprofil, Konto-Zusammenfassung noch Ranglisten-Summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'v2-17-lb-'));
  const lb = createLeaderboard(dir);
  const two = [{ accountId: ANNA, name: 'Anna', win: true, points: 3 }, { accountId: BEN, name: 'Ben', win: false, points: 1 }];
  lb.recordRound({ id: ROUND, game: 'maumau', ranked: true, players: two }); lb.recordRound({ id: ROUND2, game: 'maumau', ranked: true, players: two });
  assert.equal(lb.achievementProfile(ANNA).games[0].played, 2);
  assert.equal(lb.setRoundHidden(ROUND, true).hidden, true);
  assert.equal(lb.achievementProfile(ANNA).games[0].played, 1); assert.equal(lb.accountSummary(ANNA).played, 1); assert.equal(lb.accountRounds(ANNA).length, 1);
  assert.equal(lb.rankedSummary('all', 'all').ranked, 1); assert.equal(lb.rankedTable('maumau', 'all')[0].played, 1);
  lb.save();
  const reloaded = createLeaderboard(dir);
  assert.equal(reloaded.round(ROUND).hidden, true, 'bleibt gespeichert, nur ausgeblendet'); assert.equal(reloaded.achievementProfile(ANNA).games[0].played, 1);
  assert.equal(lb.setRoundHidden('x'.repeat(16), true), null);
});
