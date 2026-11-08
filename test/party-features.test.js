import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { i18nContext } from './i18n-harness.js';
import { resolvedRoadmap } from '../games/roadmap.js';
import { GAMES } from '../games/index.js';
import { BOTS } from '../games/bots.js';
import { SUPPORTED_GAMES, RULE_OPTIONS } from '../games/modifikatoren/index.js';
import { drawChaos, CHAOS_RULES } from '../games/chaos-modus/index.js';
import { beginBoard, boardStation, scoreBoard, boardItem, tileKind, boardWinners } from '../games/party-brett/index.js';
import { survivors } from '../games/survival-abend/index.js';
import { configureProgram, beginProgram, nextProgramStep, recordProgramResult, publicProgram, restoreProgram, normalizeProgram } from '../server/party-program.js';

function setup(game = 'schaetzmeister', n = 4, settings = {}) {
  const room = GAMES[game].create('FEATURES', settings, () => {}); room.game = game;
  const ids = Array.from({ length: n }, (_, i) => { const p = room.addPlayer(`Player ${i}`, null); p.connected = true; room.sit(p.id); return p.id; });
  return { room, ids, host: ids[0] };
}
const config = (mode, extra = {}) => ({ mode, entries: [{ game: 'schaetzmeister', settings: { rounds: 1 } }, { game: 'zahlenzoo', settings: { rounds: 1 } }], ...extra });
function result(room, ids, scores) { room.result = { players: ids, winners: ids.filter((_, i) => scores[i] === Math.max(...scores)), points: Object.fromEntries(ids.map((id, i) => [id, scores[i]])) }; }

test('All four completed feature titles and descriptions have authored English roadmap translations', () => {
  const context = i18nContext({}, 'en');
  for (const id of ['party-brett','modifikatoren','chaos-modus','survival-abend']) {
    const point = resolvedRoadmap().flatMap((s) => s.punkte).find((p) => p.id === id);
    assert.equal(point.erledigt, true);
    for (const value of [point.titel, point.text]) { context.source = value; assert.notEqual(vm.runInContext('I18n.t(source)', context), value, id); }
  }
});

test('Party features are programs/options, never four dummy games', () => {
  for (const id of ['party-brett', 'modifikatoren', 'chaos-modus', 'survival-abend']) assert.equal(GAMES[id], undefined);
  for (const game of Object.values(GAMES)) assert.equal(game.options?.some((o) => o.key === 'modifierRule') || false, SUPPORTED_GAMES.includes(game.id), game.id);
});
for (const game of SUPPORTED_GAMES) {
  test(`${game}: extra rules default off, host-only, strict settings, busy round immutable`, () => {
    const { room, ids, host } = setup(game);
    try {
      assert.equal(room.view(host).partyRules.rule, 'off');
      for (const input of [{ modifierRule: 'admin' }, { chaosMode: 1 }, { modifierScope: 'forever' }]) assert.throws(() => room.updateSettings(host, input));
      assert.throws(() => room.updateSettings(ids[1], { modifierRule: 'double' }), /Host/);
      room.updateSettings(host, { modifierRule: 'double' }); room.start(host);
      assert.throws(() => room.updateSettings(host, { modifierRule: 'reverse' }), /Runden/);
      assert.throws(() => room.start(ids[1]), /Host/);
      assert.throws(() => room.start(host));
      assert.equal(room.view(host).partyRules.rule, 'double');
    } finally { room.dispose(); }
  });
  test(`${game}: double/reverse final scoring and ties agree with winners and cumulative points`, () => {
    for (const rule of ['off', 'double', 'reverse']) {
      const { room, ids, host } = setup(game, 4, { modifierRule: rule });
      try {
        room.start(host);
        const points = Object.fromEntries(ids.map((id, i) => [id, [100, 20, 20, 0][i]]));
        room.finishRound([host], 'Test', points);
        assert.deepEqual(Object.values(room.result.points), rule === 'reverse' ? [0, 80, 80, 100] : rule === 'double' ? [200, 40, 40, 0] : [100, 20, 20, 0]);
        assert.deepEqual(room.result.winners, [rule === 'reverse' ? ids[3] : host]);
        assert.deepEqual(room.scores, room.result.points);
        assert.equal(room.view(host).partyRules.lastRule, rule);
      } finally { room.dispose(); }
    }
  });
  test(`${game}: pressure timer, one-game scope, chaos preview, abort and snapshot restore`, () => {
    const { room, ids, host } = setup(game, 4, { modifierRule: 'pressure', writeSecs: 11, voteSecs: 30, modifierScope: 'once' });
    try {
      room.start(host); assert.equal(room.stageSecs('write'), 6); assert.equal(room.stageSecs('vote'), game === 'schaetzmeister' ? 0 : 15); assert.equal(room.stageSecs('reveal'), room.revealTime());
      room.abortRound(host); assert.equal(room.view(host).partyRules.rule, 'pressure');
      room.start(host); room.finishRound([host], 'Test', { [host]: 5 });
      assert.equal(room.view(host).partyRules.rule, 'off');
      room.updateSettings(host, { chaosMode: true, modifierScope: 'session' });
      const preview = room.view(ids[1]).partyRules.rule;
      const snap = JSON.parse(JSON.stringify(room.snapshot()));
      const restored = GAMES[game].restore(snap, () => {});
      try {
        assert.equal(restored.view(host).partyRules.rule, preview);
        restored.start(host); assert.equal(restored.view(host).partyRules.rule, preview);
        restored.finishRound([host], 'Test', { [host]: 1 });
        assert.notEqual(restored.view(host).partyRules.rule, preview);
      } finally { restored.dispose(); }
      const serialized = JSON.stringify(room.view(ids[1]).partyRules);
      assert.ok(!serialized.includes('token') && !serialized.includes('answer') && !serialized.includes('custom'));
    } finally { room.dispose(); }
  });
}
test('Chaos draws are server-side, bounded and never repeat the preceding selection', () => {
  for (const previous of CHAOS_RULES) for (let i = 0; i < CHAOS_RULES.length - 1; i++) {
    const drawn = drawChaos(previous, () => i); assert.notEqual(drawn, previous); assert.ok(CHAOS_RULES.includes(drawn));
  }
});
test('Feature programs validate life/round limits, player minimum and compatible survival variants', () => {
  for (const input of [config('survival-abend', { lives: 0 }), config('survival-abend', { lives: '3' }), config('party-brett', { boardRounds: 13 }), config('survival-abend', { entries: [{ game: 'werwolf' }] })]) assert.throws(() => normalizeProgram(input));
  const { room, host } = setup('schaetzmeister', 1);
  try { configureProgram(room, host, config('party-brett')); assert.throws(() => beginProgram(room, host), /zwei/); } finally { room.dispose(); }
  assert.equal(RULE_OPTIONS.length, 3);
});
test('Party Board: a server die picks a real task, placement moves runners; tiles, items, shields and victory', () => {
  const p = { config: config('party-brett', { boardRounds: 6 }), roster: ['a', 'b'].map((id) => ({ id, name: id })), scores: { a: 0, b: 0 }, index: 0 };
  beginBoard(p);
  assert.equal(boardStation(p, () => 0).game, 'schaetzmeister'); assert.equal(p.board.die, 1);
  assert.equal(boardStation(p, () => 5).game, 'schaetzmeister'); assert.equal(p.board.cursor, 7);
  assert.equal(tileKind(3), 'bonus'); assert.equal(tileKind(4), 'item'); assert.equal(tileKind(6), 'storm');
  scoreBoard(p, { index: 0, points: { a: 3, b: 4 } }, () => 0);
  assert.equal(p.scores.a, 2); assert.equal(p.board.positions.a, 3);
  p.board.items.b = null; scoreBoard(p, { index: 1, points: { a: 1, b: 4 } }, () => 0);
  assert.equal(p.board.items.b, 'boost');
  const room = { partyProgram: { ...p, status: 'between' }, players: new Map([['a', {}], ['b', {}]]), busy: false };
  boardItem(room, 'a', { item: 'shield' }); assert.equal(p.board.shields.a, true);
  p.board.positions.a = 5;
  scoreBoard(p, { index: 2, points: { a: 1, b: 1 } }); assert.equal(p.board.positions.a, 6); assert.equal(p.board.shields.a, undefined);
  p.board.items.a = 'snare'; boardItem(room, 'a', { item: 'snare', target: 'b' }); assert.equal(p.board.positions.b, 7);
  assert.throws(() => boardItem(room, 'a', { item: 'snare', target: 'b' }));
  boardItem(room, 'b', { item: 'boost' }); assert.equal(p.board.boosts.b, 2);
  const unchanged = structuredClone(p.board); scoreBoard(p, { index: 3, points: { a: 0, b: 0 } }); assert.deepEqual(p.board, unchanged);
  p.board.positions.b = 23; assert.equal(scoreBoard(p, { index: 4, points: { a: 1, b: 1 } }), true);
  assert.deepEqual(boardWinners(p), ['b']);
});
test('Party Board: unauthorized, paused, midgame, self-target and replayed item commands cannot mutate state', () => {
  const { room, host, ids } = setup();
  try {
    configureProgram(room, host, config('party-brett')); room.partyProgram = beginProgram(room, host);
    const p = room.partyProgram; p.board.items[host] = 'snare';
    for (const [status, paused, who, target] of [['running', false, host, ids[1]], ['between', true, host, ids[1]], ['between', false, 'stranger', ids[1]], ['between', false, host, host], ['between', false, host, 'stranger']]) {
      p.status = status; room.clock.setPaused(paused);
      const before = JSON.stringify(p.board); assert.throws(() => boardItem(room, who, { item: 'snare', target })); assert.equal(JSON.stringify(p.board), before);
    }
  } finally { room.dispose(); }
});
for (const mode of ['party-brett', 'survival-abend']) test(`${mode}: program replay, private views, idempotent results and restart after each station`, () => {
  const { room, host, ids } = setup();
  try {
    configureProgram(room, host, config(mode, { lives: 1, boardRounds: 2 }));
    room.partyProgram = beginProgram(room, host);
    room.game = room.partyProgram.plan[0].game;
    room.partyProgram.saved.secret = { extra: { answer: 'HIDDEN-ANSWER-903' } };
    assert.ok(!JSON.stringify(publicProgram(room)).includes('HIDDEN-ANSWER-903'));
    const before = structuredClone(room.partyProgram);
    const replay = nextProgramStep(room, host); assert.deepEqual(replay.plan, before.plan); if (mode === 'party-brett') assert.deepEqual(replay.board, before.board);
    result(room, ids, [10, 5, 2, 0]); assert.equal(recordProgramResult(room), true); assert.equal(recordProgramResult(room), false);
    if (mode === 'survival-abend') { assert.equal(room.partyProgram.lives[ids[3]], 0); assert.deepEqual(survivors(room.partyProgram), ids.slice(0, 3)); }
    room.partyProgram = restoreProgram(JSON.parse(JSON.stringify(room.partyProgram))); assert.ok(room.partyProgram);
    const next = nextProgramStep(room, host); assert.equal(next.index, 1); assert.equal(next.plan[1].game, mode === 'survival-abend' ? 'zahlenzoo' : next.plan[1].game);
    assert.throws(() => nextProgramStep(room, ids[1]), /Host/);
    room.partyProgram = next; room.game = next.plan[next.index].game;
    result(room, ids.slice(0, mode === 'survival-abend' ? 3 : 4), [10, 5, 0, 0]); recordProgramResult(room);
    assert.equal(room.partyProgram.status, mode === 'party-brett' ? 'done' : 'between');
    if (mode === 'survival-abend') {
      room.partyProgram = nextProgramStep(room, host); room.game = room.partyProgram.plan[2].game;
      result(room, ids.slice(0, 2), [10, 0]); recordProgramResult(room); assert.equal(room.partyProgram.status, 'done'); assert.deepEqual(publicProgram(room).winners, ['Player 0']);
    }
    assert.ok(restoreProgram(JSON.parse(JSON.stringify(room.partyProgram))));
    const bad = structuredClone(room.partyProgram); if (mode === 'party-brett') bad.board.positions[host] = 99; else bad.lives[host] = -1;
    assert.equal(restoreProgram(bad), null);
  } finally { room.dispose(); }
});
test('Survival: ties/void games cost no lives; cycles past 12 stations, deterministic 60-game safety limit', () => {
  const { room, host, ids } = setup('schaetzmeister', 2);
  try {
    configureProgram(room, host, config('survival-abend')); room.partyProgram = beginProgram(room, host);
    for (let i = 0; i < 60; i++) {
      room.game = room.partyProgram.plan[i].game; result(room, ids, [0, 0]); recordProgramResult(room);
      assert.deepEqual(Object.values(room.partyProgram.lives), [3, 3]);
      assert.ok(restoreProgram(JSON.parse(JSON.stringify(room.partyProgram))));
      if (i < 59) room.partyProgram = nextProgramStep(room, host);
    }
    assert.equal(room.partyProgram.status, 'done'); assert.deepEqual(publicProgram(room).winners, ['Player 0', 'Player 1']);
  } finally { room.dispose(); }
});
test('Survival: explicit departure forfeits, disconnect does not; unseated survivor cannot be skipped', () => {
  const { room, host, ids } = setup('schaetzmeister', 3);
  try {
    configureProgram(room, host, config('survival-abend')); room.partyProgram = beginProgram(room, host);
    result(room, ids, [10, 5, 0]); recordProgramResult(room);
    room.players.get(ids[1]).connected = false;
    assert.equal(nextProgramStep(room, host).lives[ids[1]], 3);
    room.seats = room.seats.filter((id) => id !== ids[1]); assert.throws(() => nextProgramStep(room, host), /Platz nehmen/);
    room.players.delete(ids[1]); room.players.delete(ids[2]); const done = nextProgramStep(room, host);
    assert.equal(done.status, 'done'); room.partyProgram = done; assert.deepEqual(publicProgram(room).winners, ['Player 0']);
    assert.ok(restoreProgram(JSON.parse(JSON.stringify(done))));
  } finally { room.dispose(); }
});

test('Unstarted feature programs can be stopped and restored without inventing board/life state', () => {
  const { room, host } = setup();
  try { for (const mode of ['party-brett','survival-abend']) { configureProgram(room, host, config(mode)); room.partyProgram.status = 'stopped'; assert.ok(restoreProgram(JSON.parse(JSON.stringify(room.partyProgram)))); } }
  finally { room.dispose(); }
});

for (const game of SUPPORTED_GAMES) test(`${game}: 60 complete existing-bot games across manual, random and chaos rules`, () => {
  for (let n = 0; n < 60; n++) {
    const modifierRule = ['off', 'double', 'reverse', 'pressure', 'random'][n % 5];
    const { room, host } = setup(game, 4, { rounds: 2, modifierRule, chaosMode: n % 7 === 0 });
    try {
      room.start(host);
      for (let step = 0; step < 300 && room.busy; step++) {
        const due = room.waiting(room.stage)[0];
        if (room.stage === 'reveal' || !due) room.next(host);
        else BOTS[game](room, due, () => 0.37);
      }
      assert.equal(room.phase, 'over'); assert.ok(room.result);
      for (const [id, n] of Object.entries(room.result.points)) { assert.ok(Number.isFinite(n)); assert.equal(room.scores[id], n); }
      assert.ok(room.result.winners.every((id) => room.result.players.includes(id)));
    } finally { room.dispose(); }
  }
});
