import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { GAMES } from '../games/index.js';

const variants = { farbenchaos: ['classic', 'flip', 'no-mercy', 'all-wild'], stapelrennen: ['classic', 'short', 'team'], zehnetappen: ['classic', 'short', 'team'] };
function renderer(game, language = 'de') {
  let def;
  const html = (s, ...values) => typeof s === 'string' ? s : s.reduce((out, part, i) => out + part + (values[i] ?? ''), '');
  const context = vm.createContext({
    I18n: { language, html, t: (s) => s },
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    colorMark: (c) => `<i data-colour="${c}"></i>`, svg: (s) => `<svg>${s}</svg>`, backCard: (n) => `<span>${n}</span>`,
    kitGame: (d) => { def = d; return { render() {} }; }, kitShedding: (d) => { def = d; },
  });
  context.window=context;
  vm.runInContext(readFileSync(new URL('../public/games/card-interaction.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL(`../public/games/${game}/${game}.js`, import.meta.url), 'utf8'), context);
  return def;
}
function room(t, game, variant) {
  const r = GAMES[game].create('KARTEN', { variant, turnTime: 0, startAction: false }, () => {});
  t.after(() => r.dispose());
  const ids = ['Anna', 'Ben', ...(variant === 'team' ? ['Cem', 'Dana'] : [])].map((name) => { const p = r.addPlayer(name, null); r.sit(p.id); return p.id; });
  const watcher = r.addPlayer('Robin', null).id;
  r.start(ids[0]); return { r, ids, watcher };
}
const surface = (def, s) => def.main ? def.main(s) : def.tableIntro(s) + def.extraMain(s);

for (const [game, modes] of Object.entries(variants)) for (const variant of modes) {
  test(`Card design ${game}/${variant}: private cards cannot change other viewers' rendered workspace`, (t) => {
    const { r, ids: [owner, other], watcher } = room(t, game, variant), def = renderer(game);
    for (const viewer of [other, watcher]) {
      const before = surface(def, r.view(viewer));
      if (game === 'stapelrennen') {
        r.hand[owner][0] = (r.hand[owner][0] + 5) % 13;
        r.stock[owner][0] = (r.stock[owner][0] + 7) % 13;
      } else if (game === 'zehnetappen') r.hands[owner][0] = { ...r.hands[owner][0], c: 'r', n: 11 };
      else if (variant === 'classic') r.hands[owner][0] = r.hands[owner][0] === '9r' ? '8g' : '9r';
      else r.hands[owner][0].faces[r.side || 0] = r.hands[owner][0].faces[r.side || 0] === '9r' ? '8g' : '9r';
      assert.equal(surface(def, r.view(viewer)), before);
      if (viewer === watcher) assert.equal(r.view(viewer).g.hand, null);
    }
    const s = r.view(owner); s.players[1].name = '"><img src=x onerror=alert(1)>';
    for (const output of [def.lobby(s), surface(def, s)]) {
      assert.ok(!output.includes('<img src=x'));
    }
    assert.match(def.lobby(s), /&lt;img/);
    const en = renderer(game, 'en').lobby(s);
    assert.match(en, /Players/); assert.ok(!en.includes('Warten auf Mitspieler'));
    assert.equal(def.ring, false);
  });
}

test('UNO design: active Flip side and inactive public faces are labelled separately', (t) => {
  const { r, ids: [owner, other] } = room(t, 'farbenchaos', 'flip'), def = renderer('farbenchaos', 'en');
  r.side = 0;
  let s = r.view(owner);
  assert.match(def.tableIntro(s), /Light side/);
  for (const c of s.g.inactiveHands[other]) assert.ok(def.extraMain(s).includes(`fc-${c[1]}`));
  r.side = 1; s = r.view(owner);
  assert.match(def.tableIntro(s), /Dark side/);
  assert.ok(!def.extraMain(s).includes('undefined'));
});

test('Skip-Bo design: only open partner sources are interactive and retain their owner', (t) => {
  const { r, ids: [owner, other, partner] } = room(t, 'stapelrennen', 'team'), def = renderer('stapelrennen');
  const own = def.main(r.view(owner));
  assert.match(own, new RegExp(`data-kind="stock" data-owner="${partner}"`));
  assert.ok(!own.includes(`data-owner="${other}"`));
  assert.ok(!own.includes('data-kind="hand" data-owner='));
  r.turn = 1;
  assert.ok(!def.main(r.view(owner)).includes(`data-owner="${partner}"`));
});
