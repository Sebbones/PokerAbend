// V2-12 Städtehandel: echter Raum mit Bots, Aufbau per Antippen, Würfeln, Bauen, Handelsangebot, Zuschauer ohne Rohstoffe, Pause,
// Reconnect, Zoom, Bauplätze groß genug zum Antippen (Handy), Größen ohne seitliches Überlaufen, großes Brett (5 Spieler), Englisch.
// Screenshots: ST_CAPTURE=1 → docs/design/screenshots/staedtehandel/
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]];
const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);
const state = (page) => page.evaluate(() => ({ phase: lastState.phase, turn: lastState.turnId, me: lastState.you.id, g: lastState.g, players: lastState.players }));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const myTurn = (page) => expect.poll(() => state(page).then((s) => s.turn === s.me && s.phase === 'playing'), { timeout: 60000 }).toBe(true);
const stage = (page, st) => expect.poll(() => state(page).then((s) => s.g.stage), { timeout: 60000 }).toBe(st);

async function hostGame(page, app, { bots = ['easy', 'hard'], settings = {} } = {}) {
  await login(page, app); await selectGame(page, 'staedtehandel');
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', 'staedtehandel');
  expect((await send(page, 'sit')).ok).toBe(true);
  for (const difficulty of bots) expect((await send(page, 'addBot', { difficulty })).ok).toBe(true);
  expect((await send(page, 'settings', { turnTime: 0, ...settings })).ok).toBe(true);
}

test('Städtehandel: Aufbau, Würfeln, Bauen, Handel, Zuschauer, Pause, Reconnect, Zoom, Größen und Englisch', async ({ page, app, browser }, info) => {
  test.setTimeout(300000);
  const mobile = info.project.name === 'mobil';
  const shot = async (p, name) => {
    let path = info.outputPath(`staedtehandel-${name}.jpg`);
    if (process.env.ST_CAPTURE === '1') { const dir = process.env.VIS_CAPTURE_DIR || 'docs/design/screenshots/staedtehandel'; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${name}.jpg`; }
    await p.screenshot({ path, fullPage: true, type: 'jpeg', quality: 70 });
  };
  await hostGame(page, app, { settings: { layout: 'beginner' } });
  await shot(page, 'lobby');
  expect((await send(page, 'start')).ok).toBe(true);
  await expect(page.locator('.st-svg')).toBeVisible();
  await expect(page.locator('.st-land')).toHaveCount(19);
  await expect(page.locator('.st-port')).toHaveCount(9);
  await expect(page.locator('.st-token')).toHaveCount(18);

  // Aufbau: Siedlung, dann Straße – jeweils durch Antippen markierter Plätze
  await myTurn(page);
  await expect(page.locator('.st-spot.settlement').first()).toBeVisible();
  // VIS-089: dieselben legalen Bauplätze gibt es zusätzlich als zugängliche Liste (gleiche Anzahl wie Plätze auf der Karte)
  await expect(page.locator('.st-buildlist [data-g=st-spot]')).toHaveCount(await page.locator('.st-spot.settlement').count());
  await shot(page, 'setup-settlement');
  if (mobile) { // Bauplätze sind auf dem Handy groß genug zum Antippen
    const box = await page.locator('.st-spot.settlement .hit').first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('.st-spot.settlement').first().click();
  await expect.poll(() => state(page).then((s) => Object.keys(s.g.buildings).length)).toBe(1);
  await expect(page.locator('.st-spot.road').first()).toBeVisible();
  if (mobile) { const box = await page.locator('.st-spot.road .hit').first().boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); }
  await page.locator('.st-spot.road').first().click();
  await expect.poll(() => state(page).then((s) => Object.keys(s.g.roads).length)).toBeGreaterThanOrEqual(1);
  // Zweite Runde (rückwärts): erst die Bots, dann wieder ich
  await expect.poll(() => state(page).then((s) => s.g.stage === 'setup' && s.turn === s.me && s.g.setup.second), { timeout: 60000 }).toBe(true);
  await page.locator('.st-spot.settlement').last().click();
  await page.locator('.st-spot.road').first().click();
  await stage(page, 'roll');
  const afterSetup = await state(page);
  expect(Object.keys(afterSetup.g.buildings).length).toBe(6);
  await shot(page, 'board');

  // Zuschauer sieht das Brett, aber weder Rohstoffe noch Bauplätze
  const code = await page.evaluate(() => lastState.code), context = await browser.newContext({ viewport: page.viewportSize() || undefined });
  try {
    const watcher = await context.newPage(); await login(watcher, app, 'Zuschauer'); await watcher.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect(watcher.locator('.st-svg')).toBeVisible();
    expect((await state(watcher)).g.hand).toBeNull();
    await expect(watcher.locator('.st-spot')).toHaveCount(0); await expect(watcher.locator('.st-hand')).toHaveCount(0);
    await shot(watcher, 'spectator');
  } finally { await context.close(); }

  // Die Ansicht enthält nie den Kartenstapel oder Karten fremder Spieler
  const priv = await page.evaluate(() => JSON.stringify(lastState.g));
  expect(priv).not.toContain('"deck"');

  // Eigene Züge: würfeln und weiterspielen, bis ein Handelsangebot gezeigt wurde (gebaut wird, sobald die Rohstoffe reichen)
  let offered = false, built = false, rolled = 0;
  for (let turn = 0; turn < 14 && !(offered && rolled >= 2); turn++) {
    await myTurn(page);
    if ((await state(page)).g.stage === 'roll') { await page.locator('[data-g=st-roll]').click(); rolled++; await expect.poll(() => state(page).then((s) => s.g.stage !== 'roll')).toBe(true); }
    for (let i = 0; i < 8; i++) {
      const s = await state(page);
      if (s.turn !== s.me || s.phase !== 'playing') break;
      if (s.g.stage === 'discard' && s.g.discard[s.me]) {
        const rest = { ...s.g.hand }, cards = {}; let n = s.g.discard[s.me];
        for (const r of Object.keys(rest)) while (n > 0 && rest[r] > 0) { rest[r]--; cards[r] = (cards[r] || 0) + 1; n--; }
        await send(page, 'ssDiscard', { cards });
      } else if (s.g.stage === 'discard') await page.waitForTimeout(500);
      else if (s.g.stage === 'robber') await page.locator('.st-hex.pick .st-pickhex').first().click();
      else if (s.g.stage === 'steal') await page.locator('[data-g=st-steal]').first().click();
      else if (s.g.stage === 'main') break;
      else await page.waitForTimeout(200);
    }
    const s = await state(page);
    if (s.g.stage !== 'main' || s.turn !== s.me) continue;
    if (!built) {
      for (const kind of ['city', 'settlement', 'road']) {
        const tool = page.locator(`[data-g=st-tool][data-tool=${kind}]`);
        if (await tool.isEnabled()) { await tool.click(); await shot(page, `build-${kind}`); await page.locator(`.st-spot.${kind}`).first().click(); built = true; break; }
      }
    }
    if (!offered) {
      await page.locator('[data-g=st-panel][data-panel=trade]').click();
      await shot(page, 'trade-bank');
      await page.locator('[data-g=st-tab][data-tab=players]').click();
      const have = (await state(page)).g.hand, give = Object.keys(have).find((r) => have[r] > 0), want = Object.keys(have).find((r) => r !== give);
      if (give) {
        await page.locator(`[data-g=st-step][data-side=give][data-r=${give}][data-d="1"]`).click();
        await page.locator(`[data-g=st-step][data-side=want][data-r=${want}][data-d="1"]`).click();
        await shot(page, 'trade-offer');
        await page.locator('[data-g=st-offer]').click();
        await expect.poll(() => state(page).then((x) => !!x.g.offer)).toBe(true);
        offered = true;
        await shot(page, 'trade-waiting');
        // Bots antworten; danach bestätigen oder zurückziehen
        await expect.poll(() => state(page).then((x) => !x.g.offer || Object.values(x.g.offer.res).every((v) => v !== null)), { timeout: 30000 }).toBe(true);
        const sel = page.locator('[data-g=st-confirm]'), cancel = page.locator('[data-g=st-cancel]');
        if (await sel.count()) await sel.first().click(); else if (await cancel.count()) await cancel.click();
        await expect.poll(() => state(page).then((x) => !x.g.offer)).toBe(true);
      }
      await page.locator('[data-g=st-panel][data-panel=trade]').click();
    }
    await page.locator('[data-g=st-end]').click();
    await expect.poll(() => state(page).then((x) => x.turn !== x.me || x.phase !== 'playing')).toBe(true);
  }
  expect(rolled).toBeGreaterThanOrEqual(1);
  expect(offered).toBe(true);

  // Pause und Reconnect: der Stand bleibt erhalten
  await myTurn(page);
  expect((await send(page, 'gamePause', { paused: true })).ok).toBe(true); await shot(page, 'paused');
  expect((await send(page, 'gamePause', { paused: false })).ok).toBe(true);
  const before = await state(page);
  await page.reload(); await expect(page.locator('.st-svg')).toBeVisible();
  const reloaded = await state(page);
  expect(reloaded.g.buildings).toEqual(before.g.buildings); expect(reloaded.g.hand).toEqual(before.g.hand); expect(reloaded.g.stage).toBe(before.g.stage);
  await shot(page, 'reconnect');

  // Zoom: Vergrößern ändert die Brettbreite, die Seite selbst läuft nie seitlich über
  const widthOf = () => page.locator('.st-svg').evaluate((el) => el.getBoundingClientRect().width);
  const w0 = await widthOf(); await page.locator('[data-g=st-zoom][data-z="+"]').click(); expect(await widthOf()).toBeGreaterThan(w0);
  await shot(page, 'zoomed');
  await page.locator('[data-g=st-zoom][data-z=fit]').click(); expect(Math.round(await widthOf())).toBeLessThanOrEqual(Math.round(await page.locator('.st-viewport').evaluate((el) => el.clientWidth)) + 1);
  expect(await overflow(page)).toBe(true);

  if (info.project.name === 'desktop') for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height }); expect(await overflow(page), `${width}x${height}`).toBe(true);
    const box = await page.locator('.st-viewport').boundingBox(); expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await shot(page, `table-${width}x${height}`);
  } else expect(await overflow(page)).toBe(true);

  // Englisch
  await page.setViewportSize(info.project.name === 'desktop' ? { width: 1440, height: 900 } : page.viewportSize());
  await page.evaluate(() => I18n.select('en'));
  await expect(page.locator('.st-side')).toContainText('Costs');
  await page.locator('[data-kit=help]').first().click(); await expect(page.locator('#help-dlg')).toBeVisible();
  await shot(page, 'english-rules'); await page.keyboard.press('Escape');
});

test('Städtehandel: großes Brett mit fünf Spielern, falsche Spielerzahl wird abgelehnt', async ({ page, app }, info) => {
  test.setTimeout(120000);
  await hostGame(page, app, { bots: ['easy', 'easy', 'medium', 'hard'], settings: { size: 'xl' } });
  expect((await send(page, 'settings', { size: 'standard' })).ok).toBe(true);
  const refused = await send(page, 'start'); expect(refused.ok).toBe(false); expect(refused.error).toMatch(/3–4 Spieler/);
  expect((await send(page, 'settings', { size: 'xl' })).ok).toBe(true);
  expect((await send(page, 'start')).ok).toBe(true);
  await expect(page.locator('.st-land')).toHaveCount(30);
  await expect(page.locator('.st-port')).toHaveCount(11);
  await myTurn(page);
  if (process.env.ST_CAPTURE === '1') { const dir = 'docs/design/screenshots/staedtehandel'; mkdirSync(dir, { recursive: true }); await page.screenshot({ path: `${dir}/${info.project.name}-xl-board.jpg`, fullPage: true, type: 'jpeg', quality: 70 }); }
  expect(await overflow(page)).toBe(true);
});
