// Individuelle Spielwelten (P1-Pakete der visuellen Roadmap): echte Räume mit Bots, alle erreichbaren Zustände, sechs Größen, kein seitliches Überlaufen.
// Screenshots: VIS_P1_CAPTURE=1 legt sie dauerhaft unter docs/design/screenshots/<spiel>/ ab, sonst nur im Testordner.
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);
const state = (page) => page.evaluate(() => ({ phase: lastState.phase ?? (lastState.started ? 'playing' : 'lobby'), turn: lastState.turnId, me: lastState.you.id, g: lastState.g, players: lastState.players }));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
// Je Spiel: Bots (zusätzlich zum Menschen), Einstellungen, eine eigene Aktion für „nach dem Zug“ und – wo schnell erreichbar – der Weg bis zum Ergebnis
const GAMES = {
  chicago: {
    bots: 2, settings: { turnTime: 0 }, scene: '.ch-stage',
    async act(page) { await page.locator('[data-g=throw]').click(); await expect.poll(() => state(page).then((s) => Object.keys(s.g.rolled).length)).toBeGreaterThan(0); },
    async finish(page) {
      for (let i = 0; i < 300; i++) {
        const s = await state(page); if (s.phase !== 'playing') return;
        if (s.turn === s.me && await page.locator('[data-g=throw]').count()) await page.locator('[data-g=throw]').click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(150);
      }
    },
  },
};
// Hilfen für die Wege bis zum Ergebnis: der Mensch handelt über die echte Oberfläche, Bots über den Server
async function loop(page, step, max = 400) {
  for (let i = 0; i < max; i++) { const s = await state(page); if (s.phase !== 'playing') return; await step(s).catch(() => {}); await page.waitForTimeout(150); }
}
Object.assign(GAMES, {
  'tickendes-paket': {
    bots: 2, settings: { turnTime: 0, rounds: 1 }, scene: '.tp-stage',
    async act(page) { const input = page.locator('#tp-in'); if (await input.count()) { const letter = await page.evaluate(() => lastState.g.prompt.letter); await input.fill(letter + 'aaa'); await page.locator('form[data-tp] button[type=submit]').click(); await page.waitForTimeout(300); } },
  },
  wuerfelduell: {
    bots: 2, settings: { turnTime: 0, health: 5 }, scene: '.wd-stage',
    async act(page) { await page.locator('[data-g=wd-attack]').first().click(); await page.waitForTimeout(600); },
    async finish(page) { await loop(page, async (s) => { if (s.turn === s.me && await page.locator('[data-g=wd-attack]').count()) await page.locator('[data-g=wd-attack]').first().click({ timeout: 1500 }); }); },
  },
  wuerfelpoker: {
    bots: 2, settings: { turnTime: 0, strikes: 1 }, scene: '.wp-stage',
    async act(page) { await page.locator('[data-g=throw]').click(); await page.waitForTimeout(400); await page.locator('[data-g=keep]').first().click(); },
  },
  mogeln: {
    bots: 2, settings: { turnTime: 0 }, scene: '.mg-stage',
    async act(page) { await expect.poll(() => state(page).then((s) => s.turn === s.me), { timeout: 30000 }).toBe(true); await page.locator('[data-g=pick]:not([disabled])').last().click(); await page.locator('[data-g=play]').click(); await page.waitForTimeout(500); },
  },
  pfeilfieber: {
    bots: 1, settings: { turnTime: 0, rounds: 1, writeSecs: 20 }, scene: '.pf-wrap', watchScene: '[data-scene=pfeilfieber]',
    async act(page) { for (const k of ['ArrowUp', 'ArrowLeft']) { await page.keyboard.press(k); } await page.waitForTimeout(300); },
  },
});
const answer = async (page, text) => { const input = page.locator('#pk-in'); if (await input.count()) { await input.fill(text); await page.locator('form[data-pk] button[type=submit]').click(); await page.waitForTimeout(300); } };
const myTurn = (page) => expect.poll(() => state(page).then((s) => s.turn === s.me), { timeout: 30000 }).toBe(true);
Object.assign(GAMES, {
  schaetzmeister: {
    bots: 2, settings: { turnTime: 0, rounds: 1, writeSecs: 20 }, scene: '.sm-card',
    async act(page) { await answer(page, '42'); },
    async finish(page) { await loop(page, async () => {}, 600); },
  },
  shutthebox: {
    bots: 1, settings: { turnTime: 0, rounds: 1 }, scene: '.sb-table',
    async act(page) { await myTurn(page); await page.locator('[data-g=roll]').first().click(); await page.waitForTimeout(500); await page.locator('[data-g=flap]:not([disabled])').first().click({ timeout: 3000 }).catch(() => {}); },
    async finish(page) { await loop(page, async (s) => { if (s.turn !== s.me) return; const q = (x) => page.locator(x); if (await q('[data-g=roll]').count()) await q('[data-g=roll]').first().click({ timeout: 1500 }); else if (await q('[data-g=close]:not([disabled])').count()) await q('[data-g=close]').click({ timeout: 1500 }); else await q('[data-g=flap]:not(.sel):not([disabled])').first().click({ timeout: 1500 }); }, 600); },
  },
  'gedaechtnis-kueche': {
    bots: 1, settings: { turnTime: 0, rounds: 1, writeSecs: 20 }, scene: '.gk-stage', watchScene: '[data-scene=gedaechtnis-kueche]',
    async act(page) { await page.waitForTimeout(500); },
    async finish(page) { await loop(page, async () => { if (await page.locator('[data-g=gk-tap]').count()) await page.locator('[data-g=gk-tap]').first().click({ timeout: 1000 }); }, 600); },
  },
  maumau: {
    bots: 2, settings: { turnTime: 0 }, scene: '.kg-piles',
    async act(page) { await myTurn(page); const card = page.locator('[data-g=card].can').last(); try { if (await card.count()) { await card.click({ timeout: 3000 }); await page.locator('[data-g=play-selected]').click({ timeout: 3000 }); const wish = page.locator('[data-g=wish]').first(); if (await wish.count()) await wish.click({ timeout: 3000 }); } else await page.locator('[data-g=draw]').click({ timeout: 3000 }); } catch { await page.locator('[data-g=draw]:not([disabled])').click({ timeout: 2000 }).catch(() => {}); } await page.waitForTimeout(500); },
  },
  werhatdasgesagt: {
    bots: 2, settings: { turnTime: 0, rounds: 1, writeSecs: 20, voteSecs: 20 }, scene: '.pk-q',
    async act(page) { await answer(page, 'Pizza mit Ananas'); },
    async finish(page) { await loop(page, async () => { const g = page.locator('[data-g=wh-guess]'); if (await g.count()) await g.first().click({ timeout: 1000 }); }, 600); },
  },
});

// ---- P2 (erste Hälfte): 16 weitere Spielwelten ----
const lastTurn = async (page, ms = 30000) => { await expect.poll(() => state(page).then((s) => s.turn === s.me || s.phase !== 'playing'), { timeout: ms }).toBe(true); };
const tryClick = async (page, selector, timeout = 1500) => { const l = page.locator(selector).first(); if (await l.count()) { await l.click({ timeout }).catch(() => {}); return true; } return false; };
Object.assign(GAMES, {
  domino: {
    bots: 2, settings: { turnTime: 0 }, scene: '.dn-stage',
    async act(page) { await lastTurn(page); if (!(await tryClick(page, '.dn-hand .dn-tile.can'))) await tryClick(page, '[data-g=draw],[data-g=pass]'); await tryClick(page, '[data-g=side]'); await page.waitForTimeout(400); },
    async finish(page) { await loop(page, async (s) => { if (s.turn !== s.me) return; if (await tryClick(page, '[data-g=side]')) return; if (await tryClick(page, '.dn-hand .dn-tile.can')) return; await tryClick(page, '[data-g=draw],[data-g=pass]'); }, 700); },
  },
  luegenwuerfel: {
    bots: 2, settings: { turnTime: 0, dice: 1 }, scene: '.lw-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=bid]'); await page.waitForTimeout(400); },
    async finish(page) { await loop(page, async (s) => { if (s.turn !== s.me) return; if (!(await tryClick(page, '[data-g=doubt]'))) await tryClick(page, '[data-g=bid]'); }, 600); },
  },
  maexchen: {
    bots: 2, settings: { turnTime: 0, lives: 1 }, scene: '.mx-table',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(500); await tryClick(page, '[data-g=lift]'); },
  },
  praesident: {
    bots: 3, settings: { turnTime: 0 }, scene: '.pr-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=pick]'); if (!(await tryClick(page, '[data-g=play]:not([disabled])'))) await tryClick(page, '[data-g=pass]'); await page.waitForTimeout(400); },
  },
  schlagfertig: {
    bots: 2, settings: { turnTime: 0, rounds: 1, writeSecs: 20, voteSecs: 20 }, scene: '.pk-q', watchScene: '[data-scene=schlagfertig]',
    async act(page) { await answer(page, 'Ein sehr schlagfertiger Gedanke'); },
    async finish(page) { await loop(page, async () => { await answer(page, 'Noch eine Pointe'); await tryClick(page, '[data-g=sl-vote]:not([disabled])'); await tryClick(page, '[data-g=sl-confirm]:not([disabled])'); }, 700); },
  },
  schwimmen: {
    bots: 2, settings: { turnTime: 0, lives: 3 }, scene: '.sw-stage',
    async act(page) { await lastTurn(page); if (!(await tryClick(page, '[data-g=knock]'))) await tryClick(page, '[data-g=pass]'); await page.waitForTimeout(400); },
  },
  sortierstation: {
    bots: 1, settings: { turnTime: 0, rounds: 1, writeSecs: 120 }, scene: '.ss-stage', watchScene: '[data-scene=sortierstation]',
    async act(page) { await page.waitForTimeout(600); await tryClick(page, '.ss-box'); },
    async finish(page) { await loop(page, async () => { await tryClick(page, '.ss-box', 800); }, 900); },
  },
  viergewinnt: {
    bots: 1, settings: { turnTime: 0 }, scene: '.vg-stage',
    async act(page) { await lastTurn(page); await tryClick(page, 'button.vg-col'); await page.waitForTimeout(400); },
    async finish(page) { await loop(page, async (s) => { if (s.turn === s.me) await tryClick(page, 'button.vg-col'); }, 400); },
  },
  zahlenzoo: {
    bots: 1, settings: { turnTime: 0, rounds: 1 }, scene: '[data-scene=zahlenzoo]',
    async act(page) { await page.waitForTimeout(300); },
    async finish(page) { await loop(page, async () => { await answer(page, '3'); }, 700); },
  },
  reversi: {
    bots: 1, settings: { turnTime: 0 }, scene: '.rv-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '.rv-cell.can'); await page.waitForTimeout(400); },
    async finish(page) { await loop(page, async (s) => { if (s.turn === s.me) await tryClick(page, '.rv-cell.can'); }, 500); },
  },
  schocken: {
    bots: 2, settings: { turnTime: 0 }, scene: '.sc-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(400); },
  },
  zehntausend: {
    bots: 2, settings: { turnTime: 0, target: 2000 }, scene: '.zt-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(400); },
  },
  dame: {
    bots: 1, settings: { turnTime: 0 }, scene: '.dm-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '.dm-cell.can'); await tryClick(page, '.dm-cell.can .dm-hint'); await page.waitForTimeout(400); },
  },
  hex: {
    bots: 1, settings: { turnTime: 0, size: '9', swap: true }, scene: '.hx-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '.hx-cell:not(.blue):not(.red)'); await page.waitForTimeout(400); },
    async finish(page) { await loop(page, async (s) => { if (s.turn === s.me) { const free = page.locator('.hx-cell:not(.blue):not(.red)'); const n = await free.count(); if (n) await free.nth(Math.floor(n / 2)).click({ timeout: 1200 }); } }, 700); },
  },
  kniffel: {
    bots: 1, settings: { turnTime: 0 }, scene: '.kn-stage',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(500); },
  },
  kritzelpost: {
    bots: 0, humans: 2, settings: { rounds: 1, writeSecs: 20 }, scene: '[data-scene=kritzelpost]',
    async act(page) { await page.waitForTimeout(500); await page.locator('#pk-in').fill('Ein Hund auf dem Mond').catch(() => {}); },
  },
});

// ---- P2 (zweite Hälfte) und P3 ----
// relaxed: Spiele mit eigener, intern scrollbarer Tischgeometrie (Poker, Monopoly) – Aufnahme in allen Größen, aber ohne Passform-Prüfung (dafür gibt es die eigenen Specs).
const quiet = (page) => page.waitForTimeout(400);
Object.assign(GAMES, {
  bildunterschrift: { bots: 0, humans: 2, settings: { rounds: 1, writeSecs: 20 }, scene: '[data-scene=bildunterschrift]', async act(page) { await page.waitForTimeout(500); } },
  'malen-raten': { bots: 0, humans: 2, settings: { rounds: 1, writeSecs: 20 }, scene: '[data-scene=malen-raten]', async act(page) { await page.waitForTimeout(500); } },
  'wer-bin-ich': { bots: 0, humans: 2, settings: { turnTime: 0 }, scene: '.wb-stage', async act(page) { await page.waitForTimeout(500); } },
  kronenjagd: { bots: 1, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); } },
  'laser-huepfer': { bots: 1, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); } },
  broeckelboden: { bots: 3, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300); } },
  'sechs-nimmt': { bots: 2, settings: { turnTime: 0 }, scene: '.sn-table', async act(page) { await tryClick(page, '[data-g=choose]:not([disabled])'); await quiet(page); } },
  durak: { bots: 1, settings: { turnTime: 0 }, scene: '.du-wrap', async act(page) { await lastTurn(page); await tryClick(page, '.kg-hand .kc:not([disabled])'); await tryClick(page, '[data-g=attack]'); await quiet(page); } },
  muehle: { bots: 1, settings: { turnTime: 0 }, scene: '.mu-stage', async act(page) { await lastTurn(page); await tryClick(page, '.mu-pt.can'); await quiet(page); } },
  huetchen: { bots: 1, settings: { turnTime: 0 }, scene: '.hb-stage', async act(page) { await lastTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(900); await tryClick(page, '[data-g=pick]'); await quiet(page); } },
  schiffe: { bots: 1, settings: { turnTime: 0 }, scene: '.sv-stage', async act(page) { await tryClick(page, '[data-g=random]'); await tryClick(page, '[data-g=ready]'); await quiet(page); } },
  werwolf: { bots: 5, settings: { turnTime: 0 }, scene: '.ww-village', async act(page) { await page.waitForTimeout(600); } },
  blackjack: { bots: 2, settings: { turnTime: 0 }, scene: '.bj-table', async act(page) { await tryClick(page, '[data-g=bet]'); await quiet(page); } },
  'monopoly-deal': { bots: 2, settings: { turnTime: 0 }, scene: '.md-table', async act(page) { await lastTurn(page); await tryClick(page, '[data-g=card]'); await quiet(page); } },
  poker: { relaxed: true, sit: { seat: 0 }, help: '[data-help]', bots: 2, settings: {}, scene: '.table', async act(page) { await page.waitForTimeout(800); await tryClick(page, '[data-act=call],[data-act=check]'); await quiet(page); } },
  omaha: { relaxed: true, sit: { seat: 0 }, help: '[data-help]', bots: 2, settings: {}, scene: '.table', async act(page) { await page.waitForTimeout(800); await tryClick(page, '[data-act=call],[data-act=check]'); await quiet(page); } },
  'spiel-des-lebens': { bots: 1, settings: { turnTime: 0 }, scene: '.life-table', async act(page) { await lastTurn(page); await tryClick(page, '[data-g=spin]'); await page.waitForTimeout(900); } },
  monopoly: { relaxed: true, bots: 1, settings: { turnTime: 0 }, scene: '.mo-board', async act(page) { await page.waitForTimeout(500); } },
  'risiko-wuerfeln': {
    bots: 2, settings: { turnTime: 0, target: 40 }, scene: '.risk-table',
    async act(page) { await lastTurn(page); await tryClick(page, '[data-g=risk-roll]'); await quiet(page); },
    async finish(page) { await loop(page, async (s) => { if (s.turn !== s.me) return; if (s.g.pot >= 8 && await tryClick(page, '[data-g=risk-bank]:not([disabled])')) return; await tryClick(page, '[data-g=risk-roll]:not([disabled])'); }, 800); },
  },
  'story-chaos': { bots: 2, settings: { turnTime: 0 }, scene: '.story-table', async act(page) { await lastTurn(page, 20000).catch(() => {}); await answer(page, 'Es war einmal ein Pinguin'); } },
  zahlenreihe: { bots: 2, settings: { turnTime: 0, rounds: 1 }, scene: '.sequence-question', async act(page) { await answer(page, '5'); } },
  wuerfeljagd: { bots: 2, settings: { turnTime: 0, rounds: 1 }, scene: '.dg-target', async act(page) { await tryClick(page, '[data-g=hunt-roll]'); await quiet(page); } },
  monsterwuerfel: { bots: 1, settings: { turnTime: 0 }, scene: '.dg-health', async act(page) { await lastTurn(page); await tryClick(page, '[data-g=monster-roll]'); await quiet(page); } },
  'wuerfel-auktion': { bots: 2, settings: { turnTime: 0 }, scene: '.pk-q', async act(page) { await answer(page, '3'); } },
});
// ---- after_gameplay: Skat und Doppelkopf (die übrigen Pakete haben eigene Specs: visual-solo, gebietskampf, staedtehandel) ----
Object.assign(GAMES, {
  skat: { bots: 2, settings: { turnTime: 0 }, scene: '.sk-world', async act(page) { await lastTurn(page); if (!(await tryClick(page, '[data-g=sk-pass]'))) await tryClick(page, '[data-g=sk-hold]'); await page.waitForTimeout(400); } },
  doppelkopf: { bots: 3, settings: { turnTime: 0 }, scene: '.dk-world', async act(page) { await lastTurn(page); await tryClick(page, '[data-g=dk-reserve][data-choice=healthy]'); await page.waitForTimeout(400); } },
});
const only = process.env.VIS_P1_ONLY ? process.env.VIS_P1_ONLY.split(',') : Object.keys(GAMES);

test.use({ createLimit: '100' });
for (const id of only) {
  const cfg = GAMES[id];
  test(`${id}: Spielwelt – Lobby, eigene Aktion, Zuschauer, Pause, Wiederverbindung, Ergebnis, Englisch und sechs Größen`, async ({ page, app, browser }, info) => {
    test.setTimeout(420000);
    const shot = async (p, name) => {
      let path = info.outputPath(`${id}-${name}.jpg`);
      if (process.env.VIS_P1_CAPTURE === '1') { const dir = `docs/design/screenshots/${id}`; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.jpg`; }
      await p.screenshot({ path, fullPage: true, type: 'jpeg', quality: 70 }); // JPEG: kleine Dateien im Repository
    };
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', id);
    await shot(page, 'lobby');
    { const reply = await send(page, 'sit', cfg.sit || {}); expect(reply.ok, JSON.stringify(reply)).toBe(true); }
    for (let i = 0; i < cfg.bots; i++) expect((await send(page, 'addBot')).ok).toBe(true);
    // Spiele ohne Computerspieler (z. B. Kritzelpost): weitere echte Mitspieler in eigenen Kontexten
    const guestContexts = [];
    for (let i = 0; i < (cfg.humans || 0); i++) {
      const gc = await browser.newContext({ viewport: page.viewportSize() || undefined }); guestContexts.push(gc);
      const gp = await gc.newPage(); await login(gp, app, `Gast${i + 1}`);
      await gp.evaluate((c) => joinAndEnter(c, 'sit'), await page.evaluate(() => lastState.code));
    }
    if (cfg.humans) await expect.poll(() => page.evaluate(() => lastState.players.filter((p) => p.seated).length)).toBe(1 + cfg.humans);
    expect((await send(page, 'settings', cfg.settings)).ok).toBe(true);
    expect((await send(page, 'start')).ok).toBe(true);
    await expect.poll(() => state(page).then((s) => s.phase)).toBe('playing');
    await expect(page.locator(cfg.scene)).toBeVisible();
    await shot(page, 'own-action');
    // Zuschauer sieht dieselbe öffentliche Darstellung ohne Aktionen
    const code = await page.evaluate(() => lastState.code), context = await browser.newContext({ viewport: page.viewportSize() || undefined });
    try {
      const watcher = await context.newPage(); await login(watcher, app, 'Zuschauer'); await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
      await expect(watcher.locator(cfg.watchScene || cfg.scene)).toBeVisible(); await shot(watcher, 'spectator');
    } finally { await context.close(); }
    if (cfg.act) { await cfg.act(page); await page.waitForTimeout(400); await shot(page, 'waiting'); }
    { const reply = await send(page, 'gamePause', { paused: true }); expect(reply.ok, JSON.stringify(reply)).toBe(true); } await shot(page, 'paused');
    expect((await send(page, 'gamePause', { paused: false })).ok).toBe(true);
    await page.reload(); await expect(page.locator(cfg.scene)).toBeVisible(); await shot(page, 'reconnect');
    if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      if (!cfg.relaxed) { expect(await overflow(page), `${width}x${height}`).toBe(true);
        const box = await page.locator(cfg.scene).first().boundingBox(); expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(width + 1); }
      await shot(page, `table-${width}x${height}`);
    } else if (!cfg.relaxed) expect(await overflow(page)).toBe(true);
    // Englisch: Kurzregeln im Hilfedialog (vor dem Ergebnis, solange der Tisch läuft)
    await page.evaluate(() => I18n.select('en')); await page.locator(cfg.help || '[data-kit=help]').first().click();
    await expect(page.locator('#help-dlg')).toBeVisible(); await shot(page, 'english-rules'); await page.keyboard.press('Escape');
    if (cfg.finish) { await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize()); await cfg.finish(page); await expect.poll(() => state(page).then((s) => s.phase), { timeout: 60000 }).toBe('over'); await shot(page, 'result'); }
  });
}
