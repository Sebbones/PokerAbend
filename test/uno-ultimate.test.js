import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { GAMES } from '../games/index.js';
import { Room as ClassicRoom } from '../games/farbenchaos/room.js';
import { BOTS } from '../games/bots.js';
import { scoreKey, variantName } from '../games/variants.js';
import { seeded } from './sim-helpers.js';
import { i18nContext } from './i18n-harness.js';

const ghost = 'halloween-ghosthunt', modes = ['classic','flip','no-mercy','all-wild',ghost];
function table(t, settings = {}, variant = ghost) {
  const r = GAMES.farbenchaos.create('SPOOK', { variant, turnTime: 0, ...settings }, () => {});
  t.after(() => r.dispose());
  const ids = ['Anna','Ben','Cem'].map((name) => { const p = r.addPlayer(name, null); r.sit(p.id); return p.id; });
  r.start(ids[0]); return { r, ids };
}
function renderer({ reduced = true, calm = false, language = 'de' } = {}) {
  let def; const animations = [], dataset = {}, prefs = { calm };
  const area = { animate(frames, options) { const a = { frames, options, finished: Promise.resolve(), cancel() {} }; animations.push(a); return a; } };
  const root = { dataset, querySelector: () => area };
  const context = i18nContext({
    document: { addEventListener() {}, querySelector: () => root, querySelectorAll: () => [], documentElement: { lang: language } },
    prefs, matchMedia: () => ({ matches: reduced }),
    getComputedStyle: () => ({ getPropertyValue: () => '#b7cc9570' }),
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    colorMark: () => '', kitShedding: (d) => { def = d; },
  }, language);
  vm.runInContext(readFileSync(new URL('../public/games/card-interaction.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../public/games/farbenchaos/farbenchaos.js', import.meta.url), 'utf8'), context);
  return { def, animations, dataset, prefs };
}

test('Spuknacht is a fifth selectable variant using the exact Classic engine, all options and a separate score key', (t) => {
  assert.deepEqual(GAMES.farbenchaos.variants.map((v) => v.id), modes);
  const settings = { handSize: 9, stacking: true, sevenZero: true, drawUntil: true, unoCall: true, strictPlus4: true, startAction: true, catchCall: true };
  const { r } = table(t, settings), { r: classic } = table(t, settings, 'classic');
  assert.equal(r.constructor, ClassicRoom); assert.deepEqual(r.settings, classic.settings);
  assert.deepEqual(r.buildDeck(), classic.buildDeck()); assert.equal(r.buildDeck().length, 108);
  assert.equal(GAMES.farbenchaos.variants.at(-1).options, ClassicRoom.OPTIONS);
  assert.equal(scoreKey('farbenchaos', ghost), `farbenchaos~${ghost}`);
  assert.equal(variantName('farbenchaos', 'UNO', ghost), 'UNO: Spuknacht');
  assert.equal(r.opts.minPlayers, 2); assert.equal(r.opts.maxPlayers, 8);
});

test('Spuknacht preserves Classic stacking, skip and reverse effects', (t) => {
  const { r, ids: [a,b,c] } = table(t, { stacking: true });
  r.discard = ['3r']; r.hands[a] = ['Dr','4g']; r.hands[b] = ['Dy','4b'];
  r.play(a, 'Dr', null, true); r.play(b, 'Dy', null, true);
  assert.equal(r.pending, 4); const before = r.hands[c].length;
  r.draw(c); assert.equal(r.hands[c].length, before + 4); assert.equal(r.pending, 0);
  r.turn = 0; r.discard = ['3r']; r.hands[a] = ['Sr','Rr','8g'];
  r.play(a, 'Sr', null, true); assert.equal(r.currentId, c);
  r.turn = 0; r.play(a, 'Rr', null, true); assert.equal(r.dir, -1); assert.equal(r.currentId, c);
});

test('Spuknacht preserves strict +4, seven-zero hand exchange and catchable UNO calls', (t) => {
  const { r, ids: [a,b] } = table(t, { strictPlus4: true, sevenZero: true, unoCall: true, catchCall: true });
  r.discard = ['3r']; r.hands[a] = ['Fw','5r','7r'];
  assert.throws(() => r.play(a, 'Fw', 'b', true));
  const other = [...r.hands[b]]; r.play(a, '7r', null, true, b); assert.deepEqual(r.hands[a], other);
  r.turn = 0; r.discard = ['3r']; r.hands[a] = ['2r','4g']; r.drawn = null;
  r.play(a, '2r', null, false); assert.equal(r.forgot, a);
  r.catchForgot(b); assert.equal(r.hands[a].length, 3); assert.equal(r.forgot, null);
});

test('Spuknacht draw-until and final scoring use Classic rules and restore the chosen variant', (t) => {
  const { r, ids: [a,b,c] } = table(t, { drawUntil: true });
  r.discard = ['5r']; r.hands[a] = ['9g','7y']; r.deck = ['2r','3b','4b'];
  r.draw(a); assert.equal(r.drawn, '2r'); assert.equal(r.hands[a].length, 5);
  r.turn = 0; r.drawn = null; r.discard = ['3r']; r.hands[a] = ['1r']; r.hands[b] = ['Dr','7g','Ww']; r.hands[c] = ['3b'];
  r.play(a, '1r', null, true); assert.equal(r.phase, 'over'); assert.equal(r.result.points[a], 80);
  const restored = GAMES.farbenchaos.restore(r.snapshot(), () => {}); t.after(() => restored.dispose());
  assert.equal(restored.variant, ghost); assert.equal(restored.constructor, ClassicRoom);
  // Existing snapshots intentionally restore between rounds, with scores and settings.
  assert.equal(restored.phase, 'lobby'); assert.deepEqual(restored.scores, r.scores); assert.deepEqual(restored.wins, r.wins);
});

test('Spuknacht completes 60 bot rounds without losing any of the 108 cards', () => {
  const rng = seeded(311026);
  for (let n = 0; n < 60; n++) {
    const r = GAMES.farbenchaos.create('BOT', { variant: ghost, turnTime: 0, stacking: n % 2 === 0, sevenZero: n % 3 === 0, catchCall: true, unoCall: true }, () => {});
    try {
      for (const name of ['A','B','C']) { const p = r.addPlayer(name, null); r.sit(p.id); }
      r.start(r.seats[0]); let turns = 0;
      while (r.phase === 'playing' && ++turns < 10000) {
        BOTS.farbenchaos(r, r.currentId, rng);
        assert.equal(r.deck.length + r.discard.length + Object.values(r.hands).flat().length, 108);
      }
      assert.equal(r.phase, 'over', `round ${n} exceeded ${turns} actions`);
    } finally { r.dispose(); }
  }
});

for (const variant of modes) test(`UNO material ${variant}: all actual card values have themed faces, readable symbols and a safe back`, (t) => {
  const { r, ids: [a] } = table(t, {}, variant), { def } = renderer();
  const state = r.view(a), deck = r.buildDeck();
  const faces = [...new Set(deck.flatMap((c) => typeof c === 'string' ? [c] : c.faces))];
  for (const code of faces) {
    const s = { ...state, g: { ...state.g, side: 'ptov'.includes(code[1]) ? 1 : 0 } };
    const face = def.card(code, {}, s);
    assert.ok(face.includes(`data-action="${code[0]}"`));
    assert.ok(face.includes(`data-uno-theme="${variant === ghost ? 'ghosthunt' : variant}"`));
    assert.match(face, /aria-label="[^"<>]+"/); assert.ok(!face.includes('undefined'));
    assert.ok(!face.includes('fc-corner-symbol"><span class="fc-composite">'));
    if (!/\d/.test(code[0])) assert.ok(face.includes('fc-symbol') || face.includes(`+${code[0] === 'Z' ? 10 : 2}`) || /\+\d/.test(face));
    assert.ok(!def.playHint({top:code,playable:[code]}).includes('undefined'));
    assert.ok(Number.isFinite(def.sort.color(code))); assert.ok(Number.isFinite(def.sort.number(code)));
  }
  const before = def.backCard(17, state);
  state.g.hand = ['SECRET-HAND'];
  assert.equal(def.backCard(17, state), before); assert.ok(!before.includes('SECRET-HAND'));
  assert.match(before, /data-uno-back=/);
  if (variant === 'flip') assert.ok(def.sort.color('7v') < def.sort.color('Ww'));
  const english = renderer({ language: 'en' }).def.lobby(state);
  assert.match(english, /Players/); assert.ok(!english.includes('undefined'));
});

test('UNO effects use public changes only, respect both motion controls and never animate an initial/reconnected hand', async () => {
  const state = { code:'FIRST', variant: 'flip', phase: 'playing', roundNo: 1, you: { id: 'me' }, players: [], g: { side: 0, top: '2r', hand: ['PRIVATE'] } };
  for (const controls of [{ reduced: true }, { reduced: false, calm: true }, { reduced: false }]) {
    const { def, animations, dataset } = renderer(controls);
    def.onState(state, null); def.afterRender(state); assert.equal(animations.length, 0);
    const hidden = structuredClone(state); hidden.g.hand = ['DIFFERENT-PRIVATE'];
    def.onState(hidden, state); def.afterRender(hidden); assert.equal(animations.length, 0);
    const anotherRoom = structuredClone(state); anotherRoom.code = 'SECOND'; anotherRoom.g.side = 1;
    def.onState(anotherRoom, state); def.afterRender(anotherRoom); assert.equal(animations.length, 0);
    const flipped = structuredClone(state); flipped.g.side = 1; flipped.g.hand = ['NEW-AUTHORISED-FACE'];
    def.onState(flipped, state); def.afterRender(flipped);
    assert.equal(animations.length, controls.reduced || controls.calm ? 0 : 1);
    assert.equal(dataset.unoSide, 'dark');
    assert.ok(!JSON.stringify(animations).includes('PRIVATE'));
    if (animations.length) assert.equal(animations[0].options.duration, 380);
    const paused = structuredClone(state); paused.gamePaused = true;
    const count = animations.length; def.onState(paused, flipped); def.afterRender(paused);
    assert.equal(animations.length, count); assert.equal(dataset.unoEffect, undefined);
  }
});

test('Ghost Night and No Mercy effects are short public-state cues, cancelled while paused', () => {
  for (const variant of [ghost,'no-mercy']) {
    const { def, animations, dataset } = renderer({ reduced: false });
    const prev = { variant, phase:'playing', roundNo:1, players:[{id:'a',eliminated:false}], g:{top:'3r'} };
    const next = structuredClone(prev);
    if (variant === ghost) next.g.top = 'Fw'; else next.players[0].eliminated = true;
    def.onState(next, prev); def.afterRender(next);
    assert.equal(animations.length, 1); assert.equal(animations[0].options.duration, 440);
    assert.equal(dataset.unoEffect, variant === ghost ? 'spectral' : 'eliminated');
    assert.ok(!JSON.stringify(animations).includes('var('));
    def.afterRender({...next,gamePaused:true}); assert.equal(dataset.unoEffect, undefined);
  }
});
