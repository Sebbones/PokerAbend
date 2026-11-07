// Shut the Box im Browser (Regeln: games/shutthebox/room.js). Klappen antippen, die zusammen die Augensumme ergeben –
// passende leuchten, unmögliche sind gesperrt, „Schließen“ geht nur bei genauer Summe.
'use strict';
{
  let sel = new Set();
  let selKey = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  // Klappen, die zusammen mit der Auswahl noch zu einer passenden Kombination gehören
  const reachable = (combos) => {
    const fit = combos.filter((c) => [...sel].every((f) => c.includes(f)));
    return { flaps: new Set(fit.flat()), exact: fit.some((c) => c.length === sel.size) };
  };
  const box = (S, id, interactive) => {
    const g = S.g;
    const open = new Set(g.boxes[id] || []);
    const can = interactive && g.combos ? reachable(g.combos) : null;
    const flaps = [...Array(g.flaps).keys()].map((k) => {
      const f = k + 1;
      const t = WorldKit.t;
      if (!open.has(f)) return `<span class="sb-flap shut" role="img" aria-label="${t('Klappe', 'Flap')} ${f} ${t('zu', 'shut')}"><b>${f}</b><small>${t('zu', 'shut')}</small></span>`;
      if (!can) return `<span class="sb-flap" role="img" aria-label="${t('Klappe', 'Flap')} ${f} ${t('offen', 'open')}"><b>${f}</b><small>${t('offen', 'open')}</small></span>`;
      const picked = sel.has(f);
      const ok = picked || can.flaps.has(f);
      return `<button type="button" class="sb-flap ${picked ? 'sel' : ''} ${ok && !picked ? 'fit' : ''}" data-g="flap" data-f="${f}" aria-pressed="${picked}" ${ok ? '' : 'disabled'} aria-label="${t('Klappe', 'Flap')} ${f}${picked ? ' – ' + t('ausgewählt', 'selected') : ok ? ' – ' + t('passt', 'fits') : ' – ' + t('passt nicht', 'does not fit')}"><b>${f}</b><small>${picked ? t('gewählt', 'picked') : ok ? t('passt', 'fits') : t('offen', 'open')}</small></button>`;
    }).join('');
    return `<div class="sb-box ${g.flaps > 9 ? 'twelve' : ''}" role="group" aria-label="${WorldKit.t('Box von', 'Box of')} ${nameOf(S, id)}">${flaps}<span class="sb-hinge" aria-hidden="true"></span></div>`;
  };

  const kit = kitGame({
    id: 'shutthebox',
    look(S) {
      const g = S.g;
      return Object.keys(g.boxes).map((id) => ({
        title: nameOf(S, id).replace(/&amp;/g, '&') + (id === S.you?.id ? ' (du)' : ''),
        note: (g.results[id] || []).length ? I18n.html`Ergebnisse: ${g.results[id].join(' · ')}` : 'Noch kein Ergebnis',
        html: box(S, id, false),
      }));
    },
    name: 'Shut the Box',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Würfeln', 'Wirf die zwei Würfel. Ihre Summe musst du gleich mit Klappen „bezahlen“.'],
      ['Klappen schließen', 'Tipp Klappen an, die zusammen genau die Augensumme ergeben (8 = 8 oder 5 + 3 oder 1 + 2 + 5). Passende leuchten. Dann „Schließen“ und weiterwürfeln.'],
      ['Punkte', 'Passt nichts mehr, ist dein Zug vorbei: Die offenen Klappen zählen – wenig ist gut. Alle Klappen zu gewinnt die Runde sofort.'],
    ],
    short: [
      'Würfeln, dann Klappen schließen, die zusammen genau die Augensumme ergeben – und weiterwürfeln.',
      'Passt keine Kombination mehr, endet dein Zug: Die offenen Klappen zählen als Punkte (wenig ist gut).',
      'Sind 7, 8 und 9 zu, darfst du mit einem Würfel werfen.',
      'Alle Klappen zu = Box geschlossen: 0 Punkte und die Runde ist sofort gewonnen.',
      'Nach den eingestellten Runden gewinnt die niedrigste Gesamtsumme.',
    ],
    house: () => [],
    status: (S) => (S.phase === 'playing' ? I18n.html`Runde ${S.g.sub} von ${S.g.rounds} · ${S.turnId === S.you?.id ? I18n.html('<b>Du bist dran</b>') : I18n.html`${nameOf(S, S.turnId)} ist dran`}` : null),
    playerInfo: (p) => (p.total === null || p.total === undefined ? '' : I18n.html`${p.total} Punkte${p.open ? I18n.html` · ${p.open.length} offen` : ''}`),
    // Am Platz: die Box klein (offene Klappen hell)
    seat: (p, S) => (p.open ? I18n.html`<span class="sb-mini" aria-label="${p.open.length} Klappen offen">${[...Array(S.g.flaps).keys()].map((k) => `<i class="${p.open.includes(k + 1) ? 'open' : ''}">${k + 1}</i>`).join('')}</span><span>${p.total} Punkte${p.played ? ' ✓' : ''}</span>` : ''),
    onState(S) {
      const g = S.g;
      const key = g ? `${S.roundNo}:${g.sub}:${S.turnId}:${g.dice.join(',')}:${g.pending}:${(g.boxes[S.turnId] || []).join(',')}` : '';
      if (key !== selKey) {
        selKey = key; sel = new Set();
        // Gibt es nur eine Möglichkeit, ist sie schon ausgewählt
        if (g?.combos?.length === 1) sel = new Set(g.combos[0]);
      }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} würfelt`;
      if (!g.pending) return g.canOneDie ? 'Würfle – mit einem oder zwei Würfeln (7, 8, 9 sind zu)' : I18n.t('Würfle');
      return I18n.html`Schließ Klappen, die zusammen genau <b>${g.sum}</b> ergeben – leuchtende passen`;
    },
    main(S) {
      const g = S.g;
      const active = S.turnId;
      const mine = active === S.you?.id && S.phase === 'playing';
      const dice = g.dice.length ? `<div class="sb-dice">${g.dice.map((d) => dieHTML(d, { cls: 'big' })).join('')}<b>= ${g.sum}</b></div>` : I18n.html('<p class="hint">Noch nicht gewürfelt</p>');
      const shut = g.lastShut && g.lastShut.sub === g.sub - 1 ? I18n.html`<p class="sb-banner" role="status">Box geschlossen! ${nameOf(S, g.lastShut.id)} gewinnt Runde ${g.lastShut.sub}</p>` : '';
      // Punkte je Runde
      const ids = Object.keys(g.results);
      const rows = ids.map((id) => `<tr class="${id === S.you?.id ? 'me' : ''}"><td>${nameOf(S, id)}</td>${[...Array(g.rounds).keys()].map((k) => `<td class="num">${g.results[id][k] ?? ''}</td>`).join('')}
        <td class="num"><b>${g.results[id].reduce((a, b) => a + b, 0)}</b></td></tr>`).join('');
      const table = I18n.html`<div class="sb-scores"><table class="standings"><thead><tr><th>Name</th>${[...Array(g.rounds).keys()].map((k) => I18n.html`<th class="num ${k + 1 === g.sub ? 'now' : ''}">R${k + 1}</th>`).join('')}<th class="num">Summe</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      const W = WorldKit, t = W.t, total = [...sel].reduce((x, y) => x + y, 0);
      const chips = [g.dice.length ? W.chip('🎲', `${t('Summe', 'Sum')} ${g.sum}`) : W.chip('🎲', t('Noch nicht gewürfelt', 'Not rolled yet')), mine && g.pending ? W.chip(total === g.sum ? '✓' : '＋', `${t('Gewählt', 'Picked')}: ${total}${total === g.sum ? '' : ' / ' + g.sum}`, total === g.sum ? 'good' : '') : ''].filter(Boolean);
      return `<div class="kg-table wk-stage sb-table">${W.head({ eyebrow: S.phase === 'playing' ? t(`Runde ${g.sub} von ${g.rounds}`, `Round ${g.sub} of ${g.rounds}`) : t('Spiel vorbei', 'Game over'), title: S.phase === 'playing' ? t(`Box von ${nameOf(S, active)}${mine ? ' (du)' : ''}`, `${nameOf(S, active)}'s box${mine ? ' (you)' : ''}`) : 'Shut the Box', chips })}${shut}
        <div class="sb-wood">${active && g.boxes[active] ? box(S, active, mine) : ''}${dice}</div>
        ${table}</div>`;
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      if (!g.pending) return I18n.html`<button class="btn btn-brass" data-g="roll" data-n="2">Würfeln</button>${g.canOneDie ? I18n.html('<button class="btn" data-g="roll" data-n="1">Mit einem Würfel</button>') : ''}`;
      const total = [...sel].reduce((a, b) => a + b, 0);
      const exact = g.combos && reachable(g.combos).exact && total === g.sum && sel.size;
      return I18n.html`<span class="sb-sum ${exact ? 'ok' : ''}">${sel.size ? [...sel].sort((a, b) => a - b).join(' + ') : '–'} = ${total}${exact ? ' ✓' : I18n.html` (braucht ${g.sum})`}</span>
        <button class="btn btn-brass" data-g="close" ${exact ? '' : 'disabled'}>Schließen</button>
        ${sel.size ? I18n.html('<button class="btn btn-ghost" data-g="clear">Auswahl löschen</button>') : ''}`;
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'flap') { const f = Number(t.dataset.f); if (sel.has(f)) sel.delete(f); else sel.add(f); kit.render(); }
      else if (g === 'clear') { sel = new Set(); kit.render(); }
      else if (g === 'close') send('close', { flaps: [...sel] });
      else if (g === 'roll') send('roll', { count: Number(t.dataset.n) });
    },
    rules: I18n.html`<p>Jeder hat eine Box mit Klappen 1–9 (Hausregel 1–12).</p>
      <ul>
        <li><b>Zug:</b> zwei Würfel werfen, dann Klappen schließen, deren Summe genau der Augensumme entspricht – eine oder mehrere (8 = 8 oder 5 + 3 oder 1 + 2 + 5). Dann weiterwürfeln.</li>
        <li>Sind 7, 8 und 9 zu (bei 1–12: 7 bis 12), darfst du wählen, mit nur einem Würfel zu werfen.</li>
        <li>Passt keine Kombination mehr, endet dein Zug. Deine Punkte sind die Summe der offenen Klappen – wenig ist gut (Hausregel: die offenen Klappen als Ziffern hintereinander, z. B. 1, 4, 7 = 147).</li>
        <li><b>Box geschlossen</b> (alle Klappen zu): 0 Punkte, die Runde ist sofort gewonnen. Wer in dieser Runde noch nicht dran war, bekommt die volle Summe.</li>
        <li>Nach den eingestellten Runden (Standard 5) gewinnt die niedrigste Gesamtsumme.</li>
        <li>Läuft die Zeit ab, würfelt der Computer für dich bzw. schließt die höchsten passenden Klappen.</li>
      </ul>`,
  });
}
