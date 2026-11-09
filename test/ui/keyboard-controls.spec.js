// Tastatursteuerung über alle Echtzeit-/Arcade-Spiele: Start über den echten Knopf (Fokus wie beim Spielen),
// dann Pfeiltasten und Leertaste. Erwartet: Eingaben gehen an den Server, die Seite scrollt nicht mit.
import { test, expect, login, selectGame } from './helpers.js';

const KEYBOARD_GAMES = ['bomben-duell', 'broeckelboden', 'geschenkdiebe', 'geschenkfaenger', 'gummiband-challenge', 'kistenchaos',
  'kronenjagd', 'labyrinth-chaos', 'laser-huepfer', 'minenlauf', 'puzzle-panik', 'rhythmus-rausch', 'schatzgraeber',
  'scheinwerfer-flucht', 'schubsarena', 'stillgestanden', 'turmbauer'];
const INPUT_EVENTS = ['steer', 'arcAct', 'arcTap', 'expeditionAction'];

test.use({ createLimit: '100' });
for (const id of KEYBOARD_GAMES) {
  test(`Tastatur ${id}: Pfeiltasten und Leertaste steuern, die Seite scrollt nicht`, async ({ page, app }, info) => {
    test.skip(info.project.name !== 'desktop', 'Tastatur nur am PC');
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await login(page, app); await selectGame(page, id); await page.locator('#host-form button[type=submit]').click();
    await expect.poll(() => page.evaluate(() => typeof lastState !== 'undefined' && !!lastState?.code)).toBe(true);
    expect((await page.evaluate(() => send('sit'))).ok).toBe(true); expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
    await page.evaluate(() => { window.__emits = []; const emit = socket.emit.bind(socket); socket.emit = (...a) => { window.__emits.push(a[0]); return emit(...a); }; });
    const start = page.getByRole('button', { name: 'Runde starten', exact: true }).first();
    await expect(start).toBeEnabled(); await start.click();
    await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
    await page.waitForTimeout(3500); // Countdown
    const y0 = await page.evaluate(() => scrollY), from = await page.evaluate(() => window.__emits.length);
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key); }
    await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space'); await page.waitForTimeout(400);
    const after = await page.evaluate((n) => ({ y: scrollY, events: window.__emits.slice(n) }), from);
    expect(after.y, 'Seite darf beim Spielen nicht scrollen').toBe(y0);
    expect(after.events.filter((e) => INPUT_EVENTS.includes(e)).length, JSON.stringify(after.events)).toBeGreaterThan(0);
  });
}
