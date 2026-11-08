import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { io } from 'socket.io-client';

async function until(fn) {
  for (let i = 0; i < 400; i++) { if (await fn()) return; await wait(20); }
  throw new Error('Feature integration timed out');
}
async function server(dir) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `const {http}=await import('./server/index.js');const ready=()=>console.log('FEATURE_READY:'+http.address().port);if(http.listening)ready();else http.once('listening',ready);`], {
    env: { ...process.env, PORT: '0', DATA_DIR: dir, POKER_NO_DOTENV: '1', SITE_PASSWORD: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stderr.on('data', (b) => { output += b; });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start: ' + output)), 15000);
    child.once('error', (e) => { clearTimeout(timer); reject(e); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exit ${code}: ${output}`)); });
    child.stdout.on('data', (b) => { output += b; const m = output.match(/FEATURE_READY:(\d+)/); if (m) { clearTimeout(timer); resolve('http://localhost:' + m[1]); } });
  });
  return { url, async stop() { if (child.exitCode === null && child.signalCode === null) { const exited = new Promise((r) => child.once('exit', r)); child.kill(); await exited; } } };
}
async function client(url) {
  const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.on('state', (state) => { s.state = state; });
  s.ask = (event, data = {}) => new Promise((resolve, reject) => s.timeout(5000).emit(event, data, (e, reply) => e ? reject(e) : resolve(reply)));
  s.ok = async (event, data) => { const r = await s.ask(event, data); assert.equal(r.ok, true, `${event}: ${r.error}`); return r; };
  await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  return s;
}
const saved = (dir) => { try { return JSON.parse(readFileSync(join(dir, 'rooms.json'), 'utf8'))[0]; } catch { return null; } };

for (const mode of ['party-brett', 'survival-abend']) test(`${mode}: real WebSocket station, process restart midgame/between games, tokens, privacy, idempotence`, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'party-feature-')), clients = [];
  let app = await server(dir);
  try {
    let a = await client(app.url), b = await client(app.url), c = await client(app.url), watch = await client(app.url); clients.push(a,b,c,watch);
    const created = await a.ok('create', { game: 'schaetzmeister', name: 'Anna' });
    const joined = await b.ok('join', { code: created.code, name: 'Ben' }), third = await c.ok('join', { code: created.code, name: 'Cara' });
    await watch.ok('join', { code: created.code, name: 'Zoe' });
    for (const s of [a,b,c]) await s.ok('sit');
    await a.ok('custom', { text: 'Secret test question? | 739184 | Points' });
    assert.equal((await b.ask('programSave', { mode, entries: [{ game: 'schaetzmeister' }] })).ok, false);
    await a.ok('programSave', { mode, lives: 1, boardRounds: 2, entries: [{ game: 'schaetzmeister', settings: { rounds: 1 } }] });
    await a.ok('programStart');
    await until(() => [a,b,c,watch].every((s) => s.state?.partyProgram?.status === 'running'));
    const id = a.state.you.id, guestId = b.state.you.id, thirdId = c.state.you.id, program = structuredClone(a.state.partyProgram);
    for (const s of [b,c,watch]) for (const secret of ['739184', created.token, joined.token, third.token]) assert.ok(!JSON.stringify(s.state).includes(secret));
    assert.equal((await watch.ask('sit')).ok, false);
    await until(() => saved(dir)?.partyProgram?.status === 'running');
    for (const s of clients) s.close(); await app.stop(); app = await server(dir);
    a = await client(app.url); b = await client(app.url); c = await client(app.url); clients.push(a,b,c);
    await a.ok('join', { code: created.code, token: created.token }); await b.ok('join', { code: created.code, token: joined.token }); await c.ok('join', { code: created.code, token: third.token });
    assert.equal(a.state.you.id, id); assert.equal(b.state.you.id, guestId);
    assert.equal(a.state.phase, 'lobby'); assert.deepEqual(a.state.partyProgram.results, []);
    assert.deepEqual(a.state.partyProgram.board || a.state.partyProgram.lives, program.board || program.lives);
    await a.ok('programNext');
    assert.deepEqual(a.state.partyProgram.board || a.state.partyProgram.lives, program.board || program.lives);
    await a.ok('guess', { text: '739184' }); await b.ok('guess', { text: '739180' }); await c.ok('guess', { text: '0' });
    await a.ok('next'); await until(() => a.state.partyProgram.status === 'between');
    const p = structuredClone(a.state.partyProgram);
    assert.equal(p.results.length, 1);
    assert.equal((await a.ask('next')).ok, false);
    if (mode === 'party-brett') {
      await b.ok('programBoardItem', { item: 'shield' }); assert.equal((await b.ask('programBoardItem', { item: 'shield' })).ok, false);
    } else { assert.equal(p.lives[thirdId], 0); assert.equal(p.lives[guestId], 1); }
    await until(() => saved(dir)?.partyProgram?.status === 'between').catch((error) => { throw new Error(`${mode}: persisted status=${saved(dir)?.partyProgram?.status}: ${error.message}`); });
    const stored = saved(dir).partyProgram;
    for (const s of clients) s.close(); await app.stop(); app = await server(dir);
    a = await client(app.url); b = await client(app.url); c = await client(app.url); clients.push(a,b,c);
    await a.ok('join', { code: created.code, token: created.token }); await b.ok('join', { code: created.code, token: joined.token }); await c.ok('join', { code: created.code, token: third.token });
    assert.deepEqual(a.state.partyProgram.board || a.state.partyProgram.lives, stored.board || stored.lives);
    assert.equal(a.state.partyProgram.results.length, 1);
    await a.ok('programNext');
    await until(() => [a,b,c].every((s) => s.state?.phase === 'playing' && s.state.partyProgram?.index === 1));
    if (mode === 'survival-abend') { assert.equal(c.state.you.inRound, false); assert.equal(c.state.you.playing, false); assert.equal((await c.ask('sit')).ok, false); }
    await a.ok('guess', { text: '739184' }); await b.ok('guess', { text: '0' });
    if (mode === 'party-brett') await c.ok('guess', { text: '1' });
    await a.ok('next'); await until(() => a.state.partyProgram.status === 'done');
    assert.equal(a.state.partyProgram.results.length, 2);
    if (mode === 'survival-abend') assert.deepEqual(a.state.partyProgram.winners, ['Anna']);
    await a.ok('programStop');
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});

test('Modifiers: server settings, public announced chaos survives a real server restart, foreign answers stay secret', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'party-rules-')); let app = await server(dir); const clients = [];
  try {
    let a = await client(app.url), b = await client(app.url); clients.push(a,b);
    const created = await a.ok('create', { game: 'werhatdasgesagt', name: 'Anna' }), joined = await b.ok('join', { code: created.code, name: 'Ben' });
    await a.ok('sit'); await b.ok('sit'); await a.ok('addBot');
    assert.equal((await b.ask('settings', { chaosMode: true })).ok, false);
    assert.equal((await a.ask('settings', { chaosMode: 'true' })).ok, false);
    await a.ok('settings', { chaosMode: true, rounds: 1 });
    const preview = a.state.partyRules.rule;
    await until(() => b.state.partyRules?.rule === preview); // A's ack does not acknowledge B's state delivery.
    assert.equal(b.state.partyRules.rule, preview);
    await until(() => saved(dir)?.partyRules?.preview === preview);
    a.close(); b.close(); await app.stop(); app = await server(dir);
    a = await client(app.url); b = await client(app.url); clients.push(a,b);
    await a.ok('join', { code: created.code, token: created.token }); await b.ok('join', { code: created.code, token: joined.token });
    assert.equal(a.state.partyRules.rule, preview);
    await a.ok('start'); assert.equal(a.state.partyRules.rule, preview);
    await b.ok('answer', { text: 'SECRET-PRIVATE-DRAFT-019' });
    await until(() => b.state.players.find((p) => p.id === b.state.you.id)?.ready);
    assert.ok(!JSON.stringify(a.state).includes('SECRET-PRIVATE-DRAFT-019'));
    assert.equal((await a.ask('settings', { modifierRule: 'reverse' })).ok, false);
    await a.ok('abortRound'); assert.equal(a.state.partyRules.rule, preview);
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});

test('Chaos in an evening program: all see the rule in the lobby before confirmation; restart and abort keep it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'party-announcement-')); let app = await server(dir); const clients = [];
  try {
    let a = await client(app.url), b = await client(app.url); clients.push(a,b);
    const created = await a.ok('create', { game: 'schaetzmeister', name: 'Anna' }), joined = await b.ok('join', { code: created.code, name: 'Ben' });
    await a.ok('sit'); await b.ok('sit');
    await a.ok('programSave', { mode: 'playlist', entries: [{ game: 'schaetzmeister', settings: { chaosMode: true, rounds: 1 } }] });
    await a.ok('programStart');
    await until(() => b.state?.partyProgram?.awaitingRule);
    const preview = a.state.partyRules.rule;
    assert.equal(a.state.phase, 'lobby'); assert.equal(b.state.partyRules.rule, preview);
    assert.equal((await b.ask('programNext')).ok, false);
    await until(() => saved(dir)?.partyProgram?.awaitingRule);
    a.close(); b.close(); await app.stop(); app = await server(dir);
    a = await client(app.url); b = await client(app.url); clients.push(a,b);
    await a.ok('join', { code: created.code, token: created.token }); await b.ok('join', { code: created.code, token: joined.token });
    assert.equal(a.state.partyRules.rule, preview); assert.equal(a.state.partyProgram.awaitingRule, true);
    await a.ok('programNext'); assert.equal(a.state.phase, 'playing'); assert.equal(a.state.partyRules.rule, preview);
    await a.ok('abortRound'); await a.ok('programNext');
    assert.equal(a.state.phase, 'lobby'); assert.equal(a.state.partyRules.rule, preview);
    await a.ok('programNext'); assert.equal(a.state.phase, 'playing'); assert.equal(a.state.partyRules.rule, preview);
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});

test('Survival: leaving during a live station forfeits before the game emits its completion', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'survival-departure-')), app = await server(dir), clients = [];
  try {
    const a = await client(app.url), b = await client(app.url); clients.push(a,b);
    const created = await a.ok('create', { game: 'schaetzmeister', name: 'Anna' }); await b.ok('join', { code: created.code, name: 'Ben' });
    await a.ok('sit'); await b.ok('sit');
    await a.ok('programSave', { mode: 'survival-abend', lives: 1, entries: [{ game: 'schaetzmeister', settings: { rounds: 1 } }] });
    await a.ok('programStart'); const guestId = b.state.you.id;
    await b.ok('leave');
    await until(() => a.state.partyProgram?.status === 'done');
    assert.equal(a.state.partyProgram.lives[guestId], 0);
    assert.deepEqual(a.state.partyProgram.winners, ['Anna']);
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});

test('Survival: a long-game live snapshot resumes after restart and counts completion without a fresh ranked round', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'survival-live-')); let app = await server(dir); const clients = [];
  try {
    let a = await client(app.url), b = await client(app.url); clients.push(a,b);
    const created = await a.ok('create', { game: 'gebietskampf', name: 'Anna' }), joined = await b.ok('join', { code: created.code, name: 'Ben' });
    await a.ok('sit'); await b.ok('sit');
    await a.ok('programSave', { mode: 'survival-abend', entries: [{ game: 'gebietskampf', settings: { map: 'small', turnTime: 0 } }] });
    await a.ok('programStart'); const guestId = b.state.you.id;
    await until(() => saved(dir)?.extra?.phase === 'playing');
    a.close(); b.close(); await app.stop(); app = await server(dir);
    a = await client(app.url); b = await client(app.url); clients.push(a,b);
    await a.ok('join', { code: created.code, token: created.token }); await b.ok('join', { code: created.code, token: joined.token });
    assert.equal(a.state.phase, 'playing'); assert.equal(a.state.partyProgram.results.length, 0);
    await b.ok('leave'); await until(() => a.state.partyProgram?.status === 'done');
    assert.equal(a.state.partyProgram.lives[guestId], 0);
    assert.equal(a.state.partyProgram.results.length, 1);
    assert.deepEqual(a.state.partyProgram.winners, ['Anna']);
    await until(() => saved(dir)?.partyProgram?.status === 'done');
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});

test('Survival: an eliminated Host keeps control and starts the next real station as a spectator', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'survival-host-')), app = await server(dir), clients = [];
  try {
    const a = await client(app.url), b = await client(app.url), c = await client(app.url); clients.push(a,b,c);
    const created = await a.ok('create', { game: 'schaetzmeister', name: 'Anna' });
    await b.ok('join', { code: created.code, name: 'Ben' }); await c.ok('join', { code: created.code, name: 'Cara' });
    for (const s of clients) await s.ok('sit');
    await a.ok('custom', { text: 'Test question? | 100 | Points' });
    await a.ok('programSave', { mode: 'survival-abend', lives: 1, entries: [{ game: 'schaetzmeister', settings: { rounds: 1 } }] });
    await a.ok('programStart'); await a.ok('guess', { text: '0' }); await b.ok('guess', { text: '100' }); await c.ok('guess', { text: '90' });
    await a.ok('next'); await until(() => a.state.partyProgram?.status === 'between');
    assert.equal(a.state.partyProgram.lives[a.state.you.id], 0);
    await a.ok('programNext');
    await until(() => clients.every((s) => s.state?.phase === 'playing' && s.state.partyProgram.index === 1));
    assert.equal(a.state.you.isHost, true); assert.equal(a.state.you.inRound, false); assert.equal(a.state.you.playing, false);
    assert.equal(b.state.you.inRound, true); assert.equal(c.state.you.inRound, true);
    assert.equal((await a.ask('sit')).ok, false);
  } finally { clients.forEach((s) => s.close()); await app.stop(); }
});
