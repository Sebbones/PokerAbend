// V2-11 Gebietskampf: echter Raum mit Bots, Bedienung nur durch Antippen, Zuschauer, Pause, Reconnect mitten im Zug,
// Zoom auf dem Handy, sechs Größen ohne seitliches Überlaufen, Englisch. Screenshots: GK_CAPTURE=1 → docs/design/screenshots/gebietskampf/
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);
const state = (page) => page.evaluate(() => ({ phase: lastState.phase, turn: lastState.turnId, me: lastState.you.id, g: lastState.g, players: lastState.players }));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const myTurn = (page) => expect.poll(() => state(page).then((s) => s.turn === s.me && s.phase === 'playing'), { timeout: 60000 }).toBe(true);

test('Gebietskampf: Hosten, Bots, Verstärken, Angreifen, Verschieben, Zuschauer, Pause, Reconnect, Zoom, Größen und Englisch', async ({ page, app, browser }, info) => {
  test.setTimeout(240000);
  const shot = async (p, name) => {
    let path = info.outputPath(`gebietskampf-${name}.jpg`);
    if (process.env.GK_CAPTURE === '1') { const dir = process.env.VIS_CAPTURE_DIR || 'docs/design/screenshots/gebietskampf'; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.jpg`; }
    await p.screenshot({ path, fullPage: true, type: 'jpeg', quality: 70 });
  };
  await login(page, app); await selectGame(page, 'gebietskampf');
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', 'gebietskampf');
  await shot(page, 'lobby');
  expect((await send(page, 'sit')).ok).toBe(true);
  for (const difficulty of ['easy', 'hard']) expect((await send(page, 'addBot', { difficulty })).ok).toBe(true);
  expect((await send(page, 'settings', { turnTime: 0, map: 'small', mode: 'mission' })).ok).toBe(true);
  expect((await send(page, 'start')).ok).toBe(true);
  await expect(page.locator('.gk-svg')).toBeVisible();
  await expect(page.locator('.gk-t')).toHaveCount(28);
  await myTurn(page);
  await expect(page.locator('.gk-mission')).toBeVisible(); // geheime Mission nur für den Spieler selbst
  // VIS-090: alle Gebiete zusätzlich als zugängliche Liste; wählbare Gebiete stimmen mit der Karte überein
  await expect(page.locator('.gk-listbox .gk-li')).toHaveCount(28);
  await expect(page.locator('.gk-listbox .gk-li.pick')).toHaveCount(await page.locator('.gk-t.pick').count());
  await shot(page, 'reinforce');

  // Zuschauer sieht die Karte ohne Aktionen, keine Mission, keine Karten
  const code = await page.evaluate(() => lastState.code), context = await browser.newContext({ viewport: page.viewportSize() || undefined });
  try {
    const watcher = await context.newPage(); await login(watcher, app, 'Zuschauer'); await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect(watcher.locator('.gk-svg')).toBeVisible(); await expect(watcher.locator('.gk-mission')).toHaveCount(0);
    await expect(watcher.locator('.gk-t.pick')).toHaveCount(0); await shot(watcher, 'spectator');
  } finally { await context.close(); }

  // Verstärkung: Gebiet antippen setzt Truppen (Menge 5, dann der Rest)
  const before = await state(page), reserve = before.g.reserve;
  await page.locator('[data-g=gk-amt][data-a=all]').click();
  await page.locator('.gk-t.pick').first().click();
  await expect.poll(() => state(page).then((s) => s.g.reserve)).toBe(0);
  const after = await state(page);
  expect(Object.values(after.g.armies).reduce((a, b) => a + b, 0)).toBe(Object.values(before.g.armies).reduce((a, b) => a + b, 0) + reserve);
  await page.locator('[data-g=gk-next]').click();
  await expect.poll(() => state(page).then((s) => s.g.stage)).toBe('attack');

  // Angriff: eigenes Gebiet, dann markiertes Nachbargebiet – die Würfel fallen auf dem Server
  await page.locator('.gk-t.pick').first().click();
  await expect(page.locator('.gk-t.hit').first()).toBeVisible();
  await shot(page, 'attack-select');
  await page.locator('.gk-t.hit').first().click();
  await page.locator('[data-g=gk-attack]:not([data-blitz])').click();
  await expect.poll(() => state(page).then((s) => !!s.g.last)).toBe(true);
  await expect(page.locator('.gk-battle .gk-die').first()).toBeVisible();
  await shot(page, 'battle');
  if ((await state(page)).g.pending) { await page.locator('[data-g=gk-occ]').last().click(); await expect.poll(() => state(page).then((s) => !s.g.pending)).toBe(true); }

  // Pause und Reconnect mitten im Zug: der Stand bleibt, der Zug geht weiter
  expect((await send(page, 'gamePause', { paused: true })).ok).toBe(true); await shot(page, 'paused');
  expect((await send(page, 'gamePause', { paused: false })).ok).toBe(true);
  const armiesBefore = (await state(page)).g.armies;
  await page.reload(); await expect(page.locator('.gk-svg')).toBeVisible();
  expect((await state(page)).g.armies).toEqual(armiesBefore);
  expect((await state(page)).g.stage).toBe('attack');
  await shot(page, 'reconnect');

  // Zoom (Handy): Vergrößern ändert die Kartenbreite, die Seite selbst läuft nicht seitlich über
  const widthOf = () => page.locator('.gk-svg').evaluate((el) => el.getBoundingClientRect().width);
  const w0 = await widthOf(); await page.locator('[data-g=gk-zoom][data-z="+"]').click(); expect(await widthOf()).toBeGreaterThan(w0);
  await page.locator('[data-g=gk-zoom][data-z="+"]').click(); await shot(page, 'zoomed');
  await page.locator('[data-g=gk-zoom][data-z=fit]').click(); expect(Math.round(await widthOf())).toBeLessThanOrEqual(Math.round(await page.locator('.gk-viewport').evaluate((el) => el.clientWidth)) + 1);
  expect(await overflow(page)).toBe(true);

  // Verschieben und Zug beenden, danach ist ein Bot dran
  await page.locator('[data-g=gk-next]').click();
  await expect.poll(() => state(page).then((s) => s.g.stage)).toBe('fortify');
  await page.locator('[data-g=gk-end]').click();
  await expect.poll(() => state(page).then((s) => s.turn !== s.me)).toBe(true);
  await shot(page, 'waiting');

  // Tastatur: im nächsten eigenen Zug setzt Enter auf einem markierten Gebiet die Verstärkung
  await myTurn(page);
  await page.locator('[data-g=gk-amt][data-a="1"]').click();
  const reserve2 = (await state(page)).g.reserve, pick = page.locator('.gk-t.pick').first(); await pick.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => state(page).then((s) => s.g.reserve)).toBe(reserve2 - 1);

  if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height }); expect(await overflow(page), `${width}x${height}`).toBe(true);
    const box = await page.locator('.gk-viewport').boundingBox(); expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await shot(page, `table-${width}x${height}`);
  } else expect(await overflow(page)).toBe(true);

  // Englisch
  await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize());
  await page.evaluate(() => I18n.select('en'));
  await expect(page.locator('.gk-steps')).toContainText('Reinforce');
  await page.locator('[data-kit=help]').first().click(); await expect(page.locator('#help-dlg')).toBeVisible();
  await shot(page, 'english-rules'); await page.keyboard.press('Escape');
});
