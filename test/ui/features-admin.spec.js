// V2-10 im Browser: /admin → „Funktionen & Spiele“. Spiel ausschalten → verschwindet in der Spielebibliothek und lässt sich nicht hosten,
// Zurücksetzen/Einschalten bringt es zurück; Funktionsschalter mit Bestätigung; kein seitliches Überlaufen auf dem Handy.
import { test, expect, login } from './helpers.js';

test.describe('Funktionen & Spiele (Admin)', () => {
  test.use({ adminPassword: 'Admin-Flags-Test' });

  async function adminPage(browser, app, info) {
    const context = await browser.newContext({ viewport: info.project.use.viewport, isMobile: !!info.project.use.isMobile, hasTouch: !!info.project.use.hasTouch });
    const admin = await context.newPage();
    const errors = [];
    admin.on('pageerror', (e) => errors.push(e.message));
    await admin.goto(app.url + '/login');
    await admin.getByLabel('Passwort').fill(app.password);
    await admin.getByRole('button', { name: 'Reinkommen' }).click();
    await admin.goto(app.url + '/admin');
    await admin.locator('#pw').fill('Admin-Flags-Test');
    await admin.getByRole('button', { name: 'Anmelden' }).click();
    await expect(admin.locator('#app')).toBeVisible();
    return { context, admin, errors };
  }

  test('Spiel aus- und wieder einschalten: Bibliothek und Anlegen reagieren sofort; Funktionsschalter fragen nach', async ({ page, app, browser }, info) => {
    await login(page, app);
    await page.evaluate(() => { location.hash = '#spiele'; });
    await expect(page.locator('[data-host="blackjack"]').first()).toBeVisible();

    const { context, admin, errors } = await adminPage(browser, app, info);
    try {
      const section = admin.locator('#mod-features');
      await expect(section).toBeVisible();
      await expect(section.locator('#feature-flags')).toContainText('Anmeldung mit Discord');
      await expect(section.locator('#feature-flags')).toContainText('Ranked-Wertung');
      await expect(section.locator('#feature-flags')).toContainText('Kamera');
      const row = (name) => section.locator('#feature-flags tr', { hasText: name });
      await expect(row('Kamera')).toContainText('aus'); // sicherer Standard
      await expect(row('Ranked-Wertung')).toContainText('an');
      expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Admin ohne seitliches Überlaufen').toBe(true);

      // Spiel ausschalten (ohne Rückfrage, nichts geht verloren)
      await section.locator('#feature-filter').fill('blackjack');
      await section.locator('button[data-game="blackjack"][data-value="0"]').click();
      await expect(section.locator('#feature-games tr', { hasText: 'blackjack' })).toContainText('aus');
      await expect(section.locator('#feature-games tr', { hasText: 'blackjack' })).toContainText('Admin-Einstellung');
      await expect(admin.locator('#msg')).toContainText('blackjack: ausgeschaltet');
      await expect(admin.locator('#log')).toContainText('Spiel ausgeschaltet');

      // Die Bibliothek eines anderen Besuchers verliert die Kachel nach dem Neuladen, Hosten wird abgelehnt
      await page.reload();
      await page.evaluate(() => { location.hash = '#spiele'; });
      await expect(page.locator('[data-host="maumau"]').first()).toBeVisible();
      await expect(page.locator('[data-host="blackjack"]')).toHaveCount(0);
      const refused = await page.evaluate(() => new Promise((resolve) => socket.emit('create', { game: 'blackjack', name: 'Anna', avatar: '🦉' }, resolve)));
      expect(refused.ok).toBe(false);
      expect(refused.error).toContain('ausgeschaltet');

      // Zurücksetzen → wieder da
      await section.locator('button[data-game="blackjack"][data-value="reset"]').click();
      await expect(section.locator('#feature-games tr', { hasText: 'blackjack' })).toContainText('Standard');
      await page.reload();
      await page.evaluate(() => { location.hash = '#spiele'; });
      await expect(page.locator('[data-host="blackjack"]').first()).toBeVisible();

      // „nur ausgeschaltete“ filtert; Funktion ausschalten verlangt eine Bestätigung
      await section.locator('#feature-filter').fill('');
      await section.locator('#feature-off-only').check();
      await expect(section.locator('#feature-games')).toContainText('Keine Treffer');
      await section.locator('#feature-off-only').uncheck();
      await row('Ranked-Wertung').locator('button[data-flag="ranked"]').click();
      await expect(admin.locator('#confirm')).toBeVisible();
      await admin.getByRole('button', { name: 'Abbrechen' }).click();
      await expect(row('Ranked-Wertung')).toContainText('an');
      await row('Ranked-Wertung').locator('button[data-flag="ranked"]').click();
      await admin.locator('#confirm-ok').click();
      await expect(row('Ranked-Wertung').locator('td').nth(1)).toHaveText('aus');
      await row('Ranked-Wertung').locator('button[data-value="reset"]').click();
      await expect(row('Ranked-Wertung').locator('td').nth(1)).toHaveText('an');
      expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nach dem Umlegen ohne seitliches Überlaufen').toBe(true);
      await admin.screenshot({ path: info.outputPath('admin-funktionen.png'), fullPage: true });
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
});
