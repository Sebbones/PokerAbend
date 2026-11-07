import { test, expect } from './helpers.js';
import { readFileSync } from 'node:fs';

test('Konsolidierte V2-Roadmap: Besucher sehen neue Planungen, geplante Spiele bleiben nicht startbar', async ({ page, app }, info) => {
  await start(page, app, 'Anna');
  await page.evaluate(() => { location.hash = '#roadmap'; });
  await expect(page.locator('.roadmap-card.current')).toContainText('Benachrichtigungen');
  await page.locator('[data-roadmap-stage="spaeter"] > summary').click();
  for (const title of ['Dauerhafte Konten & Spieler-IDs', 'Eigene Spielerprofile', 'Privatsphäre selbst bestimmen', 'Bot-Schwierigkeitsgrade', 'Sichere Adminrechte']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await page.locator('[data-roadmap-stage="gross"] > summary').click();
  await page.locator('[data-plan="gebietskampf"]').click(); // V2-11: umgesetzt, nicht mehr nur geplant
  await expect(page.locator('#host-dlg')).toContainText('Bereits spielbar');
  await page.locator('#host-dlg .host-close').click();
  for (const id of ['staedtehandel', 'turmbauer', 'geschenkdiebe', 'fallenbauer', 'reaktor-notfall', 'bomben-duell']) {
    await page.locator(`[data-plan="${id}"]`).click();
    await expect(page.locator('#host-dlg')).toContainText('Noch nicht spielbar');
    await expect(page.locator('#host-form')).toHaveCount(0);
    await page.locator('#host-dlg .host-close').click();
  }
  const response = await page.request.get(app.url + '/roadmap');
  const sections = await response.json();
  const plan = JSON.parse(readFileSync(new URL('../../docs/roadmap/plan.json', import.meta.url), 'utf8'));
  const points = sections.flatMap(s => s.punkte);
  for (const task of plan.tasks) for (const id of task.public_roadmap_ids) {
    const matches = points.filter(p => p.id === id);
    expect(matches, `${task.id}: ${id}`).toHaveLength(1);
    // Only explicitly authorized, implemented packages may complete public points.
    expect(!!matches[0].erledigt, id).toBe(['v2-erfolge-ausbauen', 'v2-online-verbessern', 'v2-bot-schwierigkeit', 'v2-audit', 'v2-backup-migration', 'v2-account-identity', 'discord-1', 'discord-3', 'discord-4', 'v2-session-security'].includes(id));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('v2-roadmap.png'), fullPage: true });
});

async function start(page, app, name) {
  await page.addInitScript((name) => {
    localStorage.setItem('poker:showplanned', 'true'); // Altbestand muss beim Start verschwinden.
    if (!localStorage.getItem('poker:name')) {
      localStorage.setItem('poker:name', JSON.stringify(name));
      localStorage.setItem('poker:avatar', JSON.stringify('🦉'));
      localStorage.setItem('poker:prefs', JSON.stringify({ intros: false }));
    }
  }, name);
  await page.goto(app.url);
  await page.getByLabel('Passwort').fill(app.password);
  await page.getByRole('button', { name: 'Reinkommen' }).click();
  await expect(page.locator('#hub')).toBeVisible();
}

test('Roadmap: Navigation, Filter, Spielregeln und gemerkte abgeschlossene Etappen', async ({ page, app }, info) => {
  await start(page, app, 'Anna');
  expect(await page.evaluate(() => localStorage.getItem('poker:showplanned'))).toBeNull();
  const response = await page.request.get(app.url + '/roadmap');
  expect(response.ok()).toBe(true);
  const nav = page.viewportSize().width < 641 ? '#hub-tabbar' : '#side-nav';
  await page.locator(nav).getByRole('link', { name: 'Roadmap', exact: true }).click();
  await expect(page).toHaveTitle('Roadmap – Spieleabend');
  await expect(page.locator('.roadmap-card.current')).toContainText('Benachrichtigungen');
  await page.getByRole('button', { name: 'Spiele', exact: true }).click();
  await page.locator('[data-roadmap-stage="spaeter"] > summary').click();
  await expect(page.locator('[data-plan="backgammon"]')).toBeVisible();
  await expect(page.locator('#roadmap-body')).not.toContainText('Markdown-Export');
  await page.locator('[data-plan="backgammon"]').click();
  await expect(page.locator('#host-dlg')).toContainText('Regeln');
  await expect(page.locator('#host-dlg .plan-rules li')).toHaveCount(9);
  await page.locator('#host-dlg .host-close').click();
  const completed = page.locator('[data-roadmap-stage="erledigt"]');
  await expect(completed).not.toHaveAttribute('open', '');
  await completed.locator('summary').click();
  const dates = await completed.locator('time').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime')));
  expect(dates.length).toBeGreaterThan(0);
  expect(dates).toEqual([...dates].sort().reverse());
  await page.reload();
  await expect(completed).toHaveAttribute('open', '');
  await completed.locator('summary').click();
  await expect(completed).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.screenshot({ path: info.outputPath('roadmap.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(page.viewportSize().width < 641 ? '#profile-avatar' : '#profile-chip').click();
  await expect(page.getByRole('switch', { name: /Geplante Spiele zeigen/ })).toHaveCount(0);
  await page.locator('.profile-preferences summary').click();
  await expect(page.locator('#p-preferences a[href="#einstellungen"]')).toBeVisible();
});

test('Presence: zweiter Browser, Unsichtbarkeit, Tisch zuschauen und Trennen', async ({ page, app, browser }, info) => {
  await start(page, app, 'Anna');
  const otherContext = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const other = await otherContext.newPage();
    await start(other, app, 'Ben');
    if (page.viewportSize().width < 641) await page.locator('.presence-mobile > summary').click();
    const list = page.locator(page.viewportSize().width < 641 ? '.presence-mobile .presence-list' : '.presence-desktop .presence-list');
    await expect(list).toContainText('Ben', { timeout: 7000 });
    await expect(list.locator('li').first()).toContainText('Anna (du)');
    await other.evaluate(()=>location.hash='#einstellungen/datenschutz');
    await other.locator('[data-set-privacy=showOnline]').uncheck();
    await expect(list).not.toContainText('Ben', { timeout: 7000 });
    await other.locator('[data-set-privacy=showOnline]').check();
    await other.evaluate(() => { location.hash = '#spiele'; });
    await other.locator('[data-host="maumau"]').click();
    await other.locator('#host-form button[type="submit"]').click();
    await other.getByRole('button', { name: 'Mitspielen', exact: true }).click();
    await expect(list).toContainText('in Lobby: Mau-Mau', { timeout: 7000 });
    await page.screenshot({ path: info.outputPath('presence.png'), fullPage: true });
    await list.locator('li').filter({ hasText: 'Ben' }).getByRole('button', { name: 'Zuschauen', exact: true }).click();
    await expect(page.locator('#kg-meta')).toContainText('Mau-Mau');
    await page.goBack();
    await expect(page.locator('#hub')).toBeVisible();
    await otherContext.close();
    const currentList = page.locator(page.viewportSize().width < 641 ? '.presence-mobile .presence-list' : '.presence-desktop .presence-list');
    await expect(currentList).not.toContainText('Ben', { timeout: 7000 });
    await page.locator('.presence-recent > summary').click();
    await expect(page.locator('.presence-recent')).toContainText('Ben');
    await page.evaluate(() => {
      hubPresence.recent.push({ key: 'alt', name: 'Abgelaufener Besuch', avatar: '🦉', at: Date.now() - 86400001 });
      refreshPresence();
    });
    await expect(page.locator('.presence-recent')).not.toContainText('Abgelaufener Besuch');
  } finally { await otherContext.close(); }
});

test('Roadmap erfordert Anmeldung', async ({ page, app }) => {
  const response = await page.request.get(app.url + '/roadmap', { maxRedirects: 0 });
  expect([302, 401]).toContain(response.status());
  expect(await response.text()).not.toContain('Hub-Paket');
});
