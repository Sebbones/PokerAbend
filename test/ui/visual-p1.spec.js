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
const only = process.env.VIS_P1_ONLY ? process.env.VIS_P1_ONLY.split(',') : Object.keys(GAMES);

test.use({ createLimit: '100' });
for (const id of only) {
  const cfg = GAMES[id];
  test(`${id}: Spielwelt – Lobby, eigene Aktion, Zuschauer, Pause, Wiederverbindung, Ergebnis, Englisch und sechs Größen`, async ({ page, app, browser }, info) => {
    test.setTimeout(240000);
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
      await expect(watcher.locator(cfg.scene)).toBeVisible(); await shot(watcher, 'spectator');
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
    if (cfg.finish) { await cfg.finish(page); await expect.poll(() => state(page).then((s) => s.phase), { timeout: 60000 }).toBe('over'); await shot(page, 'result'); }
  });
}
