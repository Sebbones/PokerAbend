// P3: Poker und Omaha (Tischspiele mit eigenem Rahmen, Plätzen und Chips) – echte Räume mit Bots, alle erreichbaren Zustände, sechs Größen.
// Screenshots: VIS_P1_CAPTURE=1 → docs/design/screenshots/<spiel>/ (JPEG). Die Tischgeometrie ist bei Poker eigen (scrollbar), deshalb gibt es hier keine Passform-Prüfung.
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);

test.use({ createLimit: '100' });
for (const id of ['poker', 'omaha']) {
  test(`${id}: Spielwelt – Lobby, Tisch, Zuschauer, Pause, Wiederverbindung, Englisch und sechs Größen`, async ({ page, app, browser }, info) => {
    test.setTimeout(180000);
    const shot = async (p, name) => {
      let path = info.outputPath(`${id}-${name}.jpg`);
      if (process.env.VIS_P1_CAPTURE === '1') { const dir = `docs/design/screenshots/${id}`; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.jpg`; }
      await p.screenshot({ path, fullPage: true, type: 'jpeg', quality: 70 });
    };
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', id);
    await shot(page, 'lobby');
    expect((await send(page, 'sit', { seat: 0 })).ok).toBe(true);
    for (let i = 0; i < 2; i++) expect((await send(page, 'addBot')).ok).toBe(true);
    expect((await send(page, 'start')).ok).toBe(true);
    await expect(page.locator('.table')).toBeVisible();
    await page.waitForTimeout(1500);
    await shot(page, 'own-action');
    const code = await page.evaluate(() => lastState?.code || new URL(location.href).searchParams.get('t'));
    const context = await browser.newContext({ viewport: page.viewportSize() || undefined });
    try {
      const watcher = await context.newPage(); await login(watcher, app, 'Zuschauer'); await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
      await expect(watcher.locator('.table')).toBeVisible(); await shot(watcher, 'spectator');
    } finally { await context.close(); }
    expect((await send(page, 'pause')).ok).toBe(true); await page.waitForTimeout(300); await shot(page, 'paused');
    expect((await send(page, 'pause')).ok).toBe(true);
    await page.reload(); await expect(page.locator('.table')).toBeVisible(); await shot(page, 'reconnect');
    if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) { await page.setViewportSize({ width, height }); await page.waitForTimeout(200); await shot(page, `table-${width}x${height}`); }
    await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize());
    await page.evaluate(() => I18n.select('en')); await page.waitForTimeout(300); await shot(page, 'english');
  });
}
