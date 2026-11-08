// scripts/restore-test.sh: neuestes Backup entpacken, Server darauf starten, Bestenliste, Tickets und Tische prüfen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createLeaderboard } from '../server/leaderboard.js';

const hasBash = spawnSync('bash', ['-c', 'tar --version >/dev/null && echo ok']).stdout?.toString().trim() === 'ok';
const slash = (p) => p.replace(/\\/g, '/');
const bash = (args, options = {}) => spawnSync('bash', args, { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), ...options });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Echten Server mit Daten füllen (Tisch, Ticket) und sauber beenden – so entsteht ein realistisches Daten-Verzeichnis */
async function realisticData() {
  const dataDir = mkdtempSync(join(tmpdir(), 'restore-src-'));
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    const { http } = await import('./server/index.js');
    const ready = () => console.log('RT_READY:' + http.address().port);
    if (http.listening) ready(); else http.once('listening', ready);
    process.stdin.on('data', () => process.emit('SIGTERM'));
  `], { env: { ...process.env, PORT: '0', DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '' }, stdio: ['pipe', 'pipe', 'inherit'] });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startet nicht')), 15000);
    child.stdout.on('data', (d) => { const m = String(d).match(/RT_READY:(\d+)/); if (m) { clearTimeout(timer); resolve('http://localhost:' + m[1]); } });
  });
  const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  const ask = (event, data) => new Promise((resolve) => socket.timeout(5000).emit(event, data, (e, r) => resolve(e ? { ok: false } : r)));
  assert.ok((await ask('create', { game: 'viergewinnt', name: 'Anna' })).ok);
  const ticket = await fetch(url + '/api/tickets', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'spieleabend' }, body: JSON.stringify({ title: 'Sicherung testen', type: 'idea', description: 'Ein Ticket für den Wiederherstellungs-Test.', name: 'Anna', avatar: '🦉' }) });
  assert.equal(ticket.status, 201);
  await wait(500);
  socket.disconnect();
  child.stdin.write('TERM\n');
  assert.equal(await exited, 0);
  const board = createLeaderboard(dataDir); // ein gespeichertes Ergebnis, wie nach einem echten Abend
  board.record('viergewinnt', [{ name: 'Anna', win: true, points: 1 }, { name: 'Ben', win: false, points: 0 }]);
  board.save();
  return dataDir;
}
const archiveOf = (dataDir, name = 'spieleabend-2026-11-01_0430.tar.gz') => {
  const dir = mkdtempSync(join(tmpdir(), 'restore-backup-'));
  // Über stdout archivieren: GNU-tar (Git Bash) deutet „C:/…“ als Rechnernamen
  const made = spawnSync('bash', ['-c', 'tar cz .'], { cwd: dataDir, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(made.status, 0, String(made.stderr));
  writeFileSync(join(dir, name), made.stdout);
  return { dir, file: join(dir, name) };
};

test('restore-test.sh: neuestes Backup wird entpackt, Server startet, Bestenliste, Tickets und Tische laden', { skip: !hasBash && 'bash nicht verfügbar' }, async () => {
  const data = await realisticData();
  const { dir, file } = archiveOf(data);
  // Ein älteres Backup liegt auch da – das neueste muss gewinnen
  const old = archiveOf(mkdtempSync(join(tmpdir(), 'restore-empty-')), 'spieleabend-2020-01-01_0000.tar.gz');
  writeFileSync(join(dir, 'spieleabend-2020-01-01_0000.tar.gz'), readFileSync(old.file));
  utimesSync(join(dir, 'spieleabend-2020-01-01_0000.tar.gz'), new Date('2020-01-01'), new Date('2020-01-01'));
  const result = bash(['scripts/restore-test.sh'], { env: { ...process.env, BACKUP_DIR: slash(dir) } });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /spieleabend-2026-11-01_0430\.tar\.gz/);
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version; // die gebaute Version, nicht fest eingetragen
  assert.ok(result.stdout.includes(`/health ok, Version ${version}`), result.stdout);
  assert.match(result.stdout, /Bestenliste geladen/);
  assert.match(result.stdout, /Tickets geladen \(1\)/);
  assert.match(result.stdout, /Tische geladen \(1\)/);
  assert.match(result.stdout, /OK: Die Sicherung/);
});

test('restore-test.sh: aufgeräumt wird immer, die echten Daten bleiben unberührt', { skip: !hasBash && 'bash nicht verfügbar' }, async () => {
  const data = await realisticData();
  const before = readFileSync(join(data, 'rooms.json'), 'utf8');
  const { file } = archiveOf(data);
  const result = bash(['scripts/restore-test.sh', slash(file)]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFileSync(join(data, 'rooms.json'), 'utf8'), before);
});

test('restore-test.sh: kaputtes Archiv, fehlendes Backup und beschädigte Daten schlagen mit Fehler fehl', { skip: !hasBash && 'bash nicht verfügbar' }, async () => {
  const empty = mkdtempSync(join(tmpdir(), 'restore-none-'));
  const none = bash(['scripts/restore-test.sh'], { env: { ...process.env, BACKUP_DIR: slash(empty) } });
  assert.notEqual(none.status, 0);
  assert.match(none.stderr, /Kein Backup/);

  const garbage = join(empty, 'spieleabend-kaputt.tar.gz');
  writeFileSync(garbage, 'das ist kein Archiv');
  const broken = bash(['scripts/restore-test.sh', slash(garbage)]);
  assert.notEqual(broken.status, 0);
  assert.match(broken.stderr, /entpacken/);

  const data = await realisticData();
  writeFileSync(join(data, 'tickets.json'), '{kaputt');
  const damaged = archiveOf(data);
  const result = bash(['scripts/restore-test.sh', slash(damaged.file)]);
  assert.notEqual(result.status, 0, 'defekte Ticket-Datei muss auffallen');
  assert.match(result.stderr, /Tickets|Probleme/);
});
