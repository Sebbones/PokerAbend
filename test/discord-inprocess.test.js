// Discord-Anmeldung im selben Prozess (gegen den Discord-Nachbau, ohne echtes Discord und ohne echte Secrets).
// Ergänzt test/discord.test.js: Dort läuft der Server als Kindprozess; diese Datei importiert ihn, damit die Abdeckungsmessung
// server/auth-discord.js wirklich sieht (beendete Kindprozesse liefern unter Windows keine Messdaten).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fakeDiscord, GUILD, CLIENT, SECRET } from './discord-fake.js';

const PASSWORD = 'gruppe-passwort';
const DATA = mkdtempSync(join(tmpdir(), 'discord-inproc-'));
writeFileSync(join(DATA, 'leaderboard.json'), JSON.stringify({ players: { oma: { name: 'Oma', games: { maumau: { played: 6, wins: 5, points: 0, months: {} } } } } }));
let fake, http, URL_;

before(async () => {
  fake = await fakeDiscord();
  for (const [id, name] of [['100000000000000001', 'Mitglied Eins'], ['100000000000000002', 'Mitglied Zwei'], ['100000000000000003', 'Fremder'], ['100000000000000004', 'Nummer Vier']]) fake.user(id, name);
  for (const id of ['100000000000000001', '100000000000000002', '100000000000000004']) fake.members.add(id);
  Object.assign(process.env, {
    POKER_NO_DOTENV: '1', PORT: '0', DATA_DIR: DATA, SITE_PASSWORD: PASSWORD, ADMIN_PASSWORD: 'adminpw', CREATE_LIMIT: '500',
    DISCORD_CLIENT_ID: CLIENT, DISCORD_CLIENT_SECRET: SECRET, DISCORD_GUILD_ID: GUILD, DISCORD_API_BASE: fake.base + '/api', DISCORD_AUTHORIZE_URL: fake.base + '/oauth2/authorize',
    DISCORD_RECHECK_MIN: '0.02', DISCORD_RATE_MAX: '1000',
  });
  const port = (await import('./free-port.js').then((m) => m.freePort()));
  process.env.PORT = String(port); process.env.PUBLIC_URL = `http://localhost:${port}`;
  ({ http } = await import('../server/index.js'));
  if (!http.listening) await new Promise((r) => http.once('listening', r));
  URL_ = `http://localhost:${http.address().port}`;
});
after(() => { fake?.server.close(); http?.closeAllConnections?.(); http?.close(); setTimeout(() => process.exit(0), 50).unref(); });

function browser() {
  const jar = {};
  const take = (res) => { for (const c of res.headers.getSetCookie()) { const [kv, ...attrs] = c.split(';'); const i = kv.indexOf('='), name = kv.slice(0, i), value = decodeURIComponent(kv.slice(i + 1)); if (value && !attrs.some((a) => /max-age=0/i.test(a))) jar[name] = value; else delete jar[name]; } };
  const header = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  const b = {
    jar, header,
    async get(path) { const res = await fetch(URL_ + path, { headers: { cookie: header() }, redirect: 'manual' }); take(res); return res; },
    async post(path, body = {}, extra = {}) { const res = await fetch(URL_ + path, { method: 'POST', headers: { cookie: header(), 'content-type': 'application/json', 'x-requested-with': 'spieleabend', ...extra }, body: JSON.stringify(body), redirect: 'manual' }); take(res); return res; },
    async password() { const res = await fetch(URL_ + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: header() }, body: new URLSearchParams({ password: PASSWORD }) }); take(res); assert.equal(res.status, 303); await b.get('/'); return b; },
    inside: async () => (await b.get('/')).status === 200,
    async discord({ user, path = '/auth/discord/login?next=%2Fspiel', approve = true } = {}) {
      const start = await b.get(path);
      assert.equal(start.status, 303, 'Weiterleitung zu Discord');
      const back = fake.authorize(start.headers.get('location'), { user, approve });
      return b.get(back.pathname + back.search + (back.hash || ''));
    },
  };
  return b;
}
const identityOf = async (b) => (await b.get('/api/identity')).json();
const MEMBER = '100000000000000001', MEMBER2 = '100000000000000002', STRANGER = '100000000000000003', FOUR = '100000000000000004';

test('Mitglied: Login ohne Gruppenpasswort, Ziel bleibt erhalten, Sitzungs-Cookie HttpOnly, Status und Namensvorschlag', async () => {
  const b = browser();
  assert.match(await (await b.get('/login')).text(), /Mit Discord anmelden/);
  assert.ok(!(await b.inside()));
  const start = await b.get('/auth/discord/login?next=%2F%3Ftisch%3DABCD');
  const location = new URL(start.headers.get('location'));
  assert.equal(location.searchParams.get('scope'), 'identify guilds.members.read');
  assert.match(location.searchParams.get('state'), /^[\w-]{20,}$/);
  assert.ok(location.searchParams.get('code_challenge'), 'PKCE');
  const back = fake.authorize(start.headers.get('location'), { user: MEMBER });
  const done = await b.get(back.pathname + back.search);
  assert.equal(done.status, 303); assert.equal(done.headers.get('location'), '/?tisch=ABCD');
  const session = done.headers.getSetCookie().find((c) => c.startsWith('pa_discord='));
  assert.match(session, /HttpOnly/); assert.match(session, /SameSite=Lax/);
  assert.ok(!b.jar.pa_auth, 'Discord stellt nie das Passwort-Cookie aus');
  assert.ok(await b.inside());
  const status = await (await b.get('/auth/discord/status')).json();
  assert.equal(status.linked, true); assert.equal(status.name, 'Mitglied Eins'); assert.equal(status.adopt, 'Mitglied Eins');
  assert.equal((await b.post('/auth/discord/profile', { ack: true })).status, 200);
  assert.equal((await (await b.get('/auth/discord/status')).json()).adopt, '');
  assert.match((await identityOf(b)).gameId, /^#/);
});

test('Nicht-Mitglied, Abbruch, gefälschter, wiederverwendeter und fremder state, abgelaufener Code: kein Zugang', async () => {
  const outsider = browser();
  const r = await outsider.discord({ user: STRANGER });
  assert.match(r.headers.get('location'), /^\/login\?discord=nomember/);
  assert.ok(!outsider.jar.pa_discord && !(await outsider.inside()));
  assert.match(await (await outsider.get('/login?discord=nomember')).text(), /nicht Mitglied/);
  assert.match((await browser().discord({ user: MEMBER, approve: false })).headers.get('location'), /discord=denied/);
  const b = browser();
  assert.match((await b.get('/auth/discord/callback?code=CODE-x&state=erfunden')).headers.get('location'), /discord=state/);
  assert.match((await b.get('/auth/discord/callback')).headers.get('location'), /discord=/);
  const start = await b.get('/auth/discord/login'), back = fake.authorize(start.headers.get('location'), { user: MEMBER });
  const url = back.pathname + back.search, saved = b.jar.pa_oauth;
  assert.equal((await b.get(url)).status, 303); assert.ok(await b.inside());
  const replay = browser(); if (saved) replay.jar.pa_oauth = saved;
  assert.match((await replay.get(url)).headers.get('location'), /discord=state/, 'wiederverwendeter state');
  const attacker = browser(), victim = browser();
  const atkBack = fake.authorize((await attacker.get('/auth/discord/login')).headers.get('location'), { user: MEMBER });
  assert.match((await victim.get(atkBack.pathname + atkBack.search)).headers.get('location'), /discord=state/);
  assert.ok(!(await victim.inside()));
  fake.expireCodes = true;
  try { assert.match((await browser().discord({ user: MEMBER })).headers.get('location'), /discord=expired/); } finally { fake.expireCodes = false; }
});

test('Verknüpfen, Konto per Discord wiederfinden, Trennen; Zusammenführen nur nach Bestätigung und mit Schutz vor Fremdseiten', async () => {
  const b = await browser().password();
  const before_ = await identityOf(b);
  assert.match((await b.discord({ user: MEMBER2, path: '/auth/discord/link' })).headers.get('location'), /discord=linked/);
  assert.equal((await (await b.get('/auth/discord/status')).json()).linked, true);
  const fresh = browser();
  await fresh.discord({ user: MEMBER2 });
  assert.equal((await identityOf(fresh)).gameId, before_.gameId, 'per Discord wieder dasselbe Konto');
  assert.equal((await fresh.post('/auth/discord/unlink')).status, 200);
  assert.ok(!(await fresh.inside())); assert.ok(await b.inside());
  // Zusammenführen
  const main = await browser().password(), other = await browser().password();
  await main.discord({ user: FOUR, path: '/auth/discord/link' });
  assert.equal((await other.post('/api/identity/claim', { name: 'Oma' })).status, 200);
  const mainId = (await identityOf(main)).gameId, otherId = (await identityOf(other)).gameId;
  assert.notEqual(mainId, otherId);
  assert.match((await other.discord({ user: FOUR, path: '/auth/discord/link' })).headers.get('location'), /discord=conflict/);
  assert.equal((await (await other.post('/auth/discord/merge', { confirm: false })).json()).merged, false);
  assert.equal((await other.post('/auth/discord/merge', { confirm: true })).status, 409, 'die Rückfrage ist verbraucht');
  await other.discord({ user: FOUR, path: '/auth/discord/link' });
  assert.equal((await other.post('/auth/discord/merge', { confirm: true }, { 'x-requested-with': 'fremd' })).status, 403);
  assert.equal((await (await other.post('/auth/discord/merge', { confirm: true })).json()).merged, true);
  assert.equal((await identityOf(other)).gameId, mainId);
});

test('Abmelden: einzeln, überall, Rotation und widerrufene Tokens; Discord-Nutzer sind nie Admin', async () => {
  const one = browser(), two = browser();
  await one.discord({ user: MEMBER }); await two.discord({ user: MEMBER });
  assert.notEqual(one.jar.pa_discord, two.jar.pa_discord);
  const first = one.jar.pa_discord;
  assert.equal((await one.get('/admin/api/status')).status, 401);
  assert.notEqual((await one.post('/api/tickets/admin/login', { password: 'egal' })).status, 200);
  await one.discord({ user: MEMBER });
  assert.notEqual(one.jar.pa_discord, first);
  const stale = browser(); stale.jar.pa_discord = first;
  assert.ok(!(await stale.inside()), 'altes Token nach der Rotation wertlos');
  assert.equal((await one.post('/auth/discord/logout', {}, { 'x-requested-with': 'x' })).status, 403);
  assert.equal((await fetch(URL_ + '/auth/discord/logout', { method: 'POST', headers: { cookie: one.header(), origin: 'https://boese.example', 'x-requested-with': 'spieleabend' } })).status, 403);
  assert.ok(await two.inside());
  assert.equal((await one.post('/auth/discord/logout-all')).status, 200);
  assert.ok(!(await one.inside())); assert.ok(!(await two.inside()));
  const three = browser(); await three.discord({ user: MEMBER }); const token = three.jar.pa_discord;
  assert.equal((await three.post('/auth/discord/logout')).status, 200);
  const reuse = browser(); reuse.jar.pa_discord = token;
  assert.ok(!(await reuse.inside()));
});

test('Mitgliedschaft wird neu geprüft: Austritt entzieht den Discord-Zugang, Ausfall von Discord sperrt niemanden aus', async () => {
  const both = await browser().password();
  await both.discord({ user: MEMBER2 });
  const only = browser(); await only.discord({ user: MEMBER2 });
  assert.ok(await only.inside());
  fake.down = true;
  try { await new Promise((r) => setTimeout(r, 1300)); for (let i = 0; i < 2; i++) { assert.ok(await only.inside(), 'Ausfall sperrt nicht aus'); await new Promise((r) => setTimeout(r, 250)); } } finally { fake.down = false; }
  fake.members.delete(MEMBER2);
  const end = Date.now() + 8000; let out = false;
  while (Date.now() < end && !out) { out = !(await only.inside()); if (!out) await new Promise((r) => setTimeout(r, 150)); }
  assert.ok(out, 'nach dem Austritt kein Zugang mehr');
  assert.ok(await both.inside(), 'das Gruppenpasswort bleibt davon unberührt');
  fake.members.add(MEMBER2);
});

test('Sitzungsdatei: Token nur als Hash, Provider-Tokens und Secret nie im Klartext', async () => {
  const b = browser(); await b.discord({ user: MEMBER });
  await new Promise((r) => setTimeout(r, 800));
  const file = readFileSync(join(DATA, 'discord-sessions.json'), 'utf8');
  assert.ok(!file.includes(b.jar.pa_discord));
  assert.ok(!/RT-[0-9a-f]{12}|AT-[0-9a-f]{12}/.test(file));
  assert.ok(!file.includes(SECRET));
});
