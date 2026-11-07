// V2-05/V2-15: Einstellungen am Konto, Datenschutz-Durchsetzung, Export und Löschen mit Anonymisierung.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createAccountStore } from '../server/account-store.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { SETTINGS_DEFAULTS, sanitizeSettings, mergeSettings, patchProblem, isDefault, CATEGORIES, BLOCKS } from '../server/settings.js';
import { createIdentity } from '../server/identity.js';
import { freePort } from './free-port.js';

const A = 'a'.repeat(32), B = 'b'.repeat(32), D = 'd'.repeat(32);
const NOW = Date.now();
const tmp = (p = 'settings-') => mkdtempSync(join(tmpdir(), p));
const player = (a, n, win, pts, place) => ({ a, n, bot: false, win, pts, place });
const account = (id, gameId, name, extra = {}) => ({ id, gameId, createdAt: NOW, lastSeen: NOW, name, avatar: '🦊', mergedInto: null, discord: null, ...extra });
const month = new Date(NOW).toISOString().slice(0, 7);
const stat = (played, wins) => ({ played, wins, points: 0, months: { [month]: { played, wins, points: 0 } } });
function seed(dir) {
  writeFileSync(join(dir, 'accounts.json'), JSON.stringify({
    schemaVersion: 1,
    accounts: { [A]: account(A, '#AAAA', 'Anna', { discord: { name: 'AnnaDiscord' } }), [B]: account(B, '#BBBB', 'Ben', { discord: { name: 'BenDiscord' } }), [D]: account(D, '#DDDD', 'Dora') },
    externals: { 'discord:1': A, 'discord:2': B }, audit: [],
  }));
  writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify({
    schemaVersion: 3,
    players: { [A]: { name: 'Anna', accountId: A, games: { maumau: stat(5, 3) } }, [B]: { name: 'Ben', accountId: B, games: { maumau: stat(5, 2) } }, alt: { name: 'AltAnna', claimKind: 'legacy', claimedBy: A, games: { schocken: stat(2, 1) } } },
    rounds: {
      '1000000000000001': { id: '1000000000000001', game: 'maumau', variant: 'classic', at: NOW - 3000, ranked: true, reason: '', players: [player(A, 'Anna', true, 0, 1), player(B, 'Ben', false, 5, 2)] },
      '1000000000000002': { id: '1000000000000002', game: 'maumau', variant: 'classic', at: NOW - 2000, ranked: true, reason: '', players: [player(B, 'Ben', true, 0, 1), player(A, 'Anna', false, 7, 2)] },
    },
  }));
}

// ---------- Schema ----------
test('Einstellungen: Standardwerte, Bereinigung und Zusammenführung kennen nur gültige Felder', () => {
  assert.deepEqual(sanitizeSettings(undefined), SETTINGS_DEFAULTS); assert.deepEqual(sanitizeSettings('x'), SETTINGS_DEFAULTS); assert.deepEqual(sanitizeSettings([]), SETTINGS_DEFAULTS);
  assert.ok(isDefault({}));
  const dirty = sanitizeSettings({ display: { theme: 'night', cardSize: 'riesig', calm: 'ja', language: 'en', evil: 1 }, hub: { hiddenCategories: ['brett', 'brett', 'unbekannt'], hiddenBlocks: ['tickets'], defaultFilter: 'p34' }, extra: {}, sound: { enabled: false } });
  assert.equal(dirty.display.theme, 'night'); assert.equal(dirty.display.cardSize, 'normal'); assert.equal(dirty.display.calm, false); assert.equal(dirty.display.language, 'en');
  assert.deepEqual(dirty.hub.hiddenCategories, [], 'ein ungültiger Eintrag verwirft die ganze Liste'); assert.deepEqual(dirty.hub.hiddenBlocks, ['tickets']);
  assert.equal(dirty.hub.defaultFilter, 'p34'); assert.equal(dirty.sound.enabled, false); assert.ok(!('evil' in dirty.display) && !('extra' in dirty));
  const merged = mergeSettings(dirty, { hub: { hiddenCategories: ['brett', 'brett', 'party'] }, display: { theme: 'classic' } });
  assert.deepEqual(merged.hub.hiddenCategories, ['brett', 'party'], 'Doppelte entfallen'); assert.equal(merged.display.theme, 'classic'); assert.equal(merged.display.language, 'en', 'ungenannte Felder bleiben');
  assert.deepEqual(SETTINGS_DEFAULTS.hub.hiddenCategories, [], 'die Standardwerte werden nie verändert');
  assert.ok(Object.isFrozen(SETTINGS_DEFAULTS));
});
test('Einstellungen: Schnittstellen-Patch lehnt Unbekanntes und Ungültiges ab statt es zu ignorieren', () => {
  assert.equal(patchProblem({ display: { theme: 'night' } }), '');
  assert.equal(patchProblem({ hub: { hiddenCategories: CATEGORIES, hiddenBlocks: BLOCKS } }), '');
  for (const bad of [null, [], {}, 'x', { display: {} }, { nope: { a: 1 } }, { display: { nope: true } }, { display: { theme: 'pink' } }, { controls: { doubleTap: 'ja' } }, { hub: { hiddenCategories: ['x'] } }, { hub: { hiddenBlocks: 'tickets' } }, { sound: [] }]) assert.notEqual(patchProblem(bad), '', JSON.stringify(bad));
  assert.ok(patchProblem({ hub: { hiddenCategories: Array(50).fill('brett') } }) !== '', 'Obergrenze für Listen');
});

// ---------- Konto ----------
test('Konto: Einstellungen bleiben, werden zurückgesetzt und folgen dem Ziel bei Gerätezusammenführung', () => {
  const dir = tmp(); seed(dir);
  const accounts = createAccountStore(dir, { now: () => 5000 });
  assert.deepEqual(accounts.settingsOf(A), { settings: SETTINGS_DEFAULTS, updatedAt: 0 });
  assert.equal(accounts.setSettings(A, { display: { theme: 'night' }, hub: { hiddenCategories: ['brett'] } }).updatedAt, 5000);
  assert.equal(accounts.settingsOf(A).settings.hub.hiddenCategories[0], 'brett');
  accounts.save(); assert.equal(createAccountStore(dir).settingsOf(A).settings.display.theme, 'night', 'bleibt nach Neustart');
  accounts.setSettings(B, { sound: { enabled: false } });
  accounts.merge(B, A);
  assert.equal(accounts.settingsOf(B).settings.display.theme, 'night', 'das Ziel behält seine Einstellungen');
  const solo = createAccountStore(tmp()); const x = solo.ensure('e'.repeat(32)), y = solo.ensure('f'.repeat(32));
  solo.setSettings(y.id, { display: { cardSize: 'xl' } }); solo.merge(y.id, x.id);
  assert.equal(solo.settingsOf(x.id).settings.display.cardSize, 'xl', 'ohne eigene Einstellungen übernimmt das Ziel die des zweiten Geräts');
  accounts.resetSettings(A); assert.deepEqual(accounts.settingsOf(A), { settings: SETTINGS_DEFAULTS, updatedAt: 0 });
  assert.equal(accounts.privacyOf(A).showOnline, true, 'Online-Status ist standardmäßig sichtbar');
});
test('Konto: Löschen entfernt Konto, verbundene Geräte und Verknüpfungen und gibt die IDs für die Anonymisierung zurück', () => {
  const dir = tmp(); seed(dir);
  const accounts = createAccountStore(dir);
  accounts.merge(D, A);
  accounts.setSettings(A, { sound: { enabled: false } }); accounts.recordAchievements(A, ['debüt']);
  const removed = accounts.deleteAccount(A).sort();
  assert.deepEqual(removed, [A, D].sort());
  for (const id of removed) { assert.equal(accounts.has(id), false); assert.equal(accounts.get(id), null); }
  assert.equal(accounts.byGameId('#AAAA'), null); assert.equal(accounts.findExternal('discord', '1'), null);
  assert.equal(accounts.isRegistered(B), true, 'andere Konten bleiben unberührt');
  accounts.save();
  const json = readFileSync(join(dir, 'accounts.json'), 'utf8');
  for (const gone of [A, D, 'Anna', 'AnnaDiscord', '#AAAA']) assert.ok(!json.includes(gone), `${gone} steht noch in accounts.json`);
  assert.deepEqual(accounts.deleteAccount('9'.repeat(32)), []);
});
test('Bestenliste: Löschen anonymisiert Runden, andere Ergebnisse bleiben, alte Namensstatistik des Kontos verschwindet', () => {
  const dir = tmp(); seed(dir);
  const lb = createLeaderboard(dir);
  const before = lb.rankedTable('maumau', 'all').find((r) => r.name === 'Ben');
  const out = lb.forgetAccounts([A]);
  assert.equal(out.anonymized, 2); assert.equal(out.removedPlayers, 2, 'Konto-Eintrag und übernommener alter Name');
  const table = lb.rankedTable('maumau', 'all');
  assert.deepEqual(table.map((r) => r.name), ['Ben'], 'Anna taucht nicht mehr auf');
  assert.deepEqual(table[0], before, 'Bens Zahlen bleiben genau gleich');
  assert.equal(lb.round('1000000000000001').players[0].n, 'Gelöschtes Konto'); assert.equal(lb.round('1000000000000001').players[0].a, null);
  assert.equal(lb.round('1000000000000001').players[0].win, true, 'der Ausgang der Runde bleibt für Ben nachvollziehbar');
  assert.equal(lb.accountRounds(A, 10).length, 0); assert.deepEqual(lb.names('anna'), []);
  lb.save(); const json = readFileSync(join(dir, 'leaderboard.json'), 'utf8');
  assert.ok(!json.includes('Anna') && !json.includes(A) && !json.includes('AltAnna'));
  assert.deepEqual(lb.forgetAccounts(['kein-id']), { removedPlayers: 0, anonymized: 0 });
});

// ---------- Mit dem Server ----------
let server, URL, dataDir;
const SECRET = 'test-secret-settings';
before(async () => {
  dataDir = tmp('settings-server'); seed(dataDir);
  const port = await freePort(); URL = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500', SESSION_SECRET: SECRET }, stdio: 'pipe' });
  await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); }); server.on('exit', (c) => rej(new Error('Server beendet: ' + c))); });
  server.removeAllListeners('exit');
});
after(() => server?.kill());
const identity = createIdentity({ secret: SECRET });
function browser(accountId) {
  const jar = accountId ? { pa_guest: identity.issue(accountId) } : {};
  const take = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); const name = kv.slice(0, i); if (/Max-Age=0/i.test(c)) delete jar[name]; else jar[name] = decodeURIComponent(kv.slice(i + 1)); } };
  const header = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  const b = {
    jar, header,
    async get(path) { const res = await fetch(URL + path, { headers: { cookie: header() }, redirect: 'manual' }); take(res); return res; },
    async send(method, path, body = {}, extra = {}) { const res = await fetch(URL + path, { method, headers: { cookie: header(), 'content-type': 'application/json', 'x-requested-with': 'spieleabend', ...extra }, body: JSON.stringify(body) }); take(res); return res; },
    post: (path, body, extra) => b.send('POST', path, body, extra), put: (path, body, extra) => b.send('PUT', path, body, extra),
  };
  return b;
}
const visit = async (id) => { const b = browser(id); await b.get('/'); return b; };

test('Server: Einstellungen lesen, schreiben, zurücksetzen – validiert, mit Herkunftsprüfung und ohne Cookie nicht erreichbar', async () => {
  const b = await visit();
  const first = await (await b.get('/api/me/settings')).json();
  assert.deepEqual(first.settings, SETTINGS_DEFAULTS); assert.equal(first.updatedAt, 0); assert.equal(first.registered, false); assert.equal(first.privacy.showOnline, true);
  assert.equal((await b.put('/api/me/settings', { display: { theme: 'night' }, hub: { hiddenCategories: ['brett'], hiddenBlocks: ['roadmap'] } })).status, 200);
  const saved = await (await b.get('/api/me/settings')).json();
  assert.equal(saved.settings.display.theme, 'night'); assert.deepEqual(saved.settings.hub.hiddenCategories, ['brett']); assert.ok(saved.updatedAt > 0);
  for (const bad of [{}, { display: { theme: 'pink' } }, { unbekannt: { a: 1 } }, { hub: { hiddenCategories: ['xyz'] } }, [1]]) assert.equal((await b.put('/api/me/settings', bad)).status, 400, JSON.stringify(bad));
  assert.equal((await b.put('/api/me/settings', { sound: { enabled: false } }, { 'x-requested-with': '' })).status, 403);
  assert.equal((await b.put('/api/me/settings', { sound: { enabled: false } }, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await fetch(URL + '/api/me/settings')).status, 409, 'ohne Cookie gibt es keine Einstellungen');
  assert.equal((await (await b.post('/api/me/settings/reset')).json()).updatedAt, 0);
  assert.deepEqual((await (await b.get('/api/me/settings')).json()).settings, SETTINGS_DEFAULTS);
  assert.equal((await b.get('/api/profile/me')).status, 200, 'das Zurücksetzen berührt die Privatsphäre nicht');
});

test('Server: Einstellungen gelten auf allen per Code verbundenen Geräten', async () => {
  const phone = await visit(), laptop = await visit();
  await phone.put('/api/me/settings', { display: { cardSize: 'xl' }, controls: { doubleTap: false } });
  const code = (await (await phone.post('/api/identity/link/create')).json()).code;
  assert.equal((await laptop.post('/api/identity/link/redeem', { code })).status, 200);
  const there = await (await laptop.get('/api/me/settings')).json();
  assert.equal(there.settings.display.cardSize, 'xl'); assert.equal(there.settings.controls.doubleTap, false);
});

test('Server: „Online zeigen“ ist eine Freigabe des Kontos und gilt serverseitig, auch wenn der Browser sichtbar meldet', async () => {
  const sockets = [];
  const connect = (id) => new Promise((resolve) => { const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: `pa_guest=${encodeURIComponent(identity.issue(id))}` } }); s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r)); s.on('connect', () => resolve(s)); sockets.push(s); });
  try {
    const anna = await connect(A), ben = await connect(B), watcher = await connect('e'.repeat(32));
    const online = async () => (await watcher.ask('lobby', {})).presence.online.map((p) => p.name);
    assert.equal((await anna.ask('presence', { name: 'Anna', avatar: '🦊', visible: true, active: true })).accepted, true);
    assert.equal((await ben.ask('presence', { name: 'Ben', avatar: '🦊', visible: true, active: true })).accepted, true);
    await new Promise((r) => setTimeout(r, 2300));
    assert.deepEqual((await online()).sort(), ['Anna', 'Ben']);
    const annaBrowser = browser(A);
    assert.equal((await annaBrowser.post('/api/profile/privacy', { showOnline: false })).status, 200);
    await anna.ask('presence', { name: 'Anna', avatar: '🦊', visible: true, active: true }); // der Browser behauptet „sichtbar“
    await new Promise((r) => setTimeout(r, 2300));
    assert.deepEqual(await online(), ['Ben'], 'Anna bleibt verborgen');
    assert.equal((await annaBrowser.post('/api/profile/privacy', { showOnline: true })).status, 200);
    await anna.ask('presence', { name: 'Anna', avatar: '🦊', visible: true, active: true });
    await new Promise((r) => setTimeout(r, 2300));
    assert.deepEqual((await online()).sort(), ['Anna', 'Ben']);
  } finally { for (const s of sockets) s.close(); }
});

test('Server: Export enthält alle eigenen Daten, aber keine Namen oder Konten von Mitspielern', async () => {
  const b = browser(A);
  const res = await b.get('/api/me/export');
  assert.equal(res.status, 200); assert.match(res.headers.get('content-disposition'), /attachment; filename="spieleabend-daten-AAAA\.json"/);
  const data = await res.json(), text = JSON.stringify(data);
  assert.equal(data.schemaVersion, 1); assert.equal(data.account.gameId, '#AAAA'); assert.equal(data.account.name, 'Anna'); assert.equal(data.account.discord.name, 'AnnaDiscord');
  assert.ok(data.settings && data.privacy && data.statistics.games.length >= 1 && data.statistics.ranked.played === 2);
  assert.equal(data.rounds.length, 2); assert.deepEqual(data.rounds.map((r) => r.players), [2, 2]); assert.deepEqual(data.claimedLegacyNames, ['AltAnna']);
  for (const other of [B, 'Ben', 'BenDiscord', '#BBBB']) assert.ok(!text.includes(other), `${other} im Export`);
  assert.ok(!text.includes(A), 'die interne Konto-ID steht nicht im Export');
  assert.equal((await fetch(URL + '/api/me/export')).status, 409);
});

test('Server: Löschen braucht die Game-ID, räumt auf, anonymisiert Runden und verwirft das Cookie', async () => {
  const b = browser(A);
  assert.equal((await b.post('/api/me/delete', {})).status, 400);
  assert.equal((await b.post('/api/me/delete', { confirm: '#BBBB' })).status, 400, 'fremde Game-ID genügt nicht');
  assert.equal((await b.post('/api/me/delete', { confirm: 'x' }, { 'x-requested-with': '' })).status, 403);
  const ok = await b.post('/api/me/delete', { confirm: 'aaaa' });
  assert.equal(ok.status, 200); assert.match(ok.headers.getSetCookie().join(';'), /pa_guest=;.*Max-Age=0/);
  assert.equal(b.jar.pa_guest, undefined, 'das Gast-Cookie ist weg');
  const ben = browser(B), ranked = await (await ben.get('/api/ranked?game=maumau&period=all')).json();
  assert.deepEqual(ranked.rows.map((r) => r.name), ['Ben'], 'Bens gewertete Ergebnisse bleiben, Anna ist anonymisiert');
  assert.equal(ranked.rows[0].played, 2);
  assert.deepEqual(await (await ben.get('/api/profile/AAAA')).json(), { available: false, error: 'Dieses Profil ist nicht öffentlich.' });
  const again = await visit(), fresh = await (await again.get('/api/profile/me')).json();
  assert.notEqual(fresh.gameId, '#AAAA'); assert.equal(fresh.stats.played, 0, 'ein neuer Besuch beginnt leer');
  // Nach einem Neustart steht nichts mehr von Anna in den Dateien
  await new Promise((r) => setTimeout(r, 1500));
  const files = ['accounts.json', 'leaderboard.json'].map((f) => { try { return readFileSync(join(dataDir, f), 'utf8'); } catch { return ''; } }).join('');
  for (const gone of ['AnnaDiscord', '#AAAA', 'AltAnna']) assert.ok(!files.includes(gone), `${gone} steht noch in den Daten`);
});
