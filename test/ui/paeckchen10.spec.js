import { test, expect, login, selectGame } from './helpers.js';
const cases = [
  ['monopoly', 'classic', '.mo-field', 40], ['monopoly', 'speed', '.mo-field', 40], ['monopoly', 'junior', '.mo-field', 24],
  ['farbenchaos', 'classic', '.kg-hand .kc'], ['farbenchaos', 'flip', '.kg-hand .kc'], ['farbenchaos', 'no-mercy', '.kg-hand .kc'], ['farbenchaos', 'all-wild', '.kg-hand .kc'],
  ['kniffel', 'classic', '.kn-sheet'], ['kniffel', 'triple', '.kn-sheet'],
  ['huetchen', 'classic', '.hb-board'], ['huetchen', 'six', '.hb-hex'], ['huetchen', 'team', '.hb-board'],
  ['viergewinnt', 'classic', '.vg-board'], ['viergewinnt', 'pop-out', '.vg-board'], ['viergewinnt', 'five', '.vg-board'],
  ['schiffe', 'classic', '.sv-board'], ['schiffe', 'salvo', '.sv-board'],
  ['stapelrennen', 'classic', '.st-builds'], ['stapelrennen', 'short', '.st-builds'], ['stapelrennen', 'team', '.st-builds'],
  ['zehnetappen', 'classic', '.ze-table'], ['zehnetappen', 'short', '.ze-table'], ['zehnetappen', 'team', '.ze-table'],
  ['monopoly-deal', 'classic', '.md-table'], ['monopoly-deal', 'quick', '.md-table'],
  ['spiel-des-lebens', 'classic', '.life-map'], ['spiel-des-lebens', 'short', '.life-map'],
];

async function host(page, app, game, variant) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await login(page, app); await selectGame(page, game);
  await page.locator('#host-variant').selectOption(variant); await page.locator('#host-form button[type=submit]').click();
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
  const count = variant === 'team' ? 4 : variant === 'six' ? 6 : 2;
  for (let i = 1; i < count; i++) expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  if (game === 'monopoly' && variant !== 'junior') expect((await page.evaluate(() => send('settings', { theme: 'classic' }))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
}
async function action(page, game) {
  const click = async (selector) => { const button = page.locator(selector).first(); if (await button.isVisible() && await button.isEnabled()) { await button.click(); return true; } return false; };
  if (game === 'monopoly') { if (await click('#mo-dialog[open] [data-mo=buy][data-yes=true]')) return; if (await click('[data-g=junior]')) return; if (await click('[data-g=speed]')) return; if (await click('[data-g=destination]')) return; if (await click('[data-g=roll]')) return; await click('[data-g=end]'); }
  else if (game === 'spiel-des-lebens') { if (await click('[data-g=choose]')) return; await click('[data-g=spin]'); }
  else if (game === 'farbenchaos') { for (const selector of ['[data-g=target]', '[data-g=wish]', '[data-g=chooseColor]', '[data-g=acceptDraw]', '[data-g=play-selected]', '.kg-hand .can', '[data-g=pass]', '[data-g=draw]']) if (await click(selector)) return; }
  else if (game === 'kniffel') { if (await click('[data-g=score][data-f=chance]')) return; if (await click('[data-g=score]:not(.zero)')) return; await click('[data-g=roll]'); }
  else if (game === 'huetchen') { if (await click('[data-g=move]')) return; if (await click('[data-g=pick]')) return; await click('[data-g=roll]'); }
  else if (game === 'viergewinnt') await click('[data-g=col]');
  else if (game === 'schiffe') { if (await click('[data-g=random]')) { await click('[data-g=ready]'); return; } const salvo = await page.evaluate(() => lastState.variant === 'salvo'); if (salvo) { const count = await page.evaluate(() => lastState.g.salvoQuota); for (let i = 0; i < count; i++) await page.locator('[data-g=aim]').nth(i).click(); await click('[data-g=salvo]'); } else { await click('[data-g=aim]'); await click('[data-g=fire]'); } }
  else if (game === 'stapelrennen') { if (await click('[data-g=drop]')) return; await click('[data-g=pick][data-kind=hand]'); }
  else if (game === 'zehnetappen') { for (const selector of ['[data-g=draw-deck]', '[data-g=mode-discard]', '[data-g=discard]', '[data-g=skipwho]', '.kg-hand [data-g=pick]']) if (await click(selector)) return; }
  else if (game === 'monopoly-deal') await click('[data-g=end]');
}
for (const [game, variant, selector, count] of cases) test(`P10 ${game}/${variant}: auswählen, mit Bots anspielen, wiederverbinden`, async ({ page, app }, info) => {
  test.setTimeout(60000); await host(page, app, game, variant);
  if (count) await expect(page.locator(selector)).toHaveCount(count); else await expect(page.locator(selector).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => lastState.variant)).toBe(variant);
  if (game === 'schiffe') {
    await action(page, game); await expect.poll(() => page.evaluate(() => lastState.g.step)).toBe('shoot');
    await action(page, game);
    if (variant === 'salvo') await expect.poll(() => page.evaluate(() => lastState.g.salvoRound)).toBeGreaterThan(1);
    else await expect.poll(() => page.evaluate(() => Object.values(lastState.g.seas).reduce((n, sea) => n + Object.keys(sea.shots).length, 0))).toBeGreaterThan(0);
  }
  if (game === 'spiel-des-lebens') {
    for (let k = 0; k < 20 && !(await page.evaluate(() => lastState.g.spin)); k++) {
      if (await page.evaluate(() => lastState.turnId === lastState.you.id)) await action(page, game); else await page.waitForTimeout(150);
    }
    await expect.poll(() => page.evaluate(() => lastState.g.spin?.value || 0)).toBeGreaterThan(0);
    await expect(page.locator('.life-car.own')).toBeVisible();
  }
  for (let k = 0; k < 25; k++) {
    const played = await page.evaluate(() => lastState.moves.some((m) => /^Bot /.test(m.n)));
    if (played) break;
    const mine = await page.evaluate(() => lastState.turnId === lastState.you.id || lastState.g?.step === 'place');
    if (mine) await action(page, game); else await page.waitForTimeout(200);
  }
  await expect.poll(() => page.evaluate(() => lastState.moves.some((m) => /^Bot /.test(m.n))), { timeout: 10000 }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`${game}-${variant}.png`) });
  await page.reload(); if (count) await expect(page.locator(selector)).toHaveCount(count); else await expect(page.locator(selector).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => lastState.variant)).toBe(variant);
});

test('P10 Variantenwechsel ist Host-Sache, bleibt nach Reload und hat eigene Bestenliste', async ({ page, app, browser }) => {
  await login(page, app); await selectGame(page, 'viergewinnt'); await page.locator('#host-form button[type=submit]').click();
  await page.locator('[data-kit-panel=host]').first().click(); await page.locator('[data-variant]').selectOption('five');
  await expect.poll(() => page.evaluate(() => lastState?.variant)).toBe('five'); await page.reload();
  await expect.poll(() => page.evaluate(() => lastState?.variant)).toBe('five');
  expect((await page.evaluate(() => send('setVariant', { variant: 'falsch' }))).ok).toBe(false);
  const board = await page.evaluate(async () => (await fetch('/api/leaderboard?game=viergewinnt~five')).json());
  expect(board.game).toBe('viergewinnt~five'); expect(board.games.find((g) => g.id === board.game).name).toContain('Fünf in einer Reihe');
  const context = await browser.newContext();
  try {
    const guest = await context.newPage(); await login(guest, app, 'Ben'); const code = await page.evaluate(() => lastState.code);
    await guest.evaluate((code) => joinAndEnter(code), code);
    expect((await guest.evaluate(() => send('setVariant', { variant: 'classic' }))).ok).toBe(false);
  } finally { await context.close(); }
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click(); expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true); expect((await page.evaluate(() => send('setVariant', { variant: 'classic' }))).ok).toBe(false);
});
