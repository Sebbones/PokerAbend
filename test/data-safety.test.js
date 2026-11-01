// Nacharbeiten der Code-Review (E5): rooms.json sichern, verwaiste Verlaufsdateien beim Start aufräumen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freePort } from './free-port.js';

async function startAndStop(dataDir) {
  const port = await freePort();
  const server = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '' }, stdio: 'pipe' });
  let log = '';
  server.stderr.on('data', (d) => { log += d; });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { log += d; if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c + log)));
  });
  server.removeAllListeners('exit');
  server.kill();
  await new Promise((r) => server.once('exit', r));
  return log;
}

test('rooms.json: eine unlesbare Datei wird gesichert, die Verlaufsdateien bleiben liegen', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rooms-bad-'));
  const broken = '[{"game":"maumau","code":"ABCD","players":[';
  writeFileSync(join(dir, 'rooms.json'), broken);
  writeFileSync(join(dir, 'history-ABCD.json'), '[]');
  await startAndStop(dir);
  const files = readdirSync(dir);
  const backup = files.find((f) => f.startsWith('rooms.json.unlesbar-'));
  assert.ok(backup, 'Sicherung fehlt: ' + files.join(', '));
  assert.equal(readFileSync(join(dir, backup), 'utf8'), broken);
  assert.ok(files.includes('history-ABCD.json'), 'nach einem Lesefehler bleibt der Verlauf erhalten');
});

test('Verlaufsdateien ohne Raum werden beim Start entfernt, intakte rooms.json nicht gesichert', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rooms-ok-'));
  writeFileSync(join(dir, 'rooms.json'), '[]');
  writeFileSync(join(dir, 'history-WXYZ.json'), '[]');
  writeFileSync(join(dir, 'history-WXYZ.json.tmp'), '[');
  writeFileSync(join(dir, 'history-notes.txt'), 'bleibt');
  await startAndStop(dir);
  const files = readdirSync(dir);
  assert.ok(!files.includes('history-WXYZ.json') && !files.includes('history-WXYZ.json.tmp'), files.join(', '));
  assert.ok(files.includes('history-notes.txt'), 'fremde Dateien bleiben');
  assert.ok(!files.some((f) => f.includes('unlesbar')));
});
