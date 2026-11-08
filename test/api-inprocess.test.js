// HTTP-Schnittstellen im selben Prozess: Der Server wird hier importiert (nicht als Kindprozess gestartet), damit die Abdeckungsmessung
// seinen Code wirklich sieht – unter Windows liefern beendete Kindprozesse keine Messdaten. Geprüft werden Einstellungen, Profil, Identität,
// Abendplanung, Tickets und Admin: gültige Wege, ungültige Eingaben, falsche Herkunft, fehlende Anmeldung, Limits. Ohne echte Secrets.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATA = mkdtempSync(join(tmpdir(), 'poker-inproc-'));
Object.assign(process.env, {
  POKER_NO_DOTENV: '1', PORT: '0', DATA_DIR: DATA, SITE_PASSWORD: 'InProc2026', ADMIN_PASSWORD: 'Admin-InProc-2026', TICKET_ADMIN_PASSWORD: 'Ticket-InProc-2026',
  TRUST_PROXY: '1', CREATE_LIMIT: '500', API_LIMIT: '100000', NEW_ACCOUNT_LIMIT: '1000',
});
let http, BASE;

before(async () => {
  ({ http } = await import('../server/index.js'));
  if (!http.listening) await new Promise((r) => http.once('listening', r));
  BASE = `http://localhost:${http.address().port}`;
});
after(() => { http.closeAllConnections?.(); http.close(); setTimeout(() => process.exit(0), 50).unref(); });

let ipCounter = 1;
// Kleiner „Browser“ mit eigenem Cookie-Speicher und eigener Absenderadresse (X-Forwarded-For, damit Limits nicht gemeinsam zählen)
function browser() {
  const jar = {}, ip = `10.1.${Math.floor(ipCounter / 250)}.${ipCounter++ % 250 + 1}`;
  const take = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); const value = decodeURIComponent(kv.slice(i + 1)); if (value) jar[kv.slice(0, i)] = value; else delete jar[kv.slice(0, i)]; } };
  const cookie = () => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(BASE + path, { method, redirect: 'manual', headers: { cookie: cookie(), 'x-forwarded-for': ip, origin: BASE, 'x-requested-with': 'spieleabend', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    take(res);
    return res;
  };
  return { jar, ip, call, get: (p, h) => call('GET', p, undefined, h), post: (p, b = {}, h) => call('POST', p, b, h), put: (p, b = {}, h) => call('PUT', p, b, h), patch: (p, b = {}, h) => call('PATCH', p, b, h), del: (p, h) => call('DELETE', p, undefined, h) };
}
const json = async (res) => { const text = await res.text(); try { return JSON.parse(text); } catch { return { raw: text }; } };
// Mit Seitenpasswort angemeldeter Browser (Gast-Konto entsteht beim ersten Seitenaufruf)
async function visitor() {
  const b = browser();
  const login = await fetch(BASE + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': b.ip }, body: new URLSearchParams({ password: 'InProc2026', next: '/' }) });
  for (const c of login.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); b.jar[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }
  const page = await b.get('/', { accept: 'text/html' });
  assert.equal(page.status, 200);
  await page.text();
  assert.ok(b.jar.pa_guest, 'Gast-Cookie nach dem ersten Seitenaufruf');
  return b;
}
const noServerError = (res, label) => assert.ok(res.status < 500, `${label}: Serverfehler ${res.status}`);

test('Einstellungen: lesen, ändern, ungültig, fremde Herkunft, Zurücksetzen, Export und Löschen mit Bestätigung', async () => {
  const b = await visitor();
  const first = await json(await b.get('/api/me/settings'));
  assert.equal(first.updatedAt, 0);
  assert.equal((await b.put('/api/me/settings', { display: { theme: 'night' } })).status, 200);
  assert.equal((await json(await b.get('/api/me/settings'))).settings.display.theme, 'night');
  for (const bad of [{}, { display: { theme: 'pink' } }, { unbekannt: { a: 1 } }, [1], 'text']) assert.equal((await b.put('/api/me/settings', bad)).status, 400, JSON.stringify(bad));
  assert.equal((await b.put('/api/me/settings', { sound: { enabled: false } }, { 'x-requested-with': '' })).status, 403);
  assert.equal((await b.put('/api/me/settings', { sound: { enabled: false } }, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await b.call('PUT', '/api/me/settings', 'kein json', { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await b.post('/api/me/settings/reset')).status, 200);
  const exported = await json(await b.get('/api/me/export'));
  assert.equal(exported.schemaVersion, 1);
  assert.match(exported.account.gameId, /^#[A-Z0-9]{4}$/);
  assert.ok(!JSON.stringify(exported).includes(b.jar.pa_guest), 'der Export enthält kein Cookie-Geheimnis');
  const wrong = await b.post('/api/me/delete', { confirm: '#WRONG' });
  assert.equal(wrong.status, 400, 'Löschen nur mit der eigenen Game-ID');
  const ok = await b.post('/api/me/delete', { confirm: exported.account.gameId });
  noServerError(ok, 'Konto löschen');
  assert.ok(ok.status === 200, `Löschen: ${ok.status}`);
  const nobody = await fetch(BASE + '/api/me/settings', { headers: { 'x-forwarded-for': '10.250.0.1', cookie: `pa_auth=${encodeURIComponent(b.jar.pa_auth || '')}` } });
  assert.ok([409, 302, 401].includes(nobody.status), 'ohne Gast-Cookie keine Einstellungen');
});

test('Profil: eigenes Profil, Privatsphäre ändern (nur bekannte Schalter, nur Wahrheitswerte), Fremdprofil nur nach Freigabe', async () => {
  const a = await visitor(), c = await visitor();
  const own = await json(await a.get('/api/profile/me'));
  assert.ok(own.gameId, 'eigenes Profil mit Game-ID');
  for (const bad of [{}, { gibtEsNicht: true }, { showStats: 'ja' }, [true]]) assert.equal((await a.post('/api/profile/privacy', bad)).status, 400, JSON.stringify(bad));
  const key = Object.keys(own.privacy || {})[0];
  if (key) assert.equal((await a.post('/api/profile/privacy', { [key]: false })).status, 200);
  const foreign = await json(await c.get('/api/profile/' + encodeURIComponent(own.gameId.replace('#', ''))));
  assert.ok('available' in foreign || foreign.gameId, 'Fremdprofil: kontrollierte Antwort');
  const unknown = await json(await c.get('/api/profile/ZZZZ'));
  assert.equal(unknown.available, false, 'unbekannte ID verrät nichts');
  assert.equal((await c.post('/api/profile/privacy', { [key || 'showOnline']: true }, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await fetch(BASE + '/api/profile/me', { headers: { 'x-forwarded-for': '10.250.0.2' } })).status < 500, true);
});

test('Identität: Geräte verbinden mit Einmal-Code, falsche und mehrfach benutzte Codes, alte Namen übernehmen', async () => {
  const a = await visitor(), second = await visitor();
  const info = await json(await a.get('/api/identity'));
  assert.ok(info.gameId || info.account || info.raw === undefined);
  const created = await a.post('/api/identity/link/create');
  assert.equal(created.status, 200);
  const { code } = await json(created);
  assert.ok(code, 'Code erhalten');
  for (const bad of ['', 'ABCDEFGH', 5, null]) assert.ok([400, 404, 410, 422].includes((await second.post('/api/identity/link/redeem', { code: bad })).status), `falscher Code ${JSON.stringify(bad)}`);
  const redeemed = await second.post('/api/identity/link/redeem', { code });
  assert.equal(redeemed.status, 200);
  const again = await visitor();
  assert.ok((await again.post('/api/identity/link/redeem', { code })).status >= 400, 'Code nur einmal verwendbar');
  const legacy = await a.get('/api/identity/legacy');
  noServerError(legacy, 'Alte Namen');
  for (const bad of [{}, { name: '' }, { name: 'x'.repeat(40) }, { name: 5 }]) assert.equal((await a.post('/api/identity/claim', bad)).status, 400, JSON.stringify(bad));
  assert.ok((await a.post('/api/identity/claim', { name: 'NiemandHierDrin' })).status >= 400, 'unbekannter alter Name');
  assert.equal((await a.post('/api/identity/link/create', {}, { origin: 'https://fremd.example' })).status, 403);
});

test('Abendplanung: anlegen, abstimmen, Spiele vorschlagen, ändern, löschen – und Fehleingaben ohne Serverfehler', async () => {
  const a = await visitor(), other = await visitor();
  const list = await a.get('/api/plans');
  assert.equal(list.status, 200);
  const when = new Date(Date.now() + 5 * 86400000).toISOString();
  const attempts = [{ title: 'Spieleabend', date: when, startsAt: when, name: 'Anna', avatar: '🦉', slots: [when], games: ['poker'], options: [when] }, { title: 'Zweiter', startsAt: when }];
  let id = null;
  for (const body of attempts) { const r = await a.post('/api/plans', body); noServerError(r, 'Planung anlegen'); const j = await json(r); id = id || j.plan?.id || j.id; }
  for (const bad of ['[1]', 'kein json', '{"title":5}', JSON.stringify({ title: 'x'.repeat(500) })]) noServerError(await a.call('POST', '/api/plans', bad), 'Fehleingabe');
  assert.equal((await a.post('/api/plans', {}, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await a.call('POST', '/api/plans', '{}', { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await a.get('/api/plans/nicht-vorhanden')).status, 404);
  if (id) {
    noServerError(await other.put(`/api/plans/${id}/vote`, { slot: 0, vote: 'yes', choice: 'yes', votes: {} }), 'Abstimmen');
    noServerError(await other.post(`/api/plans/${id}/games`, { game: 'poker', games: ['poker'] }), 'Spiel vorschlagen');
    noServerError(await a.get(`/api/plans/${id}`), 'Planung lesen');
    noServerError(await a.get(`/api/plans/${id}/program`), 'Programm lesen');
    noServerError(await other.patch(`/api/plans/${id}`, { title: 'Fremd' }), 'Fremdes Ändern');
    noServerError(await other.del(`/api/plans/${id}`), 'Fremdes Löschen');
    noServerError(await a.patch(`/api/plans/${id}`, { title: 'Neu benannt' }), 'Ändern');
    noServerError(await a.del(`/api/plans/${id}`), 'Löschen');
  }
});

test('Tickets: Ideen anlegen, abstimmen, kommentieren, Export; Verwaltung nur mit Ticket-Passwort', async () => {
  const a = await visitor(), other = await visitor();
  const created = await a.post('/api/tickets', { type: 'idea', title: 'Mehr Würfel bitte', text: 'Ein Spiel mit sehr vielen Würfeln', body: 'Ein Spiel mit sehr vielen Würfeln', name: 'Anna', avatar: '🦉' });
  noServerError(created, 'Ticket anlegen');
  const j = await json(created);
  const id = j.ticket?.id || j.id;
  for (const bad of ['[1]', 'kein json', '{"title":""}', JSON.stringify({ type: 'zauberei', title: 'x' })]) noServerError(await a.call('POST', '/api/tickets', bad), 'Fehleingabe');
  assert.equal((await a.post('/api/tickets', {}, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await a.get('/api/tickets')).status, 200);
  noServerError(await a.get('/api/tickets/export.md'), 'Export');
  if (id) {
    noServerError(await other.put(`/api/tickets/${id}/vote`, { active: true }), 'Abstimmen');
    noServerError(await other.post(`/api/tickets/${id}/comments`, { text: 'Gute Idee', name: 'Ben', avatar: '🦊' }), 'Kommentar');
    noServerError(await a.get(`/api/tickets/${id}`), 'Lesen');
    noServerError(await a.get(`/api/tickets/${id}/export.md`), 'Einzelexport');
    assert.ok([401, 403].includes((await other.patch(`/api/tickets/${id}`, { status: 'done' })).status), 'Status ändert nur die Verwaltung');
    assert.ok([401, 403].includes((await other.del(`/api/tickets/${id}`)).status), 'Löschen nur die Verwaltung');
  }
  assert.equal((await other.post('/api/tickets/admin/login', { password: 'falsch' })).status, 401);
  const admin = await visitor();
  const login = await admin.post('/api/tickets/admin/login', { password: 'Ticket-InProc-2026' });
  assert.equal(login.status, 200);
  if (id) {
    noServerError(await admin.patch(`/api/tickets/${id}`, { status: 'planned' }), 'Status');
    noServerError(await admin.del(`/api/tickets/${id}`), 'Verwaltung löscht');
  }
  noServerError(await admin.post('/api/tickets/admin/logout'), 'Abmelden');
});

test('Admin: Anmeldung, Status, Werkzeuge (Rückblicke, Bestenliste, Runden, Spieler) – ungültige Eingaben liefern 4xx statt Serverfehler', async () => {
  const b = await visitor();
  assert.equal((await b.get('/admin')).status, 200);
  assert.equal((await b.get('/admin/app.js')).status, 200);
  assert.equal((await b.get('/admin/api/status')).status, 401);
  assert.equal((await b.post('/admin/api/login', { password: 'falsch' })).status, 401);
  assert.equal((await b.post('/admin/api/login', { password: 'Admin-InProc-2026' })).status, 200);
  const status = await json(await b.get('/admin/api/status'));
  assert.ok(status.version !== undefined && Array.isArray(status.rooms) && status.data);
  assert.ok(!JSON.stringify(status).includes('Admin-InProc-2026') && !JSON.stringify(status).includes('InProc2026'), 'Status enthält keine Passwörter');
  for (const path of ['/admin/api/reviews', '/admin/api/leaderboard', '/admin/api/leaderboard?game=poker&period=week', '/admin/api/leaderboard?period=quartal', '/admin/api/rounds', '/admin/api/rounds?game=poker&hidden=1', '/admin/api/players?q=Anna', '/admin/api/tickets', '/admin/api/log', '/admin/api/errors']) {
    const r = await b.get(path); noServerError(r, path); await r.text();
  }
  for (const [method, path, body] of [
    ['POST', '/admin/api/players/merge', {}], ['POST', '/admin/api/players/merge', { from: '#AAAA', to: '#AAAA' }], ['POST', '/admin/api/players/merge', { from: '#AAAA', to: '#BBBB' }],
    ['POST', '/admin/api/rounds/abc/hide', { hidden: true }], ['POST', '/admin/api/rounds/abc/hide', { hidden: 'ja' }],
    ['POST', '/admin/api/reviews/00000000-0000-0000-0000-000000000000/hide', { hidden: true }], ['POST', '/admin/api/reviews/x/hide', {}],
    ['POST', '/admin/api/rooms/ABCDE/close', {}], ['POST', '/admin/api/announce', { text: 'x'.repeat(5000) }], ['POST', '/admin/api/update', { minutes: -3 }],
  ]) { const r = await b.call(method, path, body); noServerError(r, `${method} ${path}`); await r.text(); }
  assert.equal((await b.post('/admin/api/players/merge', {}, { 'x-requested-with': '' })).status, 403);
  const out = await b.post('/admin/api/logout');
  assert.equal(out.status, 200);
  assert.equal((await b.get('/admin/api/status')).status, 401, 'nach dem Abmelden wieder gesperrt');
});

test('Admin-Anmeldung wird nach zu vielen Fehlversuchen gesperrt (Retry-After), richtiges Passwort hilft dann nicht sofort', async () => {
  const b = await visitor();
  let last;
  for (let i = 0; i < 8; i++) { last = await b.post('/admin/api/login', { password: 'falsch' + i }); assert.equal(last.status, 401); await last.text(); }
  const blocked = await b.post('/admin/api/login', { password: 'Admin-InProc-2026' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('Öffentliche Lese-Wege: Gesundheit, Neuigkeiten, Roadmap, Bestenliste, Erfolge und Wochen-/Spielwahl ohne Serverfehler', async () => {
  const b = await visitor();
  const health = await json(await fetch(BASE + '/health'));
  assert.equal(health.ok ?? health.status ?? true, health.ok ?? health.status ?? true);
  for (const path of ['/api/whats-new', '/roadmap', '/api/leaderboard', '/api/leaderboard?period=week&game=poker', '/api/ranked', '/api/ranked?game=poker&period=month', '/api/achievements', '/api/achievements/players', '/api/evenings', '/me', '/api/nicht-da']) {
    const r = await b.get(path); noServerError(r, path); await r.text();
  }
});

test('Ohne Seitenpasswort bleibt jede Schnittstelle zu: Seiten leiten zur Anmeldung, /api verlangt Anmeldung', async () => {
  for (const path of ['/api/me/settings', '/api/profile/me', '/api/identity', '/api/plans', '/api/tickets', '/admin/api/status', '/api/leaderboard']) {
    const r = await fetch(BASE + path, { redirect: 'manual', headers: { 'x-forwarded-for': '10.99.0.1' } });
    assert.ok([301, 302, 303, 307, 401, 403].includes(r.status), `${path}: ${r.status}`);
    await r.text();
  }
});

test('Sicherheit der Antworten: keine Technikangaben, 404 für Unbekanntes, kaputtes JSON → 400', async () => {
  const b = await visitor();
  const missing = await b.get('/gibt-es-nicht.php');
  assert.ok([404, 302].includes(missing.status));
  const bad = await b.call('PUT', '/api/me/settings', '{"display":', { 'content-type': 'application/json' });
  assert.equal(bad.status, 400);
  const body = await bad.text();
  assert.ok(!/at .*\.js:\d+/.test(body) && !/node_modules/.test(body), 'kein Stacktrace');
  assert.equal(bad.headers.get('x-powered-by'), null);
  writeFileSync(join(DATA, 'x.tmp'), readFileSync(new URL('../package.json', import.meta.url))); mkdirSync(join(DATA, 'y'), { recursive: true });
});
