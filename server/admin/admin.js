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
  $('#errors').innerHTML = s.errors.length ? `<table><thead><tr><th>Meldung</th><th>Spiel</th><th>Anzahl</th><th>Zuletzt</th></tr></thead><tbody>${s.errors.map((e) => `<tr><td>${esc(e.message)}</td><td>${esc(e.game)}</td><td>${e.count}</td><td>${esc(time(e.last))}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Keine Fehler gemeldet.</p>';
  $('#log').innerHTML = s.log.length ? `<table><tbody>${s.log.map((l) => `<tr><td class="muted">${esc(time(l.at))}</td><td>${esc(l.action)}</td><td class="muted">${esc(l.detail)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Noch keine Einträge.</p>';
}
async function load() {
  try { const s = await call('/status'); $('#login').hidden = true; $('#app').hidden = false; render(s); }
  catch (e) { if (!$('#app').hidden) say(e.message, true); }
}
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; clearInterval(timer); timer = null; }
function start() { clearInterval(timer); timer = setInterval(load, 5000); load(); }

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await call('/login', 'POST', { password: $('#pw').value }); $('#pw').value = ''; $('#login-error').textContent = ''; start(); }
  catch (err) { $('#login-error').textContent = err.message; }
});
$('#logout').addEventListener('click', async () => { await call('/logout', 'POST', {}).catch(() => {}); showLogin(); });
$('#refresh').addEventListener('click', load);
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
  } else if (b.hasAttribute('data-cancel-update')) {
    if (!await confirmDialog('Ankündigung zurücknehmen?', 'Das Banner verschwindet, neue Runden starten wieder.', 'Zurücknehmen')) return;
    try { await call('/update', 'DELETE'); say('Ankündigung zurückgenommen'); } catch (err) { say(err.message, true); }
    load();
  }
});
start();
