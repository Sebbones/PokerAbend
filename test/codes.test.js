// Raumcodes: zentral vergeben, nie doppelt – auch nicht zwischen verschiedenen Spielarten und nach einem Neustart.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { createCodes, CODE_CHARS, CODE_LENGTH } from '../server/codes.js';
import { freePort } from './free-port.js';

test('Codes haben das richtige Format und sind eindeutig', () => {
  const codes = createCodes();
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const c = codes.take(i % 2 ? 'poker' : 'maumau');
    assert.equal(c.length, CODE_LENGTH);
    assert.ok([...c].every((ch) => CODE_CHARS.includes(ch)));
    assert.ok(!seen.has(c), 'doppelt: ' + c);
    seen.add(c);
  }
  assert.equal(codes.size, 5000);
});

test('Besetzter Code wird übersprungen – egal welches Spiel ihn hat', () => {
  // Zufall, der zuerst zweimal „AAAAA“ und dann „BBBBB“ liefert
  const seq = [...Array(10).fill(0), ...Array(5).fill(1)];
  const codes = createCodes({ random: () => seq.shift() ?? 2 });
  assert.equal(codes.take('maumau'), 'AAAAA');
  assert.equal(codes.take('poker'), 'BBBBB', 'AAAAA ist schon vom anderen Spiel belegt');
  assert.equal(codes.gameOf('AAAAA'), 'maumau');
  assert.equal(codes.gameOf('bbbbb'), 'poker', 'Groß/Klein egal');
});

test('claim und release', () => {
  const codes = createCodes();
  assert.equal(codes.claim('abcde'), true);
  assert.equal(codes.claim('ABCDE', 'maumau'), false, 'schon vergeben');
  assert.equal(codes.claim(''), false);
  codes.release('ABCDE');
  assert.equal(codes.has('ABCDE'), false);
  assert.equal(codes.claim('ABCDE'), true, 'nach release wieder frei');
});

test('Wenn wirklich kein Code frei ist, gibt es einen Fehler statt einer Endlosschleife', () => {
  const codes = createCodes({ random: () => 0 });
  codes.take();
  assert.throws(() => codes.take(), /kein Code frei/);
});

// ---------- Mit Server: gespeicherte Tische belegen ihre Codes ----------
const PORT = await freePort();
const URL = `http://localhost:${PORT}`;
let server;
const saved = (code, name) => ({
  code, settings: {}, hostId: 'h', button: 0, handNo: 3, log: [],
  players: [{ id: 'h', token: 'tok-' + name, name, avatar: '🦊', seat: null, chips: 10000, buyIn: 10000, rebuys: 0 }],
});

before(async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'poker-codes-'));
  // Kaputte Datei mit doppeltem Code: der zweite Tisch darf den ersten nicht überschreiben
  writeFileSync(join(dataDir, 'rooms.json'), JSON.stringify([saved('KLMNP', 'Erste'), saved('KLMNP', 'Zweite'), saved('QRSTU', 'Dritte')]));
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '' },
    stdio: 'pipe',
  });
  await new Promise((res, rej) => {
    server.stdout.on('data', (d) => { if (String(d).includes('läuft')) res(); });
    server.on('exit', (c) => rej(new Error('Server beendet: ' + c)));
  });
});
after(() => server.kill());

test('Gespeicherte Tische: doppelter Code wird nur einmal geladen', async () => {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const ask = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  const one = await ask('join', { code: 'KLMNP', token: 'tok-Erste' });
  assert.ok(one.ok, one.error);
  s.disconnect();
  const s2 = io(URL, { transports: ['websocket'], forceNew: true });
  const two = await new Promise((r) => s2.emit('join', { code: 'KLMNP', token: 'tok-Zweite', name: 'Neu' }, r));
  assert.ok(two.ok);
  assert.notEqual(two.token, 'tok-Zweite', 'der zweite Tisch mit gleichem Code wurde nicht geladen');
  const three = await new Promise((r) => s2.emit('join', { code: 'qrstu', token: 'tok-Dritte' }, r));
  assert.ok(three.ok, 'Code-Eingabe ist unabhängig von Groß/Klein');
  s2.disconnect();
});

test('Neue Tische bekommen nie einen schon belegten Code', async () => {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const got = new Set(['KLMNP', 'QRSTU']);
  for (let i = 0; i < 5; i++) {
    const r = await new Promise((res) => s.emit('create', { name: 'Host' + i }, res));
    assert.ok(r.ok, r.error);
    assert.ok(!got.has(r.code), 'doppelt: ' + r.code);
    got.add(r.code);
  }
  s.disconnect();
});
