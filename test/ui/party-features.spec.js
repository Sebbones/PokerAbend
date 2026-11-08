import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

async function command(page, event, data = {}) {
  const reply = await page.evaluate(({ event, data }) => new Promise((resolve) => socket.emit(event, data, resolve)), { event, data });
  expect(reply?.ok, JSON.stringify(reply)).toBe(true);
  return reply;
}
async function create(page, app) {
  await login(page, app); await page.emulateMedia({ reducedMotion: 'reduce' });
  await selectGame(page, 'schaetzmeister');
  await page.locator('#host-form button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => lastState?.game)).toBe('schaetzmeister');
  await command(page, 'sit');
}
async function plan(page, mode) {
  await page.locator('[data-kit-panel="host"]').first().click();
  await page.getByRole('button', { name: 'Abendprogramm planen', exact: true }).click();
  await page.locator('#program-mode').selectOption(mode);
  await expect(page.locator(mode === 'party-brett' ? '.pb-brief' : '#program-dlg .sv-world')).toBeVisible();
}
async function fit(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
async function shot(page, info, name) { await fit(page); const dir = `artifacts/party-features-ui/${info.project.name}`; mkdirSync(dir, { recursive: true }); await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true }); }
async function closePanel(page) { if (await page.locator('#kg-panel').isVisible()) await page.locator('#kg-panel .icon-btn[data-kit="close"]').click(); }
async function closeResult(page) { if (await page.locator('.kg-over [data-kit="closeResult"]').isVisible()) await page.locator('.kg-over [data-kit="closeResult"]').click(); }

test('Party Board: real minigame, own item controls, guest permissions, reconnect, six layouts and English rules', async ({ page, app, browser }, info) => {
  test.setTimeout(90000); // Two contexts and nine full-page screenshots at six sizes.
  await create(page, app);
  const code = await page.evaluate(() => lastState.code);
  const guestContext = await browser.newContext(info.project.use);
  const guest = await guestContext.newPage();
  try {
    await login(guest, app, 'Ben');
    await guest.evaluate((code) => joinAndEnter(code, 'sit'), code);
    await expect.poll(() => guest.evaluate(() => typeof lastState === 'undefined' ? null : lastState?.code)).toBe(code);
    await plan(page, 'party-brett');
    await page.locator('#program-board-rounds').fill('2');
    await shot(page, info, 'board-lobby');
    await page.getByRole('button', { name: 'Programm übernehmen', exact: true }).click();
    await command(page, 'custom', { text: 'Testfrage Punkte? | 10 | Punkte' });
    await command(page, 'programStart');
    await closePanel(page);
    await expect(page.locator('.program-banner')).toContainText('Party-Brett');
    await expect.poll(() => page.evaluate(() => lastState.g?.stage)).toBe('write');
    await command(page, 'guess', { text: '10' }); await command(guest, 'guess', { text: '1' });
    await command(page, 'next');
    await expect.poll(() => page.evaluate(() => lastState.partyProgram?.status)).toBe('between');
    await expect(page.locator('.kg-over .pb-grid')).toBeVisible();
    await expect(page.locator('.kg-over [data-pb-item="shield"]')).toBeVisible();
    const saved = await page.evaluate(() => JSON.stringify(lastState.partyProgram.board));
    const forbidden = await guest.evaluate(() => new Promise((resolve) => socket.emit('programNext', {}, resolve)));
    expect(forbidden.ok).toBe(false);
    expect(await page.evaluate(() => JSON.stringify(lastState.partyProgram.board))).toBe(saved);
    await page.locator('.kg-over [data-pb-item="shield"]').click();
    await expect.poll(() => page.evaluate(() => lastState.partyProgram.board.shields[lastState.you.id])).toBe(true);
    await shot(page, info, 'board-result');
    const expected = await page.evaluate(() => JSON.stringify(lastState.partyProgram.board));
    await page.reload();
    await expect.poll(() => page.evaluate(() => lastState?.partyProgram && JSON.stringify(lastState.partyProgram.board))).toBe(expected);
    await closeResult(page);
    await page.locator('.program-banner [data-program="stand"]').click();
    await expect(page.locator('#program-dlg .pb-grid')).toBeVisible();
    await shot(page, info, 'board-reconnect');
    for (const [width, height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]) {
      await page.setViewportSize({ width, height }); await shot(page, info, `board-layout-${width}x${height}`);
    }
    await page.evaluate(() => I18n.select('en'));
    // Language change rerenders the open feature dialog using authored text.
    await page.locator('[data-program-close]').click();
    await page.locator('.program-banner [data-program="stand"]').click();
    await expect(page.locator('#program-dlg')).toContainText('Lantern Trail');
    await page.locator('#program-dlg .pf-rules summary').click();
    await expect(page.locator('#program-dlg')).toContainText('The host rolls');
    await shot(page, info, 'board-english-rules');
  } finally { await guestContext.close(); }
});

test('Survival Evening: bot round, life accounting, reconnect and visible rules in DE/EN', async ({ page, app }, info) => {
  await create(page, app); await command(page, 'addBot');
  await command(page, 'custom', { text: 'Wie viele Testpunkte? | 10 | Punkte' });
  await plan(page, 'survival-abend');
  await page.locator('#program-lives').fill('1');
  await expect(page.locator('[data-program-game="0"] option[value="werwolf"]')).toHaveCount(0);
  await shot(page, info, 'survival-lobby');
  await page.getByRole('button', { name: 'Programm übernehmen', exact: true }).click();
  await command(page, 'programStart'); await closePanel(page);
  await command(page, 'guess', { text: '10' });
  // The bot may occasionally guess correctly; a void/tie must preserve all lives.
  await expect.poll(() => page.evaluate(() => lastState.g?.stage), { timeout: 10000 }).toBe('reveal');
  await command(page, 'next');
  await expect(page.locator('.kg-over .sv-world')).toBeVisible();
  const p = await page.evaluate(() => lastState.partyProgram);
  expect(['done', 'between']).toContain(p.status);
  expect(Object.values(p.lives).every((v) => v >= 0 && v <= 1)).toBe(true);
  await shot(page, info, 'survival-result');
  await page.reload();
  await expect.poll(() => page.evaluate(() => lastState?.partyProgram?.lives)).toEqual(p.lives);
  await closeResult(page);
  await page.locator('.program-banner [data-program="stand"]').click();
  await expect(page.locator('#program-dlg .sv-lights')).toBeVisible();
  for (const [width, height] of [[1920,1080],[1440,900],[768,1024],[390,844],[360,800],[900,450]]) {
    await page.setViewportSize({ width, height }); await shot(page, info, `survival-layout-${width}x${height}`);
  }
  await page.locator('[data-program-close]').click(); await page.evaluate(() => I18n.select('en'));
  await page.locator('.program-banner [data-program="stand"]').click();
  await page.locator('#program-dlg .pf-rules summary').click();
  await expect(page.locator('#program-dlg')).toContainText('Cycle through');
  await shot(page, info, 'survival-english-rules');
});

test('Modifiers and Chaos: host settings, public preview, raw-vs-final score, one-game scope and rules tab', async ({ page, app }, info) => {
  await create(page, app); await command(page, 'addBot');
  await page.locator('[data-kit-panel="host"]').first().click();
  await expect(page.locator('[data-kit-set="modifierRule"]')).toHaveValue('off');
  await page.locator('[data-kit-set="modifierRule"]').selectOption('double');
  await expect(page.locator('.pm-world').first()).toContainText('Doppelte Punkte');
  await command(page, 'settings', { modifierScope: 'once', rounds: 1 });
  await command(page, 'custom', { text: 'Wie viele Testpunkte? | 10 | Punkte' });
  await closePanel(page); await shot(page, info, 'modifier-lobby');
  await command(page, 'start'); await command(page, 'guess', { text: '10' });
  await expect.poll(() => page.evaluate(() => lastState.g?.stage), { timeout: 10000 }).toBe('reveal');
  await command(page, 'next');
  await expect.poll(() => page.evaluate(() => lastState.partyRules?.lastRule)).toBe('double');
  const S = await page.evaluate(() => lastState);
  expect(S.result.points[S.you.id]).toBe(10); expect(S.partyRules.rule).toBe('off');
  await shot(page, info, 'modifier-result');
  await command(page, 'settings', { chaosMode: true, modifierScope: 'session' });
  const preview = await page.evaluate(() => lastState.partyRules.rule);
  await page.reload(); await expect.poll(() => page.evaluate(() => lastState?.partyRules?.rule)).toBe(preview);
  await closeResult(page);
  await page.locator('#kg [data-kit="help"]').click();
  await page.locator('[data-help-more]').click();
  await expect(page.locator('#kg-panel-body [data-program-rules]')).toContainText('Chaos-Modus');
  await page.locator('#kg-panel-body [data-program-rules] summary').click();
  await page.locator('#kg-panel-body [data-program-rules]').scrollIntoViewIfNeeded();
  await shot(page, info, 'chaos-rules');
  await page.evaluate(() => I18n.select('en'));
  await expect(page.locator('#kg-panel-body [data-program-rules]')).toContainText('Chaos Mode');
  await expect(page.locator('#kg-panel-body [data-program-rules]')).toContainText('Supported:');
  await page.locator('#kg-panel-body [data-program-rules] summary').click();
  await page.locator('#kg-panel-body [data-program-rules]').scrollIntoViewIfNeeded();
  await shot(page, info, 'chaos-english-rules');
});

test('Program chaos: real lobby announcement and explicit Host confirmation before any question begins', async ({ page, app }, info) => {
  await create(page, app); await command(page, 'addBot');
  await command(page, 'programSave', { mode: 'playlist', entries: [{ game: 'schaetzmeister', settings: { chaosMode: true, rounds: 1 } }] });
  await command(page, 'programStart');
  await expect.poll(() => page.evaluate(() => lastState.partyProgram?.awaitingRule)).toBe(true);
  const rule = await page.evaluate(() => lastState.partyRules.rule);
  expect(await page.evaluate(() => lastState.phase)).toBe('lobby');
  await expect(page.locator('.pm-world').first()).toContainText('Chaos-Modus');
  await shot(page, info, 'chaos-program-preview');
  await page.reload();
  await expect.poll(() => page.evaluate(() => lastState?.partyProgram?.awaitingRule)).toBe(true);
  expect(await page.evaluate(() => lastState.partyRules.rule)).toBe(rule);
  await command(page, 'programNext');
  await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
  expect(await page.evaluate(() => lastState.partyRules.rule)).toBe(rule);
});
