// V2-06: Konto-Seiten (Profil, Einstellungen, Bestenliste, Erfolge, Admin) im bestehenden Liquid-Glass-Design.
// Prüft ohne Logikänderung: gemeinsame Tokens, kein Überlaufen, Kontrast nach WCAG AA, reduzierte Bewegung, beide Tischthemen.
// Screenshots: V206_CAPTURE=before|after → docs/design/screenshots/v2-06/<label>/ (JPEG, desktop + mobil).
import { test, expect, login } from './helpers.js';
import { mkdirSync } from 'node:fs';

const A = 'a'.repeat(32), B = 'b'.repeat(32), D = 'd'.repeat(32);
const NOW = Date.now(), month = new Date(NOW).toISOString().slice(0, 7);
const stat = (played, wins) => ({ played, wins, points: 0, months: { [month]: { played, wins, points: 0 } } });
const pl = (a, n, win, pts, place) => ({ a, n, bot: false, win, pts, place });
const account = (id, gameId, name, extra = {}) => ({ id, gameId, createdAt: NOW, lastSeen: NOW, name, avatar: '🦊', mergedInto: null, discord: null, ...extra });
const files = {
  'secret.key': 'ui-test-secret-profile',
  'accounts.json': { schemaVersion: 1, accounts: { [A]: account(A, '#AAAA', 'Anna', { discord: { name: 'AnnaDiscord' }, privacy: { showDiscord: true } }), [B]: account(B, '#BBBB', 'Ben'), [D]: account(D, '#DDDD', 'Dora', { discord: { name: 'DoraDiscord' } }) }, externals: { 'discord:1': A, 'discord:4': D }, audit: [] },
  'leaderboard.json': {
    schemaVersion: 3,
    players: { [A]: { name: 'Anna', accountId: A, games: { maumau: stat(6, 4), hearts: stat(2, 1) } }, [D]: { name: 'Dora', accountId: D, games: { maumau: stat(3, 1) } } },
    rounds: {
      '1000000000000001': { id: '1000000000000001', game: 'maumau', variant: 'classic', at: NOW - 3000, ranked: true, reason: '', players: [pl(A, 'Anna', true, 0, 1), pl(D, 'Dora', false, 5, 2)] },
      '1000000000000002': { id: '1000000000000002', game: 'maumau', variant: 'classic', at: NOW - 2000, ranked: true, reason: '', players: [pl(D, 'Dora', true, 0, 1), pl(A, 'Anna', false, 7, 2)] },
    },
  },
};
test.use({ seedFiles: files, createLimit: '100', adminPassword: 'Admin-UI-Test' });

const label = process.env.V206_CAPTURE;
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

// Kontrast: Vordergrund gegen den tatsächlich dahinterliegenden Hintergrund (halbtransparente Flächen werden übereinandergelegt)
const contrastReport = (page, scopeSelector) => page.evaluate((scope) => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); return a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const base = { r: 23, g: 32, b: 27, a: 1 }; // dunkler Raumton unter allen Flächen (Hub-Hintergrund ist ein Foto mit Abdunklung)
  const bgOf = (el) => { const chain = []; for (let n = el; n; n = n.parentElement) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg.a > 0) chain.push(bg); if (bg && bg.a === 1) break; } return chain.reverse().reduce((acc, c) => over(c, acc), base); };
  const root = document.querySelector(scope) || document.body, seen = [], bad = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.nodeValue.trim()) continue;
    const el = t.parentElement; if (!el || seen.includes(el)) continue; seen.push(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    let opacity = 1; for (let n = el; n && n !== document.body; n = n.parentElement) opacity *= +getComputedStyle(n).opacity;
    const bg = bgOf(el), fgRaw = parse(cs.color); if (!fgRaw) continue;
    const fg = over({ ...fgRaw, a: fgRaw.a * opacity }, bg), size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5, got = ratio(fg, bg);
    if (got < need) bad.push({ text: t.nodeValue.trim().slice(0, 40), cls: el.className?.toString().slice(0, 40) || el.tagName, got: +got.toFixed(2), need });
  }
  return { checked: seen.length, bad };
}, scopeSelector);

const motionReport = (page, scope) => page.evaluate((s) => [...(document.querySelector(s) || document.body).querySelectorAll('*')].filter((el) => {
  const cs = getComputedStyle(el), secs = (v) => Math.max(0, ...v.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 0.001 : 1)));
  return secs(cs.animationDuration) > 0.011 && cs.animationName !== 'none' || secs(cs.transitionDuration) > 0.011;
}).map((el) => el.className?.toString().slice(0, 40) || el.tagName).slice(0, 12), scope);

async function shot(page, info, name) {
  if (!label) return;
  const dir = `docs/design/screenshots/v2-06/${label}`; mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: `${dir}/${info.project.name}-${name}.jpg`, fullPage: true, type: 'jpeg', quality: 72 });
}
async function openPage(page, hash, ready) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await expect(page.locator(ready).first()).toBeVisible();
  await page.waitForTimeout(250);
}

const VIEWS = [
  ['bestenliste', '#bestenliste', '#board-body', '#hub-main'],
  ['erfolge', '#erfolge', '.achievement-card', '#hub-main'],
  ['einstellungen', '#einstellungen', '.set-page', '#hub-main'],
];

for (const theme of ['classic', 'night']) {
  test(`Konto-Seiten (${theme}): gleiche Tokens, kein Überlaufen, WCAG-AA-Kontrast, reduzierte Bewegung`, async ({ page, app }, info) => {
    test.setTimeout(120000);
    await login(page, app, 'Viewer');
    await page.evaluate((t) => { const p = JSON.parse(localStorage.getItem('poker:prefs') || '{}'); localStorage.setItem('poker:prefs', JSON.stringify({ ...p, theme: t })); }, theme);
    await page.reload();
    const report = {};
    for (const [name, hash, ready, scope] of VIEWS) {
      await openPage(page, hash, ready);
      expect(await overflow(page), `${name}: kein seitliches Überlaufen`).toBe(true);
      if (theme === 'classic') await shot(page, info, name);
      report[name] = await contrastReport(page, scope);
    }
    // Profil-Dialog mit echten Zahlen
    await openPage(page, '#bestenliste', '#board-body');
    await page.locator('#lbp-game').selectOption('maumau');
    await page.locator('.lb-table [data-profile="#AAAA"]').click();
    await expect(page.locator('#player-profile-dlg')).toBeVisible();
    await page.waitForTimeout(200);
    const fits = await page.locator('#player-profile-dlg').evaluate((el) => { const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 1 && b.top >= 0 && b.bottom <= innerHeight + 1; });
    expect(fits, 'Profil-Dialog passt in den Bildschirm').toBe(true);
    if (theme === 'classic') await shot(page, info, 'profil');
    report.profil = await contrastReport(page, '#player-profile-dlg');
    await page.keyboard.press('Escape');
    const bad = Object.entries(report).flatMap(([view, r]) => r.bad.map((b) => ({ view, ...b })));
    test.info().annotations.push({ type: 'kontrast', description: `${theme}: ${Object.entries(report).map(([k, r]) => `${k} ${r.checked}`).join(', ')}; ${bad.length} unter AA` });
    expect(bad, `Kontrast unter WCAG AA (${theme})`).toEqual([]);

    // Reduzierte Bewegung: keine laufenden Animationen oder Übergänge in den Konto-Seiten
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [name, hash, ready, scope] of VIEWS) {
      await openPage(page, hash, ready);
      expect(await motionReport(page, scope), `${name}: Bewegung trotz „reduzierte Bewegung“`).toEqual([]);
    }
  });
}

test('Admin-Seite: gleiche Farben, Abstände und Schrift wie der Hub, Kontrast und kein Überlaufen', async ({ app, browser }, info) => {
  // eigener Kontext: der Anmelde-Versuch ohne Admin-Sitzung liefert erwartbare 401-Antworten
  const context = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  try {
    const page = await context.newPage();
    await login(page, app, 'Anna');
    await page.goto(app.url + '/admin');
    await expect(page.locator('#login')).toBeVisible();
    await shot(page, info, 'admin-login');
    await page.locator('#pw').fill('Admin-UI-Test');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page.locator('#app')).toBeVisible();
    await page.waitForTimeout(300);
    expect(await overflow(page)).toBe(true);
    await shot(page, info, 'admin');
    const report = await contrastReport(page, 'body');
    expect(report.bad, 'Kontrast unter WCAG AA (Admin)').toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await motionReport(page, 'body')).toEqual([]);
    // Gemeinsame Schrift, Rundungen und Flächenfarbe wie im Hub (Tokens, keine eigene Palette)
    const look = await page.evaluate(() => ({ font: getComputedStyle(document.body).fontFamily, radius: getComputedStyle(document.querySelector('section')).borderRadius, panel: getComputedStyle(document.querySelector('section')).backgroundColor, edge: getComputedStyle(document.querySelector('section')).borderTopColor }));
    expect(look.font).toMatch(/Bricolage/);
    expect(parseFloat(look.radius)).toBeGreaterThanOrEqual(16);
    expect(look.edge).not.toBe('rgb(44, 64, 57)'); // nicht mehr die alte eigene Linienfarbe
  } finally { await context.close(); }
});

test('Konto-Seiten: Tastaturfokus ist sichtbar (Einstellungen, Bestenliste, Profil)', async ({ page, app }) => {
  await login(page, app, 'Viewer');
  await openPage(page, '#einstellungen', '.set-page');
  const el = page.locator('.set-page button, .set-page select, .set-page input').first();
  await el.focus();
  const ring = await el.evaluate((n) => { const cs = getComputedStyle(n); return { w: parseFloat(cs.outlineWidth), s: cs.outlineStyle, shadow: cs.boxShadow }; });
  expect(ring.s !== 'none' && ring.w >= 2 || ring.shadow !== 'none', 'sichtbarer Fokusring').toBe(true);
});
