import { test, expect, login, selectGame } from './helpers.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAMES } from '../../games/index.js';
import {independentPlayer} from './independent-player.js';

test('Englische Anmeldung: Sprachwahl vor dem Login und übersetzter Passwortfehler', async ({ browser, app }, info) => {
  // A wrong password deliberately produces HTTP 401. Verify that response explicitly;
  // the ordinary page fixture correctly treats unexpected HTTP errors as failures.
  const context = await browser.newContext({ viewport: info.project.use.viewport });
  const page = await context.newPage(), scriptErrors = [], consoleErrors = [], rejected = [];
  page.on('pageerror', (e) => scriptErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) rejected.push({ path: new URL(r.url()).pathname, method: r.request().method(), status: r.status() }); });
  try {
    await page.goto(app.url + '/login?next=%2F%23spiele');
    await page.locator('#login-language select').selectOption('en');
    await page.getByLabel('Password', { exact: true }).fill('incorrect-test-password');
    const response = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/login');
    await page.getByRole('button', { name: 'Enter', exact: true }).click();
    expect((await response).status()).toBe(401);
    await expect(page.locator('.error')).toHaveText('Incorrect password.');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('input[name=next]')).toHaveValue('/#spiele');
    await page.goto(app.url + '/login');
    await expect(page.locator('#login-language select')).toHaveValue('en');
    expect(scriptErrors).toEqual([]);
    expect(rejected).toEqual([{ path: '/login', method: 'POST', status: 401 }]);
    expect(consoleErrors).toEqual(['Failed to load resource: the server responded with a status of 401 (Unauthorized)']);
  } finally { await context.close(); }
});

test('Sprache: umschalten, englisch suchen, Namen erhalten und Auswahl nach Neuladen merken', async ({ page, app }, info) => {
  await login(page, app, 'Spiele');
  await page.locator('#hub-language select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Game library', exact: true })).toBeVisible();
  await expect(page.locator('.welcome p')).toContainText('Welcome, Spiele.');
  await page.locator('[data-create-table]:visible').first().click();
  await page.locator('#picker-search').fill('Battleships');
  await expect(page.locator('#picker-games [data-host="schiffe"]')).toBeVisible();
  await page.locator('#host-dlg [data-host-close]').click();
  await page.evaluate(() => { location.hash = '#spiele'; });
  await page.getByRole('searchbox', { name: 'Search games', exact: true }).fill('Battleships');
  await expect(page.locator('#games-body [data-host="schiffe"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('#hub-language select')).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#profile-avatar')).toContainText('Spiele');
  await page.evaluate(() => { location.hash = '#start'; });
  const out = resolve('artifacts/language'); mkdirSync(out, { recursive: true });
  await page.screenshot({ path: resolve(out, `english-home-${info.project.name}.png`), fullPage: true });
  await page.locator('#hub-language select').selectOption('de');
  await expect(page.getByRole('heading', { name: 'Spielebibliothek', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#hub-language select')).toHaveValue('de');
});

test('Zwei Sprachen an einem Tisch: gemeinsame Frage, Pause, Entwurf und englische Zahleneingabe', async ({ page, app, browser }, info) => {
  await login(page, app, 'Spiele');
  await selectGame(page, 'schaetzmeister');
  await page.locator('#host-form button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => lastState?.game)).toBe('schaetzmeister');
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  const code = await page.evaluate(() => lastState.code);
  const context = await browser.newContext({ viewport: page.viewportSize() });
  try {
    const guest = await context.newPage(); await login(guest, app, 'Regeln');
    await guest.evaluate((code) => joinAndEnter(code, 'sit'), code);
    expect((await page.evaluate(() => send('start'))).ok).toBe(true);
    expect((await page.evaluate(() => send('gamePause', { paused: true }))).ok).toBe(true);
    await expect(page.locator('#game-pause-banner')).toBeVisible();
    const initial = await page.evaluate(() => ({ question: lastState.g.question, en: lastState.g.questionEn, round: lastState.roundNo, now: lastState.now }));
    await page.locator('[data-kit-panel="me"]').click();
    await page.locator('#kg-panel [data-language]').selectOption('en');
    await expect(page.locator('.pk-q h2')).toHaveText(initial.en);
    await expect(guest.locator('.pk-q h2')).toHaveText(initial.question);
    await expect(guest.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('#game-pause-banner')).toContainText('Game paused');
    expect(await page.evaluate(() => lastState.now)).toBe(initial.now);
    await expect(page.locator('#kg-players')).toContainText('Regeln');
    await page.locator('.panel-head [data-kit="close"]').click();
    expect((await page.evaluate(() => send('gamePause', { paused: false }))).ok).toBe(true);
    await page.locator('#pk-in').fill('1,234.5');
    await page.locator('[data-kit-panel="me"]').click();
    await page.locator('#kg-panel [data-language]').selectOption('de');
    await expect(page.locator('#pk-in')).toHaveValue('1234,5');
    await page.locator('#kg-panel [data-language]').selectOption('en');
    await expect(page.locator('#pk-in')).toHaveValue('1234.5');
    await page.locator('.panel-head [data-kit="close"]').click();
    await page.locator('.pk-send').click();
    await expect.poll(() => page.evaluate(() => lastState.g.mine)).toBe(1234.5);
    expect(await page.evaluate(() => lastState.roundNo)).toBe(initial.round);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.pk-q h2')).toHaveText(initial.en);
    await expect.poll(() => page.evaluate(() => lastState.you.name)).toBe('Spiele');
    const out = resolve('artifacts/language'); mkdirSync(out, { recursive: true });
    await page.screenshot({ path: resolve(out, `english-party-${info.project.name}.png`), fullPage: true });
  } finally { await context.close(); }
});

test('Live-Sprachwechsel erhält den lokalen Rezeptfortschritt eines Solo-Spiels', async ({ page, app }) => {
  await login(page, app);
  await selectGame(page, 'gedaechtnis-kueche');
  await page.locator('#host-form button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => lastState?.game)).toBe('gedaechtnis-kueche');
  expect((await page.evaluate(() => send('sit'))).ok).toBe(true);
  expect((await page.evaluate(() => send('addBot'))).ok).toBe(true);
  expect((await page.evaluate(() => send('start'))).ok).toBe(true);
  await expect(page.locator('.gk-recall')).toBeVisible();
  const snapshot = await page.evaluate(async () => {
    const logic = await import('/games/gedaechtnis-kueche/logic.js');
    const g = lastState.g;
    const round = logic.makeRound(g.seed, g.level, { ...g.options, playMs: g.playMs });
    return { first: round.expected[0], seed: g.seed, round: lastState.roundNo };
  });
  await page.locator(`[data-g="gk-tap"][data-i="${snapshot.first}"]`).click();
  await expect(page.locator('.gk-taps .on')).toHaveCount(1);
  expect((await page.evaluate(() => send('gamePause', { paused: true }))).ok).toBe(true);
  await page.locator('[data-kit-panel="me"]').click();
  await page.locator('#kg-panel [data-language]').selectOption('en');
  await expect(page.locator('.gk-taps .on')).toHaveCount(1);
  await page.locator('#kg-panel [data-language]').selectOption('de');
  await expect(page.locator('.gk-taps .on')).toHaveCount(1);
  expect(await page.evaluate(() => ({ seed: lastState.g.seed, round: lastState.roundNo }))).toEqual({ seed: snapshot.seed, round: snapshot.round });
});

for (let offset = 0; offset < Object.keys(GAMES).length; offset += 5) test(`English game surfaces, group ${1 + offset / 5}`, async ({ page, app }) => {
  test.setTimeout(90000);
  await login(page, app);
  await page.locator('#hub-language select').selectOption('en');
  const games = await page.evaluate(() => account.games.map(({ id, minPlayers }) => ({ id, minPlayers })));
  let opened = false;const guests=[];
  try{for (const { id, minPlayers } of games.slice(offset, offset + 5)) {
    const reply = await page.evaluate((game) => new Promise((resolve) => socket.emit('create', { game, name: profile.name, avatar: profile.avatar }, resolve)), id);
    expect(reply.ok, id).toBe(true);
    // The next module is mounted through a full reload. Wait for that navigation
    // before testing its DOM instead of racing the previous page under load.
    await Promise.all([
      opened ? page.waitForEvent('load') : Promise.resolve(),
      page.evaluate((reply) => enterGame(reply), reply),
    ]);
    opened = true;
    const poker = id === 'poker' || id === 'omaha';
    await expect(page.locator(poker ? '#game' : '#kg')).toBeVisible();
    expect((await page.evaluate(()=>send('sit',{seat:0}))).ok,id).toBe(true);
    for(let i=1;i<minPlayers;i++)guests.push(await independentPlayer(app,reply.code,'Guest '+i,i));
    const started=await page.evaluate(()=>send('start'));
    expect(started.ok, id + ': ' + started.error).toBe(true);
    await expect(page.locator(poker ? '#dock' : '#kg-dock')).toBeVisible();
    await page.locator(poker ? '[data-panel="me"]' : '[data-kit-panel="me"]').click();
    await expect(page.locator(poker ? '#panel [data-language]' : '#kg-panel [data-language]')).toHaveValue('en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), id).toBe(true);
    const closed = await page.evaluate(() => send('closeTable'));
    expect(closed.ok, id).toBe(true);
    await expect(page.locator('#hub')).toBeVisible();
  }
  // The hub background is requested again after the last table is closed. Finish
  // that request before the isolated test server is stopped by the app fixture.
  await page.waitForLoadState('networkidle');
  }finally{for(const guest of guests)await guest.close();}
});
