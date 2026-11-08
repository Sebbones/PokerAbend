// Betrieb im Browser: Version, „Was ist neu“, Update-Banner, Neustart-Hinweis, Fehler melden, Admin-Seite.
import { readFileSync } from 'node:fs';
import { test, expect, login } from './helpers.js';

const VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

const profileButton = (page) => page.locator('#profile-chip, #profile-avatar').locator('visible=true').first();

test.describe('Browser', () => {
  test('Version unter „Ich“, „Was ist neu“ auf Wunsch, einmalig nach einem Versionswechsel', async ({ page, app }) => {
    await login(page, app);
    await profileButton(page).click();
    await expect(page.locator('#profile-dlg')).toBeVisible();
    await expect(page.locator('#p-version')).toContainText('Version ' + VERSION);
    await page.locator('#p-whatsnew').click();
    await expect(page.locator('#whatsnew-dlg')).toBeVisible();
    await expect(page.locator('#whatsnew-dlg')).toContainText('Neu in Version ' + VERSION);
    await expect(page.locator('#whatsnew-dlg li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Verstanden' }).click();
    // Ein Browser, der eine ältere Version gesehen hat, bekommt den Hinweis genau einmal
    await page.evaluate(() => localStorage.setItem('poker:seenVersion', JSON.stringify('1.0.0')));
    await page.reload();
    await expect(page.locator('#whatsnew-dlg')).toBeVisible();
    await page.getByRole('button', { name: 'Verstanden' }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('poker:seenVersion')))).toBe(VERSION);
    await page.reload();
    await expect(page.locator('#hub')).toBeVisible();
    await expect(page.locator('#whatsnew-dlg[open]')).toHaveCount(0);
  });

  test('Update-Banner und Neustart-Hinweis erscheinen und verschwinden wieder', async ({ page, app }) => {
    await login(page, app);
    await page.evaluate(() => socket.listeners('maintenance').forEach((fn) => fn({ leftMs: 3 * 60000, due: false })));
    await expect(page.locator('#ops-banner')).toContainText('Update in 3 Minuten');
    await expect(page.locator('#ops-banner')).toContainText('neue Runden starten nicht mehr');
    await page.evaluate(() => socket.listeners('maintenance').forEach((fn) => fn(null)));
    await expect(page.locator('#ops-banner')).toBeHidden();
    await page.evaluate(() => socket.listeners('restarting').forEach((fn) => fn({ text: 'Server startet neu – gleich wieder da' })));
    await expect(page.locator('#ops-banner')).toContainText('Server startet neu – gleich wieder da');
    await page.evaluate(() => socket.listeners('connect').forEach((fn) => fn()));
    await expect(page.locator('#ops-banner')).toBeHidden();
  });

  test('„Fehler melden“ öffnet das Ticket-Formular mit den letzten Fehlern', async ({ page, app }) => {
    await login(page, app);
    // Künstliches Fehlerereignis, damit der Test selbst nicht an einem echten Seitenfehler scheitert
    await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'Testfehler im Spiel', filename: 'https://x.example/spiel.js?t=ABCDE', lineno: 7, colno: 3 })));
    await profileButton(page).click();
    await page.locator('#p-bugreport').click();
    const form = page.locator('#ticket-edit-form');
    await expect(form).toBeVisible();
    await expect(form.locator('[name="type"]')).toHaveValue('bug');
    const text = await form.locator('[name="description"]').inputValue();
    expect(text).toContain('Testfehler im Spiel');
    expect(text).toContain('spiel.js:7:3');
    expect(text).not.toContain('ABCDE');
  });
});

test.describe('Admin-Seite', () => {
  test.use({ adminPassword: 'Admin-UI-Test' });

  test('Anmelden, Räume sehen, Update ankündigen und Raum schließen – jeweils mit Bestätigung', async ({ page, app, browser }) => {
    await login(page, app);
    // Ein Tisch, den der Admin später schließt
    await page.evaluate(() => { location.hash = '#spiele'; });
    await page.locator('[data-host="maumau"]').first().click();
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('#game-root')).toBeVisible();
    const code = new URL(page.url()).searchParams.get('t');

    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const admin = await context.newPage();
    await admin.goto(app.url + '/login');
    await admin.getByLabel('Passwort').fill(app.password);
    await admin.getByRole('button', { name: 'Reinkommen' }).click();
    await admin.goto(app.url + '/admin');
    await expect(admin.locator('#login')).toBeVisible();
    await admin.locator('#pw').fill('falsch');
    await admin.getByRole('button', { name: 'Anmelden' }).click();
    await expect(admin.locator('#login-error')).toContainText('stimmt nicht');
    await admin.locator('#pw').fill('Admin-UI-Test');
    await admin.getByRole('button', { name: 'Anmelden' }).click();
    await expect(admin.locator('#app')).toBeVisible();
    await expect(admin.locator('#version')).toContainText(VERSION);
    await expect(admin.locator('#rooms')).toContainText(code);
    await expect(admin.locator('#rooms')).toContainText('Anna');

    // Update ankündigen: erst nach Bestätigung, dann sehen es alle
    await admin.locator('#update-form button[type=submit]').click();
    await expect(admin.locator('#confirm')).toBeVisible();
    await admin.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(admin.locator('#update')).not.toContainText('Update angekündigt');
    await admin.locator('#update-form button[type=submit]').click();
    await admin.locator('#confirm-ok').click();
    await expect(admin.locator('#update')).toContainText('Update angekündigt');
    await expect(page.locator('#ops-banner')).toContainText('Update in');
    await admin.locator('[data-cancel-update]').click();
    await admin.locator('#confirm-ok').click();
    await expect(page.locator('#ops-banner')).toBeHidden();

    // Raum schließen: Bestätigung, dann landen die Spieler auf der Startseite
    await admin.locator(`[data-close="${code}"]`).click();
    await expect(admin.locator('#confirm')).toContainText(code);
    await admin.locator('#confirm-ok').click();
    await expect(admin.locator('#rooms')).not.toContainText(code);
    await expect(page.locator('#hub')).toBeVisible();
    await expect(admin.locator('#log')).toContainText('Raum geschlossen');
    await expect(admin.locator('#log')).toContainText('Update angekündigt');
    await context.close();
  });
});
