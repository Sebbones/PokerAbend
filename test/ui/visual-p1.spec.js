// Individuelle Spielwelten (P1-Pakete der visuellen Roadmap): echte Räume mit Bots, alle erreichbaren Zustände, sechs Größen, kein seitliches Überlaufen.
// Screenshots: VIS_P1_CAPTURE=1 legt sie dauerhaft unter docs/design/screenshots/<spiel>/ ab, sonst nur im Testordner.
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);
const state = (page) => page.evaluate(() => ({ phase: lastState.phase, turn: lastState.turnId, me: lastState.you.id, g: lastState.g, players: lastState.players }));
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
    expect((await send(page, 'sit')).ok).toBe(true);
    for (let i = 0; i < cfg.bots; i++) expect((await send(page, 'addBot')).ok).toBe(true);
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
    expect((await send(page, 'gamePause', { paused: true })).ok).toBe(true); await shot(page, 'paused');
    expect((await send(page, 'gamePause', { paused: false })).ok).toBe(true);
    await page.reload(); await expect(page.locator(cfg.scene)).toBeVisible(); await shot(page, 'reconnect');
    if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height }); expect(await overflow(page), `${width}x${height}`).toBe(true);
      const box = await page.locator(cfg.scene).first().boundingBox(); expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      await shot(page, `table-${width}x${height}`);
    } else expect(await overflow(page)).toBe(true);
    // Englisch: Kurzregeln im Hilfedialog (vor dem Ergebnis, solange der Tisch läuft)
    await page.evaluate(() => I18n.select('en')); await page.locator('[data-kit=help]').first().click();
    await expect(page.locator('#help-dlg')).toBeVisible(); await shot(page, 'english-rules'); await page.keyboard.press('Escape');
    if (cfg.finish) { await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize()); await cfg.finish(page); await expect.poll(() => state(page).then((s) => s.phase), { timeout: 60000 }).toBe('over'); await shot(page, 'result'); }
  });
}
