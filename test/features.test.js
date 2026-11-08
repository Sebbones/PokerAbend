// V2-10 Feature-Flags: Reihenfolge (Admin > .env > Standard), sichere Standardwerte, Speichern, Spiele ein/aus – als Baustein und über den echten Server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createFeatures, parseSwitch, parseGameList, FLAGS, FLAG_NAMES } from '../server/features.js';
import { createRanked, rankedReason } from '../server/ranked.js';

const known = ['poker', 'blackjack', 'sudoku', 'maumau'];
const quiet = () => { const warnings = []; return { warnings, warn: (t) => warnings.push(t) }; };
const dir = () => mkdtempSync(join(tmpdir(), 'poker-features-'));

test('Schalter-Werte: on/off/true/false/1/0/ja/nein; alles andere ist „unbekannt“', () => {
  for (const yes of ['on', 'ON', 'true', '1', ' yes ', 'ja', 'an']) assert.equal(parseSwitch(yes), true, yes);
  for (const no of ['off', 'OFF', 'false', '0', 'no', 'nein', 'aus']) assert.equal(parseSwitch(no), false, no);
  for (const other of ['', undefined, null, 'vielleicht', '2', 'onn']) assert.equal(parseSwitch(other), null, String(other));
  assert.deepEqual(parseGameList(' Poker, blackjack ;sudoku\nmaumau, , POKER, ../etc, a b'), ['poker', 'blackjack', 'sudoku', 'maumau', 'a', 'b']);
  assert.deepEqual(parseGameList(''), []);
});

test('Sichere Standardwerte: Discord und Ranked wie bisher an, Kamera aus, alle Spiele an', () => {
  const f = createFeatures({ dir: dir(), env: {}, knownGames: known });
  assert.deepEqual(FLAG_NAMES, ['discord', 'ranked', 'camera']);
  assert.equal(f.enabled('discord'), true); assert.equal(f.enabled('ranked'), true); assert.equal(f.enabled('camera'), false);
  assert.deepEqual(f.disabledGames(), []);
  assert.deepEqual(f.filterGames(known.map((id) => ({ id }))).map((g) => g.id), known);
  assert.ok(Object.values(FLAGS).every((d) => d.label && d.hint && /^FEATURE_[A-Z]+$/.test(d.env)));
  assert.throws(() => f.enabled('gibtsnicht'), (e) => e.status === 404);
});

test('.env gilt als Grundeinstellung; falsche Werte werden gemeldet und ignoriert; unbekannte Spiele ebenso', () => {
  const q = quiet();
  const f = createFeatures({ dir: dir(), env: { FEATURE_RANKED: 'off', FEATURE_CAMERA: 'ON', FEATURE_DISCORD: 'vielleicht', DISABLED_GAMES: 'blackjack, nixda' }, knownGames: known, warn: q.warn });
  assert.equal(f.enabled('ranked'), false); assert.equal(f.enabled('camera'), true); assert.equal(f.enabled('discord'), true, 'ungültiger Wert → Standard');
  assert.deepEqual(f.disabledGames(), ['blackjack']);
  assert.equal(q.warnings.length, 2);
  assert.match(q.warnings.join(' '), /FEATURE_DISCORD/); assert.match(q.warnings.join(' '), /nixda/);
  const d = f.describe();
  assert.equal(d.flags.find((x) => x.name === 'ranked').source, 'env');
  assert.equal(d.flags.find((x) => x.name === 'discord').source, 'standard');
  assert.equal(d.games.find((g) => g.id === 'blackjack').source, 'env');
  assert.equal(d.games.find((g) => g.id === 'poker').enabled, true);
});

test('Admin-Einstellung schlägt .env, „zurücksetzen“ führt auf .env zurück und überlebt einen Neustart', () => {
  const where = dir();
  const env = { FEATURE_RANKED: 'off', DISABLED_GAMES: 'blackjack' };
  const f = createFeatures({ dir: where, env, knownGames: known });
  assert.deepEqual(f.set('ranked', true), { name: 'ranked', value: true, changed: true, source: 'admin' });
  assert.equal(f.set('ranked', true).changed, false, 'gleicher Wert ist keine Änderung');
  assert.equal(f.setGame('blackjack', true).enabled, true);
  assert.equal(f.setGame('poker', false).enabled, false);
  const again = createFeatures({ dir: where, env, knownGames: known });
  assert.equal(again.enabled('ranked'), true); assert.equal(again.gameEnabled('blackjack'), true); assert.equal(again.gameEnabled('poker'), false);
  assert.equal(JSON.parse(readFileSync(join(where, 'features.json'), 'utf8')).version, 1);
  assert.deepEqual(again.set('ranked', null), { name: 'ranked', value: false, changed: true, source: 'env' });
  assert.equal(again.setGame('blackjack', null).enabled, false, 'zurück auf .env: ausgeschaltet');
  assert.equal(again.setGame('poker', null).enabled, true);
  const third = createFeatures({ dir: where, env, knownGames: known });
  assert.deepEqual(third.describe().flags.map((x) => x.source), ['standard', 'env', 'standard']);
});

test('Ungültige Eingaben: unbekannte Funktion/Spiel → 404, Nicht-Wahrheitswerte → 400, nichts wird gespeichert', () => {
  const where = dir();
  const f = createFeatures({ dir: where, env: {}, knownGames: known });
  for (const bad of ['ja', 1, 0, {}, [], undefined]) {
    assert.throws(() => f.set('ranked', bad), (e) => e.status === 400, String(bad));
    assert.throws(() => f.setGame('poker', bad), (e) => e.status === 400, String(bad));
  }
  for (const name of ['', 'camera ', '__proto__', 'constructor', 5]) assert.throws(() => f.set(name, true), (e) => e.status === 404);
  for (const id of ['', '../x', 'POKER', 'nixda', '__proto__', null]) assert.throws(() => f.setGame(id, false), (e) => e.status === 404, String(id));
  assert.equal(existsSync(join(where, 'features.json')), false);
});

test('Kaputte oder fremde features.json: wird ignoriert (und nie überschrieben, solange nichts geändert wird)', () => {
  const where = dir();
  writeFileSync(join(where, 'features.json'), '{ kaputt');
  const q = quiet();
  const f = createFeatures({ dir: where, env: {}, knownGames: known, warn: q.warn });
  assert.equal(f.enabled('ranked'), true); assert.match(q.warnings[0], /nicht lesbar/);
  assert.equal(readFileSync(join(where, 'features.json'), 'utf8'), '{ kaputt');
  writeFileSync(join(where, 'features.json'), JSON.stringify({ flags: { ranked: 'nein', camera: true, evil: true }, games: { poker: false, '../x': false, maumau: 'ja' } }));
  const g = createFeatures({ dir: where, env: {}, knownGames: known });
  assert.equal(g.enabled('ranked'), true, 'Text statt Wahrheitswert zählt nicht'); assert.equal(g.enabled('camera'), true);
  assert.equal(g.gameEnabled('poker'), false); assert.equal(g.gameEnabled('maumau'), true);
});

test('Ranked aus: neue Runden zählen mit Grund „aus“, an: wie bisher', () => {
  const room = (players) => ({ players: new Map(players.map((p) => [p.id, p])), seats: players.map((p) => p.id) });
  const a = { id: 'a', accountId: 'A' }, b = { id: 'b', accountId: 'B' };
  const accounts = { isRegistered: () => true, resolve: (id) => id };
  let on = true;
  const ranked = createRanked({ accounts, leaderboard: {}, newId: () => 'r1', enabled: () => on });
  const r = room([a, b]);
  assert.deepEqual(ranked.state(r), { ranked: true, reason: '', frozen: false });
  on = false;
  assert.deepEqual(ranked.state(r), { ranked: false, reason: 'aus', frozen: false });
  ranked.freeze(r, ['a', 'b']);
  assert.equal(r.rankedRound.reason, 'aus');
  assert.equal(rankedReason([a, b], { isRegistered: () => true, resolve: (id) => id }), '', 'die reine Berechtigung bleibt unverändert');
  assert.equal(createRanked({ accounts, leaderboard: {}, newId: () => 'x' }).state(room([a, b])).ranked, true, 'ohne Flag-Funktion: wie bisher');
});

// ---------- über den echten Server (im selben Prozess) ----------
const DATA = mkdtempSync(join(tmpdir(), 'poker-features-srv-'));
Object.assign(process.env, {
  POKER_NO_DOTENV: '1', PORT: '0', DATA_DIR: DATA, SITE_PASSWORD: 'Feat2026', ADMIN_PASSWORD: 'Admin-Feat-2026', TRUST_PROXY: '1', CREATE_LIMIT: '500', API_LIMIT: '100000',
  FEATURE_RANKED: 'off', DISABLED_GAMES: 'blackjack,sudoku',
});
let http, BASE;
before(async () => {
  ({ http } = await import('../server/index.js'));
  if (!http.listening) await new Promise((r) => http.once('listening', r));
  BASE = `http://localhost:${http.address().port}`;
});
after(() => { http.closeAllConnections?.(); http.close(); setTimeout(() => process.exit(0), 50).unref(); });

let n = 1;
async function visitor() {
  const jar = {}, ip = `10.7.0.${n++}`;
  const take = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); const v = decodeURIComponent(kv.slice(i + 1)); if (v) jar[kv.slice(0, i)] = v; else delete jar[kv.slice(0, i)]; } };
  const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  take(await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip }, body: new URLSearchParams({ password: 'Feat2026', next: '/' }) }));
  await (await fetch(BASE + '/', { headers: { cookie: cookie(), 'x-forwarded-for': ip, accept: 'text/html' } })).text();
  const call = async (method, path, body, headers = {}) => { const res = await fetch(BASE + path, { method, redirect: 'manual', headers: { cookie: cookie(), 'x-forwarded-for': ip, origin: BASE, 'x-requested-with': 'spieleabend', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }); take(res); return res; };
  return { jar, cookie, ip, get: (p, h) => call('GET', p, undefined, h), post: (p, b = {}, h) => call('POST', p, b, h) };
}
const socketOf = (v) => new Promise((res, rej) => { const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: v.cookie(), 'x-forwarded-for': v.ip } }); s.on('connect', () => res(s)); s.on('connect_error', rej); });
const ask = (s, event, data) => new Promise((res) => { const t = setTimeout(() => res({ ok: false, error: 'keine Antwort' }), 3000); s.emit(event, data, (r) => { clearTimeout(t); res(r); }); });

test('Server: /me blendet abgeschaltete Spiele aus und meldet die Schalter; Tische dafür lassen sich nicht anlegen', async () => {
  const v = await visitor();
  const me = await (await v.get('/me')).json();
  const ids = me.games.map((g) => g.id);
  assert.ok(ids.includes('poker') && ids.includes('maumau'));
  assert.ok(!ids.includes('blackjack'), 'Blackjack ist ausgeschaltet');
  assert.ok(!me.singleplayerGames.some((g) => g.id === 'sudoku') && me.singleplayerGames.some((g) => g.id === '2048'), 'auch lokale Spiele lassen sich ausblenden');
  assert.deepEqual(me.features, { ranked: false, camera: false });
  const s = await socketOf(v);
  try {
    const off = await ask(s, 'create', { game: 'blackjack', name: 'Anna', avatar: '🦉' });
    assert.equal(off.ok, false); assert.match(off.error, /Blackjack ist gerade ausgeschaltet/);
    const ok = await ask(s, 'create', { game: 'maumau', name: 'Anna', avatar: '🦉' });
    assert.equal(ok.ok, true, ok.error);
    const switched = await ask(s, 'switchGame', { game: 'blackjack' });
    assert.equal(switched.ok, false); assert.match(switched.error, /ausgeschaltet/);
  } finally { s.close(); }
});

test('Admin: Schalter lesen, umlegen, zurücksetzen – wirkt sofort, steht im Protokoll, nur mit Admin-Anmeldung und Herkunftsschutz', async () => {
  const v = await visitor();
  assert.equal((await v.get('/admin/api/features')).status, 401);
  assert.equal((await v.post('/admin/api/features/camera', { value: true })).status, 401);
  assert.equal((await v.post('/admin/api/login', { password: 'Admin-Feat-2026' })).status, 200);
  const state = await (await v.get('/admin/api/features')).json();
  const flag = (name) => state.flags.find((f) => f.name === name);
  assert.deepEqual([flag('discord').value, flag('ranked').value, flag('camera').value], [true, false, false]);
  assert.equal(flag('ranked').source, 'env');
  assert.ok(state.games.length >= 90 && state.games.find((g) => g.id === 'blackjack').source === 'env' && state.games.some((g) => g.id === 'sudoku'));
  // CSRF und Eingaben
  assert.equal((await v.post('/admin/api/features/camera', { value: true }, { 'x-requested-with': '' })).status, 403);
  assert.equal((await v.post('/admin/api/features/camera', { value: 'ja' })).status, 400);
  assert.equal((await v.post('/admin/api/features/gibtsnicht', { value: true })).status, 404);
  assert.equal((await v.post('/admin/api/features/games/nixda', { value: false })).status, 404);
  // Spiel einschalten: sofort in /me und anlegbar
  const on = await (await v.post('/admin/api/features/games/blackjack', { value: true })).json();
  assert.equal(on.enabled, true); assert.equal(on.source, 'admin');
  const guest = await visitor();
  assert.ok((await (await guest.get('/me')).json()).games.some((g) => g.id === 'blackjack'));
  const s = await socketOf(guest);
  try { assert.equal((await ask(s, 'create', { game: 'blackjack', name: 'Ben', avatar: '🦊' })).ok, true); } finally { s.close(); }
  // Ranked und Kamera umlegen
  const cam = await (await v.post('/admin/api/features/camera', { value: true })).json();
  assert.equal(cam.value, true);
  assert.equal((await (await guest.get('/me')).json()).features.camera, true);
  assert.equal((await (await v.post('/admin/api/features/ranked', { value: true })).json()).value, true);
  // zurücksetzen → .env gilt wieder
  const reset = await (await v.post('/admin/api/features/ranked', { value: null })).json();
  assert.equal(reset.value, false); assert.equal(reset.source, 'env');
  assert.equal((await (await v.post('/admin/api/features/games/blackjack', { value: null })).json()).enabled, false);
  await v.post('/admin/api/features/camera', { value: null });
  // gespeichert, ohne Geheimnisse; Protokoll vorhanden
  const file = JSON.parse(readFileSync(join(DATA, 'features.json'), 'utf8'));
  assert.deepEqual(file, { version: 1, flags: {}, games: {} });
  const log = (await (await v.get('/admin/api/log')).json()).entries.map((e) => e.action + ' ' + (e.detail || ''));
  assert.ok(log.some((l) => /Spiel eingeschaltet.*blackjack/.test(l)) && log.some((l) => /Funktion ausgeschaltet|Funktion eingeschaltet/.test(l)) && log.some((l) => /Funktion zurückgesetzt.*ranked/.test(l)), log.join(' | '));
});

test('Server: abgeschaltetes Ranked → die Runde eines laufenden Tischs zeigt den Grund „aus“', async () => {
  const v = await visitor();
  const s = await socketOf(v);
  try {
    const state = new Promise((res) => s.on('state', (st) => { if (st.ranked) res(st); }));
    const r = await ask(s, 'create', { game: 'maumau', name: 'Cara', avatar: '🦉' });
    assert.equal(r.ok, true, r.error);
    const st = await Promise.race([state, new Promise((res) => setTimeout(() => res(null), 3000))]);
    assert.ok(st, 'Zustand mit Ranked-Anzeige empfangen');
    assert.equal(st.ranked.ranked, false); assert.equal(st.ranked.reason, 'aus');
  } finally { s.close(); }
});
