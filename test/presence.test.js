import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPresence } from '../server/presence.js';

function setup() {
  let clock = 1000000, callback = null, scheduled = 0;
  const locations = new Map(), sent = [];
  const p = createPresence({ now: () => clock, location: (id) => locations.get(id) || { kind: 'home' }, emit: (value) => sent.push(value),
    setTimer: (fn, delay) => { assert.equal(delay, 2000); scheduled++; callback = fn; return 1; }, clearTimer: () => { callback = null; } });
  return { p, locations, sent, update: (id, patch = {}) => p.update(id, { name: 'Anna', avatar: '🦉', visible: true, active: true, ...patch }),
    flush: () => { const fn = callback; callback = null; fn?.(); }, advance: (ms) => { clock += ms; }, scheduled: () => scheduled };
}

test('Presence: normalisierter Name bündelt Tabs, aktivster Status gewinnt; Trennen und zuletzt online', () => {
  const { p, update, locations, advance } = setup();
  update('a'); update('b', { name: '  ANNA  ' });
  assert.equal(p.snapshot().online.length, 1);
  assert.equal(p.snapshot().online[0].kind, 'home');
  locations.set('b', { kind: 'playing', code: 'ABCDE', gameName: 'UNO', game: 'farbenchaos', canJoin: true });
  p.changed();
  assert.equal(p.snapshot().online[0].status, 'spielt UNO');
  assert.equal(p.snapshot().online[0].code, 'ABCDE');
  update('b', { active: false });
  assert.equal(p.snapshot().online[0].kind, 'home');
  p.disconnect('a');
  assert.equal(p.snapshot().online[0].kind, 'away');
  p.disconnect('b');
  assert.equal(p.snapshot().online.length, 0);
  assert.equal(p.snapshot().recent.length, 1);
  advance(86400001);
  assert.equal(p.snapshot().recent.length, 0);
});

test('Presence: privater Tisch verrät weder Spiel noch Code, Bots fehlen vollständig', () => {
  const { p, update, locations } = setup();
  locations.set('a', { kind: 'watching', code: 'SECRET', game: 'poker', gameName: 'Poker', private: true });
  update('a');
  const row = p.snapshot().online[0];
  assert.equal(row.status, 'an einem privaten Tisch');
  assert.ok(!JSON.stringify(row).includes('SECRET'));
  assert.equal(row.game, undefined);
  locations.set('b', { bot: true });
  update('b', { name: 'Bot 1' });
  assert.equal(p.snapshot().online.length, 1);
  p.disconnect('b');
  assert.equal(p.snapshot().recent.length, 0);
});

test('Presence: Unsichtbare fehlen auch nach Umbenennen/Trennen und bei mehreren Tabs; park kehrt in den Hub zurück', () => {
  const { p, update } = setup();
  update('a'); update('b');
  update('a', { visible: false });
  assert.deepEqual(p.snapshot(), { online: [], recent: [] });
  p.disconnect('a'); p.disconnect('b');
  assert.deepEqual(p.snapshot(), { online: [], recent: [] });
  update('a', { visible: false });
  update('a', { name: 'Ben', visible: false });
  assert.deepEqual(p.snapshot(), { online: [], recent: [] });
  update('a', { name: 'Ben' });
  p.park('a');
  assert.equal(p.snapshot().online[0].kind, 'home');
  update('a', { name: 'Ben' });
  assert.equal(p.snapshot().online[0].kind, 'home');
});

test('Presence: viele Änderungen ergeben wenige Sendungen, kaputte Eingaben bleiben harmlos', () => {
  const { p, update, flush, scheduled, sent } = setup();
  for (let n = 0; n < 100; n++) update('a', { active: n % 2 === 0 });
  assert.equal(scheduled(), 1);
  flush();
  assert.equal(sent.length, 1);
  for (const data of [null, undefined, [], 3, 'Anna', {}, { name: {} }, { name: '' }, { name: '\u0000' }, { name: 'Anna', visible: 'false' }, { name: 'Anna', active: {} }]) assert.equal(p.update('bad', data), false);
  p.changed(); flush();
  assert.equal(sent.length, 1);
  update('a', { name: '\u0000  Anna\n', avatar: '<script>' }); flush();
  assert.equal(p.snapshot().online[0].name, 'Anna');
  assert.ok(!JSON.stringify(p.snapshot()).includes('<script>'));
  p.dispose();
});
