// V2-05/V2-15: gemeinsame Einstellungsseite – Anzeige, Bedienung, Hub-Filter, Ton, Datenschutz, Export/Löschen, Synchronisierung.
import { test, expect, login, selectGame } from './helpers.js';

test.use({ createLimit: '100' });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const open = async (page, app, sub = '') => { await login(page, app); await page.evaluate((s) => { location.hash = '#einstellungen' + (s ? '/' + s : ''); }, sub); await expect(page.locator('.set-page')).toBeVisible(); };
const api = (page, method, path, body) => page.evaluate(async ([method, path, body]) => { const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; }, [method, path, body]);

test('Einstellungsseite: erreichbar, alle Bereiche da, mobil ohne seitliches Überlaufen', async ({ page, app }, info) => {
  await open(page, app);
  for (const id of ['anzeige', 'bedienung', 'hub', 'ton', 'datenschutz', 'daten']) await expect(page.locator('#set-' + id)).toBeVisible();
  await expect(page.locator('#set-status')).toContainText('Spieler-ID');
  expect(await overflow(page)).toBe(true);
  await page.locator('#set-datenschutz').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('einstellungen.png'), fullPage: true });
  // Sprung direkt zum Datenschutz-Abschnitt
  await page.evaluate(() => { location.hash = '#einstellungen/datenschutz'; });
  await expect(page.locator('[data-set-privacy]')).toHaveCount(7);
  // Der Dialog „Ich“ verweist auf die Seite statt eigene Schalter zu haben
  await page.locator('#profile-chip:visible, #profile-avatar:visible').first().click();
  await page.locator('.profile-preferences summary').click();
  await expect(page.locator('#p-preferences a[href="#einstellungen"]')).toBeVisible();
  await expect(page.locator('#p-presence-hidden')).toHaveCount(0);
  await page.locator('#p-preferences a').click();
  await expect(page.locator('#profile-dlg')).toBeHidden();
  await expect(page.locator('.set-page')).toBeVisible();
});

test('Anzeige und Bedienung: wirken sofort und bleiben nach dem Neuladen, Sprache wechselt', async ({ page, app }) => {
  await open(page, app);
  await page.locator('[data-set="display.theme"]').selectOption('night');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
  await page.locator('[data-set="display.cardSize"]').selectOption('xl');
  await page.locator('[data-set="display.calm"]').check();
  await page.locator('[data-set="controls.doubleTap"]').uncheck();
  await page.locator('[data-set="controls.confirmations"]').uncheck();
  await page.locator('[data-set="sound.enabled"]').uncheck();
  expect(await page.evaluate(() => [prefs.cardSize, prefs.calm, prefs.doubleTap, prefs.confirmations, prefs.sound])).toEqual(['xl', true, false, false, false]);
  await expect.poll(async () => (await api(page, 'GET', '/api/me/settings')).json.settings.display.cardSize).toBe('xl');   // am Konto gespeichert
  await page.reload();
  await expect(page.locator('[data-set="display.theme"]')).toHaveValue('night');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
  await expect(page.locator('[data-set="controls.doubleTap"]')).not.toBeChecked();
  await page.locator('[data-set="display.language"]').selectOption('en');
  await expect(page.locator('.set-head h2').first()).toHaveText('Display');
  await page.reload();
  await expect(page.locator('.set-head h2').first()).toHaveText('Display');
  expect((await api(page, 'GET', '/api/me/settings')).json.settings.display.language).toBe('en');
  // Zurücksetzen lässt die Sprache stehen
  await page.locator('[data-set-reset-all]').click();
  await page.locator('#dlg-ok').click();
  await expect(page.locator('[data-set="display.theme"]')).toHaveValue('classic');
  await expect(page.locator('[data-set="display.language"]')).toHaveValue('en');
});

test('Kategorien: Brettspiele ausblenden und wieder einblenden; Einladungslink und Adresse funktionieren weiter', async ({ page, app, browser }) => {
  await login(page, app);
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.locator('#hub-main [data-host="schach"]').first()).toBeVisible();
  await page.evaluate(() => { location.hash = '#einstellungen/hub'; });
  await page.locator('[data-set-list="hub.hiddenCategories"][data-value="brett"]').uncheck();
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.locator('#hub-main [data-host="schach"]')).toHaveCount(0);
  await expect(page.locator('#hub-main [data-host="maumau"]').first()).toBeVisible();
  await expect(page.locator('#side-nav a[href="#spiele/brett"]')).toHaveCount(0);
  // Direkt über die Adresse bleibt die Kategorie erreichbar (keine versteckten Rechte, nur Anzeige)
  await page.evaluate(() => { location.hash = '#spiele/brett'; });
  await expect(page.locator('#hub-main [data-host="schach"]').first()).toBeVisible();
  // Ein Tisch eines ausgeblendeten Spiels lässt sich per Einladungslink betreten
  const other = await browser.newContext(), host = await other.newPage();
  try {
    await login(host, app, 'Gastgeber');
    await selectGame(host, 'viergewinnt');
    await host.locator('#host-form button[type=submit]').click();
    await expect.poll(() => host.evaluate(() => (typeof lastState !== 'undefined' && lastState?.code) || null)).toBeTruthy();
    const code = await host.evaluate(() => lastState.code);
    await page.evaluate((c) => joinAndEnter(c, 'watch'), code);
    await expect(page.locator('[data-scene]')).toHaveAttribute('data-scene', 'viergewinnt');
  } finally { await other.close(); }
  await page.goto(app.url + '/#einstellungen/hub');
  await page.locator('[data-set-list="hub.hiddenCategories"][data-value="brett"]').check();
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.locator('#hub-main [data-host="schach"]').first()).toBeVisible();
});

test('Bereiche: einzeln ausblenden, die Einstellungen bleiben immer erreichbar, Zurücksetzen holt alles zurück', async ({ page, app }) => {
  await open(page, app, 'hub');
  const blocks = ['leaderboard', 'roadmap', 'tickets'];
  for (const id of blocks) await page.locator(`[data-set-list="hub.hiddenBlocks"][data-value="${id}"]`).uncheck();
  for (const href of ['#bestenliste', '#roadmap', '#tickets']) await expect(page.locator(`#side-nav a[href="${href}"]`)).toHaveCount(0);
  await expect(page.locator('#side-nav a[href="#einstellungen"]')).toHaveCount(1);
  await expect(page.locator('#hub-tabbar a[href="#einstellungen"]')).toHaveCount(1);
  await expect(page.locator('#side-nav a[href="#erfolge"]')).toHaveCount(1); // unabhängig davon bleibt der Rest
  await page.reload();
  await expect(page.locator('#side-nav a[href="#roadmap"]')).toHaveCount(0);
  await page.evaluate(() => { location.hash = '#roadmap'; });
  await expect(page.locator('#hub-main')).toContainText('Roadmap'); // die Adresse funktioniert weiter
  await page.evaluate(() => { location.hash = '#einstellungen/hub'; });
  await page.locator('[data-set-reset="hub"]').click();
  for (const href of ['#bestenliste', '#roadmap', '#tickets']) await expect(page.locator(`#side-nav a[href="${href}"]`)).toHaveCount(1);
  // Standardfilter der Bibliothek
  await page.locator('[data-set="hub.defaultFilter"]').selectOption('p2');
  await page.reload();
  await page.evaluate(() => { location.hash = '#spiele'; });
  await expect(page.locator('[data-chip="p2"]').first()).toHaveAttribute('aria-pressed', 'true');
});

test('Datenschutz getrennt vom Ausblenden: Erfolge im Hub verbergen ändert die öffentliche Freigabe nicht', async ({ page, app }) => {
  await open(page, app, 'datenschutz');
  await page.locator('[data-set-privacy="showStats"]').uncheck();
  await expect.poll(async () => (await api(page, 'GET', '/api/profile/me')).json.privacy.showStats).toBe(false);
  await page.evaluate(() => { location.hash = '#einstellungen/hub'; });
  await page.locator('[data-set-list="hub.hiddenBlocks"][data-value="achievements"]').uncheck();
  await expect.poll(async () => (await api(page, 'GET', '/api/me/settings')).json.settings.hub.hiddenBlocks).toContain('achievements');
  const me = (await api(page, 'GET', '/api/profile/me')).json;
  expect(me.privacy.showAchievements).toBe(true);          // öffentlich weiterhin freigegeben
  await page.reload();
  await page.evaluate(() => { location.hash = '#einstellungen/datenschutz'; });
  await expect(page.locator('[data-set-privacy="showStats"]')).not.toBeChecked();
  await expect(page.locator('[data-set-privacy="showAchievements"]')).toBeChecked();
  await page.locator('[data-set-privacy="showOnline"]').uncheck();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('poker:presenceHidden')))).toBe(true);
  await expect.poll(async () => (await api(page, 'GET', '/api/profile/me')).json.privacy.showOnline).toBe(false);
  // Das eigene Profil verweist auf die Einstellungen
  await page.locator('.set-page [data-profile="me"]').click();
  await expect(page.locator('#player-profile-dlg a[href="#einstellungen/datenschutz"]')).toBeVisible();
  await expect(page.locator('#player-profile-dlg [data-profile-privacy]')).toHaveCount(0);
});

test('Geräte: Einstellungen folgen der Spieler-ID auf ein per Code verbundenes zweites Gerät', async ({ page, app, browser }) => {
  await open(page, app);
  await page.locator('[data-set="display.theme"]').selectOption('night');
  await page.locator('[data-set-list="hub.hiddenBlocks"][data-value="tickets"]').uncheck().catch(() => {});
  await expect.poll(async () => (await api(page, 'GET', '/api/me/settings')).json.settings.display.theme).toBe('night');
  const code = (await api(page, 'POST', '/api/identity/link/create')).json.code;
  const context = await browser.newContext(), second = await context.newPage();
  try {
    await login(second, app, 'Zweitgerät');
    expect((await api(second, 'POST', '/api/identity/link/redeem', { code })).status).toBe(200);
    await second.reload();
    await expect.poll(() => second.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
    expect((await api(second, 'GET', '/api/me/settings')).json.settings.display.theme).toBe('night');
  } finally { await context.close(); }
});

test('Meine Daten: Export als JSON und Löschen mit Game-ID-Bestätigung', async ({ page, app }) => {
  await open(page, app, 'daten');
  const id = await page.evaluate(() => Identity.gameId);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-set-export]').click()]);
  expect(download.suggestedFilename()).toBe(`spieleabend-daten-${id.slice(1)}.json`);
  const data = JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
  expect(data.account.gameId).toBe(id); expect(data.schemaVersion).toBe(1); expect(data.settings).toBeTruthy();
  await page.locator('[data-set-delete]').click();
  await expect(page.locator('#dlg-title')).toContainText('endgültig');
  await page.locator('#dlg-extra input').fill(id);
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/me/delete') && r.status() === 200), page.locator('#dlg-ok').click()]);
  await page.waitForFunction(() => !location.hash);   // die Seite wurde neu geladen (Adresse ohne Anker)
  await page.waitForLoadState('load');
  await expect.poll(() => page.evaluate(() => Identity.gameId)).not.toBe(id);   // ein neuer Besuch bekommt ein neues Konto
  expect(await page.evaluate(() => localStorage.getItem('poker:settings'))).toBeNull();
});
