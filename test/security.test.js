// Sicherheit: Seitenpasswort, Cookie, Origin-Check und Rate-Limits.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createAuth } from '../server/security.js';
import { freePort } from './free-port.js';

const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
let server;

before(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'poker-sec-'));
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, SITE_PASSWORD: 'Flush2026', POKER_NO_DOTENV: '1' },
    stdio: 'pipe',
  });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
});
after(() => server.kill());

const get = (path, cookie) => fetch(URL + path, { redirect: 'manual', headers: cookie ? { cookie } : {} });
const login = (password, extra = {}) => fetch(URL + '/login', {
  method: 'POST', redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', ...extra },
  body: new URLSearchParams({ password, next: '/?t=ABCDE' }),
});
const connect = (opts) => new Promise((res) => {
  const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false, ...opts });
  s.on('connect', () => res({ ok: true, s }));
  s.on('connect_error', (e) => res({ ok: false, error: e.message, s }));
});

let cookie;

test('Ohne Passwort: Seite leitet zur Passwort-Seite, Dateien und API sind gesperrt', async () => {
  const r = await get('/?t=ABCDE');
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /^\/login\?next=/);
  assert.equal((await get('/core.js')).status, 401);
  assert.equal((await get('/index.html')).status, 401);
  assert.equal((await get('/me')).status, 401);
  // Login-Seite selbst und ihr Stylesheet sind erreichbar
  assert.equal((await get('/login')).status, 200);
  assert.equal((await get('/style.css')).status, 200);
});

test('Ohne Cookie keine Socket-Verbindung', async () => {
  const r = await connect();
  assert.equal(r.ok, false);
  r.s.close();
});

test('Falsches Passwort wird abgelehnt, richtiges setzt ein Cookie', async () => {
  const bad = await login('falsch');
  assert.equal(bad.status, 401);
  assert.match(await bad.text(), /stimmt nicht/);
  const ok = await login('Flush2026');
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('location'), '/?t=ABCDE', 'Nach dem Login zurück zum Einladungslink');
  const set = ok.headers.get('set-cookie');
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /Max-Age=15552000/);
  cookie = set.split(';')[0];
});

test('Mit Cookie: Seite, Dateien und Socket funktionieren, Cookie wird verlängert', async () => {
  const r = await get('/', cookie);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie') || '', /pa_auth=/);
  assert.equal((await get('/core.js', cookie)).status, 200);
  assert.equal((await get('/games/poker/poker.js', cookie)).status, 200);
  assert.equal((await get('/games/poker/poker.css')).status, 401, 'Spieldateien nur angemeldet');
  const c = await connect({ extraHeaders: { cookie } });
  assert.equal(c.ok, true);
  c.s.close();
});

test('Gefälschtes oder verändertes Cookie gilt nicht', async () => {
  const [name, value] = cookie.split('=');
  const [exp, sig] = decodeURIComponent(value).split('.');
  const longer = `${name}=${encodeURIComponent(`${Number(exp) + 1e10}.${sig}`)}`;
  assert.equal((await get('/me', longer)).status, 401);
  assert.equal((await get('/me', 'pa_auth=123.abc')).status, 401);
  const c = await connect({ extraHeaders: { cookie: longer } });
  assert.equal(c.ok, false);
  c.s.close();
});

test('Fremde Webseite darf keine Socket-Verbindung aufmachen', async () => {
  const c = await connect({ extraHeaders: { cookie, origin: 'https://boese-seite.example' } });
  assert.equal(c.ok, false);
  c.s.close();
});

test('Kein Open Redirect nach dem Login', async () => {
  const r = await fetch(URL + '/login', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: 'Flush2026', next: '//boese-seite.example' }),
  });
  assert.equal(r.headers.get('location'), '/');
});

test('Sicherheits-Header sind gesetzt, Bilder nur von der eigenen Seite', async () => {
  const r = await get('/login');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /img-src 'self' data:(;|$)/, 'keine fremden Bildquellen');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('Login-Seite hat ein Passwortfeld, /me meldet Modus und Spiele', async () => {
  const html = await (await get('/login?next=/?t=ABCDE')).text();
  assert.match(html, /type="password"/);
  assert.match(html, /name="next" value="\/\?t=ABCDE"/);
  const me = await (await get('/me', cookie)).json();
  assert.equal(me.mode, 'password');
  assert.deepEqual(me.games.map((g) => g.id), ['poker', 'maumau', 'farbenchaos', 'maexchen', 'schocken', 'huetchen', 'zehnetappen', 'stapelrennen', 'schwimmen', 'blackjack', 'kniffel', 'schiffe', 'viergewinnt', 'shutthebox', 'zehntausend', 'muehle', 'schaetzmeister', 'schlagfertig', 'werhatdasgesagt', 'mogeln', 'praesident', 'durak', 'omaha', 'wuerfelpoker', 'luegenwuerfel', 'chicago', 'reversi', 'dame', 'domino', 'zahlenzoo', 'gedaechtnis-kueche', 'pfeilfieber', 'sortierstation', 'tickendes-paket', 'werwolf', 'wer-bin-ich', 'kritzelpost', 'bildunterschrift', 'malen-raten', 'broeckelboden', 'kronenjagd', 'laser-huepfer', 'sechs-nimmt', 'monopoly-deal', 'monopoly', 'spiel-des-lebens', 'scotland-yard', 'hex', 'wuerfelduell', 'risiko-wuerfeln', 'story-chaos', 'zahlenreihe', 'wuerfeljagd', 'monsterwuerfel', 'wuerfel-auktion', 'backgammon', 'hearts', 'five-card-draw'], 'Spielauswahl für die Startseite');
  assert.ok(me.games[0].createFields.some((f) => f.key === 'bigBlind'));
  assert.equal('events' in me.games[0], false, 'keine Server-Interna');
});

test('Abmelden löscht das Cookie und führt zur Passwort-Seite', async () => {
  const r = await fetch(URL + '/logout', { method: 'POST', redirect: 'manual', headers: { cookie } });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/login');
  assert.match(r.headers.get('set-cookie'), /pa_auth=;.*Max-Age=0/);
});

test('Tisch-Codes raten wird gebremst', async () => {
  const c = await connect({ extraHeaders: { cookie } });
  const ask = (ev, d) => new Promise((r) => c.s.emit(ev, d, r));
  let last;
  for (let i = 0; i < 22; i++) last = await ask('join', { code: 'ZZZZ' + (i % 9), name: 'X' });
  assert.match(last.error, /Zu viele falsche Codes/);
  c.s.close();
});

test('Event-Flut wird abgewiesen, Server läuft weiter', async () => {
  const c = await connect({ extraHeaders: { cookie } });
  const replies = await Promise.all(Array.from({ length: 80 }, () => new Promise((r) => c.s.emit('stand', {}, r))));
  assert.ok(replies.some((r) => /zu viele Anfragen/.test(r.error)));
  // Kaputte Pakete bringen den Server nicht zum Absturz
  c.s.emit('react', null);
  c.s.emit('sit', null, () => {});
  c.s.close();
  assert.equal((await get('/health')).status, 200);
});

test('Passwort raten wird nach 8 Fehlversuchen gesperrt', async () => {
  const headers = {}; // gleiche IP wie die Tests oben (localhost)
  let r;
  for (let i = 0; i < 9; i++) r = await login('nope' + i, headers);
  assert.equal(r.status, 429);
  assert.ok(r.headers.get('retry-after'));
  // Auch das richtige Passwort hilft während der Sperre nicht
  assert.equal((await login('Flush2026')).status, 429);
});

test('Passwort ändern macht alte Cookies ungültig', () => {
  const a = createAuth({ password: 'alt', secret: 'geheim' });
  const b = createAuth({ password: 'neu', secret: 'geheim' });
  const token = a.issue();
  assert.equal(a.valid(token), true);
  assert.equal(b.valid(token), false);
  assert.equal(a.checkPassword('alt'), true);
  assert.equal(a.checkPassword('Alt'), false);
  assert.equal(a.checkPassword(undefined), false);
});

test('App fürs Handy: Manifest und Icons ohne Login, sonst nichts', async () => {
  const m = await get('/manifest.webmanifest');
  assert.equal(m.status, 200);
  assert.match(m.headers.get('content-type'), /manifest\+json/);
  const json = await m.json();
  assert.equal(json.name, 'Spieleabend');
  assert.equal(json.display, 'standalone');
  for (const icon of json.icons) {
    const r = await get(icon.src);
    assert.equal(r.status, 200, icon.src);
    assert.equal(r.headers.get('content-type'), 'image/png');
  }
  assert.equal((await get('/icons/apple-touch-icon.png')).status, 200);
  // Alles andere bleibt hinter dem Passwort
  assert.equal((await get('/sw.js')).status, 401);
  assert.equal((await get('/icons/../core.js')).status, 401);
});
