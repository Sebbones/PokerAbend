import { test, expect, login, selectGame } from '../../test/ui/helpers.js';
import { mkdirSync } from 'node:fs';

async function shot(page, info, name) {
  let path = info.outputPath(name + '.png');
  if (process.env.CARDS_CAPTURE === '1') { const dir = 'docs/design/screenshots/doppelkopf'; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.png`; }
  await page.screenshot({ path, fullPage: true });
}
const state = (page) => page.evaluate(() => ({ phase: lastState.phase, turn: lastState.turnId, me: lastState.you.id, g: lastState.g }));
const click = async (page, selector) => { const el = page.locator(selector).first(); await expect(el).toBeEnabled({ timeout: 5000 }); await el.click(); };

// Der Mensch spielt über die echte Oberfläche; die Bots antworten über den Server.
async function humanStep(page, seen) {
  const s = await state(page);
  if (s.phase !== 'playing' || s.g.stage === 'deal-over' || s.turn !== s.me) return false;
  const g = s.g, tag = `${g.key}:${g.revision}`;
  if (seen.has(tag)) return false;
  seen.add(tag);
  if (g.stage === 'reserve') await click(page, '[data-g=dk-reserve][data-choice=healthy]');
  else if (g.stage === 'play') {
    if (g.canAnnounce === 1 && !seen.has('announced')) { seen.add('announced'); await click(page, '[data-g=dk-announce]'); return true; }
    await page.locator('[data-g=dk-card]:enabled').first().click();
    await click(page, '[data-g=dk-play]:enabled');
  }
  return true;
}

test('Doppelkopf: Hosten, Bots, Vorbehalt, Ansage, Stichspiel, Abrechnung, Zuschauer, Pause, Reconnect, Viewports und Englisch', async ({ page, app, browser }, info) => {
  test.setTimeout(300000);
  await login(page, app); await selectGame(page, 'doppelkopf');
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', 'doppelkopf');
  await expect(page.locator('.scene-hero > svg')).toBeVisible(); await expect(page.locator('.dk-lobby')).toBeVisible();
  await shot(page, info, 'lobby');
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  for (const difficulty of ['easy', 'medium', 'hard']) expect((await page.evaluate((d) => send('addBot', { difficulty: d }), difficulty)).ok).toBe(true);
  expect((await page.evaluate(() => send('settings', { turnTime: 0, deals: 4, nines: false, schweine: true }))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await expect(page.locator('.dk-hand .kc')).toHaveCount(10);
  const code = await page.evaluate(() => lastState.code);
  const context = await browser.newContext();
  try {
    const watcher = await context.newPage();
    await login(watcher, app, 'Watcher');
    await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect(watcher.locator('.dk-world')).toBeVisible();
    expect(await watcher.evaluate(() => lastState.g.hand)).toBe(null);
    expect(await watcher.evaluate(() => lastState.g.myParty)).toBe(null);
    await shot(watcher, info, 'spectator');
  } finally { await context.close(); }

  const seen = new Set(); let shotPlay = false;
  for (let i = 0; i < 900; i++) {
    await page.waitForTimeout(250);
    const s = await state(page);
    if (s.g.stage === 'play' && !shotPlay && s.g.trick.length) { shotPlay = true; await shot(page, info, 'playing'); }
    if (s.g.stage === 'deal-over' || s.phase !== 'playing') break;
    try { await humanStep(page, seen); } catch { /* Zustand hat sich zwischenzeitlich geändert */ }
  }
  expect(await page.evaluate(() => lastState.g.stage)).toBe('deal-over');
  await expect(page.locator('.dk-result')).toBeVisible();
  await shot(page, info, 'result');
  const deal = await page.evaluate(() => lastState.g.lastDeal);
  expect(deal.points.re + deal.points.kontra).toBe(240);
  expect(Object.values(deal.per).reduce((a, b) => a + b, 0)).toBe(0);

  await page.reload();
  await expect(page.locator('.dk-world')).toBeVisible();
  await shot(page, info, 'reconnect');
  await click(page, '[data-g=dk-next]');
  await expect.poll(() => page.evaluate(() => lastState.g.dealNo)).toBe(2);
  expect((await page.evaluate(() => send('gamePause', { paused: true }))).ok).toBe(true);
  await shot(page, info, 'pause');
  expect((await page.evaluate(() => send('gamePause', { paused: false }))).ok).toBe(true);
  if (info.project.name === 'desktop') for (const [width, height] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await shot(page, info, `table-${width}x${height}`);
  }
  await page.evaluate(() => I18n.select('en'));
  await page.locator('[data-kit=help]').first().click();
  await expect(page.locator('#help-dlg')).toContainText('Queen of clubs');
  await page.locator('[data-help-more]').click();
  await expect(page.locator('.kg-rules')).toContainText('Trump order');
  await shot(page, info, 'english-rules');
});
