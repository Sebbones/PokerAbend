// Betrieb im Browser: Update-Hinweis, Neustart-Meldung, Version, „Was ist neu“ und Fehlermeldungen an den Server.
// Läuft nach core.js/hub.js und nutzt deren socket, store, session und profile.
'use strict';
Object.assign(window.EN || {}, { 'Was ist neu?': 'What’s new?', 'Fehler melden': 'Report a problem' });
(() => {
  const T = (de, en) => (window.I18n?.language === 'en' ? en : de);
  const minutesText = (ms) => {
    const m = Math.ceil(ms / 60000);
    return m <= 1 ? T('weniger als einer Minute', 'under a minute') : T(`${m} Minuten`, `${m} minutes`);
  };

  // ---------- Banner ----------
  const banner = document.createElement('div');
  banner.id = 'ops-banner'; banner.className = 'ops-banner'; banner.setAttribute('role', 'status'); banner.hidden = true;
  document.body.append(banner);
  let update = null;          // { dueAt (Browserzeit), due }
  let restarting = false;
  let newVersion = null;      // Server läuft mit neuerer Version als diese Seite
  function render() {
    banner.hidden = false; banner.className = 'ops-banner';
    if (restarting) {
      banner.classList.add('is-restart');
      banner.textContent = T('Server startet neu – gleich wieder da', 'Server is restarting – back in a moment');
    } else if (update) {
      const left = update.dueAt - Date.now();
      banner.classList.add('is-update');
      banner.textContent = update.due || left <= 0
        ? T('Update gleich – laufende Runden dürfen noch fertig werden, neue starten nicht mehr', 'Update imminent – running rounds may finish, new rounds will not start')
        : T(`Update in ${minutesText(left)} – neue Runden starten nicht mehr, laufende dürfen fertig werden`, `Update in ${minutesText(left)} – new rounds will not start, running rounds may finish`);
    } else if (newVersion) {
      banner.classList.add('is-version');
      banner.textContent = T(`Neue Version ${newVersion} ist da. `, `Version ${newVersion} is available. `);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = T('Neu laden', 'Reload');
      button.addEventListener('click', () => location.reload());
      banner.append(button);
    } else { banner.hidden = true; banner.textContent = ''; }
  }
  setInterval(() => { if (update && !restarting) render(); }, 1000);
  socket.on('maintenance', (state) => { update = state ? { dueAt: Date.now() + state.leftMs, due: !!state.due } : null; render(); });
  socket.on('restarting', () => { restarting = true; render(); });
  socket.on('connect', () => { if (restarting) { restarting = false; render(); } });
  window.addEventListener('languagechange', () => { render(); showVersion(); });

  // ---------- Version und „Was ist neu“ ----------
  let loaded = null, current = null;
  function showVersion() {
    const el = document.getElementById('p-version');
    if (el && current) el.textContent = `${T('Version', 'Version')} ${current.version}${current.commit ? ` · ${current.commit}` : ''}`;
  }
  const ART = { spiel: ['Spiel', 'Game'], funktion: ['Funktion', 'Feature'], design: ['Design', 'Design'], betrieb: ['Betrieb', 'Operations'], discord: ['Discord', 'Discord'], fehler: ['Fehler', 'Fix'] };
  async function whatsNew(auto) {
    let data;
    try { data = await (await fetch('/api/whats-new', { credentials: 'same-origin', cache: 'no-store' })).json(); }
    catch { if (!auto) toast(T('„Was ist neu“ lässt sich gerade nicht laden', 'Could not load “What’s new”'), true); return; }
    let dialog = document.getElementById('whatsnew-dlg');
    if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'whatsnew-dlg'; dialog.className = 'dlg'; dialog.setAttribute('aria-labelledby', 'whatsnew-title'); document.body.append(dialog); }
    const rows = (data.entries || []).map((e) => `<li><b>${esc(e.titel)}</b> <small>${esc((ART[e.art] || [e.art, e.art])[window.I18n?.language === 'en' ? 1 : 0])} · ${esc(e.datum)}</small><br><span>${esc(e.text)}</span></li>`).join('');
    dialog.innerHTML = `<form method="dialog"><h2 id="whatsnew-title">${esc(T(`Neu in Version ${data.version}`, `New in version ${data.version}`))}</h2><ul class="whatsnew-list">${rows}</ul><div class="dlg-actions"><button class="btn btn-brass" value="ok">${esc(T('Verstanden', 'Got it'))}</button></div></form>`;
    if (auto) store.set('poker:seenVersion', data.version);
    if (!dialog.open) dialog.showModal();
  }
  socket.on('version', (v) => {
    current = v; showVersion();
    if (loaded === null) {
      loaded = v.version;
      const seen = store.get('poker:seenVersion', null);
      if (seen === null) store.set('poker:seenVersion', v.version);         // neuer Browser: nichts Neues für ihn
      else if (seen !== v.version && !session && !roomCodeFromUrl()) whatsNew(true); // einmal pro neuer Version, nicht mitten im Spiel
    } else if (v.version !== loaded) { newVersion = v.version; render(); }  // Server wurde aktualisiert, die Seite ist noch alt
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'p-whatsnew') whatsNew(false);
    else if (b.id === 'p-bugreport') { $('#profile-dlg').close(); startBugReport(); }
  });

  // ---------- Fehler aus dem Browser ----------
  // Lokal bleiben die letzten fünf für das Ticket-Formular; an den Server gehen höchstens 10 pro Minute.
  const recent = [];
  let sentAt = [];
  const clean = (text) => {
    let out = String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/https?:\/\/[^\s)'"]+/g, (u) => u.split(/[?#]/)[0]);
    const name = (typeof profile !== 'undefined' && profile.name || '').trim();
    if (name.length >= 2) out = out.split(name).join('…');
    return out.slice(0, 200);
  };
  function report(message, where = '') {
    const entry = { message: clean(message) || 'Unbekannter Fehler', where: clean(where), game: (typeof session !== 'undefined' && session?.game) || 'hub', at: Date.now() };
    const last = recent[recent.length - 1];
    if (last && last.message === entry.message && last.where === entry.where) { last.count = (last.count || 1) + 1; return; }
    recent.push(entry); if (recent.length > 5) recent.shift();
    const now = Date.now();
    sentAt = sentAt.filter((t) => now - t < 60000);
    if (sentAt.length >= 10) return;
    sentAt.push(now);
    socket.emit('clientError', { message: entry.message, where: entry.where, game: entry.game });
  }
  window.addEventListener('error', (e) => { if (e.error || e.message) report(e.message || String(e.error), e.filename ? `${e.filename.split(/[?#]/)[0].split('/').pop()}:${e.lineno}:${e.colno}` : ''); });
  window.addEventListener('unhandledrejection', (e) => report('Unhandled rejection: ' + (e.reason?.message || e.reason || ''), ''));
  window.OpsErrors = { recent: () => recent.map((e) => ({ ...e })) };

  function bugDescription() {
    const lines = recent.map((e) => `- [${e.game}] ${e.message}${e.where ? ` (${e.where})` : ''}${e.count > 1 ? ` ×${e.count}` : ''}`);
    return `Was ist passiert?\n\n\nZuletzt gemeldete Browser-Fehler:\n${lines.length ? lines.join('\n') : '- keine'}`;
  }
  async function startBugReport() {
    if (!profile.name) { openProfile(true); return; }
    location.hash = '#tickets';
    for (let i = 0; i < 50 && !ticketCache.data; i++) await new Promise((r) => setTimeout(r, 100));
    if (ticketCache.data) openTicketEditor(null, { type: 'bug', description: bugDescription() });
  }
})();
