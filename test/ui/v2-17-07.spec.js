// V2-17: Admin-Moderation im Browser (Rückblicke, Partien, Tickets, Protokoll, Rate-Limit).
import { test, expect } from './helpers.js';

const REVIEW = '11111111-2222-3333-4444-555555555555', ROUND = 'abcdef0123456789';
const review = { id: REVIEW, name: 'Freitagsabend', mode: 'abend', status: 'done', private: false, startedAt: 1, endedAt: 2, updatedAt: 3, planned: 1,
  players: [{ name: 'Anna', avatar: '🦊' }, { name: 'Ben', avatar: '🦊' }],
  stations: [{ index: 0, game: 'maumau', gameName: 'Mau-Mau', at: 2, scoreLabel: 'Punkte', lowWins: false, values: [{ player: 'p0', raw: 3, points: 5, won: true }, { player: 'p1', raw: 1, points: 2, won: false }] }] };
const ticket = { id: 1, title: 'Altes Ticket vom Hub', description: 'Ein Ticket aus der Zeit vor den Konten.', type: 'idea', game: '', status: 'new', author: { id: 'ab'.repeat(16), name: 'Oma', avatar: '🦉' },
  createdAt: 1, updatedAt: 1, revision: 1, voters: [], comments: [], nextComment: 1, history: [] };

test.describe('Admin-Moderation', () => {
  test.use({
    adminPassword: 'Admin-UI-Test',
    seedFiles: {
      'evening-reviews.json': { version: 1, evenings: [review] },
      'leaderboard.json': { schemaVersion: 3, players: {}, alias: {}, rounds: { [ROUND]: { id: ROUND, game: 'maumau', at: Date.now(), ranked: true, reason: '', players: [{ a: null, n: 'Anna', bot: false, win: true, pts: 9, place: 1 }, { a: null, n: 'Ben', bot: false, win: false, pts: 2, place: 2 }] } } },
      'tickets.json': { version: 1, nextId: 2, tickets: [ticket] },
    },
  });

  test('Rückblick und Partie ausblenden, Ticket bearbeiten, Protokoll, Login-Sperre', async ({ app, browser }) => {
    // Eigener Kontext: erwartete 401/404-Antworten (falsches Passwort, unbekannte Game-ID) sind hier gewollt
    const adminContext = await browser.newContext({ viewport: { width: 1200, height: 900 } }), page = await adminContext.newPage();
    await page.goto(app.url + '/login');
    await page.getByLabel('Passwort').fill(app.password);
    await page.getByRole('button', { name: 'Reinkommen' }).click();
    await page.goto(app.url + '/admin');
    await page.locator('#pw').fill('Admin-UI-Test');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page.locator('#app')).toBeVisible();

    // Rückblicke: Ausblenden braucht Bestätigung, öffentlich verschwindet der Abend
    await expect(page.locator('#reviews')).toContainText('Freitagsabend');
    expect((await (await page.request.get(app.url + '/api/evenings')).json()).total).toBe(1);
    await page.locator(`[data-hide-review="${REVIEW}"]`).click();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    expect((await (await page.request.get(app.url + '/api/evenings')).json()).total).toBe(1);
    await page.locator(`[data-hide-review="${REVIEW}"]`).click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#reviews')).toContainText('ausgeblendet');
    expect((await (await page.request.get(app.url + '/api/evenings')).json()).total).toBe(0);
    await page.locator(`[data-hide-review="${REVIEW}"]`).click(); // Einblenden braucht keine Bestätigung
    await expect(page.locator('#reviews')).not.toContainText('(ausgeblendet)');
    expect((await (await page.request.get(app.url + '/api/evenings')).json()).total).toBe(1);

    // Partien
    await expect(page.locator('#rounds')).toContainText('1. Anna');
    await page.locator(`[data-hide-round="${ROUND}"]`).click();
    await expect(page.locator('#confirm')).toContainText('maumau');
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#rounds')).toContainText('ausgeblendet');
    await page.locator(`[data-hide-round="${ROUND}"]`).click();
    await expect(page.locator('#rounds')).toContainText('gewertet');

    // Tickets: Status ändern, kommentieren
    await expect(page.locator('#tickets')).toContainText('Altes Ticket vom Hub');
    await page.locator('#tickets select').selectOption('planned');
    await page.locator('[data-ticket-save="1"]').click();
    await expect(page.locator('#msg')).toContainText('Ticket gespeichert');
    expect((await (await page.request.get(app.url + '/api/tickets/1')).json()).ticket.status).toBe('planned');
    page.once('dialog', (dialog) => dialog.accept('Kommt bald.'));
    await page.locator('[data-ticket-comment="1"]').click();
    await expect(page.locator('#msg')).toContainText('Kommentar gespeichert');
    expect((await (await page.request.get(app.url + '/api/tickets/1')).json()).ticket.comments[0].author.name).toBe('Admin');

    // Spieler-Suche und Zusammenführen mit ungültiger Eingabe zeigt einen Fehler statt etwas zu tun
    await page.locator('#merge-form [name=from]').fill('#AAAA');
    await page.locator('#merge-form [name=to]').fill('#BBBB');
    await page.locator('#merge-form button').click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#msg')).toContainText('gibt es nicht');

    // Protokoll
    await page.getByRole('button', { name: 'Aktualisieren' }).click();
    for (const action of ['Rückblick ausgeblendet', 'Rückblick eingeblendet', 'Partie ausgeblendet', 'Partie eingeblendet', 'Ticket bearbeitet', 'Ticket kommentiert']) await expect(page.locator('#log')).toContainText(action);

    // Ticket löschen mit Bestätigung
    await page.locator('[data-ticket-delete="1"]').click();
    await page.locator('#confirm-ok').click();
    await expect(page.locator('#tickets')).toContainText('Keine Tickets');
    await expect(page.locator('#log')).toContainText('Ticket gelöscht');

    // Login-Sperre nach Fehlversuchen (frischer Kontext ohne Admin-Cookie)
    const context = await browser.newContext();
    const anon = await context.newPage();
    await anon.goto(app.url + '/login');
    await anon.getByLabel('Passwort').fill(app.password);
    await anon.getByRole('button', { name: 'Reinkommen' }).click();
    await anon.goto(app.url + '/admin');
    for (let i = 0; i < 8; i++) { await anon.locator('#pw').fill('falsch' + i); await anon.getByRole('button', { name: 'Anmelden' }).click(); await expect(anon.locator('#login-error')).toContainText('stimmt nicht'); }
    await anon.locator('#pw').fill('Admin-UI-Test');
    await anon.getByRole('button', { name: 'Anmelden' }).click();
    await expect(anon.locator('#login-error')).toContainText('Zu viele Anmeldeversuche');
    await expect(anon.locator('#app')).toBeHidden();
    await context.close(); await adminContext.close();
  });
});
