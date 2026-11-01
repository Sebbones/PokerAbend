import { test, expect, login } from './helpers.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAMES } from '../../games/index.js';
import {independentPlayer} from './independent-player.js';

test.use({ createLimit: '100' });

test('Neuer Tisch: echte Spielauswahl, Tastatur, Host-Dialog und gespeicherte Darstellung', async ({ page, app }) => {
  await login(page, app);
  await page.locator('.welcome [data-create-table]').click();
  await expect(page.locator('#picker-games [data-host]')).toHaveCount(await page.evaluate(() => account.games.length));
  await page.getByLabel('Spiel auswählen', { exact: true }).fill('kniffel');
  await expect(page.locator('#picker-games [data-host]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#host-title')).toHaveText('Kniffel hosten');
  await page.keyboard.press('Escape');
  await page.locator('#profile-avatar').click();
  await page.locator('.profile-preferences summary').click();
  await page.getByRole('switch', { name: /Glaseffekt reduzieren/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'reduced');
  await page.getByLabel('Kartengröße', { exact: true }).selectOption('xl');
  await page.getByRole('combobox', { name: 'Tisch', exact: true }).selectOption('night');
  await page.locator('#p-cancel').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'reduced');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  expect(await page.evaluate(() => prefs.cardSize)).toBe('xl');
  await page.locator('.welcome [data-create-table]').click();
  await page.locator('#picker-search').fill('kniffel');
  await page.locator('#picker-games [data-host]').click();
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('[data-scene="kniffel"]')).toBeVisible();
});

test('Bibliothek: reale Kategorien, Favoriten, kombinierte Suche und gemerkte Listenansicht', async ({ page, app }) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.getByRole('heading', { name: 'Spielebibliothek', exact: true })).toBeVisible();
  await expect(page.locator('.games')).toHaveClass(/tiles/);
  await page.locator('.category-tabs a[href="#spiele/brett"]').click();
  await expect(page.locator('#hub-main h1')).toHaveText('Brettspiele');
  const boardIds = await page.evaluate(() => account.games.filter((g) => g.category === 'brett').map((g) => g.id).sort());
  expect(await page.locator('#games-body [data-host]').evaluateAll((els) => els.map((el) => el.dataset.host).sort())).toEqual(boardIds);
  await page.locator('#games-search').fill('Reversi');
  await page.locator('[data-fav="reversi"]').click();
  await page.getByRole('button', { name: 'Liste', exact: true }).click();
  await page.reload();
  await expect(page.locator('.games')).toHaveClass(/rows/);
  await expect(page.locator('[data-fav="reversi"]')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { location.hash = '#favoriten'; });
  await expect(page.locator('#games-body [data-host]')).toHaveCount(1);
  await page.getByLabel('Spiel suchen', { exact: true }).fill('nichtvorhanden');
  await expect(page.locator('#games-body [data-host]')).toHaveCount(0);
});

test('Alle Hub-Bereiche passen in sechs Bildschirmgrößen; weitere mobile Navigation und deckender Fallback', async ({ page, app }, info) => {
  test.skip(info.project.name !== 'desktop', 'Die sechs Größen werden einmal vollständig durchlaufen.');
  test.setTimeout(90000);
  await login(page, app);
  const output = resolve('artifacts/ui-redesign/responsive');
  mkdirSync(output, { recursive: true });
  const sizes = [[1440, 900], [1920, 1080], [768, 1024], [390, 844], [360, 800], [900, 450]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const route of ['start', 'spiele', 'favoriten', 'tische', 'bestenliste', 'roadmap', 'tickets', 'rueckblick', 'planung', 'erfolge']) {
      await page.evaluate((route) => { location.hash = '#' + route; }, route);
      await expect(page).toHaveTitle(new RegExp('Spieleabend$'));
      await expect(page.locator('#hub-main h1').first()).toBeVisible();
      // Die Route muss gerendert sein, bevor die Abmessungen gemessen werden.
      await expect.poll(() => page.evaluate(() => renderedPage)).toBe(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route}: ${width}×${height}`).toBe(true);
      if (['start', 'spiele', 'tickets'].includes(route)) await page.screenshot({ path: resolve(output, `${route}-${width}x${height}.png`) });
    }
    if (width < 641) {
      await page.getByRole('button', { name: 'Weitere Bereiche', exact: true }).click();
      await page.locator('#hub-menu-nav a[href="#planung"]').click();
      await expect(page.locator('#hub-menu')).not.toBeVisible();
      await expect(page).toHaveTitle('Abend planen – Spieleabend');
    } else if (width < 1101) {
      if (await page.locator('#side-toggle').getAttribute('aria-expanded') === 'true') await page.locator('#side-toggle').click();
      await page.getByRole('button', { name: 'Seitenleiste ausklappen', exact: true }).click();
      await expect(page.locator('#side-toggle')).toHaveAttribute('aria-expanded', 'true');
      await page.locator('#side-nav a[href="#spiele"]').click();
      // Navigation klappt die Leiste wieder ein.
      await expect(page).toHaveTitle('Spiele – Spieleabend');
    }
  }
  // Ohne Filterunterstützung greift die deckende Basisfarbe, ohne auf ein Bild angewiesen zu sein.
  await page.addStyleTag({ content: '.hub-main,.hub-side { backdrop-filter:none!important; background:var(--panel)!important; }' });
  await expect(page.locator('#hub-main')).toHaveCSS('background-color', 'rgb(26, 37, 33)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#hub-main')).toBeVisible();
});

// Getrennte Testserver respektieren das echte Limit für neue Spieler pro Anschluss.
for (let offset = 0; offset < Object.keys(GAMES).length; offset += 5) test(`Alle registrierten Spiele, Teil ${1 + offset / 5}: echter Start, Panels, Regeln und Tischende`, async ({ page, app }, info) => {
  test.setTimeout(90000);
  await login(page, app);
  const games = await page.evaluate(() => account.games.map(({ id, minPlayers }) => ({ id, minPlayers })));
  expect(games).toHaveLength(Object.keys(GAMES).length);
  const output = resolve('artifacts/ui-redesign/games', info.project.name);
  mkdirSync(output, { recursive: true });
  const guests=[];
  try{for (const { id, minPlayers } of games.slice(offset, offset + 5)) {
    const reply = await page.evaluate(async (game) => {
      prefs.sound = false; savePrefs();
      const r = await send('create', { game, name: profile.name, avatar: profile.avatar });
      if (!r.ok) throw new Error(r.error);
      store.set('poker:session:' + r.code, r.token);
      return r;
    }, id);
    await page.goto(app.url + '/?t=' + reply.code);
    const poker = ['poker', 'omaha'].includes(id), frame = page.locator(poker ? '#game' : '#kg');
    await expect(frame).toBeVisible();
    expect((await page.evaluate(()=>send('sit',{seat:0}))).ok,id).toBe(true);
    for(let i=1;i<minPlayers;i++)guests.push(await independentPlayer(app,reply.code,'Testgast '+i,i));
    const started=await page.evaluate(()=>send('start'));
    expect(started.ok, id + ': ' + started.error).toBe(true);
    await expect.poll(() => page.evaluate(() => lastState.phase === 'playing' || !!lastState.hand)).toBe(true);
    await expect(page.locator(poker ? '#dock' : '#kg-dock')).toBeVisible();
    await expect(page.locator(poker ? '#table' : '#kg-main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), id).toBe(true);
    await page.screenshot({ path: resolve(output, `${id}.png`) });
    if (info.project.name === 'desktop' && ['poker', 'omaha', 'kniffel', 'huetchen', 'schiffe', 'reversi', 'dame', 'muehle', 'viergewinnt', 'zehnetappen', 'monopoly', 'monopoly-deal', 'spiel-des-lebens', 'malen-raten', 'broeckelboden'].includes(id)) {
      for (const [width, height] of [[1920, 1080], [768, 1024], [360, 800], [900, 450]]) {
        await page.setViewportSize({ width, height });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}: ${width}×${height}`).toBe(true);
        const dock = await page.locator(poker ? '#dock' : '#kg-dock').boundingBox();
        expect(dock.y, `${id}: Dock oben`).toBeGreaterThanOrEqual(0);
        expect(dock.y + dock.height, `${id}: Dock unten`).toBeLessThanOrEqual(height + 1);
        await page.screenshot({ path: resolve(output, `${id}-${width}x${height}.png`) });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    for (const panel of ['log', 'stand', 'me', 'host']) {
      await page.locator(poker ? `[data-panel="${panel}"]` : `[data-kit-panel="${panel}"]`).click();
      await expect(page.locator(poker ? '#panel' : '#kg-panel')).toBeVisible();
      await page.locator(poker ? '#panel-close' : '.panel-head [data-kit="close"]').click();
    }
    await page.getByRole('button', { name: 'Kurzregeln und Hausregeln', exact: true }).click();
    if (!poker) {
      await page.getByRole('button', { name: 'Alle Regeln', exact: true }).click();
      await expect(page.locator('#kg-panel-title')).toHaveText('Regeln');
      await page.locator('.panel-head [data-kit="close"]').click();
    } else {
      await expect(page.locator('#help-title')).toContainText('kurz erklärt');
      await page.getByRole('button', { name: 'Alles klar', exact: true }).click();
      await page.locator('.hands-btn').click();
      await expect(page.locator('#panel-title')).toHaveText('Pokerhände');
      await page.locator('#panel-close').click();
    }
    await page.locator(poker ? '[data-panel="host"]' : '[data-kit-panel="host"]').click();
    await page.locator('[data-end="abort"]').click();
    await page.locator('#dlg-ok').click();
    await expect.poll(() => page.evaluate(() => lastState.phase !== 'playing' && !lastState.hand)).toBe(true);
    await page.locator('[data-end="close"]').click();
    await page.locator('#dlg-ok').click();
    await expect(page.locator('#hub')).toBeVisible();
  }
  }finally{for(const guest of guests)await guest.close();}
});
