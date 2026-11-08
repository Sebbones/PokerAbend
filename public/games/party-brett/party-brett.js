'use strict';
window.PartyBoardUI = (() => {
  const t = (de, en) => I18n.content(de, en);
  const items = () => ({ boost: t('Schub +2', 'Boost +2'), shield: t('Schutzschild', 'Shield'), snare: t('Stolperfalle −2', 'Snare −2') });
  const rules = () => t('Der Host würfelt den Aufgaben-Marker 1–6 Felder weiter. Das Feld wählt das nächste Party-Minispiel aus dem Aufgabenpool. Platzierungspunkte bewegen eure Figuren Richtung Feld 24. Bonusfelder geben +2 Punkte; Itemfelder geben ein Item, falls die Tasche leer ist. Sturmfelder werfen dich 2 Felder zurück; ein aktiver Schild fängt das ab. Jeder beginnt mit einem Schild. Items sind zwischen Minispielen nutzbar: Schub +2 beim nächsten Ergebnis, Schild gegen eine Falle oder einen Sturm, Stolperfalle −2 für ein anderes Teammitglied. Feld 24 oder die eingestellte Rundengrenze beendet den Abend: weiteste Figur gewinnt, bei Gleichstand die meisten Punkte. Ein abgebrochenes, ungewertetes Minispiel wird ohne neuen Würfelwurf wiederholt.',
    'The host rolls the task marker 1–6 spaces. Its tile picks the next party minigame from the task pool. Placement points move your runners towards tile 24. Bonus tiles award +2 points; item tiles give an item if your bag is empty. Storm tiles move you back 2 spaces; an active shield blocks this. Everyone starts with a shield. Use items between minigames: boost adds 2 movement to the next result, shield blocks one snare or storm, snare moves another player back 2 spaces. Tile 24 or the selected round limit ends the evening: furthest runner wins, then most points breaks ties. Aborted, unscored minigames are replayed without rolling again.');
  function lobby() { return `<section class="pb-world pb-brief"><img src="/games/party-brett/scene.svg" alt=""><h3>${t('Party-Brett · Laternenpfad', 'Party Board · Lantern Trail')}</h3><p>${t('Ein gemeinsames Brett, echte Party-Minispiele und eine Tasche voller Möglichkeiten.', 'One shared board, real party minigames and a bag full of possibilities.')}</p><details class="pf-rules"><summary>${t('Regeln', 'Rules')}</summary><p>${rules()}</p></details></section>`; }
  function html(S) {
    const p = S.partyProgram, b = p?.board;
    if (!b) return lobby();
    const labels = { task: t('Aufgabe', 'Task'), bonus: t('Bonus +2', 'Bonus +2'), item: t('Item', 'Item'), storm: t('Sturm −2', 'Storm −2') };
    const kind = (n) => n >= 24 ? 'finish' : n && n % 6 === 0 ? 'storm' : n % 4 === 0 ? 'item' : n % 3 === 0 ? 'bonus' : 'task';
    const me = S.you?.id, held = b.items[me];
    return `<section class="pb-world" aria-label="${t('Party-Brett', 'Party Board')}"><header><img src="/games/party-brett/scene.svg" alt=""><h3>${t('Laternenpfad', 'Lantern Trail')}</h3><p>${t('Aufgaben-Marker', 'Task marker')}: ${b.cursor} · ${t('Würfel', 'Die')}: ${b.die} · ${t('Runde', 'Round')} ${p.index + 1}/${p.config.boardRounds}</p></header>
      <div class="pb-grid" role="list" aria-label="${t('Spielfelder', 'Board spaces')}">${Array.from({ length: 25 }, (_, n) => `<div role="listitem" class="pb-tile pb-${kind(n)}"><b>${n}</b><small>${n === 24 ? t('Ziel', 'Finish') : n === 0 ? t('Start', 'Start') : labels[kind(n)]}</small><div class="pb-markers">${p.standings.filter((person) => b.positions[person.id] === n).map((person) => `<span title="${esc(person.name)}">${Object.keys(b.positions).indexOf(person.id) + 1}</span>`).join('')}</div></div>`).join('')}</div>
      <ol class="pb-runners">${p.standings.map((person, i) => `<li><b>${Object.keys(b.positions).indexOf(person.id) + 1}. ${esc(person.name)}</b><span>${t('Feld', 'Tile')} ${b.positions[person.id]} · ${person.points} ${t('Punkte', 'points')} · ${items()[b.items[person.id]] || '—'}${b.shields[person.id] ? ` · ${t('geschützt', 'protected')}` : ''}${b.boosts[person.id] ? ' · +2' : ''}</span></li>`).join('')}</ol>
      ${held && p.status === 'between' && !programBusy(S) ? `<div class="pb-items">${held === 'snare' ? `<label>${t('Ziel der Falle', 'Snare target')}<select data-pb-target>${p.standings.filter((person) => person.id !== me).map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('')}</select></label>` : ''}<button type="button" class="btn btn-brass" data-pb-item="${held}" ${S.gamePaused ? 'disabled' : ''}>${items()[held]} · ${t('einsetzen', 'use')}</button></div>` : ''}
      <details class="pf-rules"><summary>${t('Regeln', 'Rules')}</summary><p>${rules()}</p></details></section>`;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pb-item]');
    if (!b || b.disabled) return;
    b.disabled = true;
    const reply = await send('programBoardItem', { item: b.dataset.pbItem, target: b.closest('.pb-world').querySelector('[data-pb-target]')?.value });
    if (!reply?.ok) b.disabled = false;
  });
  return { html, lobby, rules };
})();
