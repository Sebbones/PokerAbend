import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {independentPlayer} from './independent-player.js';

const cases = [
  ['farbenchaos', 'classic'], ['farbenchaos', 'flip'], ['farbenchaos', 'no-mercy'], ['farbenchaos', 'all-wild'],
  ['stapelrennen', 'classic'], ['stapelrennen', 'short'], ['stapelrennen', 'team'],
  ['zehnetappen', 'classic'], ['zehnetappen', 'short'], ['zehnetappen', 'team'],
];
const desktopSizes = [[1920,1080], [1440,900], [768,1024], [390,844], [360,800], [900,450]];

for (const [game, variant] of cases) test(`Card worlds ${game}/${variant}: states, sizes, privacy and reconnect`, async ({ page, browser, app }, info) => {
  test.setTimeout(120000);
  const output = resolve('artifacts/cards-redesign', process.env.CARD_CAPTURE || 'after', info.project.name, `${game}-${variant}`);
  mkdirSync(output, { recursive: true });
  const contexts = [], errors = [], teamPlayers=[];
  const emit = async (target, event, data = {}) => {
    const reply = await target.evaluate(({ event, data }) => send(event, data), { event, data });
    expect(reply.ok, `${event}: ${reply.error}`).toBe(true); return reply;
  };
  const shot = async (target, state) => {
    expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), state).toBe(true);
    await target.screenshot({ path: resolve(output, `${target.viewportSize().width}x${target.viewportSize().height}-${state}.png`), fullPage: true });
  };
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, app, 'Anna'); await selectGame(page, game);
    await page.locator('#host-variant').selectOption(variant);
    await page.locator('#host-form button[type=submit]').click();
    await expect.poll(() => page.evaluate(() => lastState?.game)).toBe(game);
    await emit(page, 'sit'); await emit(page, 'settings', { turnTime: 0, startAction: false });
    await shot(page, 'lobby-waiting');
    const code = await page.evaluate(() => lastState.code);
    const guests = [];
    for (const [name, mode] of [['Ben', 'sit'], ['Robin', 'watch']]) {
      const context = await browser.newContext({ viewport: page.viewportSize(), reducedMotion: 'reduce', ...(info.project.use.isMobile ? { isMobile: true, hasTouch: true } : {}) });
      contexts.push(context); const guest = await context.newPage();
      guest.on('pageerror', (e) => errors.push(e.message));
      await login(guest, app, name);
      await guest.evaluate(({ code, mode }) => joinAndEnter(code, mode), { code, mode });
      await expect.poll(() => guest.evaluate(() => lastState?.code)).toBe(code); guests.push(guest);
    }
    if (variant === 'team') {
      for(const name of ['Cem','Dana'])teamPlayers.push(await independentPlayer(app,code,name));
    }
    await shot(page, 'lobby-ready'); await emit(page, 'start');
    const [guest, watcher] = guests;
    for (const target of [page, ...guests]) await expect.poll(() => target.evaluate(() => lastState?.phase)).toBe('playing');
    expect(await watcher.evaluate(() => lastState.g.hand)).toBeNull();
    const sizes = info.project.name === 'desktop' ? variant === 'classic' ? desktopSizes : [[1440,900], [390,844]] : [[390,844]];
    for (const [width, height] of sizes) {
      for (const target of [page, ...guests]) await target.setViewportSize({ width, height });
      await shot(page, 'own-turn'); await shot(guest, 'waiting'); await shot(watcher, 'spectator');
      const dock = await page.locator('#kg-dock').boundingBox();
      expect(dock.y).toBeGreaterThanOrEqual(0); expect(dock.y + dock.height).toBeLessThanOrEqual(height + 1);
      if (game === 'stapelrennen' && width === 900 && height === 450) {
        const main = await page.locator('#kg-main').boundingBox(), stock = await page.locator('.st-goal-stock .kc').boundingBox();
        expect(stock.y).toBeGreaterThanOrEqual(main.y);
        expect(stock.y + stock.height).toBeLessThanOrEqual(main.y + main.height + 1);
        await expect(page.locator('.st-shared')).toBeInViewport();
      }
    }
    if (variant === 'classic') {
      // Display-only fixtures exercise dense states; the live room and its rules
      // stay untouched. Reload afterwards before submitting any real action.
      await page.evaluate((game) => {
        const S = structuredClone(lastState), me = S.players.find((p) => p.id === S.you.id);
        S.turnId = S.you.id;
        if (game === 'farbenchaos') {
          Object.assign(S.g, { top: '7r', wish: null, pending: 4, drawn: null, forgot: null, hand: ['7r','Ww','Rb','9y','Fw','2b','Sg'], playable: ['7r','Ww'] });
        } else if (game === 'stapelrennen') {
          S.g.hand = [0,4,7,9,12]; S.g.build = [3,8,11,0].map((count) => ({ count, next: count + 1, jokers: [] }));
          me.stock = 20; me.stockTop = 4; me.piles = [[1,7], [8], [], [3,12]];
        } else {
          me.phase = 2; me.laidDone = false;
          Object.assign(S.g, { step: 'play', myPhase: 2, myGroups: [{ type: 'set', size: 3 }, { type: 'run', size: 4 }], phaseText: 'Drilling + 4er-Folge', laid: {}, hand: [['r',7],['g',7],['b',7],['r',3],['g',4],['b',5],['y',6],['j',0],['r',8],['b',12]].map(([c,n],i) => ({ id: 9000+i,c,n })) });
        }
        current.onState(S);
      }, game);
      if (game === 'farbenchaos') {
        await page.locator('.kg-hand [data-card="Ww"]').click();
        await page.locator('.kg-acts [data-g="play-selected"]').click();
        await expect(page.locator('.kg-wishes .wish')).toHaveCount(4);
        await shot(page, 'fixture-colour-choice');
      } else if (game === 'stapelrennen') {
        await page.locator('.st-mine [data-kind="stock"]').click();
        await shot(page, 'fixture-stack-choice');
      } else {
        for (const index of [0,1,2]) await page.locator('.ze-hand .kc').nth(index).click();
        await page.locator('.ze-slot').nth(1).locator('.ze-slot-head').click();
        for (const index of [3,4,5,6,7,8]) await page.locator('.ze-hand .kc').nth(index).click();
        await expect(page.locator('[data-g="lay"]')).toBeEnabled();
        await shot(page, 'fixture-two-groups');
      }
      const selected = game === 'farbenchaos' ? '.kg-wishes .wish' : game === 'stapelrennen' ? '.st-mine .sel' : '.ze-hand .ze-badge';
      const count = await page.locator(selected).count();
      expect(count).toBeGreaterThan(0);
      await page.evaluate(() => I18n.select('en'));
      await expect(page.locator(selected)).toHaveCount(count);
      await page.evaluate(() => I18n.select('de'));
      await expect(page.locator(selected)).toHaveCount(count);
      if (game === 'farbenchaos') {
        await page.evaluate(() => {
          const S = structuredClone(lastState);
          S.turnId = S.you.id;
          S.g.hand = Array.from({ length: 24 }, (_, i) => `${i % 10}${'rgby'[i % 4]}`);
          S.players.find((p) => p.id === S.you.id).cards = S.g.hand.length;
          S.g.playable = [...S.g.hand];
          current.onState(S);
        });
        const denseSizes = info.project.name === 'desktop' ? [[1440,900], [360,800], [900,450]] : [[390,844]];
        for (const [width, height] of denseSizes) {
          await page.setViewportSize({ width, height });
          expect(await page.locator('.kg-hand .kc').first().evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
          await page.locator('.kg-hand .kc').last().scrollIntoViewIfNeeded();
          await expect(page.locator('.kg-hand .kc').last()).toBeInViewport();
          await page.locator('.kg-hand .kc').last().focus();
          await expect(page.locator('.kg-hand .kc').last()).toBeFocused();
          const dock = await page.locator('#kg-dock').boundingBox();
          expect(dock.y + dock.height).toBeLessThanOrEqual(height + 1);
          await shot(page, 'fixture-long-hand');
        }
      }
      await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.phase)).toBe('playing');
    }
    if (game === 'farbenchaos' && variant !== 'classic') {
      await page.evaluate((variant) => {
        const S = structuredClone(lastState); S.turnId = S.you.id;
        if (variant === 'flip') {
          Object.assign(S.g, { side: 1, colors: ['p','t','o','v'], top: '7p', hand: ['7p','Ww'], playable: ['7p','Ww'], drawBack: '7r', pending: 0, wish: null });
          S.g.inactiveHands = Object.fromEntries(S.players.filter((p) => p.inRound && p.id !== S.you.id).map((p) => [p.id, ['7r','Lb']]));
        } else if (variant === 'no-mercy') {
          Object.assign(S.g, { pending: 10, challenge: { from: S.players[1].id }, challengeHand: ['3r','Zw'] });
        } else Object.assign(S.g, { hand: ['Xw','Ww'], playable: ['Xw','Ww'] });
        current.onState(S);
      }, variant);
      if (variant === 'flip') {
        await expect(page.locator('.fc-side-state')).toHaveText('◐ Dunkle Seite');
        await page.locator('.kg-hand [data-card="Ww"]').click();
        await page.locator('.kg-acts [data-g="play-selected"]').click();
        await expect(page.locator('.kg-wishes .wish')).toHaveCount(4);
        await expect(page.locator('.kg-wishes')).toContainText('Pink');
        const purple = page.locator('.kg-wishes .fc-v');
        await purple.hover();
        await expect(purple).toHaveCSS('background-color', 'rgb(128, 70, 180)');
        const circle = await purple.boundingBox();
        expect(Math.abs(circle.width - circle.height)).toBeLessThanOrEqual(1);
      } else if (variant === 'no-mercy') {
        await expect(page.locator('[data-g="challengeDraw"]')).toBeVisible();
      } else {
        await page.locator('.kg-hand [data-card="Xw"]').click();
        await page.locator('.kg-acts [data-g="play-selected"]').click();
        await expect(page.locator('[data-g="target"]')).toHaveCount(1);
      }
      await shot(page, 'fixture-variant-action');
      await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.phase)).toBe('playing');
    }
    await emit(page, 'gamePause', { paused: true });
    await expect(watcher.locator('#game-pause-banner')).toBeVisible(); await shot(page, 'paused');
    const hand = await page.evaluate(() => lastState.g.hand);
    await page.locator('[data-kit-panel="me"]').click();
    await page.locator('#kg-panel [data-language]').selectOption('en');
    await page.locator('.panel-head [data-kit="close"]').click();
    await shot(page, 'english');
    await page.reload(); await expect(page.locator('#game-pause-banner')).toBeVisible();
    expect(await page.evaluate(() => lastState.g.hand)).toEqual(hand);
    await emit(page, 'gamePause', { paused: false });
    if (variant === 'classic') {
      const owner = await page.evaluate(() => lastState.you.id);
      if (game === 'farbenchaos') {
        await page.locator('[data-g="draw"]').click();
        await expect.poll(() => page.evaluate(() => JSON.stringify(lastState.g.hand))).not.toBe(JSON.stringify(hand));
      } else if (game === 'stapelrennen') {
        await page.locator('.kg-hand [data-kind="hand"]').first().click();
        await page.locator('.st-mine [data-g="drop"]').first().click();
        await expect.poll(() => page.evaluate(() => lastState.turnId)).not.toBe(owner);
      } else {
        await page.locator('[data-g="draw-deck"]').click();
        await expect.poll(() => page.evaluate(() => lastState.g.step)).toBe('play');
        await page.locator('[data-g="mode-discard"]').click();
        const normal = page.locator('.ze-hand .kc:not(.ze-s)');
        await normal.first().click(); await page.locator('[data-g="discard"]').click();
        await expect.poll(() => page.evaluate(() => lastState.turnId)).not.toBe(owner);
      }
      await shot(page, 'real-action');
    }
    await emit(page, 'stand');
    await expect(guest.locator('.kg-over')).toBeVisible(); await shot(guest, 'result');
    expect(errors).toEqual([]);
  } finally {
    for(const guest of teamPlayers)await guest.close();
    for (const context of contexts) await context.close();
  }
});
