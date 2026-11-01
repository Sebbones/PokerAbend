'use strict';
// „Ich“ → Identität & Geräte: Game-ID zeigen, zweites Gerät verbinden, alte Statistiken übernehmen.
// Die Identität selbst steckt im signierten Cookie des Servers (HttpOnly); hier gibt es nur Anzeige und Aktionen.
const Identity = (() => {
  Object.assign(window.EN || (window.EN = {}), {
    'Identität & Geräte': 'Identity & devices', 'Deine Game-ID': 'Your Game ID',
    'Gleiche Namen sind zwei Personen: Die Game-ID unterscheidet sie. Sie bleibt, auch wenn du dich umbenennst.': 'The same name can belong to two people: the Game ID tells them apart. It stays even if you rename yourself.',
    'Gerät verbinden': 'Connect a device', 'Erzeuge hier einen Code und gib ihn auf dem anderen Gerät ein. Er gilt 10 Minuten und nur einmal. Beide Geräte sind danach dieselbe Person.': 'Create a code here and enter it on your other device. It works once for 10 minutes. Both devices are then the same person.',
    'Code erzeugen': 'Create code', 'Code vom anderen Gerät': 'Code from your other device', 'Verbinden': 'Connect', 'Der Code gilt noch': 'This code is valid for another',
    'Verbunden – die Seite lädt neu.': 'Connected – the page is reloading.', 'Bitte gib den Code ein.': 'Please enter the code.',
    'Meine alten Statistiken übernehmen': 'Take over my old statistics', 'Bisher zählte nur dein Name. Wähle einen Namen, unter dem du früher gespielt hast. Wer zuerst übernimmt, bekommt die Statistik; eine falsche Zuordnung kann die Verwaltung zurücknehmen.': 'Until now only your name counted. Pick a name you played under before. Whoever takes it first gets the statistics; the admins can undo a wrong assignment.',
    'Liste laden': 'Load list', 'Übernehmen': 'Take over', 'Keine alten Statistiken mehr frei.': 'No old statistics left to take over.', 'Schon übernommen': 'Already taken over',
    'Die Identität konnte nicht geladen werden.': 'The identity could not be loaded.', 'Übernommen:': 'Taken over:',
  });
  const state = { gameId: null, claimed: [] };
  let codeTimer = null;
  const call = async (path, body) => {
    const res = await fetch('/api/identity' + path, { method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json', 'X-Requested-With': 'spieleabend' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || I18n.t('Die Identität konnte nicht geladen werden.'));
    return data;
  };
  async function refresh() {
    try { const data = await call(''); state.gameId = data.gameId; state.claimed = data.claimed || []; }
    catch { state.gameId = null; }
    window.dispatchEvent(new Event('identityready'));
    paint();
  }
  function paint() {
    const body = $('#p-identity-body'); if (!body) return;
    if (!state.gameId) { body.innerHTML = I18n.html`<p class="hint">Die Identität konnte nicht geladen werden.</p>`; return; }
    body.innerHTML = I18n.html`
      <div class="identity-block"><b>Deine Game-ID</b> <output id="p-game-id" class="identity-id">${esc(state.gameId)}</output>
        <p class="hint">Gleiche Namen sind zwei Personen: Die Game-ID unterscheidet sie. Sie bleibt, auch wenn du dich umbenennst.</p></div>
      <div class="identity-block"><b>Gerät verbinden</b>
        <p class="hint">Erzeuge hier einen Code und gib ihn auf dem anderen Gerät ein. Er gilt 10 Minuten und nur einmal. Beide Geräte sind danach dieselbe Person.</p>
        <div class="identity-row"><button type="button" class="btn" id="p-link-create">Code erzeugen</button><output id="p-link-code" class="identity-id" aria-live="polite"></output></div>
        <div class="identity-row"><input id="p-link-input" class="input" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${esc(I18n.t('Code vom anderen Gerät'))}" aria-label="${esc(I18n.t('Code vom anderen Gerät'))}"><button type="button" class="btn" id="p-link-redeem">Verbinden</button></div></div>
      <div class="identity-block"><b>Meine alten Statistiken übernehmen</b>
        <p class="hint">Bisher zählte nur dein Name. Wähle einen Namen, unter dem du früher gespielt hast. Wer zuerst übernimmt, bekommt die Statistik; eine falsche Zuordnung kann die Verwaltung zurücknehmen.</p>
        ${state.claimed.length ? `<p class="hint">${esc(I18n.t('Schon übernommen'))}: ${esc(state.claimed.join(', '))}</p>` : ''}
        <button type="button" class="btn" id="p-legacy-load">Liste laden</button><ul class="identity-legacy" id="p-legacy-list"></ul></div>`;
  }
  const flash = (text, bad = false) => { $('#p-error').textContent = bad ? text : ''; if (!bad) toast(text); };
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('#p-link-create, #p-link-redeem, #p-legacy-load, [data-legacy-claim]');
    if (!button) return;
    try {
      if (button.id === 'p-link-create') {
        const { code, expiresAt } = await call('/link/create', {});
        const out = $('#p-link-code'); clearInterval(codeTimer);
        const show = () => { const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000)); out.textContent = `${code.slice(0, 3)}-${code.slice(3)}`; out.title = `${I18n.t('Der Code gilt noch')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (!left) clearInterval(codeTimer); };
        show(); codeTimer = setInterval(show, 1000);
      } else if (button.id === 'p-link-redeem') {
        const code = $('#p-link-input').value.trim();
        if (!code) { flash(I18n.t('Bitte gib den Code ein.'), true); return; }
        await call('/link/redeem', { code });
        flash(I18n.t('Verbunden – die Seite lädt neu.'));
        setTimeout(() => location.reload(), 700);
      } else if (button.id === 'p-legacy-load') {
        const { names } = await call('/legacy');
        $('#p-legacy-list').innerHTML = names.length
          ? names.map((n) => I18n.html`<li><span><b>${esc(n.name)}</b> <small>${n.played} Partien, ${n.wins} Siege</small></span><button type="button" class="btn btn-ghost" data-legacy-claim="${esc(n.name)}">Übernehmen</button></li>`).join('')
          : `<li class="hint">${esc(I18n.t('Keine alten Statistiken mehr frei.'))}</li>`;
      } else {
        const { name } = await call('/claim', { name: button.dataset.legacyClaim });
        flash(`${I18n.t('Übernommen:')} ${name}`);
        await refresh();
      }
      $('#p-error').textContent = '';
    } catch (error) { flash(error.message, true); }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'p-link-input') { event.preventDefault(); $('#p-link-redeem').click(); }
  });
  refresh();
  return { get gameId() { return state.gameId; }, open: refresh };
})();
