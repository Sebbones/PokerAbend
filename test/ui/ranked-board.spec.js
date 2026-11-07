// V2-03: Bestenliste im Hub – gewertet (Ranked) und unbestätigte Statistik getrennt, Zeiträume, leere Zustände, mobil lesbar.
import { test, expect, login, selectGame } from './helpers.js';

const A = 'a'.repeat(32), B = 'b'.repeat(32), C = 'c'.repeat(32);
const now = Date.now(), DAY = 24 * 3600 * 1000;
const round = (id, game, at, ranked, reason, players) => ({ id, game, variant: 'classic', at, ranked, reason, players });
const p = (a, n, win, pts, place, bot = false) => ({ a, n, bot, win, pts, place });
const board = {
  schemaVersion: 3,
  players: {
    [A]: { name: 'Anna', games: {}, accountId: A },
    [B]: { name: 'Ben', games: {}, accountId: B },
    [C]: { name: 'Cara', games: {}, accountId: C },
    alterspieler: { name: 'Alterspieler', games: { maumau: { played: 7, wins: 5, points: 20, months: { '2026-10': { played: 7, wins: 5, points: 20 } } } } },
  },
  rounds: {
    '1000000000000001': round('1000000000000001', 'maumau', now - 1000, true, '', [p(A, 'Anna', true, 0, 1), p(B, 'Ben', false, 6, 2)]),
    '1000000000000002': round('1000000000000002', 'maumau', now - 2000, true, '', [p(A, 'Anna', true, 0, 1), p(C, 'Cara', false, 9, 2)]),
    '1000000000000003': round('1000000000000003', 'maumau', now - 20 * DAY, true, '', [p(B, 'Ben', true, 0, 1), p(C, 'Cara', false, 3, 2)]),
    '1000000000000004': round('1000000000000004', 'maumau', now - 3000, false, 'bots', [p(A, 'Anna', true, 0, 1), p(null, 'Computer', false, 8, 2, true)]),
    '1000000000000005': round('1000000000000005', 'maumau', now - 4000, false, 'gast', [p(A, 'Anna', true, 0, 1), p(null, 'Gast', false, 8, 2)]),
  },
};

test.use({ seedFiles: { 'leaderboard.json': board } });

const open = async (page, app) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#bestenliste'; });
  await expect(page.locator('#board-body')).toBeVisible();
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test('Bestenliste: gewertete Ansicht mit Zeiträumen, Zusammenfassung der nicht gewerteten Partien', async ({ page, app }, info) => {
  await open(page, app);
  await expect(page.locator('#lbp-view')).toHaveValue('ranked');
  await expect(page.locator('.lb-badge-ranked')).toContainText('mindestens zwei registrierten Menschen');
  await page.locator('#lbp-game').selectOption('maumau');
  await expect(page.locator('.lb-table tbody tr')).toHaveCount(3);
  // Alles: Anna 2 Siege, Ben 1, Cara 0 – ohne die Computer- und Gast-Runden
  await expect(page.locator('.lb-table tbody tr').nth(0)).toContainText('Anna');
  await expect(page.locator('.lb-table tbody tr').nth(0).locator('td.num').first()).toHaveText('2');
  await expect(page.locator('.lb-table tbody tr').nth(1)).toContainText('Ben');
  await expect(page.locator('.lb-table')).not.toContainText('Computer');
  await expect(page.locator('.lb-table')).not.toContainText('Gast');
  await expect(page.locator('#board-body')).toContainText('Gewertet: 3 · nicht gewertet: 2');
  await expect(page.locator('#board-body')).toContainText('mit Computer-Mitspielern');
  await expect(page.locator('#board-body')).toContainText('mit Gästen ohne Discord-Verknüpfung');
  // Diese Woche: die 20 Tage alte Runde fällt heraus
  await page.locator('#lbp-period').selectOption('week');
  await expect(page.locator('.lb-table tbody tr')).toHaveCount(3);
  await expect(page.locator('.lb-table tbody tr', { hasText: 'Ben' }).locator('td.num').first()).toHaveText('1');
  await expect(page.locator('#board-body')).toContainText('Gewertet: 2');
  // Gesamt über alle Spiele: keine Punktespalte
  await page.locator('#lbp-game').selectOption('all');
  await expect(page.locator('.lb-table thead')).not.toContainText('Punkte');
  expect(await overflow(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('bestenliste-gewertet.png') });
});

test('Bestenliste: echter leerer Zustand ohne erfundene Spieler', async ({ page, app }) => {
  await open(page, app);
  await page.locator('#lbp-game').selectOption('schocken');
  await expect(page.locator('.lb-empty')).toContainText('noch keine gewerteten Partien');
  await expect(page.locator('.lb-table')).toHaveCount(0);
});

test('Bestenliste: alte Namensstatistik ist deutlich als unbestätigt gekennzeichnet und weiter erreichbar', async ({ page, app }, info) => {
  await open(page, app);
  await page.locator('#lbp-view').selectOption('stats');
  await expect(page.locator('.lb-badge-stats')).toContainText('Unbestätigt');
  await page.locator('#lbp-game').selectOption('maumau');
  await expect(page.locator('.lb-table tbody tr', { hasText: 'Alterspieler' })).toBeVisible();
  await expect(page.locator('#lbp-view')).toHaveValue('stats');
  expect(await overflow(page)).toBe(true);
  await page.screenshot({ path: info.outputPath('bestenliste-statistik.png') });
  // Zurück zur gewerteten Ansicht
  await page.locator('#lbp-view').selectOption('ranked');
  await expect(page.locator('.lb-badge-ranked')).toBeVisible();
});

test('Bestenliste: Tabelle ist auch im Dialog am Tisch erreichbar', async ({ page, app }) => {
  await login(page, app);
  await page.evaluate(() => showLeaderboard('maumau'));
  await expect(page.locator('#lb-dlg')).toBeVisible();
  await expect(page.locator('#lb-dlg .lb-badge-ranked')).toBeVisible();
  await expect(page.locator('#lb-dlg .lb-table tbody tr')).toHaveCount(3);
  const fits = await page.locator('#lb-dlg .lb-scroll').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(fits, 'Tabelle passt ohne seitliches Scrollen in den Dialog').toBe(true);
});

test('Tisch: Kennzeichnung gewertet / nicht gewertet im Spiel', async ({ page, app }) => {
  await login(page, app);
  await selectGame(page, 'maumau');
  await page.locator('#host-form button[type=submit]').click();
  await page.getByRole('button', { name: 'Mitspielen', exact: true }).click();
  const chip = page.locator('[data-ranked]');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-ranked', 'off');
  await expect(chip).toContainText('Nicht gewertet');
  await expect(chip).toContainText('zählt nur für die Statistik');
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  await expect(chip).toContainText('Computer-Mitspieler dabei');
  expect(await overflow(page)).toBe(true);
});
