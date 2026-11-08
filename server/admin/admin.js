'use strict';
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let timer = null;

async function call(path, method = 'GET', body = null) {
  const res = await fetch('/admin/api' + path, {
    method, credentials: 'same-origin',
    headers: { 'X-Requested-With': 'spieleabend', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') { showLogin(); throw new Error(data.error || 'Nicht angemeldet'); }
  if (!res.ok) throw new Error(data.error || 'Das hat nicht geklappt');
  return data;
}
function confirmDialog(title, text, ok = 'Bestätigen') {
  return new Promise((resolve) => {
    const d = $('#confirm');
    $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm-ok').textContent = ok;
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.returnValue = 'cancel'; d.showModal();
  });
}
const say = (text, bad = false) => { const m = $('#msg'); m.textContent = text; m.className = bad ? 'bad' : 'good'; };
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
const size = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : mb(n));
const dur = (ms) => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 1 ? 'unter 1 Min.' : m < 60 ? m + ' Min.' : Math.floor(m / 60) + ' Std. ' + (m % 60) + ' Min.'; };
const time = (at) => new Date(at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' });
const uptime = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return (d ? d + ' T ' : '') + h + ' Std. ' + m + ' Min.'; };

function render(s) {
  $('#version').textContent = `Version ${s.version}${s.commit ? ' · ' + s.commit.slice(0, 7) : ''}`;
  $('#system').innerHTML = [
    ['Laufzeit', uptime(s.system.uptimeSec)], ['Speicher (RSS)', mb(s.system.memory.rss)], ['Heap', `${mb(s.system.memory.heapUsed)} / ${mb(s.system.memory.heapTotal)}`],
    ['CPU (letzte Messung)', s.system.cpuPercent + ' %'], ['Verbindungen online', s.online.connections], ['Spieler an Tischen (online)', s.online.players], ['Offene Räume', s.rooms.length], ['Node', s.system.node],
  ].map(([k, v]) => `<div class="stat"><span class="muted">${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  const u = s.update;
  $('#update').innerHTML = u
    ? `<p><b class="bad">Update angekündigt</b> – ${u.due ? 'fällig, wartet auf laufende Runden' : 'in ' + dur(u.leftMs)}.</p><p class="muted">Neue Runden starten nicht mehr; laufende dürfen fertig werden. Danach speichert und beendet der Server.</p><button class="ghost" type="button" data-cancel-update>Ankündigung zurücknehmen</button>`
    : `<p class="muted">Zeigt allen ein Banner. Neue Runden starten nicht mehr, laufende dürfen fertig werden, danach speichert und beendet der Server.</p><form id="update-form" class="row"><input type="number" name="minutes" min="1" max="${s.maxUpdateMinutes}" value="5" required aria-label="Minuten"><span class="muted">Minuten</span><button type="submit">Update ankündigen</button></form>`;
  $('#rooms').innerHTML = s.rooms.length ? `<table><thead><tr><th>Code</th><th>Spiel</th><th>Spieler</th><th>Laufzeit</th><th>Letzte Aktivität</th><th>Status</th><th></th></tr></thead><tbody>${s.rooms.map((r) => `<tr>
    <td><b>${esc(r.code)}</b></td><td>${esc(r.gameName)}${r.private ? ' <span class="muted">(privat)</span>' : ''}</td>
    <td>${r.humans} (${r.online} online)${r.bots ? ' · ' + r.bots + ' Bot' : ''}<br><span class="muted">${esc(r.names.join(', '))}</span></td>
    <td>${dur(s.now - r.openedAt)}</td><td>vor ${dur(s.now - r.lastActivity)}</td><td>${r.busy ? 'Runde läuft' : 'wartet'}${r.paused ? ' · pausiert' : ''}</td>
    <td><button class="danger" type="button" data-close="${esc(r.code)}" data-label="${esc(r.gameName)}">Schließen</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine offenen Räume.</p>';
  $('#files').innerHTML = s.data.files.map((f) => `<div class="stat"><span>${esc(f.name)}</span><b>${size(f.size)}</b></div>`).join('') + `<div class="stat"><span class="muted">Gesamt</span><b>${size(s.data.total)}</b></div>`;
  $('#claims').innerHTML = s.claims.length ? `<table><thead><tr><th>Alter Name</th><th>Übernommen von</th><th>Wann</th><th></th></tr></thead><tbody>${s.claims.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.gameId || '?')} <span class="muted">${esc(c.by)}</span></td><td class="muted">${esc(time(c.claimedAt))}</td><td><button class="danger" type="button" data-undo-claim="${esc(c.key)}" data-label="${esc(c.name)}">Rückgängig</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Noch hat niemand alte Statistiken übernommen.</p>';
  $('#errors').innerHTML = s.errors.length ? `<table><thead><tr><th>Meldung</th><th>Spiel</th><th>Anzahl</th><th>Zuletzt</th></tr></thead><tbody>${s.errors.map((e) => `<tr><td>${esc(e.message)}</td><td>${esc(e.game)}</td><td>${e.count}</td><td>${esc(time(e.last))}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Fehler gemeldet.</p>';
  $('#log').innerHTML = s.log.length ? `<table><tbody>${s.log.map((l) => `<tr><td class="muted">${esc(time(l.at))}</td><td>${esc(l.action)}</td><td class="muted">${esc(l.detail)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Noch keine Einträge.</p>';
}
const bad = (e) => say(e.message, true);
const fmtDay = (at) => (at ? new Date(at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const tag = (gid) => (gid ? ` <span class="muted">${esc(gid)}</span>` : '');
async function loadReviews() {
  const { items } = await call('/reviews');
  $('#reviews').innerHTML = items.length ? `<table><thead><tr><th>Abend</th><th>Spieler</th><th>Stationen</th><th>Sieger</th><th>Stand</th><th></th></tr></thead><tbody>${items.map((r) => `<tr><td><b>${esc(r.name)}</b>${r.private ? ' <span class="muted">(privat)</span>' : ''}${r.hidden ? ' <span class="bad">(ausgeblendet)</span>' : ''}<br><span class="muted">${esc(fmtDay(r.endedAt || r.updatedAt))}</span></td>
    <td>${r.players.map((p) => esc(p.name) + tag(p.gameId)).join(', ')}</td><td>${r.completed}/${r.planned}<br><span class="muted">${esc(r.games.join(', '))}</span></td><td>${esc(r.winners.join(', ') || '–')}</td><td>${esc(r.status)}</td>
    <td><button class="${r.hidden ? 'ghost' : 'danger'}" type="button" data-hide-review="${esc(r.id)}" data-hidden="${r.hidden ? 0 : 1}" data-label="${esc(r.name)}">${r.hidden ? 'Einblenden' : 'Ausblenden'}</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Noch keine Rückblicke.</p>';
}
async function loadBoard() {
  const f = new FormData($('#board-form')), game = String(f.get('game') || '').trim() || 'all', period = String(f.get('period') || 'all'), hidden = f.get('hidden') ? '1' : '0';
  const [b, r] = await Promise.all([call(`/leaderboard?game=${encodeURIComponent(game)}&period=${encodeURIComponent(period)}`), call(`/rounds?game=${encodeURIComponent(game)}&hidden=${hidden}&limit=50`)]);
  $('#board').innerHTML = b.rows.length ? `<table><thead><tr><th>#</th><th>Spieler</th><th>Partien</th><th>Siege</th><th>Ø Platz</th><th>Punkte</th></tr></thead><tbody>${b.rows.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}${tag(x.gameId)}</td><td>${x.played}</td><td>${x.wins}</td><td>${x.avgPlace}</td><td>${x.points ?? '–'}</td></tr>`).join('')}</tbody></table><p class="muted">Gewertet: ${b.summary.ranked} · nicht gewertet: ${b.summary.notRanked}</p>` : '<p class="muted">Keine gewerteten Partien.</p>';
  $('#rounds').innerHTML = r.items.length ? `<table><thead><tr><th>Wann</th><th>Spiel</th><th>Ergebnis</th><th>Wertung</th><th></th></tr></thead><tbody>${r.items.map((x) => `<tr><td class="muted">${esc(fmtDay(x.at))}</td><td>${esc(x.game)}</td>
    <td>${x.players.map((p) => `${p.place}. ${esc(p.name)}${p.bot ? ' (Bot)' : ''}${tag(p.gameId)}`).join('<br>')}</td><td>${x.hidden ? '<span class="bad">ausgeblendet</span>' : x.ranked ? 'gewertet' : '<span class="muted">nicht gewertet</span>'}</td>
    <td><button class="${x.hidden ? 'ghost' : 'danger'}" type="button" data-hide-round="${esc(x.id)}" data-hidden="${x.hidden ? 0 : 1}" data-label="${esc(x.game)}">${x.hidden ? 'Einblenden' : 'Ausblenden'}</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Partien.</p>';
}
async function loadPlayers() {
  const { items } = await call('/players?q=' + encodeURIComponent(String(new FormData($('#player-search')).get('q') || '')));
  $('#players').innerHTML = items.length ? `<table><thead><tr><th>Game-ID</th><th>Name</th><th>Zuletzt gesehen</th><th>Discord</th></tr></thead><tbody>${items.map((p) => `<tr><td><b>${esc(p.gameId)}</b></td><td>${esc(p.avatar)} ${esc(p.name || '–')}</td><td class="muted">${esc(fmtDay(p.lastSeen))}</td><td>${p.registered ? 'ja' : 'nein'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Konten gefunden.</p>';
}
async function loadTickets() {
  const f = new FormData($('#ticket-filter')), data = await call(`/tickets?q=${encodeURIComponent(String(f.get('q') || ''))}&status=${encodeURIComponent(String(f.get('status') || ''))}`);
  const sel = $('#ticket-filter [name=status]'); if (sel.options.length === 1) for (const [k, v] of Object.entries(data.statuses)) sel.add(new Option(v, k));
  $('#tickets').innerHTML = data.tickets.length ? `<table><thead><tr><th>#</th><th>Ticket</th><th>Von</th><th>Status</th><th></th></tr></thead><tbody>${data.tickets.map((t) => `<tr data-ticket="${t.id}" data-revision="${t.revision}"><td>${t.id}</td><td><b>${esc(t.title)}</b><br><span class="muted">${esc(t.excerpt)}</span><br><span class="muted">${t.votes} Stimmen · ${t.commentCount} Kommentare</span></td>
    <td>${esc(t.author.name)}${tag(t.author.gameId)}</td><td><select aria-label="Status #${t.id}">${Object.entries(data.statuses).map(([k, v]) => `<option value="${k}"${k === t.status ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></td>
    <td class="row"><button type="button" data-ticket-save="${t.id}">Speichern</button><button class="ghost" type="button" data-ticket-comment="${t.id}">Kommentieren</button><button class="danger" type="button" data-ticket-delete="${t.id}" data-label="${esc(t.title)}">Löschen</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Tickets.</p>';
}
const SOURCE = { admin: 'Admin-Einstellung', env: '.env', standard: 'Standard' };
let featureState = null;
function renderFeatures() {
  if (!featureState) return;
  $('#feature-flags').innerHTML = `<table><thead><tr><th>Funktion</th><th>Zustand</th><th>Quelle</th><th></th></tr></thead><tbody>${featureState.flags.map((f) => `<tr><td><b>${esc(f.label)}</b><br><span class="muted">${esc(f.hint)}</span></td>
    <td><b class="${f.value ? 'good' : 'bad'}">${f.value ? 'an' : 'aus'}</b></td><td>${esc(SOURCE[f.source])}${f.source === 'admin' ? `<br><span class="muted">sonst: ${f.baseline ? 'an' : 'aus'}</span>` : ''}</td>
    <td class="row"><button class="${f.value ? 'danger' : ''}" type="button" data-flag="${esc(f.name)}" data-value="${f.value ? 0 : 1}" data-label="${esc(f.label)}">${f.value ? 'Ausschalten' : 'Einschalten'}</button>${f.source === 'admin' ? `<button class="ghost" type="button" data-flag="${esc(f.name)}" data-value="reset" data-label="${esc(f.label)}">Zurücksetzen</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
  const q = $('#feature-filter').value.trim().toLowerCase(), offOnly = $('#feature-off-only').checked;
  const games = featureState.games.filter((g) => (!q || g.id.includes(q)) && (!offOnly || !g.enabled));
  $('#feature-games').innerHTML = games.length ? `<table><thead><tr><th>Spiel</th><th>Zustand</th><th>Quelle</th><th></th></tr></thead><tbody>${games.map((g) => `<tr><td><code>${esc(g.id)}</code></td><td><b class="${g.enabled ? 'good' : 'bad'}">${g.enabled ? 'an' : 'aus'}</b></td><td>${esc(SOURCE[g.source])}</td>
    <td class="row"><button class="${g.enabled ? 'danger' : ''}" type="button" data-game="${esc(g.id)}" data-value="${g.enabled ? 0 : 1}">${g.enabled ? 'Ausschalten' : 'Einschalten'}</button>${g.source === 'admin' ? `<button class="ghost" type="button" data-game="${esc(g.id)}" data-value="reset">Zurücksetzen</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Treffer.</p>';
}
async function loadFeatures() { featureState = await call('/features'); renderFeatures(); }
$('#feature-filter').addEventListener('input', renderFeatures);
$('#feature-off-only').addEventListener('change', renderFeatures);
$('#mod-features').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-flag],button[data-game]'); if (!b) return;
  const value = b.dataset.value === 'reset' ? null : b.dataset.value === '1';
  const what = b.dataset.flag ? `${b.dataset.label}` : `Spiel ${b.dataset.game}`;
  if (value === false && b.dataset.flag && !await confirmDialog(`${what} ausschalten?`, 'Die Funktion ist danach für alle sofort weg. Daten bleiben erhalten.', 'Ausschalten')) return;
  try { featureState = await call(b.dataset.flag ? `/features/${encodeURIComponent(b.dataset.flag)}` : `/features/games/${encodeURIComponent(b.dataset.game)}`, 'POST', { value }); renderFeatures(); say(`${what}: ${value === null ? 'zurückgesetzt' : value ? 'eingeschaltet' : 'ausgeschaltet'}`); load(); } catch (err) { bad(err); }
});
async function loadTools() { await Promise.all([loadReviews(), loadBoard(), loadPlayers(), loadTickets(), loadFeatures()].map((p) => p.catch(bad))); }
async function load() {
  try { const s = await call('/status'); $('#login').hidden = true; $('#app').hidden = false; render(s); }
  catch (e) { if (!$('#app').hidden) say(e.message, true); }
}
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; clearInterval(timer); timer = null; }
function start() { clearInterval(timer); timer = setInterval(load, 5000); load(); loadTools(); }

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await call('/login', 'POST', { password: $('#pw').value }); $('#pw').value = ''; $('#login-error').textContent = ''; start(); }
  catch (err) { $('#login-error').textContent = err.message; }
});
$('#logout').addEventListener('click', async () => { await call('/logout', 'POST', {}).catch(() => {}); showLogin(); });
$('#refresh').addEventListener('click', () => { load(); loadTools(); });
for (const [id, fn] of [['#board-form', loadBoard], ['#player-search', loadPlayers], ['#ticket-filter', loadTickets]]) $(id).addEventListener('submit', (e) => { e.preventDefault(); fn().catch(bad); });
$('#merge-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target), from = String(f.get('from') || '').trim().toUpperCase(), to = String(f.get('to') || '').trim().toUpperCase();
  if (!await confirmDialog('Spieler zusammenführen?', `Alles von ${from} gehört danach ${to}. Das Konto ${from} wird nicht mehr als eigene Person geführt.`, 'Zusammenführen')) return;
  try { await call('/players/merge', 'POST', { from, to }); say(`${from} wurde mit ${to} zusammengeführt`); e.target.reset(); } catch (err) { bad(err); }
  load(); loadTools();
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'update-form') return;
  e.preventDefault();
  const minutes = Number(new FormData(e.target).get('minutes'));
  if (!await confirmDialog('Update ankündigen?', `Alle sehen sofort „Update in ${minutes} Minuten“. Neue Runden starten nicht mehr. Danach beendet sich der Server.`, 'Ankündigen')) return;
  try { await call('/update', 'POST', { minutes }); say('Update angekündigt'); } catch (err) { say(err.message, true); }
  load();
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.close) {
    if (!await confirmDialog('Raum schließen?', `Raum ${b.dataset.close} (${b.dataset.label}) wird sofort geschlossen. Alle Spieler landen auf der Startseite.`, 'Raum schließen')) return;
    try { await call(`/rooms/${encodeURIComponent(b.dataset.close)}/close`, 'POST', {}); say(`Raum ${b.dataset.close} geschlossen`); } catch (err) { say(err.message, true); }
    load();
  } else if (b.dataset.undoClaim) {
    if (!await confirmDialog('Zuordnung rückgängig machen?', `Die alte Statistik „${b.dataset.label}“ gehört danach wieder niemandem und kann neu übernommen werden. Gespielte Partien gehen nicht verloren.`, 'Rückgängig')) return;
    try { await call('/identity/claims/undo', 'POST', { key: b.dataset.undoClaim }); say('Zuordnung rückgängig gemacht'); } catch (err) { say(err.message, true); }
    load();
  } else if (b.dataset.hideReview || b.dataset.hideRound) {
    const hide = b.dataset.hidden === '1', review = !!b.dataset.hideReview, id = b.dataset.hideReview || b.dataset.hideRound;
    if (hide && !await confirmDialog(review ? 'Rückblick ausblenden?' : 'Partie ausblenden?', review ? `„${b.dataset.label}“ verschwindet aus dem öffentlichen Archiv. Die Daten bleiben gespeichert.` : `Diese Partie (${b.dataset.label}) zählt danach in keiner Wertung mehr. Die Daten bleiben gespeichert.`, 'Ausblenden')) return;
    try { await call(`/${review ? 'reviews' : 'rounds'}/${encodeURIComponent(id)}/hide`, 'POST', { hidden: hide }); say(hide ? 'Ausgeblendet' : 'Eingeblendet'); } catch (err) { bad(err); }
    loadTools();
  } else if (b.dataset.ticketSave) {
    const row = b.closest('tr');
    try { await call('/tickets/' + b.dataset.ticketSave, 'PATCH', { status: row.querySelector('select').value, revision: Number(row.dataset.revision) }); say('Ticket gespeichert'); } catch (err) { bad(err); }
    loadTickets().catch(bad);
  } else if (b.dataset.ticketComment) {
    const text = prompt('Kommentar der Verwaltung (öffentlich sichtbar):');
    if (!text) return;
    try { await call(`/tickets/${b.dataset.ticketComment}/comments`, 'POST', { text }); say('Kommentar gespeichert'); } catch (err) { bad(err); }
    loadTickets().catch(bad);
  } else if (b.dataset.ticketDelete) {
    if (!await confirmDialog('Ticket löschen?', `„${b.dataset.label}“ wird samt Kommentaren endgültig gelöscht.`, 'Löschen')) return;
    try { await call('/tickets/' + b.dataset.ticketDelete, 'DELETE'); say('Ticket gelöscht'); } catch (err) { bad(err); }
    loadTickets().catch(bad);
  } else if (b.hasAttribute('data-cancel-update')) {
    if (!await confirmDialog('Ankündigung zurücknehmen?', 'Das Banner verschwindet, neue Runden starten wieder.', 'Zurücknehmen')) return;
    try { await call('/update', 'DELETE'); say('Ankündigung zurückgenommen'); } catch (err) { say(err.message, true); }
    load();
  }
});
start();
