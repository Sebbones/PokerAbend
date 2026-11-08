import { test, expect, login } from './helpers.js';

test('Referenz-Home: fünf echte Kategorien, großzügige SVG-Motive und getrennte Informationsspalte', async ({ page, app }, info) => {
  await login(page, app);
  await expect(page.locator('.welcome h1')).toHaveText('Spielebibliothek');
  const categories = await page.evaluate(() => [...new Set([...account.games,...account.singleplayerGames].map((g) => g.category))].sort());
  expect(await page.locator('.home-categories a').evaluateAll((links) => links.map((a) => a.hash.split('/')[1]).sort())).toEqual(categories);
  await expect(page.locator('.home-games > li')).toHaveCount(4);
  const measurements = await page.locator('.home-games > li').evaluateAll((cards) => cards.map((card) => ({ height: card.getBoundingClientRect().height, art: card.querySelector('.game-art').getBoundingClientRect().width })));
  expect(Math.max(...measurements.map((m) => m.height)) - Math.min(...measurements.map((m) => m.height))).toBeLessThan(2);
  expect(measurements.every((m) => m.art >= 82)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#hub'), '::before').backgroundImage)).toContain('/assets/games-lounge');
  if (info.project.name === 'desktop') {
    const primary = await page.locator('.home-primary').boundingBox(), side = await page.locator('.home-secondary').boundingBox();
    expect(side.x).toBeGreaterThan(primary.x + primary.width);
    expect(side.width / primary.width).toBeGreaterThan(.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Kopfzeilensuche führt in den echten Katalog und öffnet den bestehenden Host-Dialog', async ({ page, app }) => {
  await login(page, app);
  await page.getByRole('searchbox', { name: 'Spiele suchen', exact: true }).fill('Reversi');
  await page.keyboard.press('Enter');
  await expect(page.locator('#games-body [data-host]')).toHaveCount(1);
  await expect(page.locator('#games-search')).toHaveValue('Reversi');
  await page.locator('#games-body [data-host="reversi"]').click();
  await expect(page.locator('#host-title')).toHaveText('Reversi hosten');
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('#kg')).toBeVisible();
});

test('Favoriten aktualisieren die echte rechte Spalte sofort und erhalten den lokalen Speicher', async ({ page, app }) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#spiele'; });
  await page.locator('[data-fav="kniffel"]').click();
  await expect(page.locator('[data-local-games="favorites"] [data-game-open="kniffel"]')).toHaveCount(1);
  await page.locator('[data-fav="kniffel"]').click();
  await expect(page.locator('[data-local-games="favorites"] [data-game-open="kniffel"]')).toHaveCount(0);
  await expect(page.locator('[data-local-games="favorites"]')).toContainText('Noch kein Lieblingsspiel');
  const ids = await page.evaluate(() => [...favs()]); expect(ids).not.toContain('kniffel');
});

test('Deckender Modus erhält die Bibliothek ohne Raumfoto und den vollständigen Spielekatalog', async ({ page, app }) => {
  await login(page, app);
  // Seit V2-05 liegen die Anzeige-Schalter auf der Einstellungsseite (der Dialog „Ich“ verweist nur dorthin)
  await page.evaluate(() => { location.hash = '#einstellungen'; });
  await page.locator('[data-set="display.reduceGlass"]').check();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#hub'), '::before').backgroundImage)).toBe('none');
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.locator('#games-body [data-host]')).toHaveCount(await page.evaluate(() => account.games.length));
  await expect(page.locator('#hub-main')).toHaveCSS('backdrop-filter', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-glass', 'reduced');
});
