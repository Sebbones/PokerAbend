import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Room } from '../../games/farbenchaos/room.js';
import { flipDeck, mercyDeck, allWildDeck } from '../../games/farbenchaos/variants.js';

const modes = ['classic','flip','no-mercy','all-wild','halloween-ghosthunt'];
const sizes = [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]];
const material = (variant, side = 0) => {
  const deck = variant === 'flip' ? flipDeck().map((c) => c.faces[side]) : variant === 'no-mercy' ? mercyDeck().map((c) => c.faces[0]) : variant === 'all-wild' ? allWildDeck().map((c) => c.faces[0]) : Room.prototype.buildDeck();
  return [...new Set(deck)].filter((c, i, all) => all.findIndex((x) => x[0] === c[0]) === i || ['7b','7g','7y'].includes(c));
};

for (const variant of modes) test(`UNO Ultimate ${variant}: real room, material, six sizes, privacy, controls and reconnect`, async ({ page, browser, app }, info) => {
  test.setTimeout(180000);
  const output = resolve('artifacts/uno-ultimate', info.project.name, variant); mkdirSync(output, { recursive: true });
  const contexts = [], errors = [];
  const emit = async (target, event, data = {}) => {
    const reply = await target.evaluate(({ event, data }) => send(event, data), { event, data });
    expect(reply.ok, `${event}: ${reply.error}`).toBe(true); return reply;
  };
  const shot = async (target, state) => {
    expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const v = target.viewportSize(); await target.screenshot({ path: resolve(output, `${v.width}x${v.height}-${state}.png`) });
  };
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page, app, 'Anna');
    // Test-only access to the actual renderer for permanent material contact sheets.
    await page.evaluate(() => {
      const original = kitShedding;
      kitShedding = (opts) => { if (opts.id === 'farbenchaos') window.unoPresentation = opts; return original(opts); };
    });
    await selectGame(page, 'farbenchaos');
    expect(await page.locator('#host-variant option').evaluateAll((els) => els.map((e) => e.value))).toEqual(modes);
    await expect(page.locator('#host-form [data-uno-variant]')).toHaveCount(5);
    await page.locator(`#host-form [data-uno-variant="${variant}"]`).click();
    await expect(page.locator('#host-variant')).toHaveValue(variant);
    await expect(page.locator(`#host-form [data-uno-variant="${variant}"]`)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'host-menu'); await page.locator('#host-form button[type=submit]').click();
    await expect.poll(() => page.evaluate(() => lastState?.variant)).toBe(variant); await emit(page, 'sit');
    if (['classic','halloween-ghosthunt'].includes(variant)) await emit(page, 'settings', { turnTime: 0, handSize: 7, startAction: false });
    await shot(page, 'lobby-waiting');
    const code = await page.evaluate(() => lastState.code), guests = [];
    for (const [name, mode] of [['Ben','sit'],['Robin','watch']]) {
      const context = await browser.newContext({ viewport: page.viewportSize(), reducedMotion: 'reduce', ...(info.project.use.isMobile ? { isMobile: true, hasTouch: true } : {}) });
      contexts.push(context); const guest = await context.newPage(); guest.on('pageerror', (e) => errors.push(e.message));
      await login(guest, app, name); await guest.evaluate(({ code, mode }) => joinAndEnter(code, mode), { code, mode });
      await expect.poll(() => guest.evaluate(() => lastState?.code)).toBe(code); guests.push(guest);
    }
    const [guest, watcher] = guests;
    await shot(page, 'lobby-ready'); await emit(page, 'start');
    for (const target of [page,...guests]) await expect.poll(() => target.evaluate(() => lastState?.phase)).toBe('playing');
    await expect(page.locator('#kg')).toHaveAttribute('data-uno-variant', variant);
    expect(await watcher.evaluate(() => lastState.g.hand)).toBeNull(); await expect(watcher.locator('.kg-hand .kc')).toHaveCount(0);
    const theme = variant === 'halloween-ghosthunt' ? 'ghosthunt' : variant;
    await expect(page.locator('.kg-hand .kc').first()).toHaveAttribute('data-uno-theme', theme);
    await expect(page.locator('[data-uno-back]')).toHaveAttribute('data-uno-back', theme);
    const viewports = info.project.name === 'desktop' ? sizes : [[390,844],[360,800],[900,450]];
    for (const [width,height] of viewports) {
      for (const target of [page,...guests]) await target.setViewportSize({ width,height });
      await shot(page, 'table'); await shot(guest, 'waiting'); await shot(watcher, 'spectator');
      const dock = await page.locator('#kg-dock').boundingBox();
      expect(dock.y).toBeGreaterThanOrEqual(0); expect(dock.y + dock.height).toBeLessThanOrEqual(height + 1);
      expect(await page.locator('.kg-hand .kc').first().evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    }
    // Gallery contains only known deck prototypes, never real hidden card data.
    for (const side of variant === 'flip' ? [0,1] : [0]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(({ cards, side }) => {
        const S = structuredClone(lastState); S.g.side = side;
        if (S.variant === 'flip') S.g.drawBack = side ? '7r' : '7p';
        const main = document.querySelector('#kg-main');
        main.innerHTML = `<section class="fc-material-atlas" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:22px;width:100%;padding:24px"><h2 style="grid-column:1/-1">${S.variant} · ${side ? 'DARK' : 'LIGHT'} · Material</h2>${cards.map((c) => `<div style="--w:90px">${unoPresentation.card(c, { attrs: 'disabled' }, S)}</div>`).join('')}<div>${unoPresentation.backCard(42, S)}</div></section>`;
        document.querySelector('#kg-dock').innerHTML = '';
        main.querySelectorAll('.kc').forEach((el) => el.style.setProperty('--w', '90px'));
        document.querySelector('#kg').dataset.unoSide = side ? 'dark' : 'light';
      }, { cards: material(variant, side), side });
      if (variant === 'flip' && side === 0) {
        const contrast = await page.locator('.fc-material-atlas .fc-w .v').evaluateAll((els) => {
          const linear = (v) => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
          const luminance = (rgb) => rgb.map(linear).reduce((v,c,i) => v + c * [.2126,.7152,.0722][i], 0);
          const paper = luminance([231,236,227]);
          return els.map((el) => { const rgb = getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number); return (paper + .05) / (luminance(rgb) + .05); });
        });
        expect(contrast.length).toBeGreaterThan(0); expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
      }
      await shot(page, `material-${side}`);
    }
    await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.phase === 'playing' && !!current?.onState)).toBe(true);
    for (const target of [page,...guests]) await target.setViewportSize(info.project.name === 'desktop' ? { width:1440,height:900 } : { width:390,height:844 });
    if (variant === 'no-mercy') {
      await page.evaluate(() => {
        const S = structuredClone(lastState), opponent = S.players.find((p) => p.inRound && p.id !== S.you.id);
        S.players.push({...opponent,id:'material-cem',name:'Cem',eliminated:false,cards:7});
        opponent.eliminated = true; opponent.cards = 0;
        S.g.pending = 16; S.g.lastDraw = 6;
        current.onState(S);
      });
      await expect(page.locator('.fc-penalty-meter')).toContainText('+16');
      await expect(page.locator('.fc-eliminated')).toContainText('Ben'); await shot(page, 'penalty-and-elimination');
      await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.phase === 'playing' && !!current?.onState)).toBe(true);
    }
    if (variant === 'flip') {
      const flip = () => page.evaluate(() => {
        const initial = structuredClone(lastState); initial.g.side = 0; initial.g.top = '7r'; initial.g.drawBack = '7p'; initial.g.hand = ['7r','Ww'];
        const next = structuredClone(initial); next.g.side = 1; next.g.top = '7p'; next.g.drawBack = '7r'; next.g.hand = ['7p','Ww'];
        current.onState(initial); current.onState(next);
        const area = document.querySelector('.kg-piles');
        return { effect: document.querySelector('#kg').dataset.unoEffect, animations: area.getAnimations().length };
      });
      await page.emulateMedia({ reducedMotion:'no-preference' });
      expect(await flip()).toEqual({ effect:'flip', animations:1 });
      await page.emulateMedia({ reducedMotion:'reduce' }); expect((await flip()).animations).toBe(0);
      await page.emulateMedia({ reducedMotion:'no-preference' });
      await page.locator('[data-kit-panel=me]').click(); await page.locator('[data-pref=calm]').check();
      await page.locator('#kg-panel .panel-head [data-kit=close]').click(); expect((await flip()).animations).toBe(0);
      await page.emulateMedia({ reducedMotion:'reduce' });
      await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.phase === 'playing' && !!current?.onState)).toBe(true);
    }
    await emit(page, 'gamePause', { paused: true }); await expect(watcher.locator('#game-pause-banner')).toBeVisible();
    await shot(page, 'paused');
    const hand = await page.evaluate(() => lastState.g.hand);
    await page.locator('[data-kit-panel=me]').click(); await page.locator('#kg-panel [data-language]').selectOption('en');
    await page.locator('#kg-panel .panel-head [data-kit=close]').click(); await shot(page, 'english');
    await page.reload(); await expect(page.locator('#game-pause-banner')).toBeVisible();
    expect(await page.evaluate(() => lastState.g.hand)).toEqual(hand); await emit(page, 'gamePause', { paused:false });
    if (['classic','halloween-ghosthunt'].includes(variant)) {
      await page.locator('[data-g=draw]').click();
      await expect.poll(() => page.evaluate(() => JSON.stringify(lastState.g.hand))).not.toBe(JSON.stringify(hand));
    }
    await page.locator('[data-kit-panel=host]').click();
    await expect(page.locator('#kg-panel [data-variant]')).toBeDisabled();
    await expect(page.locator('#kg-panel [data-uno-variant]')).toHaveCount(5);
    await page.locator('#kg-panel .panel-head [data-kit=close]').click();
    await emit(page, 'stand'); await expect(guest.locator('.kg-over')).toBeVisible(); await shot(guest, 'result');
    if (variant === 'halloween-ghosthunt') {
      const scores = () => guest.evaluate(async () => (await fetch('/api/leaderboard?game=farbenchaos~halloween-ghosthunt&period=all')).json());
      await expect.poll(async () => (await scores()).rows.find((p) => p.name === 'Ben')?.wins || 0).toBe(1);
      const result = await scores(); expect(result.game).toBe('farbenchaos~halloween-ghosthunt');
      expect(result.games.find((g) => g.id === result.game).name).toBe('UNO: Spuknacht');
      const classic = await guest.evaluate(async () => (await fetch('/api/leaderboard?game=farbenchaos&period=all')).json());
      expect(classic.rows).toEqual([]);
    }
    if (variant === 'classic') {
      await expect(page.locator('[data-kit=closeResult]')).toBeVisible(); await page.locator('[data-kit=closeResult]').click();
      await page.locator('#kg-nav-host').click();
      await page.locator('#kg-panel [data-uno-variant="halloween-ghosthunt"]').click();
      await expect.poll(() => page.evaluate(() => lastState.variant)).toBe('halloween-ghosthunt');
      await expect(guest.locator('#kg')).toHaveAttribute('data-uno-variant','halloween-ghosthunt');
      expect(await page.evaluate(() => lastState.code)).toBe(code);
      await shot(page, 'host-variant-switch');
    }
    expect(errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});
