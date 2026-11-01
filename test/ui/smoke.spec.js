// Rauchprobe für die CI (vor dem Image-Bau): Startseite, ein Kartenspiel, ein Brettspiel, Handy-Ansicht.
// Läuft in beiden Projekten (Desktop und Handy): npm run test:smoke
import { test, expect, login, selectGame } from './helpers.js';

async function host(page, id) {
  await selectGame(page, id);
  await page.locator('#host-form button[type=submit]').click();
  await expect(page.locator('#game-root')).toBeVisible();
  await expect(page.locator('#hub')).toBeHidden();
  return new URL(page.url()).searchParams.get('t');
}

test('Rauchprobe: Startseite lädt, Spiele sind da, nichts läuft über den Rand', async ({ page, app }) => {
  await login(page, app);
  await expect(page.locator('#hub')).toBeVisible();
  await expect(page.locator('[data-host]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontaler Überlauf').toBeLessThanOrEqual(1);
  const health = await (await page.request.get(app.url + '/health')).json();
  expect(health.ok).toBe(true);
});

test('Rauchprobe: Kartenspiel (Mau-Mau) lässt sich hosten', async ({ page, app }) => {
  await login(page, app);
  const code = await host(page, 'maumau');
  expect(code).toMatch(/^[A-Z0-9]{5}$/);
  await expect(page.locator('#kg')).toBeVisible();
});

test('Rauchprobe: Brettspiel (Vier gewinnt) lässt sich hosten', async ({ page, app }) => {
  await login(page, app);
  await host(page, 'viergewinnt');
  await expect(page.locator('#game-root')).not.toBeEmpty();
});
