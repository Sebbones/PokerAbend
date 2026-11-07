// BACKLOG-08: Geschenkfänger, Rhythmus-Rausch, Stillgestanden!, Bomben-Duell – echte Browserläufe (Desktop + Handy).
import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync, appendFileSync } from 'node:fs';

const games = {
  geschenkfaenger: { settings: { playSecs: 10 }, rules: 'Small gifts give 10' },
  'rhythmus-rausch': { settings: { playSecs: 10 }, rules: 'Perfect (±60 ms)' },
  stillgestanden: { settings: { playSecs: 20 }, rules: 'Amber announces red' },
  'bomben-duell': { settings: { playSecs: 20, rounds: 2 }, rules: 'destroys the first crate' },
};
async function emit(page, event, data = {}) { const r = await page.evaluate(([e, d]) => send(e, d), [event, data]); expect(r.ok, r.error).toBe(true); return r; }
async function capture(page, info, id, state) {
  let path = info.outputPath(`${id}-${state}.png`);
  if (process.env.BACKLOG08_CAPTURE === '1') { const dir = `docs/backlog/screenshots/backlog08/${id}`; mkdirSync(dir, { recursive: true }); path = `${dir}/${info.project.name}-${state}.png`; }
  await page.screenshot({ path, fullPage: true });
}
// Echte Touchereignisse über CDP: halten (Start ohne Ende) oder tippen.
async function touch(page, selector, { hold = false } = {}) {
  const box = await page.locator(selector).first().boundingBox(), cdp = await page.context().newCDPSession(page), point = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point });
  const end = async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); };
  if (!hold) await end();
  return end;
}
const mine = (page) => page.evaluate(() => arenaFrame.bodies.find((p) => p.id === lastState.you.id));

for (const [id, cfg] of Object.entries(games)) {
  test(`BACKLOG-08 ${id}: Szene, Regeln DE/EN, Bots, Eingabe per Tastatur/Touch, Pause/Neuladen, 60-fps-Zeichnen, reguläres Ergebnis`, async ({ page, app }, info) => {
    test.setTimeout(120000);
    const touchMode = info.project.name === 'mobil';
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('.arc-lobby svg')).toBeVisible();
    await capture(page, info, id, 'lobby');
    await emit(page, 'settings', cfg.settings); await emit(page, 'sit'); for (let i = 0; i < 5; i++) await emit(page, 'addBot'); // sechs Spielende: Mensch + fünf Bots
    await page.evaluate(() => { window.arenaFrame = null; window.arenaPackets = []; socket.on('arena', (f) => { arenaFrame = f; arenaPackets.push(f); if (arenaPackets.length > 200) arenaPackets.shift(); }); });

    // Regeln-Tab: deutsch und englisch
    await page.locator('#kg [data-kit=help]').click(); await page.locator('[data-help-more]').click();
    await expect(page.locator('.kg-rules')).toContainText('Server');
    await page.locator('#kg-panel .icon-btn[data-kit=close]').click();
    await page.evaluate(() => I18n.select('en'));
    await page.locator('#kg [data-kit=help]').click(); await page.locator('[data-help-more]').click();
    await expect(page.locator('.kg-rules')).toContainText(cfg.rules);
    await capture(page, info, id, 'english-rules');
    await page.locator('#kg-panel .icon-btn[data-kit=close]').click();

    await emit(page, 'start');
    await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
    await expect(page.locator('#rt-canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => arenaFrame?.elapsed ?? -3000), { timeout: 12000 }).toBeGreaterThanOrEqual(0);
    await expect(page.locator('#kg-meta')).toContainText('Everyone plays simultaneously');
    const frame = await page.evaluate(() => arenaFrame);
    expect(frame.kind).toBe({ geschenkfaenger: 'gift', 'rhythmus-rausch': 'rhythm', stillgestanden: 'freeze', 'bomben-duell': 'bomb' }[id]);
    if (id === 'rhythmus-rausch') expect(frame.lanes).toBe(4); // Standard: vier Bahnen, keine unbeabsichtigte Option aus dem Erstellformular
    expect(JSON.stringify(frame)).not.toMatch(/"seed"|"roles"|"rng"/);

    // Eingabe: Der Server bewegt/wertet; der Client sendet nur Richtungen, Tipps und Bombe.
    await page.bringToFront();
    if (id === 'geschenkfaenger') {
      const before = await mine(page);
      const release = touchMode ? await touch(page, '[data-arc-hold=left]', { hold: true }) : (await page.keyboard.down('ArrowLeft'), () => page.keyboard.up('ArrowLeft'));
      await expect.poll(async () => (await mine(page)).x).toBeLessThan(before.x - 25); await release();
    } else if (id === 'stillgestanden') {
      await expect.poll(() => page.evaluate(() => arenaFrame.signal)).toBeTruthy();
      const release = touchMode ? await touch(page, '[data-arc-hold=up]', { hold: true }) : (await page.keyboard.down('ArrowUp'), () => page.keyboard.up('ArrowUp'));
      await expect.poll(async () => { const m = await mine(page); return m.prog > 0 || m.falls > 0; }).toBe(true); await release();
    } else if (id === 'rhythmus-rausch') {
      if (touchMode) await touch(page, '[data-arc-tap="0"]'); else await page.keyboard.press('d');
      await expect.poll(() => page.evaluate(() => arenaFrame.last?.grade ?? null)).not.toBeNull(); // der Server hat den Tipp gewertet
    } else {
      if (touchMode) await touch(page, '[data-arc-act]'); else await page.keyboard.press('Space');
      await expect.poll(() => page.evaluate(() => arenaFrame.bombs.length)).toBeGreaterThan(0);
      const bomb = await page.evaluate(() => arenaFrame.bombs[0]); expect(bomb.explodeAt - bomb.at).toBe(2200);
    }
    await capture(page, info, id, 'playing');

    // 60 fps: Zeichenzeit pro Bild und tatsächliche Bildrate mit Bot und eigener Figur.
    const perf = await page.evaluate(() => new Promise((resolve) => { const p = window.ArcadePerf, f0 = p.frames, t0 = performance.now(), s0 = p.total; setTimeout(() => resolve({ fps: (p.frames - f0) / ((performance.now() - t0) / 1000), avgMs: (p.total - s0) / Math.max(1, p.frames - f0), maxMs: p.max }), 2000); }));
    appendFileSync(process.env.BACKLOG08_PERF || 'artifacts/backlog08-perf.log', `${id} ${info.project.name} fps=${perf.fps.toFixed(1)} avgMs=${perf.avgMs.toFixed(2)} maxMs=${perf.maxMs.toFixed(1)}\n`);
    expect(perf.avgMs).toBeLessThan(8); expect(perf.fps).toBeGreaterThan(40);

    // Pause und Neuladen: Position/Zustand bleiben, Uhr steht
    await emit(page, 'gamePause', { paused: true });
    await expect.poll(() => page.evaluate(() => lastState.gamePaused)).toBe(true);
    const saved = await page.evaluate(() => ({ id: lastState.you.id, elapsed: lastState.g.elapsed, mine: lastState.g.bodies.find((p) => p.id === lastState.you.id) }));
    await page.reload();
    await expect.poll(() => page.evaluate(() => lastState?.gamePaused)).toBe(true);
    expect(await page.evaluate(() => lastState.you.id)).toBe(saved.id);
    expect(await page.evaluate(() => lastState.g.bodies.find((p) => p.id === lastState.you.id))).toEqual(saved.mine);
    await capture(page, info, id, 'paused');
    if (info.project.name === 'desktop') for (const [width, height] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844], [360, 800], [900, 450]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id} ${width}`).toBe(true);
      await capture(page, info, id, `${width}x${height}`);
    }
    await page.setViewportSize(touchMode ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await emit(page, 'gamePause', { paused: false });
    await expect.poll(() => page.evaluate(() => lastState.phase), { timeout: 70000 }).toBe('over');
    await expect(page.locator('.kg-over')).toBeVisible();
    await capture(page, info, id, 'result');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
