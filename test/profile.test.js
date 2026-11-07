// V2-04: Spielerprofile, Freigaben und Erfolge-Grundgerüst – Konto-Daten, Profilansicht, Schnittstelle, Datenschutz.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore, PRIVACY_DEFAULTS } from '../server/account-store.js';
import { createLeaderboard } from '../server/leaderboard.js';
import { createAchievements } from '../server/achievements.js';
import { createProfiles, normalizeGameId } from '../server/profile.js';
import { GAMES } from '../games/index.js';
import { freePort } from './free-port.js';

const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32), D = 'd'.repeat(32);
const tmp = (p = 'profile-') => mkdtempSync(join(tmpdir(), p));
const NOW = Date.now(), DAY = 24 * 3600 * 1000;
const player = (a, n, win, pts, place) => ({ a, n, bot: false, win, pts, place });
const round = (id, game, at, ranked, players, reason = '') => ({ id, game, variant: 'classic', at, ranked, reason, players });
const month = new Date(NOW).toISOString().slice(0, 7);
const stat = (played, wins) => ({ played, wins, points: 0, months: { [month]: { played, wins, points: 0 } } });
const account = (id, gameId, name, extra = {}) => ({ id, gameId, createdAt: NOW, lastSeen: NOW, name, avatar: '🦊', mergedInto: null, discord: null, ...extra });

function seed(dir) {
  writeFileSync(join(dir, 'accounts.json'), JSON.stringify({
    schemaVersion: 1,
    accounts: {
      [A]: account(A, '#AAAA', 'Anna', { discord: { name: 'AnnaDiscord', sync: true } }),                                     // registriert, Standardfreigaben
      [B]: account(B, '#BBBB', 'Ben'),                                                                                         // Gast ohne Discord
      [C]: account(C, '#CCCC', 'Cara', { discord: { name: 'CaraDiscord' }, privacy: { hidden: true } }),                      // registriert, versteckt
      [D]: account(D, '#DDDD', 'Dora', { discord: { name: 'DoraDiscord' }, privacy: { showDiscord: true, showStats: false, showFavorites: false, showRecent: false, showAchievements: false } }),
    },
    externals: { 'discord:1': A, 'discord:3': C, 'discord:4': D }, audit: [],
  }));
  writeFileSync(join(dir, 'leaderboard.json'), JSON.stringify({
    schemaVersion: 3,
    players: {
      [A]: { name: 'Anna', accountId: A, games: { maumau: stat(5, 3), schocken: stat(2, 0), hearts: stat(1, 1) } },
      [B]: { name: 'Ben', accountId: B, games: { maumau: stat(5, 1) } },
      [C]: { name: 'Cara', accountId: C, games: { maumau: stat(1, 0) } },
      [D]: { name: 'Dora', accountId: D, games: { maumau: stat(3, 3) } },
    },
    rounds: {
      '1000000000000001': round('1000000000000001', 'maumau', NOW - 3000, true, [player(A, 'Anna', true, 0, 1), player(D, 'Dora', false, 5, 2)]),
      '1000000000000002': round('1000000000000002', 'maumau', NOW - 2000, true, [player(D, 'Dora', true, 0, 1), player(A, 'Anna', false, 7, 2)]),
      '1000000000000003': round('1000000000000003', 'maumau', NOW - 1000, false, [player(A, 'Anna', true, 0, 1), player(B, 'Ben', false, 7, 2)], 'gast'),
    },
  }));
}

// ---------- Konto-Daten ----------
test('Freigaben: alte Konten ohne Feld bekommen sichere Standardwerte, nur bekannte Schalter und nur Wahrheitswerte', () => {
  const dir = tmp(); seed(dir);
  const accounts = createAccountStore(dir);
  assert.deepEqual(accounts.privacyOf(A), PRIVACY_DEFAULTS);
  assert.equal(PRIVACY_DEFAULTS.showDiscord, false, 'Discord-Name ist standardmäßig nicht sichtbar');
  assert.equal(accounts.privacyOf(D).showStats, false);
  assert.equal(accounts.privacyOf(D).showDiscord, true);
  accounts.setPrivacy(A, { showStats: false, showRecent: 'ja', unbekannt: true, hidden: 1 });
  assert.equal(accounts.privacyOf(A).showStats, false);
  assert.equal(accounts.privacyOf(A).showRecent, true, 'Nicht-Boolesches wird ignoriert');
  assert.equal(accounts.privacyOf(A).hidden, false);
  assert.ok(!('unbekannt' in accounts.privacyOf(A)));
  assert.equal(accounts.setPrivacy('f'.repeat(32), { hidden: true }), false);
  const fresh = createAccountStore(tmp()).ensure('e'.repeat(32));
  assert.deepEqual(fresh.privacy, PRIVACY_DEFAULTS);
});

test('Erfolge: erster Zeitpunkt wird einmal gespeichert, Zusammenführung behält den früheren', () => {
  const dir = tmp(); seed(dir);
  const accounts = createAccountStore(dir);
  assert.deepEqual(accounts.recordAchievements(A, ['debüt', 'erster-sieg', '<script>'], 1000), ['debüt', 'erster-sieg']);
  assert.deepEqual(accounts.recordAchievements(A, ['debüt', 'zehn-siege'], 2000), ['zehn-siege']);
  assert.deepEqual(accounts.achievementTimes(A), { 'debüt': 1000, 'erster-sieg': 1000, 'zehn-siege': 2000 });
  accounts.recordAchievements(B, ['debüt'], 500);
  accounts.merge(B, A);
  assert.equal(accounts.achievementTimes(A)['debüt'], 500);
  assert.equal(accounts.achievementTimes(A)['zehn-siege'], 2000);
  accounts.save();
  assert.equal(createAccountStore(dir).achievementTimes(A)['erster-sieg'], 1000, 'bleibt nach Neustart erhalten');
});

// ---------- Profilansicht ----------
function profilesFor(dir) {
  const accounts = createAccountStore(dir), leaderboard = createLeaderboard(dir), games = Object.values(GAMES);
  return { accounts, leaderboard, profiles: createProfiles({ accounts, leaderboard, achievements: createAchievements({ leaderboard, games }), games }) };
}
test('Profil: echte Zahlen aus Bestenliste und Rundenablage – Siegquote, Lieblingsspiele, letzte Partien, Erfolge', () => {
  const dir = tmp(); seed(dir);
  const { profiles } = profilesFor(dir);
  const p = profiles.publicByGameId('#AAAA');
  assert.equal(p.name, 'Anna'); assert.equal(p.gameId, '#AAAA'); assert.equal(p.avatar, '🦊'); assert.equal(p.self, false);
  assert.deepEqual(p.stats, { played: 8, wins: 4, winRate: 50, rankedPlayed: 2, rankedWins: 1 });
  assert.deepEqual(p.favorites.map((f) => [f.id, f.played, f.wins]), [['maumau', 5, 3], ['schocken', 2, 0], ['hearts', 1, 1]]);
  assert.equal(p.recent.length, 3); assert.equal(p.recent[0].game, 'maumau'); assert.equal(p.recent[0].ranked, false);
  assert.ok(p.recent[0].at >= p.recent[1].at, 'neueste zuerst');
  assert.deepEqual(p.recent.map((r) => r.place), [1, 2, 1]);
  assert.equal(p.recent[0].gameName, 'Mau-Mau');
  assert.equal(p.achievements.unlocked, 4);
  assert.ok(p.achievements.badges.some(b=>b.id==='erster-sieg') && p.achievements.badges.some(b=>b.id==='spiel-maumau-start'));
  assert.equal(p.discord, null, 'Discord-Name ist ohne Freigabe nicht dabei');
  assert.equal(p.privacy, undefined, 'fremde Sicht enthält keine Einstellungen');
});

test('Profil: nur freigegebene Felder, Gäste und versteckte Profile sind nicht öffentlich', () => {
  const dir = tmp(); seed(dir);
  const { profiles } = profilesFor(dir);
  const d = profiles.publicByGameId('#DDDD');
  assert.equal(d.discord.name, 'DoraDiscord');
  assert.equal(d.stats, null); assert.equal(d.favorites, null); assert.equal(d.recent, null); assert.equal(d.achievements, null);
  assert.deepEqual(d.shared, { discord: true, stats: false, favorites: false, recent: false, achievements: false });
  assert.equal(profiles.publicByGameId('#BBBB'), null, 'Gast: kein öffentliches globales Profil');
  assert.equal(profiles.publicByGameId('#CCCC'), null, 'versteckt');
  assert.equal(profiles.publicByGameId('#ZZZZ'), null, 'unbekannt');
  assert.equal(profiles.publicByGameId('<img>'), null);
  assert.equal(profiles.publicByGameId('#AAAAAAAAAAAAAAAA'), null);
  // Das eigene Profil sieht jeder, auch ein Gast oder ein verstecktes – mit allen Feldern und den Schaltern
  const own = profiles.publicByGameId('#BBBB', B);
  assert.equal(own.self, true); assert.equal(own.registered, false); assert.equal(own.stats.played, 5); assert.deepEqual(own.privacy, PRIVACY_DEFAULTS);
  assert.equal(profiles.publicByGameId('#CCCC', C).self, true);
  assert.equal(profiles.publicByGameId('#AAAA', B).self, false);
  assert.equal(profiles.own(D).stats.played, 3, 'eigene Sicht zeigt alles, auch Nicht-Freigegebenes');
});

test('Profil: Namenswechsel erhält den Fortschritt, Gerätezusammenführung zählt mit, keine internen IDs im JSON', () => {
  const dir = tmp(); seed(dir);
  const { profiles, accounts } = profilesFor(dir);
  const before = profiles.publicByGameId('#AAAA');
  accounts.touch(A, { name: 'Annabelle' });
  const after = profiles.publicByGameId('#AAAA');
  assert.equal(after.name, 'Annabelle'); assert.deepEqual(after.stats, before.stats); assert.deepEqual(after.favorites, before.favorites);
  const json = JSON.stringify([after, profiles.publicByGameId('#DDDD'), profiles.own(A)]);
  for (const secret of [A, B, C, D, 'discord:']) assert.ok(!json.includes(secret), `${secret.slice(0, 8)} in der Profilantwort`);
});

test('Game-ID-Eingabe wird normalisiert und streng geprüft', () => {
  assert.equal(normalizeGameId('k7q2'), '#K7Q2'); assert.equal(normalizeGameId('#K7Q2'), '#K7Q2');
  for (const bad of ['', '#', 'K7', '#K7Q2K7Q2', '#K0Q2', '#K7Q2<', '../etc', null, undefined, {}]) assert.equal(normalizeGameId(bad), null, String(bad));
});

// ---------- Mit dem Server ----------
let server, URL, dataDir;
before(async () => {
  dataDir = tmp('profile-server'); seed(dataDir);
  const port = await freePort(); URL = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '', CREATE_LIMIT: '500', SESSION_SECRET: 'test-secret-profile' }, stdio: 'pipe' });
  await new Promise((res, rej) => { server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); }); server.on('exit', (c) => rej(new Error('Server beendet: ' + c))); });
  server.removeAllListeners('exit');
});
after(() => server?.kill());
function browser() {
  const jar = {};
  const take = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } };
  const header = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  return {
    async get(path) { const res = await fetch(URL + path, { headers: { cookie: header() }, redirect: 'manual' }); take(res); return res; },
    async post(path, body = {}, extra = {}) { const res = await fetch(URL + path, { method: 'POST', headers: { cookie: header(), 'content-type': 'application/json', 'x-requested-with': 'spieleabend', ...extra }, body: JSON.stringify(body) }); take(res); return res; },
  };
}

test('Server: öffentliches Profil nur mit erlaubten Feldern; Gast, versteckt, unbekannt und ungültig sind nicht verfügbar', async () => {
  const b = browser(); await b.get('/');
  const res = await b.get('/api/profile/AAAA');
  assert.equal(res.status, 200); assert.match(res.headers.get('cache-control'), /no-store/);
  const p = await res.json();
  assert.equal(p.gameId, '#AAAA'); assert.equal(p.stats.played, 8); assert.equal(p.discord, null); assert.equal(p.self, false);
  assert.equal((await (await b.get('/api/profile/%23AAAA')).json()).name, 'Anna', '„#“ darf codiert ankommen');
  const dora = await (await b.get('/api/profile/DDDD')).json();
  assert.equal(dora.discord.name, 'DoraDiscord'); assert.equal(dora.stats, null);
  for (const id of ['BBBB', 'CCCC', 'ZZZZ', 'K0Q2', '%3Cscript%3E']) {
    const r = await b.get('/api/profile/' + id);
    assert.equal(r.status, 200, id);
    assert.deepEqual(await r.json(), { available: false, error: 'Dieses Profil ist nicht öffentlich.' }, 'dieselbe Antwort, egal ob es das Konto gibt');
  }
  const text = JSON.stringify([p, dora]);
  for (const secret of [A, B, C, D, 'discord:1']) assert.ok(!text.includes(secret));
});

test('Server: eigenes Profil, Freigaben ändern nur mit Herkunftsprüfung und gültigen Schaltern', async () => {
  const me = browser(); await me.get('/');
  const own = await (await me.get('/api/profile/me')).json();
  assert.equal(own.self, true); assert.equal(own.registered, false); assert.deepEqual(own.privacy, PRIVACY_DEFAULTS); assert.match(own.gameId, /^#[A-Z2-9]{4,6}$/);
  assert.equal((await (await me.get('/api/profile/' + own.gameId.slice(1))).json()).self, true, 'ein Gast sieht sein eigenes Profil');
  const stranger = browser(); await stranger.get('/');
  assert.equal((await (await stranger.get('/api/profile/' + own.gameId.slice(1))).json()).available, false, 'für andere ist das Gastprofil nicht öffentlich');
  assert.equal((await me.post('/api/profile/privacy', { showStats: false }, { 'x-requested-with': '' })).status, 403);
  assert.equal((await me.post('/api/profile/privacy', { showStats: false }, { origin: 'https://fremd.example' })).status, 403);
  const bad = [{}, { showStats: 'nein' }, { unbekannt: true }, [true], { showStats: false, evil: true }];
  for (const body of bad) assert.equal((await me.post('/api/profile/privacy', body)).status, 400, JSON.stringify(body));
  const ok = await me.post('/api/profile/privacy', { showStats: false, showDiscord: true });
  assert.equal(ok.status, 200);
  const after = await ok.json(); assert.equal(after.privacy.showStats, false); assert.equal(after.privacy.showDiscord, true);
  assert.equal((await (await me.get('/api/profile/me')).json()).privacy.showStats, false, 'bleibt gespeichert');
  assert.equal((await fetch(URL + '/api/profile/me')).status, 409, 'ohne Cookie gibt es kein eigenes Profil');
});

test('Server: Bestenliste und offene Tische liefern Game-IDs nur für öffentliche Profile', async () => {
  const b = browser(); await b.get('/');
  const ranked = await (await b.get('/api/ranked?game=maumau&period=all')).json();
  const byName = Object.fromEntries(ranked.rows.map((r) => [r.name, r]));
  assert.equal(byName.Anna.gameId, '#AAAA'); assert.equal(byName.Dora.gameId, '#DDDD');
  assert.ok(!JSON.stringify(ranked).includes(A) && !('owner' in ranked.rows[0]));
});

test('Server: Abfragen sind begrenzt (Rate-Limit je Adresse)', async () => {
  const b = browser(); await b.get('/');
  let limited = 0;
  for (let i = 0; i < 80; i++) { const r = await b.get('/api/profile/ZZZZ'); if (r.status === 429) { limited++; assert.ok(r.headers.get('retry-after')); } }
  assert.ok(limited > 0, 'nach 60 Abfragen pro Minute kommt 429');
});

test('Server: offene Tische nennen die Game-ID nur für registrierte, nicht versteckte Menschen', async () => {
  const { io } = await import('socket.io-client');
  const { createIdentity } = await import('../server/identity.js');
  const identity = createIdentity({ secret: 'test-secret-profile' });
  const connect = (accountId) => new Promise((resolve) => {
    const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: `pa_guest=${encodeURIComponent(identity.issue(accountId))}` } });
    s.ask = (ev, d = {}) => new Promise((r) => s.emit(ev, d, r));
    s.on('connect', () => resolve(s));
  });
  const sockets = [];
  try {
    for (const [id, name, game] of [[A, 'Anna', 'viergewinnt'], [B, 'Ben', 'reversi'], [C, 'Cara', 'dame']]) {
      const s = await connect(id); sockets.push(s);
      assert.ok((await s.ask('create', { game, name })).ok);
    }
    const watcher = await connect('e'.repeat(32)); sockets.push(watcher);
    const { tables } = await watcher.ask('lobby', {});
    const hosts = Object.fromEntries(tables.map((t) => [t.host.name, t]));
    assert.ok(hosts.Anna && hosts.Ben && hosts.Cara);
    // Die Gastgeber sitzen noch nicht; sie setzen sich hin, damit die Plätze in der Liste stehen
    for (const [s, n] of [[sockets[0], 'Anna'], [sockets[1], 'Ben'], [sockets[2], 'Cara']]) assert.ok((await s.ask('sit', {})).ok, n);
    await new Promise((r) => setTimeout(r, 1300));
    const again = (await watcher.ask('lobby', {})).tables, seat = (n) => again.flatMap((t) => t.seats).find((x) => x.name === n);
    assert.equal(seat('Anna').gameId, '#AAAA');
    assert.equal(seat('Ben').gameId, undefined, 'Gast ohne Discord: kein Link');
    assert.equal(seat('Cara').gameId, undefined, 'verstecktes Profil: kein Link');
  } finally { for (const s of sockets) s.close(); }
});
