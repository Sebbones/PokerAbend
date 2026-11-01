// Betrieb & Wartung: Update-Ankündigung, sauberes Beenden, Admin-Seite, Browser-Fehler, Version.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { maintenance, assertNewRoundAllowed, UPDATE_BLOCKED } from '../server/maintenance.js';
import { versionInfo, cleanClientError, createClientErrors, createAdminLog } from '../server/ops.js';
import { whatsNew, resolvedRoadmap } from '../games/roadmap.js';
import { GAMES } from '../games/index.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, ms = 5000) {
  for (let waited = 0; waited < ms; waited += 25) { if (await check()) return; await wait(25); }
  throw new Error('Zustand kommt nicht an');
}

// ---------- Bausteine ohne Server ----------
test('Update-Ankündigung: prüft Minuten, zählt herunter und sperrt neue Runden bis zur Rücknahme', () => {
  maintenance.cancel();
  assert.doesNotThrow(() => assertNewRoundAllowed());
  for (const bad of [0, -3, 181, NaN, 'abc', null, undefined]) assert.throws(() => maintenance.announce(bad), /Minuten/, String(bad));
  const state = maintenance.announce(5, 'test', 1000);
  assert.equal(state.leftMs, 5 * 60000);
  assert.equal(state.due, false);
  assert.equal(maintenance.state(1000 + 4 * 60000).leftMs, 60000);
  assert.equal(maintenance.due(1000 + 5 * 60000 - 1), false);
  assert.equal(maintenance.due(1000 + 5 * 60000), true);
  assert.equal(maintenance.state(1000 + 6 * 60000).due, true);
  assert.throws(() => assertNewRoundAllowed(), (error) => error.message === UPDATE_BLOCKED);
  assert.equal(maintenance.cancel(), true);
  assert.equal(maintenance.cancel(), false);
  assert.doesNotThrow(() => assertNewRoundAllowed());
});

test('Update-Ankündigung: laufende Runde endet normal, die nächste startet erst nach Rücknahme', () => {
  maintenance.cancel();
  const room = GAMES.viergewinnt.create('TEST2', {}, () => {});
  const a = room.addPlayer('Anna'), b = room.addPlayer('Ben');
  room.sit(a.id); room.sit(b.id);
  room.start(a.id);
  assert.equal(room.busy, true);
  maintenance.announce(5, 'test');
  try {
    for (let i = 0; i < 10 && room.busy; i++) {
      const mover = room.currentId === a.id ? a : b;
      room.drop(mover.id, mover === a ? 0 : 1); // Züge sind trotz Ankündigung erlaubt
    }
    assert.equal(room.busy, false, 'die Runde ist zu Ende gespielt');
    assert.throws(() => room.start(a.id), /Update/);
    maintenance.cancel();
    room.start(a.id);
    assert.equal(room.busy, true);
  } finally { maintenance.cancel(); room.dispose(); }
});

test('Update-Ankündigung: Poker startet keine neue Hand per Timer oder Knopf', () => {
  maintenance.cancel();
  const room = GAMES.poker.create('TEST3', {}, () => {});
  try {
    room.addPlayer('Anna'); room.addPlayer('Ben');
    maintenance.announce(5, 'test');
    assert.equal(room.startNext(true), false);
    assert.equal(room.handRunning, false);
    assert.equal(room.started, false);
  } finally { maintenance.cancel(); room.dispose(); }
});

test('Browser-Fehler: Text gekürzt, URL-Parameter und Namen entfernt, gleiche Meldungen gruppiert', () => {
  const text = cleanClientError('Fehler bei Annabelle: ' + 'x'.repeat(500) + ' https://spiel.example/app.js?t=ABCDE&token=geheim#a', ['Annabelle', 'B']);
  assert.ok(text.length <= 200);
  assert.ok(!text.includes('Annabelle'));
  assert.equal(cleanClientError('Laden von https://spiel.example/app.js?t=ABCDE#x fehlgeschlagen'), 'Laden von https://spiel.example/app.js fehlgeschlagen');
  assert.equal(cleanClientError('Zeile\n\u0007eins'), 'Zeileeins');
  const errors = createClientErrors();
  for (let i = 0; i < 3; i++) errors.record({ message: 'Boom', game: 'maumau' });
  errors.record({ message: 'Boom', game: 'poker' });
  const list = errors.list();
  assert.equal(list.length, 2);
  assert.equal(list.find((e) => e.game === 'maumau').count, 3);
  for (let i = 0; i < 150; i++) errors.record({ message: 'Fehler ' + i, game: 'hub' });
  assert.ok(errors.size <= 100);
});

test('Admin-Protokoll: speichert, begrenzt und lässt defekte Dateien unangetastet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'admin-log-'));
  const log = createAdminLog(dir);
  log.add('Update angekündigt', 'in 5 Minuten');
  assert.equal(JSON.parse(readFileSync(join(dir, 'admin-log.json'), 'utf8'))[0].action, 'Update angekündigt');
  assert.equal(createAdminLog(dir).recent()[0].detail, 'in 5 Minuten');
  for (let i = 0; i < 600; i++) log.add('Aktion', String(i));
  assert.equal(JSON.parse(readFileSync(join(dir, 'admin-log.json'), 'utf8')).length, 500);
  const broken = mkdtempSync(join(tmpdir(), 'admin-log-'));
  const file = join(broken, 'admin-log.json');
  writeFileSync(file, '{kaputt');
  const damaged = createAdminLog(broken);
  damaged.add('Aktion');
  assert.equal(readFileSync(file, 'utf8'), '{kaputt', 'defekte Datei bleibt erhalten');
  assert.equal(damaged.recent().length, 1, 'läuft dann nur im Speicher weiter');
});

test('Version: package.json und gültiger Commit-Hash, ungültige Werte werden ignoriert', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, '2.0.0');
  const info = versionInfo({ APP_COMMIT: 'ABCDEF1234567890abcdef1234567890abcdef12' });
  assert.equal(info.version, '2.0.0');
  assert.equal(info.short, 'abcdef1');
  assert.equal(versionInfo({ APP_COMMIT: 'unbekannt' }).commit, '');
  assert.equal(versionInfo({}).short, '');
  assert.equal(versionInfo({ APP_COMMIT: '<script>' }).commit, '');
});

test('Was ist neu: neueste erledigte Einträge zuerst, Betrieb & Wartung enthalten, offene Punkte fehlen', () => {
  const list = whatsNew();
  assert.ok(list.length > 0 && list.length <= 8);
  const dates = list.map((e) => e.datum);
  assert.deepEqual(dates, [...dates].sort().reverse());
  const betrieb = resolvedRoadmap().find((e) => e.id === 'betrieb');
  const done = betrieb.punkte.filter((p) => p.erledigt).map((p) => p.titel);
  assert.deepEqual(done, ['Update-Hinweis', 'Admin-Seite', 'Version & „Was ist neu“', 'Browser-Fehler', 'Ausfall-Wächter', 'Backups & Restore-Test']);
  assert.ok(betrieb.punkte.find((p) => p.titel === 'Speichern mitten in der Runde' && !p.erledigt));
  assert.ok(list.every((e) => e.titel && e.text && e.datum));
  assert.equal(whatsNew(2).length, 2);
});

// ---------- Mit echtem Server ----------
const GROUP = 'Gruppe-Test', ADMIN = 'Admin-Test-Passwort';
async function startServer(env = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'ops-'));
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    const { http } = await import('./server/index.js');
    const ready = () => console.log('OPS_READY:' + http.address().port);
    if (http.listening) ready(); else http.once('listening', ready);
    process.stdin.on('data', (d) => { if (String(d).includes('TERM')) process.emit('SIGTERM'); }); // Signal-Handler auch unter Windows prüfbar
  `], { env: { ...process.env, PORT: '0', DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: GROUP, ADMIN_PASSWORD: '', CREATE_LIMIT: '30', ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stderr.on('data', (d) => { output += d; });
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve(code)));
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Testserver startet nicht: ' + output)), 15000);
    child.stdout.on('data', (d) => { output += d; const m = String(d).match(/OPS_READY:(\d+)/); if (m) { clearTimeout(timer); resolve('http://localhost:' + m[1]); } });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error('Testserver beendet: ' + code + ' ' + output)); });
  });
  const server = { url, dataDir, child, exited, output: () => output, stop: () => child.kill() };
  server.cookie = await siteCookie(server);
  return server;
}
async function siteCookie(server) {
  const res = await fetch(server.url + '/login', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: GROUP }) });
  return res.headers.get('set-cookie').split(';')[0];
}
const API_HEADERS = { 'content-type': 'application/json', 'x-requested-with': 'spieleabend' };
const adminCall = (server, path, { method = 'GET', body, cookie = server.cookie, headers = API_HEADERS } = {}) =>
  fetch(server.url + '/admin/api' + path, { method, headers: { ...headers, cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
async function adminLogin(server, password = ADMIN) {
  const res = await adminCall(server, '/login', { method: 'POST', body: { password } });
  const set = res.headers.get('set-cookie');
  return { res, cookie: set ? `${server.cookie}; ${set.split(';')[0]}` : null };
}
function client(server) {
  const socket = io(server.url, { transports: ['websocket'], forceNew: true, extraHeaders: { cookie: server.cookie }, reconnection: false });
  socket.events = [];
  for (const event of ['maintenance', 'restarting', 'version']) socket.on(event, (data) => socket.events.push({ event, data }));
  socket.on('state', (state) => { socket.state = state; });
  socket.ask = (event, data = {}) => new Promise((resolve) => socket.timeout(5000).emit(event, data, (error, result) => resolve(error ? { ok: false, error: error.message } : result)));
  return socket;
}
const seen = (socket, event) => socket.events.filter((e) => e.event === event);

test('/admin ist ohne ADMIN_PASSWORD aus; /health nennt Version und Commit', async () => {
  const server = await startServer({ APP_COMMIT: '0123456789abcdef0123456789abcdef01234567' });
  try {
    assert.equal((await fetch(server.url + '/admin', { headers: { cookie: server.cookie } })).status, 404);
    assert.equal((await fetch(server.url + '/admin/api/status', { headers: { cookie: server.cookie } })).status, 404);
    const health = await (await fetch(server.url + '/health')).json();
    assert.equal(health.ok, true);
    assert.equal(health.version, '2.0.0');
    assert.equal(health.commit, '0123456789'.slice(0, 7));
    const me = await (await fetch(server.url + '/me', { headers: { cookie: server.cookie } })).json();
    assert.equal(me.version, '2.0.0');
    const news = await (await fetch(server.url + '/api/whats-new', { headers: { cookie: server.cookie } })).json();
    assert.equal(news.version, '2.0.0');
    assert.ok(news.entries.length > 0);
    const s = client(server);
    await until(() => seen(s, 'version').length);
    assert.equal(seen(s, 'version')[0].data.version, '2.0.0');
    s.disconnect();
  } finally { server.stop(); }
});

test('/admin: Gruppenpasswort reicht nicht; ohne oder mit falschem Passwort gesperrt; Rate-Limit', async () => {
  const server = await startServer({ ADMIN_PASSWORD: ADMIN });
  try {
    assert.equal((await fetch(server.url + '/admin', { redirect: 'manual' })).status, 302, 'ohne Gruppen-Anmeldung zur Passwortseite');
    assert.equal((await fetch(server.url + '/admin', { headers: { cookie: server.cookie } })).status, 200, 'Seite selbst enthält keine Daten');
    for (const [path, method] of [['/status', 'GET'], ['/rooms/ABCDE/close', 'POST'], ['/update', 'POST'], ['/update', 'DELETE']]) {
      const res = await adminCall(server, path, { method, body: method === 'POST' ? { minutes: 5 } : undefined });
      assert.equal(res.status, 401, `${method} ${path} mit Gruppen-Cookie`);
    }
    assert.equal((await adminCall(server, '/login', { method: 'POST', body: { password: GROUP } })).status, 401, 'Gruppenpasswort ist kein Admin-Passwort');
    assert.equal((await adminCall(server, '/login', { method: 'POST', body: {} })).status, 401);
    const forged = await adminCall(server, '/status', { cookie: `${server.cookie}; pa_admin=${'a'.repeat(24)}.${Date.now() + 1e6}.xxxx` });
    assert.equal(forged.status, 401);
    const ok = await adminLogin(server);
    assert.equal(ok.res.status, 200);
    assert.match(ok.res.headers.get('set-cookie'), /HttpOnly/);
    assert.match(ok.res.headers.get('set-cookie'), /Path=\/admin/);
    // Das Admin-Cookie gilt nicht für andere Bereiche und ohne Seitenanmeldung auch nicht für den Rest
    const status = await adminCall(server, '/status', { cookie: ok.cookie });
    assert.equal(status.status, 200);
    const data = await status.json();
    assert.equal(data.version, '2.0.0');
    assert.ok(Array.isArray(data.rooms) && data.system.memory.rss > 0 && data.data.files.length >= 0);
    // Rate-Limit: acht Fehlversuche, dann gesperrt – auch mit dem richtigen Passwort
    for (let i = 0; i < 8; i++) assert.equal((await adminLogin(server, 'falsch' + i)).res.status, 401);
    const blocked = await adminLogin(server, ADMIN);
    assert.equal(blocked.res.status, 429);
    assert.ok(Number(blocked.res.headers.get('retry-after')) > 0);
  } finally { server.stop(); }
});

test('/admin: Aktionen verlangen Admin-Cookie, Herkunfts-Header und landen im Protokoll; Raum schließen wirft alle raus', async () => {
  const server = await startServer({ ADMIN_PASSWORD: ADMIN });
  const a = client(server), b = client(server);
  try {
    const { cookie } = await adminLogin(server);
    const created = await a.ask('create', { game: 'viergewinnt', name: 'Anna' }); assert.ok(created.ok, created.error);
    assert.ok((await b.ask('join', { code: created.code, name: 'Ben' })).ok);
    await until(() => b.state);
    const rooms = (await (await adminCall(server, '/status', { cookie })).json()).rooms;
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].code, created.code);
    assert.equal(rooms[0].gameName, 'Vier gewinnt');
    assert.equal(rooms[0].humans, 2);
    assert.deepEqual(rooms[0].names.sort(), ['Anna', 'Ben']);
    assert.ok(rooms[0].openedAt <= Date.now() && rooms[0].lastActivity > 0);
    // ohne Herkunfts-Header (CSRF-Schutz)
    assert.equal((await adminCall(server, `/rooms/${created.code}/close`, { method: 'POST', body: {}, cookie, headers: { 'content-type': 'application/json' } })).status, 403);
    assert.equal((await adminCall(server, '/rooms/ZZZZZ/close', { method: 'POST', body: {}, cookie })).status, 404);
    const closed = new Promise((resolve) => a.once('closed', resolve));
    assert.equal((await adminCall(server, `/rooms/${created.code}/close`, { method: 'POST', body: {}, cookie })).status, 200);
    assert.match((await closed).text, /Admin/);
    assert.equal((await (await adminCall(server, '/status', { cookie })).json()).rooms.length, 0);
    const log = (await (await adminCall(server, '/status', { cookie })).json()).log;
    assert.ok(log.some((e) => e.action === 'Raum geschlossen' && e.detail.includes(created.code)), JSON.stringify(log));
    assert.ok(log.some((e) => e.action === 'Angemeldet'));
    assert.ok(JSON.parse(readFileSync(join(server.dataDir, 'admin-log.json'), 'utf8')).length >= 2);
    // ungültige Minuten
    for (const minutes of [0, 500, 'x']) assert.equal((await adminCall(server, '/update', { method: 'POST', body: { minutes }, cookie })).status, 400);
  } finally { a.disconnect(); b.disconnect(); server.stop(); }
});

test('Update-Ankündigung per Admin: Banner für alle, neue Runden gesperrt, laufende endet normal, danach speichern und beenden', async () => {
  const server = await startServer({ ADMIN_PASSWORD: ADMIN });
  const a = client(server), b = client(server);
  try {
    const { cookie } = await adminLogin(server);
    const created = await a.ask('create', { game: 'viergewinnt', name: 'Anna' }); assert.ok(created.ok, created.error);
    assert.ok((await b.ask('join', { code: created.code, name: 'Ben' })).ok);
    assert.ok((await a.ask('sit')).ok); assert.ok((await b.ask('sit')).ok);
    assert.ok((await a.ask('start')).ok);
    await until(() => a.state?.phase === 'playing');
    const res = await adminCall(server, '/update', { method: 'POST', body: { minutes: 0.05 }, cookie });
    assert.equal(res.status, 200);
    await until(() => seen(a, 'maintenance').length && seen(b, 'maintenance').length);
    const banner = seen(a, 'maintenance').at(-1).data;
    assert.ok(banner.leftMs > 0 && banner.leftMs <= 3000);
    const late = client(server); // wer später kommt, sieht es auch
    await until(() => seen(late, 'maintenance').length);
    late.disconnect();
    // Neue Runde, Programmstart und Wechsel in eine neue Runde sind gesperrt
    for (const event of ['start', 'programStart', 'programNext']) {
      const blocked = await a.ask(event); assert.equal(blocked.ok, false, event); assert.match(blocked.error, /Update/, event);
    }
    // Die laufende Runde läuft über die Frist hinaus weiter – der Server wartet
    await wait(4500);
    assert.equal(server.child.exitCode, null, 'Server beendet nicht mitten in der Runde');
    assert.equal(a.state.phase, 'playing');
    assert.ok(seen(a, 'maintenance').at(-1).data.due);
    // Die Runde wird normal zu Ende gespielt
    for (let i = 0; i < 12 && a.state.phase === 'playing'; i++) {
      for (const [socket, col] of [[a, 0], [b, 1]]) await socket.ask('drop', { col });
      await wait(30);
    }
    await until(() => a.state.phase !== 'playing');
    assert.equal(await Promise.race([server.exited, wait(8000).then(() => 'timeout')]), 0, 'nach dem Rundenende sauber beendet');
    assert.ok(seen(a, 'restarting').length && seen(b, 'restarting').length, 'allen Verbindungen Bescheid gesagt');
    assert.match(seen(a, 'restarting')[0].data.text, /Server startet neu/);
    const saved = JSON.parse(readFileSync(join(server.dataDir, 'rooms.json'), 'utf8'));
    assert.ok(saved.some((room) => room.code === created.code), 'Tisch gespeichert');
    assert.ok(JSON.parse(readFileSync(join(server.dataDir, 'admin-log.json'), 'utf8')).some((e) => e.action === 'Update: Server beendet'));
  } finally { a.disconnect(); b.disconnect(); server.stop(); }
});

test('Update-Ankündigung: lässt sich zurücknehmen, danach starten Runden wieder', async () => {
  const server = await startServer({ ADMIN_PASSWORD: ADMIN });
  const a = client(server), b = client(server);
  try {
    const { cookie } = await adminLogin(server);
    const created = await a.ask('create', { game: 'viergewinnt', name: 'Anna' }); assert.ok(created.ok, created.error);
    await b.ask('join', { code: created.code, name: 'Ben' });
    await a.ask('sit'); await b.ask('sit');
    await adminCall(server, '/update', { method: 'POST', body: { minutes: 10 }, cookie });
    await until(() => seen(a, 'maintenance').length);
    assert.equal((await a.ask('start')).ok, false);
    assert.equal((await adminCall(server, '/update', { method: 'DELETE', cookie })).status, 200);
    await until(() => seen(a, 'maintenance').at(-1).data === null);
    assert.ok((await a.ask('start')).ok);
    assert.equal(server.child.exitCode, null);
  } finally { a.disconnect(); b.disconnect(); server.stop(); }
});

test('SIGTERM: alles wird gespeichert, Verbindungen erfahren vom Neustart, Prozess endet mit 0', async () => {
  const server = await startServer();
  const a = client(server);
  try {
    const created = await a.ask('create', { game: 'viergewinnt', name: 'Anna' }); assert.ok(created.ok, created.error);
    server.child.stdin.write('TERM\n'); // löst die registrierten SIGTERM-Handler aus (unter Windows gibt es echte Signale nicht)
    assert.equal(await Promise.race([server.exited, wait(8000).then(() => 'timeout')]), 0);
    await until(() => seen(a, 'restarting').length);
    assert.match(seen(a, 'restarting')[0].data.text, /gleich wieder da/);
    const saved = JSON.parse(readFileSync(join(server.dataDir, 'rooms.json'), 'utf8'));
    assert.ok(saved.some((room) => room.code === created.code));
  } finally { a.disconnect(); server.stop(); }
});

test('Browser-Fehler: höchstens 10 pro Minute, gekürzt, ohne Namen, gruppiert nach Meldung und Spiel', async () => {
  const server = await startServer({ ADMIN_PASSWORD: ADMIN });
  const a = client(server), noRoom = client(server);
  try {
    const { cookie } = await adminLogin(server);
    const created = await a.ask('create', { game: 'maumau', name: 'Annabelle' }); assert.ok(created.ok, created.error);
    for (let i = 0; i < 15; i++) a.emit('clientError', { message: 'Boom bei Annabelle ' + 'y'.repeat(400) + ' https://x.example/spiel.js?t=ABCDE', where: 'https://x.example/spiel.js?v=1:12:3', game: 'erfunden' });
    for (const bad of [null, 'text', 42, { message: 5 }, { message: {} }]) a.emit('clientError', bad);
    noRoom.emit('clientError', { message: 'Hub kaputt', game: 'hub' });
    noRoom.emit('clientError', { message: 'Solo kaputt', game: 'sudoku' });
    noRoom.emit('clientError', { message: 'Falsch markiert', game: '__proto__' });
    await until(async () => (await (await adminCall(server, '/status', { cookie })).json()).errors.length >= 4);
    const errors = (await (await adminCall(server, '/status', { cookie })).json()).errors;
    const boom = errors.find((e) => e.message.startsWith('Boom'));
    assert.equal(boom.count, 10, 'zehn von fünfzehn kommen durch');
    assert.equal(boom.game, 'maumau', 'das Spiel kommt vom Tisch, nicht vom Client');
    assert.ok(boom.message.length <= 200);
    assert.ok(!boom.message.includes('Annabelle'));
    assert.ok(!boom.message.includes('ABCDE'), 'URL-Parameter entfernt');
    assert.equal(boom.where, 'spiel.js');
    assert.equal(errors.find((e) => e.message === 'Hub kaputt').game, 'hub');
    assert.equal(errors.find((e) => e.message === 'Solo kaputt').game, 'sudoku');
    assert.equal(errors.find((e) => e.message === 'Falsch markiert').game, 'hub');
    assert.equal(errors.length, 4, 'ungültige Pakete werden ignoriert');
  } finally { a.disconnect(); noRoom.disconnect(); server.stop(); }
});
