// Ticket-Board im Hub. Eingaben bleiben Text; Formulare stehen unabhängig von Live-Updates.
'use strict';
const ticketFilters = { q: '', type: 'all', status: 'all', game: 'all', sort: 'votes', ...store.get('poker:ticketFilters', {}) };
let ticketPage = 1, ticketCache = { key: '', data: null, error: '', loading: false }, ticketRequest = 0;
const ticketComments = new Map();
let ticketFiltersOpen = store.get('poker:ticketFiltersOpen', matchMedia('(min-width:641px)').matches) === true;
const ticketURL = () => {
  const sub = parseRoute().sub;
  return sub ? `/api/tickets/${sub}` : '/api/tickets?' + new URLSearchParams({ ...ticketFilters, page: ticketPage });
};
async function ticketFetch(path, method = 'GET', data = null) {
  const options = { method, credentials: 'same-origin', cache: 'no-store' };
  if (method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' };
    options.body = JSON.stringify({ ...data, name: profile.name, avatar: profile.avatar });
  }
  const response = await fetch(path, options);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Bitte melde dich erneut auf der Seite an');
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Die Anfrage ist fehlgeschlagen'), { status: response.status });
  return result;
}
async function loadTickets(force = false) {
  const key = ticketURL();
  if (!force && ticketCache.key === key && (ticketCache.loading || ticketCache.data)) return;
  const request = ++ticketRequest;
  ticketCache = { key, data: ticketCache.key === key ? ticketCache.data : null, error: '', loading: true };
  try {
    const data = await ticketFetch(key);
    if (request !== ticketRequest) return;
    ticketCache.data = data;
  } catch (e) { if (request === ticketRequest) ticketCache.error = e.message; }
  finally {
    if (request === ticketRequest) {
      ticketCache.loading = false;
      if (hubVisible() && parseRoute().page === 'tickets' && ticketURL() === key) renderHub();
    }
  }
}
const ticketDate = (at) => new Date(at).toLocaleString(I18n.locale, { dateStyle: 'medium', timeStyle: 'short' });
const ticketOptions = (items, selected) => Object.entries(items).map(([value, label]) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(label)}</option>`).join('');
const ticketGame = (id) => ticketCache.data?.games.find((g) => g.id === id)?.name || 'Allgemein';
const ticketBadge = (t, data) => `<span class="ticket-status is-${esc(t.status)}">${esc(data.statuses[t.status])}</span><span class="ticket-type">${esc(data.types[t.type])}</span>${t.game ? `<span class="ticket-type">${esc(ticketGame(t.game))}</span>` : ''}`;
const ticketVote = (t) => `<button type="button" class="ticket-vote ${t.voted ? 'on' : ''}" data-ticket-vote="${t.id}" data-active="${!t.voted}" aria-pressed="${t.voted}" aria-label="${t.voted ? 'Stimme zurücknehmen' : 'Unterstützen'}: ${esc(t.title)}"><span aria-hidden="true">↑</span><b>${t.votes}</b><small>${t.voted ? 'Deine Stimme' : 'Stimmen'}</small></button>`;
function ticketAdminHTML(data) {
  if (data.viewer.admin) return I18n.html('<span class="ticket-admin-on">Verwaltung aktiv</span><button type="button" class="btn btn-ghost" data-ticket-admin-out>Verwaltung abmelden</button>');
  return data.viewer.adminEnabled ? I18n.html('<button type="button" class="btn btn-ghost" data-ticket-admin>Verwaltung anmelden</button>') : I18n.html('<small class="hint">Die Verwaltung ist noch nicht eingerichtet.</small>');
}
function pageTickets() {
  const key = ticketURL();
  if (ticketCache.key !== key || !ticketCache.data && !ticketCache.loading && !ticketCache.error) loadTickets();
  const data = ticketCache.key === key ? ticketCache.data : null;
  const header = I18n.html('<section class="hub-head"><h1>Ticket-Board</h1><p>Ideen teilen, Fehler melden und gemeinsam entscheiden, was als Nächstes wichtig ist.</p></section>');
  const error = ticketCache.error ? I18n.html`<p class="ticket-error" role="alert">${esc(ticketCache.error)}</p><button type="button" class="btn" data-ticket-refresh>Erneut versuchen</button>` : '';
  if (!data) return header + error + (!error ? I18n.html('<p role="status">Tickets werden geladen …</p>') : '');
  if (data.ticket) return error + ticketDetailHTML(data);
  const filteredExport = '/api/tickets/export.md?' + new URLSearchParams(ticketFilters);
  return I18n.html`${header}<div class="ticket-toolbar"><button type="button" class="btn btn-brass" data-ticket-new>Ticket erstellen</button><a class="btn" href="${esc(filteredExport)}" download>Markdown exportieren</a><button type="button" class="btn btn-ghost" data-ticket-refresh>Aktualisieren</button></div>
    <div class="ticket-overview"><span><b>${data.counts.open}</b> offen</span><span><b>${data.counts.done}</b> erledigt</span><span><b>${data.counts.total}</b> insgesamt</span></div>
    <details class="ticket-filter-panel" data-ticket-filters ${ticketFiltersOpen ? 'open' : ''}><summary>Suche & Filter${ticketFilters.q || ['type', 'status', 'game'].some((key) => ticketFilters[key] !== 'all') ? ' · Auswahl aktiv' : ''}</summary><form class="ticket-filters" id="ticket-filters"><label class="field ticket-search"><span>Tickets durchsuchen</span><input class="input" type="search" name="q" maxlength="100" value="${esc(ticketFilters.q)}" placeholder="Titel oder Beschreibung"></label>
      <label class="field"><span>Art</span><select class="input" name="type" aria-label="Art">${ticketOptions({ all: 'Alle Arten', ...data.types }, ticketFilters.type)}</select></label>
      <label class="field"><span>Status</span><select class="input" name="status" aria-label="Status">${ticketOptions({ all: 'Alle Status', ...data.statuses }, ticketFilters.status)}</select></label>
      <label class="field"><span>Spiel</span><select class="input" name="game" aria-label="Spiel">${ticketOptions({ all: I18n.t('Alle Spiele'), ...Object.fromEntries(data.games.map((g) => [g.id, g.name])) }, ticketFilters.game)}</select></label>
      <label class="field"><span>Sortierung</span><select class="input" name="sort" aria-label="Sortierung">${ticketOptions({ votes: 'Meiste Stimmen', new: 'Neueste zuerst', updated: 'Zuletzt geändert' }, ticketFilters.sort)}</select></label>
      <div class="ticket-filter-actions"><button class="btn" type="submit">Filter anwenden</button><button class="btn btn-ghost" type="button" data-ticket-reset>Zurücksetzen</button></div></form></details>
    ${error}<p class="ticket-count" role="status">${data.total} ${data.total === 1 ? 'Ticket' : 'Tickets'}${ticketCache.loading ? ' · wird aktualisiert' : ''}</p>
    <div class="ticket-list">${data.tickets.map((t) => I18n.html`<article class="ticket-card">${ticketVote(t)}<div class="ticket-card-content"><div class="ticket-badges">${ticketBadge(t, data)}</div><h2><a href="#tickets/${t.id}"><small>#${t.id}</small> ${esc(t.title)}</a></h2><p>${esc(t.excerpt)}</p><div class="ticket-meta"><span>${esc(t.author.avatar)} ${esc(t.author.name)}</span><span>${t.commentCount} Kommentare</span><time datetime="${new Date(t.createdAt).toISOString()}">${ticketDate(t.createdAt)}</time></div></div></article>`).join('') || I18n.html('<div class="ticket-empty"><h2>Hier ist noch Platz für Ideen</h2><p>Für diese Auswahl gibt es keine Tickets. Erstelle ein Ticket oder ändere die Filter.</p></div>')}</div>
    ${data.pages > 1 ? I18n.html`<nav class="ticket-pagination" aria-label="Ticket-Seiten"><button type="button" class="btn" data-ticket-page="${data.page - 1}" ${data.page === 1 ? 'disabled' : ''}>Zurück</button><span>Seite ${data.page} von ${data.pages}</span><button type="button" class="btn" data-ticket-page="${data.page + 1}" ${data.page === data.pages ? 'disabled' : ''}>Weiter</button></nav>` : ''}
    <div class="ticket-admin-bar">${ticketAdminHTML(data)}</div>`;
}
function ticketDetailHTML(data) {
  const t = data.ticket;
  return I18n.html`<a class="ticket-back" href="#tickets">← Alle Tickets</a><article class="ticket-detail"><div class="ticket-badges">${ticketBadge(t, data)}</div><h1><small>#${t.id}</small> ${esc(t.title)}</h1><div class="ticket-meta"><span>${esc(t.author.avatar)} ${esc(t.author.name)}</span><span>Erstellt ${ticketDate(t.createdAt)}</span><span>Geändert ${ticketDate(t.updatedAt)}</span></div><p class="ticket-description">${esc(t.description)}</p><div class="ticket-detail-actions">${ticketVote(t)}<a class="btn" href="/api/tickets/${t.id}/export.md" download>Ticket als Markdown</a>${t.canEdit ? I18n.html`<button type="button" class="btn" data-ticket-edit="${t.id}">Ticket bearbeiten</button>` : ''}${t.canDelete ? I18n.html`<button type="button" class="btn btn-danger" data-ticket-delete="${t.id}">Ticket löschen</button>` : ''}</div></article>
    ${data.viewer.admin ? I18n.html`<form class="ticket-status-form" id="ticket-status-form" data-id="${t.id}"><label class="field"><span>Status verwalten</span><select class="input" name="status" aria-label="Status verwalten">${ticketOptions(data.statuses, t.status)}</select></label><button class="btn btn-brass" type="submit">Status übernehmen</button></form>` : ''}
    ${t.history.length ? I18n.html`<details class="ticket-history"><summary>Statusverlauf (${t.history.length})</summary><ul>${t.history.map((h) => `<li>${esc(data.statuses[h.from])} → <b>${esc(data.statuses[h.to])}</b><small>${esc(h.by)} · ${ticketDate(h.at)}</small></li>`).join('')}</ul></details>` : ''}
    <section class="ticket-discussion" aria-labelledby="ticket-comments-title"><h2 id="ticket-comments-title">Kommentare (${t.commentCount})</h2><ol>${t.comments.map((c) => `<li><div class="ticket-meta"><b>${esc(c.author.avatar)} ${esc(c.author.name)}</b><time datetime="${new Date(c.at).toISOString()}">${ticketDate(c.at)}</time></div><p>${esc(c.text)}</p>${c.canDelete ? I18n.html`<button class="btn btn-ghost" type="button" data-ticket-comment-delete="${c.id}" data-id="${t.id}">Kommentar löschen</button>` : ''}</li>`).join('') || I18n.html('<li class="hint">Noch keine Kommentare. Was denkst du?</li>')}</ol>
      <form id="ticket-comment-form" data-id="${t.id}"><label class="field"><span>Dein Kommentar</span><textarea class="input" name="text" aria-label="Dein Kommentar" maxlength="2000" rows="4" required>${esc(ticketComments.get(t.id) || '')}</textarea></label><button class="btn btn-brass" type="submit">Kommentar senden</button></form></section><div class="ticket-admin-bar">${ticketAdminHTML(data)}<button type="button" class="btn btn-ghost" data-ticket-refresh>Aktualisieren</button></div>`;
}
function ticketDialog(id, title) {
  let dialog = document.getElementById(id);
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = id; dialog.className = 'dlg ticket-dialog'; dialog.setAttribute('aria-labelledby', id + '-title'); document.body.append(dialog); }
  dialog.dataset.title = title;
  return dialog;
}
function openTicketEditor(ticket = null, prefill = null) { // prefill: { type, description } aus „Fehler melden“
  const data = ticketCache.data;
  if (!profile.name) { openProfile(true); return; }
  const dialog = ticketDialog('ticket-editor', ticket ? 'Ticket bearbeiten' : 'Ticket erstellen');
  dialog.innerHTML = I18n.html`<form id="ticket-edit-form" data-id="${ticket?.id || ''}" data-revision="${ticket?.revision || ''}"><h2 id="ticket-editor-title">${dialog.dataset.title}</h2><p>Beschreibe, was du dir wünschst oder wie sich der Fehler nachvollziehen lässt.</p>
    <label class="field"><span>Titel</span><input class="input" name="title" minlength="4" maxlength="100" required value="${esc(ticket?.title || '')}" placeholder="Eine kurze, konkrete Überschrift"></label>
    <div class="ticket-edit-selects"><label class="field"><span>Art</span><select class="input" name="type" aria-label="Art">${ticketOptions(data.types, ticket?.type || prefill?.type || 'idea')}</select></label><label class="field"><span>Spiel</span><select class="input" name="game" aria-label="Spiel">${ticketOptions({ '': 'Allgemein / Hub', ...Object.fromEntries(data.games.map((g) => [g.id, g.name])) }, ticket?.game || '')}</select></label></div>
    <label class="field"><span>Beschreibung</span><textarea class="input" name="description" aria-label="Beschreibung" minlength="10" maxlength="4000" rows="8" required placeholder="Was soll passieren? Was passiert stattdessen?">${esc(ticket?.description ?? prefill?.description ?? '')}</textarea></label>
    <p class="error" id="ticket-edit-error" role="alert"></p><div class="dlg-actions"><button type="button" class="btn btn-ghost" data-ticket-close>Abbrechen</button><button class="btn btn-brass" type="submit">${ticket ? 'Änderungen speichern' : 'Ticket erstellen'}</button></div></form>`;
  dialog.showModal(); dialog.querySelector('[name="title"]').focus();
}
function openTicketAdmin() {
  const dialog = ticketDialog('ticket-admin', 'Verwaltung anmelden');
  dialog.innerHTML = I18n.html('<form id="ticket-admin-form"><h2 id="ticket-admin-title">Verwaltung anmelden</h2><p>Mit dem Admin-Passwort kannst du den Status ändern und Beiträge moderieren.</p><label class="field"><span>Admin-Passwort</span><input class="input" name="password" type="password" maxlength="200" autocomplete="current-password" required></label><p class="error" id="ticket-admin-error" role="alert"></p><div class="dlg-actions"><button class="btn btn-ghost" type="button" data-ticket-close>Abbrechen</button><button class="btn btn-brass" type="submit">Anmelden</button></div></form>');
  dialog.addEventListener('close', () => dialog.querySelector('form')?.reset(), { once: true });
  dialog.showModal(); dialog.querySelector('input').focus();
}
async function ticketAction(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try { await action(); }
  catch (e) { toast(e.message, true); }
  finally { if (button.isConnected) button.disabled = false; }
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-ticket-close')) b.closest('dialog').close();
  else if (b.hasAttribute('data-ticket-new')) openTicketEditor();
  else if (b.hasAttribute('data-ticket-admin')) openTicketAdmin();
  else if (b.hasAttribute('data-ticket-refresh')) loadTickets(true);
  else if (b.hasAttribute('data-ticket-admin-out')) ticketAction(b, async () => { await ticketFetch('/api/tickets/admin/logout', 'POST', {}); await loadTickets(true); });
  else if (b.hasAttribute('data-ticket-reset')) { Object.assign(ticketFilters, { q: '', type: 'all', status: 'all', game: 'all', sort: 'votes' }); ticketPage = 1; store.set('poker:ticketFilters', ticketFilters); await loadTickets(true); }
  else if (b.dataset.ticketPage) { ticketPage = Number(b.dataset.ticketPage); await loadTickets(true); }
  else if (b.dataset.ticketEdit) ticketAction(b, async () => openTicketEditor((await ticketFetch(`/api/tickets/${b.dataset.ticketEdit}`)).ticket));
  else if (b.dataset.ticketVote) ticketAction(b, async () => { await ticketFetch(`/api/tickets/${b.dataset.ticketVote}/vote`, 'PUT', { active: b.dataset.active === 'true' }); await loadTickets(true); });
  else if (b.dataset.ticketDelete) ticketAction(b, async () => {
    if (!await ask({ title: 'Ticket endgültig löschen?', text: 'Das Ticket, alle Kommentare und Stimmen werden entfernt.', ok: 'Ticket löschen', danger: true })) return;
    await ticketFetch(`/api/tickets/${b.dataset.ticketDelete}`, 'DELETE', {}); location.hash = '#tickets'; await loadTickets(true);
  });
  else if (b.dataset.ticketCommentDelete) ticketAction(b, async () => {
    if (!await ask({ title: 'Kommentar löschen?', text: 'Der Kommentar wird endgültig entfernt.', ok: 'Löschen', danger: true })) return;
    await ticketFetch(`/api/tickets/${b.dataset.id}/comments/${b.dataset.ticketCommentDelete}`, 'DELETE', {}); await loadTickets(true);
  });
});
document.addEventListener('input', (e) => {
  const form = e.target.closest('#ticket-comment-form');
  if (form) ticketComments.set(Number(form.dataset.id), e.target.value);
});
document.addEventListener('toggle', (e) => {
  if (!e.target.matches('[data-ticket-filters]')) return;
  ticketFiltersOpen = e.target.open; store.set('poker:ticketFiltersOpen', ticketFiltersOpen);
}, true);
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (!['ticket-filters', 'ticket-edit-form', 'ticket-comment-form', 'ticket-status-form', 'ticket-admin-form'].includes(f.id)) return;
  e.preventDefault(); const values = Object.fromEntries(new FormData(f));
  if (f.id === 'ticket-filters') { Object.assign(ticketFilters, values); ticketPage = 1; store.set('poker:ticketFilters', ticketFilters); await loadTickets(true); return; }
  const button = f.querySelector('[type="submit"]'); if (button.disabled) return; button.disabled = true;
  const error = f.querySelector('[role="alert"]'); if (error) error.textContent = '';
  try {
    if (f.id === 'ticket-admin-form') { await ticketFetch('/api/tickets/admin/login', 'POST', { password: values.password }); f.reset(); f.closest('dialog').close(); }
    else if (f.id === 'ticket-edit-form') {
      const id = f.dataset.id;
      const result = await ticketFetch('/api/tickets' + (id ? '/' + id : ''), id ? 'PATCH' : 'POST', { ...values, ...(id ? { revision: Number(f.dataset.revision) } : {}) });
      f.closest('dialog').close(); location.hash = I18n.html`#tickets/${result.ticket.id}`;
    } else if (f.id === 'ticket-comment-form') { await ticketFetch(`/api/tickets/${f.dataset.id}/comments`, 'POST', values); ticketComments.delete(Number(f.dataset.id)); }
    else if (f.id === 'ticket-status-form') await ticketFetch(`/api/tickets/${f.dataset.id}`, 'PATCH', { status: values.status, revision: ticketCache.data.ticket.revision });
    await loadTickets(true);
  } catch (e) { if (error) error.textContent = e.message; else toast(e.message, true); }
  finally { if (button.isConnected) button.disabled = false; }
});
