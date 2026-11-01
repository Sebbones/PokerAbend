import '../../games/omaha-hi-lo/ui.spec.js';
import '../../games/scrabble/ui.spec.js';
import '../../games/backgammon/ui.spec.js';
import '../../games/hearts/ui.spec.js';
import '../../games/five-card-draw/ui.spec.js';
import '../../games/five-card-draw/poker-regression.spec.js';
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

async function create(page, app, game, settings = {}) {
  await login(page, app); await selectGame(page, game);
  await page.locator('#host-form button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => lastState?.game)).toBe(game);
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  if (Object.keys(settings).length) expect((await page.evaluate((s) => send('settings', s), settings)).ok).toBe(true);
}
async function sizes(page, info, name) {
  const output = resolve('artifacts/new-games'); mkdirSync(output, { recursive: true });
  const dimensions = info.project.name === 'desktop' ? [[1440, 900], [768, 1024], [360, 800], [900, 450]] : [[390, 844]];
  for (const [width, height] of dimensions) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: ${width}`).toBe(true);
    for (const selector of ['.hx-viewport', '.hx-key', '.sy-viewport']) if (await page.locator(selector).count()) {
      const box = await page.locator(selector).boundingBox(); expect(box.x, selector).toBeGreaterThanOrEqual(0); expect(box.x + box.width, selector).toBeLessThanOrEqual(width + 1);
    }
    const dock = await page.locator('#kg-dock').boundingBox();
    expect(dock.y).toBeGreaterThanOrEqual(0); expect(dock.y + dock.height).toBeLessThanOrEqual(height + 1);
    await page.screenshot({ path: resolve(output, `${name}-${info.project.name}-${width}x${height}.png`), fullPage: true });
  }
  await page.waitForLoadState('networkidle');
}
test('Scotland Yard: persönliche Ansichten, echte Fahrt, Host-Rollenwahl, Pause, Sprache und Reconnect', async ({ page, app, browser }, info) => {
  await create(page, app, 'scotland-yard');
  await page.locator('[data-kit-panel=host]').click();
  const host = await page.evaluate(() => lastState.you.id), code = await page.evaluate(() => lastState.code);
  await page.locator('[data-sy-role]').selectOption(host);
  await expect.poll(() => page.evaluate(() => lastState.xChoice)).toBe(host);
  await page.locator('.panel-head [data-kit=close]').click();
  const context = await browser.newContext({ viewport: page.viewportSize() }), guestErrors = [];
  try {
    const guest = await context.newPage(); guest.on('pageerror', (e) => guestErrors.push(e.message));
    await login(guest, app, 'Ben'); await guest.evaluate((code) => joinAndEnter(code, 'sit'), code);
    expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
    expect((await page.evaluate(() => send('start'))).ok).toBe(true);
    await expect(page.locator('.sy-map')).toBeVisible();
    await expect.poll(() => guest.evaluate(() => lastState?.phase)).toBe('playing');
    expect(await guest.evaluate(() => lastState.g.xPosition)).toBeNull();
    expect(await page.evaluate(() => lastState.g.xPosition)).toEqual(expect.any(Number));
    const move = await page.evaluate(() => lastState.g.legal.find((m) => m.ticket === 'taxi'));
    const destination = page.locator(`.sy-destinations [data-to="${move.to}"]`);
    await destination.focus(); await destination.press('Enter');
    await expect.poll(() => page.evaluate(() => lastState.g.move)).toBe(1);
    await expect.poll(() => guest.evaluate(() => lastState.g.move)).toBe(1);
    expect(await guest.evaluate(() => lastState.g.xPosition)).toBeNull();
    const guestId = await guest.evaluate(() => lastState.you.id);
    expect((await guest.evaluate((target) => send('syRole', { target }), guestId)).ok).toBe(false);
    await page.getByRole('button', { name: 'Spiel für alle pausieren', exact: true }).click();
    await expect(guest.locator('#game-pause-banner')).toBeVisible();
    const policeMove = await guest.evaluate(() => lastState.g.legal[0]);
    expect((await guest.evaluate((m) => send('syMove', m), policeMove)).ok).toBe(false);
    await page.locator('[data-kit-panel=me]').click(); await page.locator('#kg-panel [data-language]').selectOption('en');
    await page.locator('.panel-head [data-kit=close]').click();
    await expect(page.locator('.sy-map-head')).toContainText('You are Mr. X');
    await page.reload(); await expect(page.locator('#game-pause-banner')).toBeVisible();
    expect(await page.evaluate(() => lastState.g.xPosition)).toBe(move.to);
    expect(await guest.evaluate(() => lastState.g.xPosition)).toBeNull();
    await page.locator('#kg-pause-control [data-game-pause=false]').click();
    await page.locator('[data-kit=help]').click(); await page.locator('[data-help-more]').click();
    await expect(page.locator('#kg-panel-body')).toContainText('An original city map with 49 stops');
    await page.locator('.panel-head [data-kit=close]').click();
    await sizes(page, info, 'scotland-yard');
    if (info.project.name === 'mobil') { await page.locator('.sy-viewport').evaluate((el) => { el.scrollLeft = 150; }); expect(await page.locator('.sy-viewport').evaluate((el) => el.scrollLeft)).toBeGreaterThan(0); }
    expect(guestErrors).toEqual([]);
  } finally { await context.close(); }
});
test('Hex: echten Stein setzen, Bot nutzt Tauschregel, Sprache und Pause erhalten das Brett', async ({ page, app }, info) => {
  await create(page, app, 'hex', { size: '9', swap: true });
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true); expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await page.locator('[data-g=hx-cell][data-cell="40"]').click();
  await expect.poll(() => page.evaluate(() => lastState.g.colors[lastState.you.id])).toBe(1);
  await page.getByRole('button', { name: 'Spiel für alle pausieren', exact: true }).click();
  const board = await page.evaluate(() => lastState.g.board);
  await page.locator('[data-kit-panel=me]').click(); await page.locator('#kg-panel [data-language]').selectOption('en');
  await page.locator('.panel-head [data-kit=close]').click();
  await expect(page.locator('.hx-key')).toContainText('Blue: top');
  expect(await page.evaluate(() => lastState.g.board)).toEqual(board);
  await page.locator('#kg-pause-control [data-game-pause=false]').click();
  expect((await page.evaluate(() => send('hexPlace', { cell: 40 }))).ok).toBe(false);
  await page.locator('[data-g=hx-cell][data-cell="0"]').focus(); await page.locator('[data-g=hx-cell][data-cell="0"]').press('Enter');
  await expect.poll(() => page.evaluate(() => lastState.g.board[0])).toBe(1);
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await sizes(page, info, 'hex');
});
test('Würfelduell: echter Angriff, öffentliche Würfe und Lebenspunkte, Pause und englische Oberfläche', async ({ page, app }, info) => {
  await create(page, app, 'wuerfelduell');
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true); expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await page.locator('[data-g=wd-attack]').click();
  await expect.poll(() => page.evaluate(() => lastState.g.attacks)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Spiel für alle pausieren', exact: true }).click();
  const last = await page.evaluate(() => lastState.g.last);
  expect(last.attack).toHaveLength(3); expect(last.defence).toHaveLength(3);
  await page.locator('[data-kit-panel=me]').click(); await page.locator('#kg-panel [data-language]').selectOption('en');
  await page.locator('.panel-head [data-kit=close]').click();
  await expect(page.locator('.wd-battle')).toContainText('Defence');
  expect(await page.evaluate(() => lastState.g.last)).toEqual(last);
  await page.locator('#kg-pause-control [data-game-pause=false]').click();
  await sizes(page, info, 'wuerfelduell');
});
