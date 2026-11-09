// EXP-F5: Atmosphäre (Welt-Standard, Mixer, Spielpause) und Lobby-Leben (Hinsetzen/Aufstehen) im echten Browser.
import { test, expect, login, selectGame } from './helpers.js';

async function host(page, game) {
  await selectGame(page, game); await page.locator('#host-form button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => typeof lastState !== 'undefined' && !!lastState?.code)).toBe(true);
  return page.evaluate(() => lastState.code);
}

test('EXP-F5 Atmosphäre: standardmäßig still, Welt passt zum Spiel, Spielpause hält sie an', async ({ page, app }) => {
  test.setTimeout(90000);
  await login(page, app);
  await host(page, 'maumau');
  await expect.poll(() => page.evaluate(() => Sound.state())).toEqual({ ambient: 'kamin', playing: false });
  expect(await page.evaluate(() => Settings.get().sound.atmosphere)).toBe(0);
  // Atmosphäre im Mixer aufdrehen (neue Sitzung), dann an einen frischen Tisch.
  await page.goto(app.url); await page.evaluate(() => { location.hash = '#einstellungen/ton'; });
  await expect(page.locator('#set-ton')).toBeVisible();
  await page.locator('[data-sound-level="atmosphere"]').fill('40');
  await expect.poll(() => page.evaluate(() => Settings.get().sound.atmosphere)).toBe(0.4);
  await host(page, 'maumau');
  await page.locator('#kg-main').click({ position: { x: 5, y: 5 } }); // Nutzergeste für Web Audio
  await expect.poll(() => page.evaluate(() => Sound.state())).toEqual({ ambient: 'kamin', playing: true });
  for (const [event, data] of [['sit'], ['addBot'], ['start']]) expect((await page.evaluate(([e, d]) => send(e, d), [event, data])).ok, event).toBe(true);
  await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
  expect((await page.evaluate(() => send('gamePause', { paused: true }))).ok).toBe(true);
  await expect.poll(() => page.evaluate(() => Sound.state().playing)).toBe(false);
  expect((await page.evaluate(() => send('gamePause', { paused: false }))).ok).toBe(true);
  await expect.poll(() => page.evaluate(() => Sound.state().playing)).toBe(true);
  // Ein anderes Spiel bringt seine eigene Welt mit.
  await page.goto(app.url);
  await host(page, 'werwolf');
  await expect.poll(() => page.evaluate(() => Sound.state().ambient)).toBe('wald-nacht');
});

test('EXP-F5 Lobby-Leben: Hinsetzen rückt den Stuhl, Aufstehen verblasst, Neuladen spielt nichts nach', async ({ page, app, browser }, info) => {
  await login(page, app);
  const code = await host(page, 'maumau');
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  await page.evaluate(() => {
    window.__soundLog = []; window.__ghosts = 0;
    new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => { if (n.classList?.contains('seat-ghost')) window.__ghosts++; }))).observe(document.body, { childList: true });
  });
  const context = await browser.newContext({ ...info.project.use, viewport: page.viewportSize() }), guest = await context.newPage();
  try {
    await login(guest, app, 'Ben');
    await guest.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect.poll(() => guest.evaluate(() => lastState?.code)).toBe(code);
    const guestId = await guest.evaluate(() => lastState.you.id);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => __soundLog.filter((e) => e.event === 'seat').length), 'Zuschauen ist kein Hinsetzen').toBe(0);
    expect((await guest.evaluate(() => send('sit'))).ok).toBe(true);
    await expect(page.locator(`[data-pid="${guestId}"][data-seat-joined]`).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => __soundLog.filter((e) => e.event === 'seat').length)).toBe(1);
    expect((await guest.evaluate(() => send('stand'))).ok).toBe(true);
    await expect.poll(() => page.evaluate(() => __soundLog.filter((e) => e.event === 'stand').length)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__ghosts)).toBe(1);
    await expect(page.locator('.seat-ghost')).toHaveCount(0, { timeout: 3000 });
    expect((await guest.evaluate(() => send('sit'))).ok).toBe(true);
    await expect.poll(() => page.evaluate(() => __soundLog.filter((e) => e.event === 'seat').length)).toBe(2);
    // Neuladen: der aktuelle Tisch wird nur übernommen, niemand „setzt sich“ erneut.
    await page.reload();
    await expect.poll(() => page.evaluate(() => typeof lastState !== 'undefined' && lastState?.code)).toBe(code);
    await page.evaluate(() => { window.__soundLog = []; });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => __soundLog.filter((e) => ['seat', 'stand'].includes(e.event)).length)).toBe(0);
    await expect(page.locator('[data-seat-joined]')).toHaveCount(0);
  } finally { await context.close(); }
});
