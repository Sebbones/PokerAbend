// Spielerprofil (V2-04): Dialog mit Avatar, Name, Game-ID, optional Discord, Statistik, Favoriten, letzten Partien und Erfolgen.
// Alles kommt von /api/profile (nur freigegebene Felder). Wer sein eigenes Profil öffnet, sieht zusätzlich die Freigabe-Schalter.
// Öffnen: Profile.open('#K7Q2') oder 'me'; jedes Element mit data-profile="#K7Q2" öffnet das Profil per Klick.
'use strict';
const Profile = (() => {
  const tx = (de, en) => (I18n.language === 'en' ? en : de);
  let dlg = null, current = null, token = 0;
  const date = (at) => (at ? new Date(at).toLocaleDateString(I18n.locale || undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  async function call(path, body) {
    const res = await fetch('/api/profile' + path, {
      method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' } : {}, body: body ? JSON.stringify(body) : undefined,
    });
    const json = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
    if (!res.ok) throw Object.assign(new Error(json.error || tx('Das Profil konnte nicht geladen werden.', 'The profile could not be loaded.')), { status: res.status });
    return json;
  }
  const hiddenNote = () => `<p class="hint profile-hidden">${esc(tx('Nicht freigegeben', 'Not shared'))}</p>`;
  function section(title, body) { return `<section class="profile-section"><h3>${esc(title)}</h3>${body}</section>`; }
  function render(p) {
    const stat = (value, label) => `<div class="profile-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
    const s = p.stats;
    const stats = s ? `<div class="profile-stats">${stat(s.played, tx('Partien', 'Games'))}${stat(s.wins, tx('Siege', 'Wins'))}${stat(s.winRate === null ? '–' : s.winRate.toLocaleString(I18n.locale || undefined) + ' %', tx('Siegquote', 'Win rate'))}${stat(`${s.rankedWins} / ${s.rankedPlayed}`, tx('Gewertet (Siege / Partien)', 'Ranked (wins / games)'))}</div>${s.played ? '' : `<p class="hint">${esc(tx('Noch keine Partie gespielt.', 'No game played yet.'))}</p>`}` : hiddenNote();
    const favorites = p.favorites ? (p.favorites.length ? `<ol class="profile-list" data-profile-favorites>${p.favorites.map((f) => `<li><b>${esc(f.name)}</b><span>${f.played} ${esc(tx('Partien', 'games'))} · ${f.wins} ${esc(tx('Siege', 'wins'))}</span></li>`).join('')}</ol>` : `<p class="hint">${esc(tx('Noch keine Lieblingsspiele.', 'No favourite games yet.'))}</p>`) : hiddenNote();
    const recent = p.recent ? (p.recent.length ? `<ul class="profile-list" data-profile-recent>${p.recent.map((r) => `<li><b>${esc(r.gameName)}</b><span>${r.win ? '🏆 ' + esc(tx('Sieg', 'Win')) : esc(tx('Platz', 'Place')) + ' ' + r.place + '/' + r.players}${r.ranked ? ' · ' + esc(tx('gewertet', 'ranked')) : ''} · <time datetime="${new Date(r.at).toISOString()}">${esc(date(r.at))}</time></span></li>`).join('')}</ul>` : `<p class="hint">${esc(tx('Noch keine Partien aufgezeichnet.', 'No games recorded yet.'))}</p>`) : hiddenNote();
    const a = p.achievements;
    const achievements = a ? `<p class="hint">${a.unlocked} ${esc(tx('von', 'of'))} ${a.total} ${esc(tx('Erfolgen freigeschaltet', 'achievements unlocked'))}</p>${a.badges.length ? `<ul class="profile-badges" data-profile-badges>${a.badges.map((b) => `<li class="tier-${esc(b.tier)}" title="${esc(b.description)}"><b>${esc(b.title)}</b>${b.at ? `<small>${esc(date(b.at))}</small>` : ''}</li>`).join('')}</ul>` : ''}` : hiddenNote();
    const privacy = p.self ? section(tx('Wer sieht was?', 'Who sees what?'), `<p class="hint">${esc(tx('Andere sehen immer Avatar, Name und Game-ID – aber nur, wenn du mit Discord verknüpft bist. Alles andere steuerst du in den Einstellungen.', 'Others always see avatar, name and game ID – but only if you are linked with Discord. You control everything else in the settings.'))}</p>${p.registered ? '' : `<p class="hint profile-guest">${esc(tx('Du bist nicht mit Discord verknüpft: Dein Profil ist für andere nicht öffentlich.', 'You are not linked with Discord: your profile is not public.'))}</p>`}<a class="btn" href="#einstellungen/datenschutz" data-profile-close>${esc(tx('Datenschutz-Einstellungen', 'Privacy settings'))}</a>`) : '';
    return `<header class="profile-head"><span class="profile-avatar" aria-hidden="true">${esc(p.avatar || '🙂')}</span><div><h2 id="player-profile-title">${esc(p.name)}${p.self ? ` <small>${esc(tx('(du)', '(you)'))}</small>` : ''}</h2>
        <p class="profile-id"><output class="identity-id" data-profile-id>${esc(p.gameId)}</output>${p.discord ? ` · Discord: <strong data-profile-discord>${esc(p.discord.name)}</strong>` : ''}</p></div></header>
      ${section(tx('Statistik', 'Statistics'), stats)}${section(tx('Lieblingsspiele', 'Favourite games'), favorites)}${section(tx('Letzte Partien', 'Recent games'), recent)}${section(tx('Erfolge', 'Achievements'), achievements)}${privacy}`;
  }
  function frame() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'player-profile-dlg'; dlg.className = 'dlg player-profile-dlg'; dlg.setAttribute('aria-labelledby', 'player-profile-title');
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-profile-close]')) dlg.close(); });
    dlg.addEventListener('change', async (e) => {
      const input = e.target.closest('[data-profile-privacy]'); if (!input) return;
      input.disabled = true;
      try { current = await call('/privacy', { [input.dataset.profilePrivacy]: input.checked }); show(current); }
      catch (error) { input.checked = !input.checked; input.disabled = false; toast(error.message, true); }
    });
    document.body.append(dlg);
    return dlg;
  }
  function show(p, focusKey) {
    const d = frame();
    d.innerHTML = `<div class="profile-body">${render(p)}<div class="profile-actions"><button type="button" class="btn" data-profile-close>${esc(tx('Schließen', 'Close'))}</button></div></div>`;
    if (!d.open) d.showModal();
    if (focusKey) d.querySelector(`[data-profile-privacy="${focusKey}"]`)?.focus();
  }
  async function open(id) {
    const mine = ++token, d = frame();
    d.innerHTML = `<div class="profile-body"><h2 id="player-profile-title">${esc(tx('Profil', 'Profile'))}</h2><p class="hint" role="status">${esc(tx('Wird geladen …', 'Loading …'))}</p></div>`;
    if (!d.open) d.showModal();
    try {
      const result = await call(id === 'me' ? '/me' : '/' + encodeURIComponent(String(id).replace(/^#/, '')));
      if (result.available === false) throw Object.assign(new Error(result.error), { status: 404 });
      current = result; if (mine === token) show(current);
    }
    catch (error) {
      if (mine !== token) return;
      d.innerHTML = `<div class="profile-body"><h2 id="player-profile-title">${esc(tx('Profil', 'Profile'))}</h2><p class="hint profile-error" role="alert">${esc(error.status === 404 ? tx('Dieses Profil ist nicht öffentlich.', 'This profile is not public.') : error.message)}</p><div class="profile-actions"><button type="button" class="btn" data-profile-close>${esc(tx('Schließen', 'Close'))}</button></div></div>`;
    }
  }
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-profile]');
    if (link && link.dataset.profile) { e.preventDefault(); e.stopPropagation(); open(link.dataset.profile); }
  });
  window.addEventListener('languagechange', () => { if (dlg?.open && current) show(current); });
  return { open, render };
})();
