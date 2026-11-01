import { test, expect, login, selectGame } from './helpers.js';
import { gameList } from '../../games/index.js';

test('Spielkatalog zeigt alle gebauten Spiele mit unveränderten IDs', async ({ page, app }) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#spiele'; });
  for (const game of gameList()) await expect(page.locator('[data-id="' + game.id + '"] b').first()).toContainText(game.name);
  await expect(page.locator('[data-host]')).toHaveCount(gameList().length);
});

for (const [id, name] of [['farbenchaos', 'UNO'], ['huetchen', 'Mensch ärgere Dich nicht'], ['zehnetappen', 'Phase 10'], ['stapelrennen', 'Skip-Bo']]) {
  test(name + ': Regeln und Sitzung nach Neuladen', async ({ page, app }) => {
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('#kg-meta .blinds')).toHaveText(name);
    await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
    await page.getByRole('button', { name: 'Kurzregeln und Hausregeln', exact: true }).click();
    await page.getByRole('button', { name: 'Alle Regeln', exact: true }).click();
    await expect(page.locator('#kg-panel-body')).not.toContainText(/Farbenchaos|Hütchenrennen|Zehn Etappen|Stapelrennen/);
    await page.locator('[data-kit="close"].icon-btn').click();
    const url = page.url(); await page.reload();
    await expect(page.locator('#kg-meta .blinds')).toHaveText(name);
    await expect(page.getByRole('button', { name: 'Zuschauen', exact: true })).toBeVisible();
    expect(page.url()).toBe(url);
  });
}

test('Spieleabend in Login, Manifest und Sitzung; technische Schlüssel bleiben', async ({ page, app, context }) => {
  await page.goto(app.url);
  await expect(page).toHaveTitle('Spieleabend – Passwort');
  const manifest = await (await page.request.get(app.url + '/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Spieleabend');
  await login(page, app);
  await expect(page).toHaveTitle('Start – Spieleabend');
  await selectGame(page, 'poker'); await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('#game')).toBeVisible();
  const code = new URL(page.url()).searchParams.get('t');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), 'poker:session:' + code)).toMatch(/^[a-f0-9]+$/);
  expect((await context.cookies()).some((c) => c.name === 'pa_auth' && c.httpOnly)).toBe(true);
});

test('Hosten-Panel zeigt nur die Felder des gewählten Spiels und übernimmt die Werte', async ({ page, app }) => {
  test.setTimeout(90000); // The catalog now contains 65 games, each opened and verified.
  await login(page, app);
  for (const game of gameList()) {
    await selectGame(page, game.id);
    expect(await page.locator('#host-form [data-cf]').evaluateAll((fields) => fields.map((f) => f.dataset.cf))).toEqual((game.createFields || []).map((f) => f.key));
    await page.locator('#host-dlg .host-close').click();
  }
  await selectGame(page, 'farbenchaos');
  await page.getByLabel('Karten pro Spieler').fill('9');
  await page.locator('#host-form button[type=submit]').click();
  await page.locator('[data-kit-panel="host"]').first().click();
  await expect(page.locator('[data-kit-set="handSize"]')).toHaveValue('9');
});
