// V2-09 Sicherheitsdurchgang: Antwort-Header (CSP, HSTS …), Cookie-Flags, Admin-Schutz, Eingabehärtung der Socket-Ereignisse.
// Läuft mit einem echten Server, ohne produktive Secrets (alle Passwörter sind Testwerte).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { GAMES, gameEvents } from '../games/index.js';
import { freePort } from './free-port.js';

const PORT = await freePort();
const BASE = `http://localhost:${PORT}`;
let server, siteCookie = '';

before(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'poker-secrev-'));
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, SITE_PASSWORD: 'Review2026', ADMIN_PASSWORD: 'Admin-Review-2026', TICKET_ADMIN_PASSWORD: 'Ticket-Review-2026', TRUST_PROXY: '1', CREATE_LIMIT: '200', POKER_NO_DOTENV: '1' },
    stdio: 'pipe',
  });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
  const r = await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '10.0.0.1' }, body: new URLSearchParams({ password: 'Review2026', next: '/' }) });
  siteCookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
});
after(() => server.kill());

const get = (path, { cookie = siteCookie, headers = {} } = {}) => fetch(BASE + path, { redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...headers } });
const setCookies = (r) => r.headers.getSetCookie?.() || [];

test('Antwort-Header: strenge CSP ohne eval und ohne Inline-Skripte, Framing/Sniffing/Referrer/Permissions gesperrt', async () => {
  for (const path of ['/login', '/health', '/style.css', '/']) {
    const r = await get(path, { cookie: path === '/' || path === '/style.css' ? siteCookie : '' });
    const csp = r.headers.get('content-security-policy') || '';
    assert.ok(csp, `${path}: CSP fehlt`);
    const script = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src')) || '';
    assert.equal(script, "script-src 'self'", `${path}: script-src muss „'self'“ sein`);
    for (const must of ["default-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'", "form-action 'self'", "frame-src 'none'"]) assert.ok(csp.includes(must), `${path}: ${must}`);
    assert.ok(!/unsafe-eval|\*\s*[;']|http:/.test(csp), `${path}: keine Joker, kein eval, kein http:`);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('referrer-policy'), 'same-origin');
    assert.match(r.headers.get('permissions-policy'), /camera=\(\)/);
    assert.equal(r.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(r.headers.get('cross-origin-opener-policy'), 'same-origin');
  }
});

test('HSTS und upgrade-insecure-requests nur über HTTPS (hinter dem Proxy), nie über reines HTTP', async () => {
  const plain = await get('/login', { cookie: '' });
  assert.equal(plain.headers.get('strict-transport-security'), null);
  assert.ok(!plain.headers.get('content-security-policy').includes('upgrade-insecure-requests'));
  const secure = await get('/login', { cookie: '', headers: { 'x-forwarded-proto': 'https' } });
  assert.match(secure.headers.get('strict-transport-security'), /max-age=31536000/);
  assert.ok(secure.headers.get('content-security-policy').includes('upgrade-insecure-requests'));
});

test('Cookie-Flags: Seitenpasswort-, Gast- und Admin-Cookie sind HttpOnly mit SameSite, Secure über HTTPS', async () => {
  const flags = (line) => line.split(';').map((s) => s.trim().toLowerCase());
  // Seitenpasswort
  const body = new URLSearchParams({ password: 'Review2026', next: '/' });
  const http = await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '10.0.0.2' }, body });
  const https = await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '10.0.0.3', 'x-forwarded-proto': 'https' }, body });
  const a = flags(setCookies(http).find((c) => c.startsWith('pa_auth=')));
  const b = flags(setCookies(https).find((c) => c.startsWith('pa_auth=')));
  for (const f of [a, b]) { assert.ok(f.includes('httponly')); assert.ok(f.includes('samesite=lax')); assert.ok(f.includes('path=/')); assert.ok(f.some((x) => x.startsWith('max-age='))); }
  assert.ok(!a.includes('secure') && b.includes('secure'));
  // Gast-Cookie (kommt mit der ersten Seitenabfrage)
  const guest = await get('/', { headers: { 'x-forwarded-proto': 'https', accept: 'text/html' } });
  const g = setCookies(guest).map(flags).find((f) => f[0].startsWith('pa_guest='));
  assert.ok(g, 'Gast-Cookie wird ausgegeben');
  assert.ok(g.includes('httponly') && g.includes('secure') && g.includes('samesite=lax') && g.includes('path=/'));
  // Admin-Cookie: SameSite=Strict, nur unter /admin
  const login = await fetch(BASE + '/admin/api/login', { method: 'POST', headers: { cookie: siteCookie, 'content-type': 'application/json', 'x-requested-with': 'spieleabend', origin: BASE, 'x-forwarded-proto': 'https' }, body: JSON.stringify({ password: 'Admin-Review-2026' }) });
  assert.equal(login.status, 200);
  const adminCookie = flags(setCookies(login).find((c) => c.startsWith('pa_admin') || c.includes('admin')));
  assert.ok(adminCookie.includes('httponly') && adminCookie.includes('samesite=strict') && adminCookie.includes('path=/admin') && adminCookie.includes('secure'));
});

test('Admin-Schutz: ohne Seitenpasswort keine Seite, ohne Admin-Anmeldung keine Daten und keine Aktion – für jede Admin-Schnittstelle', async () => {
  const noSite = await get('/admin', { cookie: '' });
  assert.ok([301, 302, 401, 403].includes(noSite.status), `ohne Seitenpasswort: ${noSite.status}`);
  assert.equal(noSite.headers.get('x-robots-tag')?.includes('noindex') || noSite.status !== 200, true);
  // Alle Admin-Routen aus dem Quelltext: ohne Admin-Cookie müssen sie ablehnen
  const source = readFileSync(new URL('../server/admin.js', import.meta.url), 'utf8');
  const routes = [...source.matchAll(/api\.(get|post|patch|delete)\('([^']+)'/g)].map((m) => [m[1].toUpperCase(), m[2]]).filter(([, p]) => p !== '/login' && p !== '/logout');
  assert.ok(routes.length >= 15, `zu wenige Admin-Routen gefunden (${routes.length})`);
  for (const [method, path] of routes) {
    const url = '/admin/api' + path.replace(':code', 'ABCDE').replace(':id', '1').replace(':comment', '1');
    const r = await fetch(BASE + url, { method, headers: { cookie: siteCookie, 'content-type': 'application/json', 'x-requested-with': 'spieleabend', origin: BASE }, body: method === 'GET' || method === 'DELETE' ? undefined : '{}' });
    assert.ok(r.status === 401 || r.status === 403, `${method} ${url}: erwartet 401/403, bekam ${r.status}`);
    const text = await r.text();
    assert.ok(!/password|secret|token/i.test(text.replace(/Passwort|Admin-Passwort/g, '')) || r.status === 401, `${method} ${url}: Antwort ohne Geheimnisse`);
  }
  // CSRF: ändernde Anfragen ohne Marker oder von fremder Herkunft werden abgelehnt
  const noMarker = await fetch(BASE + '/admin/api/update', { method: 'POST', headers: { cookie: siteCookie, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noMarker.status, 403);
  const foreign = await fetch(BASE + '/admin/api/update', { method: 'POST', headers: { cookie: siteCookie, 'content-type': 'application/json', 'x-requested-with': 'spieleabend', origin: 'https://evil.example' }, body: '{}' });
  assert.equal(foreign.status, 403);
});

const connect = () => new Promise((res, rej) => {
  const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: { cookie: siteCookie } });
  s.on('connect', () => res(s)); s.on('connect_error', rej);
});
const ask = (s, event, data) => new Promise((res) => { const t = setTimeout(() => res({ ok: false, error: 'keine Antwort' }), 400); s.emit(event, data, (r) => { clearTimeout(t); res(r); }); });

test('Socket-Ereignisse: falsche Datentypen in Nutzdaten liefern nur „Ungültige Eingabe“ oder Spielregel-Fehler – nie Programmtext – und der Server bleibt stabil', async () => {
  const JUNK = [undefined, null, 0, -1, 1e999, 'x', '', 'a'.repeat(5000), [], [1, 2, 3], {}, { cards: 5, card: {}, cell: 'x', n: [], col: null, text: { a: 1 }, id: [], target: {}, amount: 'viel', value: () => 1 }, { __proto__: { polluted: true } }, JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}')];
  const INTERNAL = /Cannot read|is not a function|is not iterable|undefined|\bat \w+|node_modules|\.js:\d+|ReferenceError|TypeError|RangeError|is not defined|Invalid (array|string) length/;
  const s = await connect();
  const created = await ask(s, 'create', { game: 'maumau', name: 'Anna', avatar: '🦊' });
  assert.ok(created.ok, JSON.stringify(created));
  const source = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  const core = [...source.matchAll(/\bon\('([a-zA-Z]+)'/g)].map((m) => m[1]);
  const events = [...new Set([...core, ...gameEvents()])].filter((e) => !['create', 'join', 'leave', 'closeTable', 'disconnect'].includes(e));
  assert.ok(events.length > 40, `zu wenige Ereignisse gefunden (${events.length})`);
  const bad = [];
  // Pro Verbindung höchstens 40 Nachrichten am Stück (Event-Flut-Schutz): nach je 34 Nachrichten eine frische Verbindung für denselben Platz
  const work = events.flatMap((event) => JUNK.map((junk) => [event, junk]));
  let current = null, used = 99;
  for (const [event, junk] of work) {
    if (used >= 34) {
      current?.close(); current = await connect();
      const back = await ask(current, 'join', { code: created.code, token: created.token });
      assert.ok(back.ok, 'Wiedereinstieg: ' + JSON.stringify(back)); used = 1;
    }
    used++;
    const reply = await ask(current, event, junk);
    if (reply && reply.ok === false && typeof reply.error === 'string' && INTERNAL.test(reply.error) && !/zu viele Anfragen/.test(reply.error)) bad.push(`${event}: ${reply.error}`);
    if (!reply || typeof reply.ok !== 'boolean') bad.push(`${event}: Antwort ohne ok-Feld`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} Ereignisse verraten Interna oder antworten nicht`);
  current?.close(); s.close();
  assert.equal((await get('/health')).status, 200, 'Server läuft weiter');
});

test('Raum-Ereignisse aller Spiele: Müll-Eingaben werfen nur Fehler (keine Endlosschleifen, keine Prototyp-Verschmutzung)', () => {
  const JUNK = [undefined, null, 0, 'x', [], {}, { cards: 5, card: {}, cell: 'x', n: [], col: null, text: { a: 1 }, id: [], target: {}, amount: 'viel', cards2: [{}] }, JSON.parse('{"__proto__":{"polluted":true}}')];
  for (const game of Object.values(GAMES)) {
    const r = game.create('FUZZ1', { turnTime: 0 }, () => {});
    r.game = game.id;
    const p = r.addPlayer('Anna', null); r.hostId = p.id;
    try { r.table ? r.sit(p.id, 0) : r.sit(p.id); } catch { /* manche Tische brauchen mehr */ }
    for (const [name, handler] of Object.entries(game.events || {})) for (const junk of JUNK) {
      const t0 = performance.now();
      try { handler(r, p, junk && typeof junk === 'object' && !Array.isArray(junk) ? junk : {}); }
      catch (error) { assert.ok(error instanceof Error, `${game.id}.${name}: wirft ${typeof error}`); }
      assert.ok(performance.now() - t0 < 500, `${game.id}.${name}: dauert zu lange (${Math.round(performance.now() - t0)} ms)`);
    }
    assert.equal({}.polluted, undefined, `${game.id}: Prototyp verschmutzt`);
    r.dispose?.();
  }
});

test('Allgemeines API-Limit: Dauerabfragen einer Adresse werden mit 429 und Retry-After gebremst, andere Adressen bleiben unberührt', async () => {
  const ip = '10.9.9.9';
  let blocked = null;
  for (let i = 0; i < 1000 && !blocked; i++) { const r = await get('/api/whats-new', { headers: { 'x-forwarded-for': ip } }); if (r.status === 429) blocked = r; }
  assert.ok(blocked, 'nach spätestens 1000 Anfragen kommt 429');
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
  const other = await get('/api/whats-new', { headers: { 'x-forwarded-for': '10.8.8.8' } });
  assert.equal(other.status, 200);
});

test('Gast-Konten werden nicht unbegrenzt angelegt: zu viele Seitenaufrufe ohne Cookie von einer Adresse → 429', async () => {
  const ip = '10.7.7.7';
  let blocked = null;
  for (let i = 0; i < 80 && !blocked; i++) { const r = await get('/', { headers: { 'x-forwarded-for': ip, accept: 'text/html' } }); if (r.status === 429) blocked = r; }
  assert.ok(blocked, 'nach spätestens 80 Aufrufen kommt 429');
  const withCookie = (await get('/', { headers: { 'x-forwarded-for': ip, accept: 'text/html' } }));
  assert.ok([200, 429].includes(withCookie.status));
});

// ---- Datenschutz: die Seite ist erreichbar, zweisprachig und stimmt mit den Zahlen im Code überein ----
test('Datenschutzseite: erreichbar (DE/EN), nennt Cookies, Speicherfristen und Löschwege – und die Zahlen stimmen mit dem Code überein', async () => {
  const r = await get('/datenschutz');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /data-for="de"/); assert.match(html, /data-for="en"/);
  for (const must of ['pa_auth', 'pa_guest', 'pa_discord', 'pa_oauth', 'pa_admin', 'localStorage', 'Meine Daten', 'My data', 'IP-Adressen werden', 'IP addresses are']) assert.ok(html.includes(must), `Seite nennt „${must}“`);
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const num = (text, re, label) => { const m = text.match(re); assert.ok(m, `${label} im Code nicht gefunden`); return Number(m[1].replace(/\./g, '')); };
  const fmt = (n) => n.toLocaleString('de-DE');
  assert.ok(html.includes(fmt(num(read('../server/leaderboard.js'), /MAX_ROUNDS = ([\d_]+)/, 'MAX_ROUNDS').valueOf())) || html.includes('50.000'), 'Rundenanzahl');
  assert.equal(num(read('../server/leaderboard.js'), /MAX_ROUNDS = (\d+)/, 'MAX_ROUNDS'), 50000);
  assert.ok(html.includes(`nach ${num(read('../server/index.js'), /ROOM_TTL_MIN = (\d+)/, 'ROOM_TTL_MIN')} Minuten`), 'Tisch-Frist');
  assert.ok(html.includes(`${num(read('../server/security.js'), /COOKIE_DAYS = (\d+)/, 'COOKIE_DAYS')} Tage`), 'Cookie pa_auth');
  assert.ok(html.includes(`${num(read('../server/identity.js'), /GUEST_DAYS = (\d+)/, 'GUEST_DAYS')} Tage`), 'Cookie pa_guest');
  const d = read('../server/auth-discord.js');
  assert.ok(html.includes(`${num(d, /SESSION_DAYS = (\d+)/, 'SESSION_DAYS')} Tage`) && html.includes(`${num(d, /IDLE_DAYS = (\d+)/, 'IDLE_DAYS')} Tagen`), 'Discord-Sitzung');
  assert.ok(html.includes(`letzten ${num(read('../server/ops.js'), /LOG_MAX = (\d+)/, 'LOG_MAX')} Einträge`), 'Admin-Protokoll');
  // IP-Adressen werden wirklich nirgends in Datendateien geschrieben: alle Zugriffe auf clientIp() dienen nur den Limits
  for (const f of ['../server/account-store.js', '../server/leaderboard.js', '../server/tickets.js', '../server/evening-plans.js', '../server/evening-reviews.js', '../server/ops.js']) assert.ok(!/clientIp|remoteAddress|x-forwarded-for/i.test(read(f)), `${f} greift nicht auf IP-Adressen zu`);
  // Verlinkung aus den Einstellungen
  assert.match(read('../public/settings.js'), /href="\/datenschutz"/);
});
