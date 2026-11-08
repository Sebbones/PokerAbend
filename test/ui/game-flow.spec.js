// Eigene Spiel-Specs (V2-Testabdeckung): Hosten, Computer-Mitspieler, ein Zug, Rundenende, Neuladen und Wiederverbinden,
// Englisch ohne deutsche Reste, kein seitliches Überlaufen auf dem Handy.
// Welche Spiele? Immer die sieben Spiele aus ALWAYS und – automatisch – jedes Spiel, das noch keine eigene Spec hat (scripts/games-without-spec.mjs liest
// die Spieleliste aus games/ und sucht in test/ui und games/<spiel>/ui.spec.js). Sobald ein Spiel eine eigene Spec bekommt, fällt es hier heraus.
// Läuft mit: npx playwright test test/ui/game-flow.spec.js   (desktop 1440 × 900 und mobil 390 × 844)
import { test, expect, login, selectGame } from './helpers.js';
import { gamesWithoutSpec } from '../../scripts/games-without-spec.mjs';
import { GAMES } from '../../games/index.js';

const ALWAYS = ['blackjack', 'maexchen', 'schlagfertig', 'schwimmen', 'shutthebox', 'werhatdasgesagt', 'zehntausend'];
const IDS = [...new Set([...ALWAYS, ...gamesWithoutSpec()])].filter((id) => GAMES[id]).sort();

const send = (page, event, data = {}) => page.evaluate(([e, d]) => send(e, d), [event, data]);
const state = (page) => page.evaluate(() => ({ phase: lastState.phase, turn: lastState.turnId, me: lastState.you.id, round: lastState.roundNo, g: lastState.g, players: lastState.players }));
const fitsWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const tryClick = async (page, selector, timeout = 1500) => { const l = page.locator(selector).first(); if (await l.count()) { await l.click({ timeout }).catch(() => {}); return true; } return false; };
const myTurn = (page, ms = 30000) => expect.poll(() => state(page).then((s) => s.turn === s.me || s.phase !== 'playing'), { timeout: ms }).toBe(true);
const write = async (page, text) => { const input = page.locator('#pk-in'); if (await input.count()) { await input.fill(text); await page.locator('form[data-pk] button[type=submit]').click(); await page.waitForTimeout(300); } };
async function loop(page, step, max = 400) {
  for (let i = 0; i < max; i++) { const s = await state(page); if (s.phase !== 'playing') return; await step(s).catch(() => {}); await page.waitForTimeout(150); }
}

// Pro Spiel: Computer-Mitspieler (zusätzlich zum Menschen), Einstellungen, Bühne (CSS-Auswahl) und ein eigener Zug.
// finishWithBots: Spiele, die ohne Mensch am Tisch mit Computern allein bis zum Rundenende laufen (Host schaut zu).
const CONFIG = {
  blackjack: { bots: 2, settings: { turnTime: 0 }, scene: '.bj-table', async act(page) { await tryClick(page, '[data-g=bet]'); await page.waitForTimeout(400); } },
  maexchen: { bots: 2, settings: { turnTime: 0, lives: 1 }, scene: '.mx-table', async act(page) { await myTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(500); await tryClick(page, '[data-g=lift]'); } },
  schlagfertig: { bots: 2, settings: { turnTime: 0, rounds: 1, writeSecs: 20, voteSecs: 20 }, scene: '.pk-q', async act(page) { await write(page, 'A very quick-witted thought'); } },
  schwimmen: { bots: 2, settings: { turnTime: 0, lives: 3 }, scene: '.sw-stage', async act(page) { await myTurn(page); if (!(await tryClick(page, '[data-g=knock]'))) await tryClick(page, '[data-g=pass]'); await page.waitForTimeout(400); } },
  shutthebox: { bots: 1, settings: { turnTime: 0, rounds: 1 }, scene: '.sb-table', async act(page) { await myTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(500); await tryClick(page, '[data-g=flap]:not([disabled])', 3000); } },
  werhatdasgesagt: { bots: 2, settings: { turnTime: 0, rounds: 1, writeSecs: 20, voteSecs: 20 }, scene: '.pk-q', async act(page) { await write(page, 'Pineapple pizza'); } },
  zehntausend: { bots: 2, settings: { turnTime: 0, target: 2000 }, scene: '.zt-stage', async act(page) { await myTurn(page); await tryClick(page, '[data-g=roll]'); await page.waitForTimeout(400); } },
  broeckelboden: { bots: 1, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300); } },
  hex: { bots: 1, settings: { turnTime: 0, size: '9', swap: true }, scene: '.hx-stage', async act(page) { await myTurn(page); await tryClick(page, '.hx-cell:not(.blue):not(.red)'); await page.waitForTimeout(400); } },
  kronenjagd: { bots: 1, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); } },
  'laser-huepfer': { bots: 1, settings: {}, scene: '#rt-canvas', async act(page) { await page.waitForTimeout(800); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); } },
  muehle: { bots: 1, settings: { turnTime: 0 }, scene: '.mu-stage', async act(page) { await myTurn(page); await tryClick(page, '.mu-pt.can'); await page.waitForTimeout(400); } },
  wuerfelduell: { bots: 2, settings: { turnTime: 0, health: 5 }, scene: '.wd-stage', async act(page) { await tryClick(page, '[data-g=wd-attack]'); await page.waitForTimeout(600); } },
};
// Spiele ohne eigene Bedienlogik oben: allgemeiner Ablauf (Host sitzt, Computer dazu, die Bühne ist das Spielelement)
const configFor = (id) => CONFIG[id] || { bots: Math.max((GAMES[id].minPlayers || 2) - 1, 1), settings: { turnTime: 0 }, scene: '[data-scene]', async act(page) { await page.waitForTimeout(500); } };

// Typische deutsche Wörter, die in der englischen Oberfläche nicht vorkommen dürfen (Spiel- und Eigennamen stehen nicht auf der Liste)
const GERMAN = /(?:^|[^A-Za-zÄÖÜäöüß])(und|oder|nicht|noch|bitte|wird|werden|dein|deine|deiner|deinen|dich|euch|zum|zur|für|aus|sind|ist|der|die|das|dem|den|ein|eine|einen|einem|mit|bei|nach|von|über|Spieler|Mitspieler|Runde|Runden|Würfel|Karten?|Zug|dran|gewinnt|Punkte|Weiter|Schließen|Regeln|Neue|Neues|Wähle|Leben|Einsatz|Zuschauer|geworfen|gewürfelt|würfelt|würfeln)(?![A-Za-zÄÖÜäöüß])/;
const germanWords = (text) => { const found = new Set(); for (const line of text.split(/\n+/)) { const m = line.match(GERMAN); if (m) found.add(`${m[1]} ← „${line.trim().slice(0, 60)}“`); } return [...found]; };

const GAP = 'Spieltexte noch teilweise nur auf Deutsch (Stand der Prüfung: siehe Bericht zur Testabdeckung)';
const UNTRANSLATED = new Map(['blackjack', 'broeckelboden', 'hex', 'kronenjagd', 'laser-huepfer', 'maexchen', 'muehle', 'schlagfertig', 'schwimmen', 'shutthebox', 'werhatdasgesagt', 'wuerfelduell', 'zehntausend'].map((id) => [id, GAP]));

test.use({ createLimit: '100' });

for (const id of IDS) {
  const cfg = configFor(id);
  const name = GAMES[id].name;

  test(`${name}: hosten, Bots, Zug, Neuladen, Wiederverbinden, Englisch und Handy-Breite`, async ({ page, app }, info) => {
    test.setTimeout(240000);
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('[data-scene]').first()).toHaveAttribute('data-scene', id);
    expect(await fitsWidth(page), 'Lobby ohne seitliches Überlaufen').toBe(true);

    // Hosten: Platz nehmen, Computer-Mitspieler dazu, Einstellungen, starten
    expect((await send(page, 'sit')).ok).toBe(true);
    for (let i = 0; i < cfg.bots; i++) expect((await send(page, 'addBot')).ok, `Bot ${i + 1}`).toBe(true);
    expect((await send(page, 'settings', cfg.settings)).ok).toBe(true);
    expect((await send(page, 'start')).ok).toBe(true);
    await expect.poll(() => state(page).then((s) => s.phase)).toBe('playing');
    await expect(page.locator(cfg.scene).first()).toBeVisible();
    expect(await fitsWidth(page), 'Spielfeld ohne seitliches Überlaufen').toBe(true);
    const before = await state(page);
    expect(before.players.filter((p) => p.seated).length).toBe(1 + cfg.bots);

    // Ein Zug über die echte Oberfläche
    await cfg.act(page);
    await page.screenshot({ path: info.outputPath(`${id}-nach-dem-zug.png`) });
    expect(await fitsWidth(page), 'nach dem Zug ohne seitliches Überlaufen').toBe(true);

    // Neuladen: dieselbe Person, derselbe Tisch, das Spiel läuft weiter
    await page.reload();
    await expect(page.locator(cfg.scene).first()).toBeVisible();
    const reloaded = await state(page);
    expect(reloaded.me, 'nach dem Neuladen dieselbe Person').toBe(before.me);
    expect(reloaded.round).toBe(before.round);
    expect(['playing', 'over']).toContain(reloaded.phase);
    expect(await fitsWidth(page), 'nach dem Neuladen ohne seitliches Überlaufen').toBe(true);

    // Wiederverbinden: Verbindung kappen und wieder aufbauen – der Tisch kommt zurück, ohne dass der Platz verloren geht
    await page.evaluate(() => { socket.disconnect(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { socket.connect(); });
    await expect.poll(() => page.evaluate(() => socket.connected), { timeout: 15000 }).toBe(true);
    await expect(page.locator(cfg.scene).first()).toBeVisible();
    const back = await state(page);
    expect(back.me).toBe(before.me);
    expect(back.players.filter((p) => p.seated).length, 'alle Plätze bleiben besetzt').toBe(1 + cfg.bots);

    // Englisch: Spielfeld passt weiterhin auf die Breite (die Texte prüft der eigene Test darunter)
    await page.evaluate(() => I18n.select('en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.waitForTimeout(400);
    expect(await fitsWidth(page), 'Englisch ohne seitliches Überlaufen').toBe(true);
    if (info.project.name === 'mobil') {
      const box = await page.locator(cfg.scene).first().boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(391);
    }
  });

  // Bekannte Lücke: Die Spieltexte dieser Spiele sind in der englischen Oberfläche noch teilweise deutsch (Spielfeld, Kurzregeln).
  // test.fail: der Test muss rot sein, solange die Reste da sind – wird ein Spiel übersetzt, schlägt er um und der Eintrag in UNTRANSLATED fliegt raus.
  test(`${name}: Englisch ohne deutsche Reste im Spielfeld und in den Kurzregeln`, async ({ page, app }, info) => {
    test.fail(UNTRANSLATED.has(id), UNTRANSLATED.get(id));
    test.setTimeout(120000);
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('[data-scene]').first()).toHaveAttribute('data-scene', id);
    expect((await send(page, 'sit')).ok).toBe(true);
    for (let i = 0; i < cfg.bots; i++) expect((await send(page, 'addBot')).ok).toBe(true);
    expect((await send(page, 'settings', cfg.settings)).ok).toBe(true);
    expect((await send(page, 'start')).ok).toBe(true);
    await expect(page.locator(cfg.scene).first()).toBeVisible();
    await page.evaluate(() => I18n.select('en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.waitForTimeout(400);
    const stageText = await page.locator('#kg').innerText();
    await page.locator('[data-kit=help]').first().click();
    await expect(page.locator('#help-dlg')).toBeVisible();
    const helpText = await page.locator('#help-dlg').innerText();
    await page.screenshot({ path: info.outputPath(`${id}-englisch.png`) });
    expect(germanWords(stageText), `deutsche Reste im englischen Spielfeld von ${id}`).toEqual([]);
    expect(germanWords(helpText), `deutsche Reste in den englischen Kurzregeln von ${id}`).toEqual([]);
  });

  test(`${name}: Rundenende – Computer spielen allein, der Host schaut zu und sieht das Ergebnis`, async ({ page, app }, info) => {
    test.setTimeout(300000);
    await login(page, app); await selectGame(page, id);
    await page.locator('#host-form button[type=submit]').click();
    await expect(page.locator('[data-scene]').first()).toHaveAttribute('data-scene', id);
    // Der Host sitzt nicht mit am Tisch; die Computer spielen allein
    const need = Math.max(GAMES[id].minPlayers || 2, 2);
    for (let i = 0; i < need; i++) expect((await send(page, 'addBot')).ok, `Bot ${i + 1}`).toBe(true);
    const quick = { turnTime: 0, rounds: 1, lives: 1, health: 3, target: 500, writeSecs: 10, voteSecs: 10, size: '9' };
    const settings = Object.fromEntries(Object.entries(cfg.settings).map(([key, value]) => [key, key in quick ? quick[key] : value]));
    await send(page, 'settings', settings);
    const started = await send(page, 'start');
    expect(started.ok, started.error).toBe(true);
    await expect.poll(() => state(page).then((s) => s.phase), { timeout: 240000, intervals: [1000] }).toBe('over');
    await expect(page.locator('[data-scene]').first()).toBeVisible();
    expect(await fitsWidth(page), 'Ergebnis ohne seitliches Überlaufen').toBe(true);
    const end = await state(page);
    expect(end.players.some((p) => (p.score ?? p.pts ?? 0) !== undefined)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${id}-rundenende.png`) });
    // Nach dem Ende kann der Host eine neue Runde anbieten (Knopf „Neue Runde“ / „Nochmal“ o. ä.) – sonst steht ein Ergebnis da
    const text = await page.locator('#kg').innerText();
    expect(text.length, 'das Ergebnis ist sichtbar').toBeGreaterThan(20);
  });
}
