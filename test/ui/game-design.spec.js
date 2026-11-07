import { test, expect, login, selectGame } from './helpers.js';

async function create(page, app, id) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page, app);
  await selectGame(page, id);
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', id);
}
async function start(page) {
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await expect.poll(() => page.evaluate(() => lastState.phase)).toBe('playing');
}
const width = (page, selector) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().width);
const fits = (page, selector) => page.locator(selector).evaluate((el) => {
  const b = el.getBoundingClientRect(), main = document.querySelector('#kg-main').getBoundingClientRect();
  return b.x >= main.x - 1 && b.right <= main.right + 1 && b.y >= main.y - 1 && b.bottom <= main.bottom + 1;
});

test('Omaha: gemeinsame Kartengröße bleibt mit vier Handkarten und Nachttisch nutzbar', async ({ page, app }, info) => {
  await create(page, app, 'omaha');
  await page.locator('[data-sit]').first().click();
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  await page.getByRole('button', { name: /Spiel starten/ }).first().click();
  const cards = '#dock .mine .cards .card';
  await expect(page.locator(cards)).toHaveCount(4);
  const normal = await width(page, cards);
  await page.locator('[data-panel=me]').click();
  await page.locator('[data-pref=theme]').selectOption('night');
  await page.getByRole('combobox', { name: 'Kartengröße', exact: true }).selectOption('xl');
  await page.locator('[data-panel=me]').click();
  await expect.poll(() => width(page, cards)).toBeCloseTo(normal * 1.5, 0);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
  await page.reload();
  await expect(page.locator(cards)).toHaveCount(4);
  await expect.poll(() => width(page, cards)).toBeCloseTo(normal * 1.5, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('omaha-grosse-karten.png') });
});

test('Handkarten: Größenwahl, keine doppelte Skalierung, Browser-Speicher und Querformat', async ({ page, app }, info) => {
  await create(page, app, 'maumau'); await start(page);
  const hand = '#kg-dock .kg-hand .kc', center = '#kg-main .kc.big';
  const normal = await width(page, hand), middle = await width(page, center);
  for (const [size, factor] of [['large', 1.25], ['xl', 1.5], ['normal', 1], ['xl', 1.5]]) {
    await page.locator('[data-kit-panel=me]').click();
    await page.getByRole('combobox', { name: 'Kartengröße', exact: true }).selectOption(size);
    await page.locator('#kg-panel .icon-btn[data-kit=close]').click();
    await expect.poll(() => width(page, hand)).toBeCloseTo(normal * factor, 0);
    expect(await width(page, center)).toBeCloseTo(middle, 0);
  }
  await page.reload();
  await expect.poll(() => width(page, hand)).toBeCloseTo(normal * 1.5, 0);
  await page.setViewportSize({ width: 900, height: 450 });
  await expect.poll(() => page.locator('#kg-dock').evaluate((el) => el.getBoundingClientRect().x >= document.querySelector('#kg-main').getBoundingClientRect().right - 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('karten-querformat.png') });
});

for (const [id, board] of [['reversi', '.rv-board'], ['dame', '.dm-board'], ['muehle', '.mu-board'], ['huetchen', '.hb-wrap'], ['viergewinnt', '.vg-board']]) {
test(`${id}: Brett bleibt in beiden Ausrichtungen vollständig sichtbar`, async ({ page, app }, info) => {
  await create(page, app, id); await start(page);
  await expect.poll(() => fits(page, board)).toBe(true);
  await page.setViewportSize({ width: 900, height: 450 });
  await expect.poll(() => fits(page, board)).toBe(true);
  if (id === 'reversi') {
    await page.locator('.rv-cell.can').first().click();
    await expect.poll(() => page.evaluate(() => lastState.g.last)).not.toBeNull();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(id + '-querformat.png') });
});
}

test('Kniffel: Würfel und Punkteblatt sind im Querformat nebeneinander bedienbar', async ({ page, app }, info) => {
  await create(page, app, 'kniffel'); await start(page);
  await page.setViewportSize({ width: 900, height: 450 });
  await expect.poll(() => page.locator('.kn-sheet-wrap').evaluate((el) => el.getBoundingClientRect().x >= document.querySelector('.kn-tray').getBoundingClientRect().right - 1)).toBe(true);
  await page.getByRole('button', { name: 'Würfeln', exact: true }).click();
  await expect(page.locator('.kn-pick').first()).toBeVisible();
  await page.locator('.kn-pick').last().click();
  await expect.poll(() => page.evaluate(() => Object.values(lastState.g.sheets[lastState.you.id]).filter((value) => value !== null).length)).toBe(1);
  await page.screenshot({ path: info.outputPath('kniffel-querformat.png') });
});

test('Tonprobe und Animationen respektieren persönliche Einstellungen und reduzierte Bewegung', async ({ page, app }) => {
  await create(page, app, 'kniffel');
  await page.locator('[data-kit-panel=me]').click();
  await page.evaluate(() => { window.testTones = []; beep = (...args) => window.testTones.push(args); });
  await page.locator('[data-pref=sound]').uncheck();
  await expect(page.locator('[data-scene-sound]')).toBeDisabled();
  expect(await page.evaluate(() => GameDesign.sound('kniffel', 'win'))).toBe(false);
  expect(await page.evaluate(() => window.testTones.length)).toBe(0);
  await page.locator('[data-pref=sound]').check();
  await page.locator('[data-scene-sound]').click();
  await expect.poll(() => page.evaluate(() => window.testTones.length)).toBe(2);
  expect(await page.evaluate(() => GameDesign.pulse(document.querySelector('#kg'), 'win'))).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.evaluate(() => GameDesign.pulse(document.querySelector('#kg'), 'win'))).toBe(true);
  await page.locator('[data-pref=calm]').check();
  expect(await page.evaluate(() => GameDesign.pulse(document.querySelector('#kg'), 'win'))).toBe(false);
});

test.describe('Spielmotive', () => {
  test.use({ createLimit: '100' });
  test('Alle Spiele laden mit eigenem Motiv ohne Browserfehler', async ({ page, app }) => {
    test.setTimeout(120000);
    await login(page, app);
    const ids = await page.evaluate(() => account.games.map((g) => g.id));
    for (const id of ids) {
      const reply = await page.evaluate(async (game) => {
        leaveGame();
        const r = await send('create', { game, name: profile.name, avatar: profile.avatar });
        if (!r.ok) throw new Error(r.error);
        store.set('poker:session:' + r.code, r.token);
        return r;
      }, id);
      await page.goto(app.url + '/?t=' + reply.code);
      await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', id);
      await expect(page.locator('.scene-backdrop > svg')).toHaveCount(1);
      if (id === 'scotland-yard') {
        await expect(page.locator('.sy-lobby')).toBeVisible();
        await expect(page.locator('.sy-lobby-art img')).toBeVisible();
        await expect.poll(() => page.locator('.sy-lobby-art img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
      } else if (['farbenchaos', 'stapelrennen', 'zehnetappen'].includes(id)) {
        await expect(page.locator('.cw-lobby')).toBeVisible();
        expect(await page.locator('.cw-lobby-art .kc').count()).toBeGreaterThan(0);
      } else if (['schach', 'exploding-deck', 'doppelagent', 'luegenbaron'].includes(id)) {
        const lobbies={schach:'.ch-lobby','exploding-deck':'.eb-lobby',doppelagent:'.da-file',luegenbaron:'.lb-lobby'};
        await expect(page.locator(lobbies[id])).toBeVisible();
        await expect(page.locator(lobbies[id]).locator('h2')).not.toHaveText('');
      } else if (!['poker', 'omaha'].includes(id)) await expect(page.locator('.scene-hero > svg')).toBeVisible();
      const closed=await page.evaluate(()=>send('closeTable'));
      expect(closed.ok,id).toBe(true);
      await expect(page.locator('#hub')).toBeVisible();
    }
  });
});
