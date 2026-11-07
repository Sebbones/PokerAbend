import { test, expect, login, selectGame } from '../../test/ui/helpers.js';
import { mkdirSync } from 'node:fs';

async function shot(page, info, name) {
  let path = info.outputPath(name + '.png');
  if (process.env.CARDS_CAPTURE === '1') { const dir = 'docs/design/screenshots/skat'; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.png`; }
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
  if (g.stage === 'bid') { if (g.bd.phase === 'call' && !seen.has('bid-once')) { seen.add('bid-once'); await click(page, '[data-g=sk-bid]'); } else if (g.bd.phase === 'respond' && !seen.has('hold-once')) { seen.add('hold-once'); await click(page, '[data-g=sk-hold]'); } else await click(page, '[data-g=sk-pass]'); }
  else if (g.stage === 'ramschChoice') await click(page, '[data-g=sk-ramsch][data-play="1"]');
  else if (g.stage === 'pickup') await click(page, '[data-g=sk-pickup][data-take="1"]');
  else if (g.stage === 'discard') { const cards = page.locator('[data-g=sk-card]:enabled'); await cards.nth(0).click(); await cards.nth(1).click(); await click(page, '[data-g=sk-discard]:enabled'); }
  else if (g.stage === 'declare') { await page.locator('.sk-chip', { hasText: 'Grand' }).click(); await click(page, '[data-g=sk-declare]'); }
  else if (g.stage === 'play') { await page.locator('[data-g=sk-card]:enabled').first().click(); await click(page, '[data-g=sk-play]:enabled'); }
  return true;
}

test('Skat: Hosten, Bots, Reizen, Skat, Ansage, Stichspiel, Abrechnung, Zuschauer, Pause, Reconnect, Viewports und Englisch', async ({ page, app, browser }, info) => {
  test.setTimeout(240000);
  await login(page, app); await selectGame(page, 'skat');
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', 'skat');
  await expect(page.locator('.scene-hero > svg')).toBeVisible(); await expect(page.locator('.sk-lobby')).toBeVisible();
  await shot(page, info, 'lobby');
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  for (const difficulty of ['easy', 'hard']) expect((await page.evaluate((d) => send('addBot', { difficulty: d }), difficulty)).ok).toBe(true);
  expect((await page.evaluate(() => send('settings', { turnTime: 0, deals: 3, ramsch: true, bock: true }))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await expect(page.locator('.sk-hand .kc')).toHaveCount(10);
  const code = await page.evaluate(() => lastState.code);
  const context = await browser.newContext();
  try {
    const watcher = await context.newPage();
    await login(watcher, app, 'Watcher');
    await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect(watcher.locator('.sk-world')).toBeVisible();
    expect(await watcher.evaluate(() => lastState.g.hand)).toBe(null);
    await shot(watcher, info, 'spectator');
  } finally { await context.close(); }

  const seen = new Set(); let shotBid = false, shotPlay = false;
  for (let i = 0; i < 600; i++) {
    await page.waitForTimeout(250);
    const s = await state(page);
    if (s.g.stage === 'bid' && !shotBid) { shotBid = true; await shot(page, info, 'bidding'); }
    if (s.g.stage === 'play' && !shotPlay && s.g.trick.length) { shotPlay = true; await shot(page, info, 'playing'); }
    if (s.g.stage === 'deal-over' || s.phase !== 'playing') break;
    try { await humanStep(page, seen); } catch { /* Zustand hat sich zwischenzeitlich geändert */ }
  }
  expect(await page.evaluate(() => lastState.g.stage)).toBe('deal-over');
  await expect(page.locator('.sk-felt')).toBeVisible();
  await shot(page, info, 'result');
  const points = await page.evaluate(() => lastState.g.lastDeal);
  expect(points.thrownIn || points.points).toBeTruthy();

  await page.reload();
  await expect(page.locator('.sk-world')).toBeVisible();
  await shot(page, info, 'reconnect');
  await click(page, '[data-g=sk-next]');
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
  await expect(page.locator('#help-dlg')).toContainText('highest bidder');
  await page.locator('[data-help-more]').click();
  await expect(page.locator('.kg-rules')).toContainText('Game value');
  await shot(page, info, 'english-rules');
});
