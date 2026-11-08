// Präsident im Browser (Regeln: games/praesident/room.js). Karten gleichen Werts antippen, „Ablegen“ oder „Passen“.
'use strict';
{
  let sel = new Set();
  const ORDER = '3456789TJQKA2';
  const RANK_NAME = { T: 'Zehner', J: 'Buben', Q: 'Damen', K: 'Könige', A: 'Asse', 2: 'Zweier' };
  const rn = (r) => I18n.language === 'en' ? ({A:'aces',2:'twos',3:'threes',4:'fours',5:'fives',6:'sixes',7:'sevens',8:'eights',9:'nines',T:'tens',J:'jacks',Q:'queens',K:'kings'}[r] || r) : RANK_NAME[r] || I18n.html`${r}er`;
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const pw = (c) => ORDER.indexOf(c[0]);

  const kit = kitGame({
    id: 'praesident',
    name: 'Präsident',
    intro: [
      ['Ziel', 'Wirf deine Karten als Erster ab – dann wirst du Präsident.'],
      ['Überbieten', 'Leg gleich viele Karten gleichen Werts, aber höher als die auf dem Tisch. Die Zwei ist die höchste Karte.'],
      ['Passen', 'Kannst oder willst du nicht, pass. Haben alle gepasst, ist der Tisch frei.'],
    ],
    short: [
      'Rangfolge: 3 niedrig … Ass, 2 am höchsten.',
      'Spiel 1 bis 4 gleiche Karten; danach muss man mit genau so vielen höheren überbieten – oder passen.',
      'Haben alle anderen gepasst, spielt der letzte Spieler neu aus.',
      'Wer zuerst keine Karten mehr hat, wird Präsident. In der nächsten Runde tauscht das Schlusslicht seine beste Karte gegen die schlechteste des Präsidenten.',
    ],
    house: () => [],
    playerInfo: (p) => (p.place ? I18n.html`${p.place}. Platz` : I18n.html`${p.cards} Karte${p.cards === 1 ? '' : 'n'}`),
    seat: (p) => (p.place ? I18n.html`<span>${p.place}. Platz</span>` : I18n.html`${fanHTML(p.cards)}<span>${p.cards} Karte${p.cards === 1 ? '' : 'n'}</span>`),
    onState(S) {
      const h = new Set(S.g?.hand || []);
      sel = new Set([...sel].filter((c) => h.has(c)));
      if (S.turnId !== S.you?.id) sel = new Set();
    },
    hint(S, myTurn) {
      const t = S.g.table;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      return t ? I18n.html`Überbiete ${t.count} × ${rn(t.rank)} mit ${t.count} höheren Karten – oder passe` : I18n.t('Du spielst aus: 1 bis 4 Karten gleichen Werts');
    },
    main(S) {
      const g = S.g;
      const t = g.table;
      const table = t ? I18n.html`<div class="pr-table"><small>${nameOf(S, t.by)} hat gelegt</small><div class="pr-cards">${t.cards.map((c) => frenchCard(c, { cls: 'big', attrs: 'disabled tabindex="-1"' })).join('')}</div></div>`
        : I18n.html('<div class="pr-table empty"><small>Der Tisch ist frei – wer dran ist, spielt aus</small></div>');
      const passed = g.passed.length ? I18n.html`<div class="kg-chip">Gepasst: ${g.passed.map((id) => nameOf(S, id)).join(', ')}</div>` : '';
      const places = g.places.length ? I18n.html`<div class="kg-chip">Fertig: ${g.places.map((id, i) => `${i + 1}. ${nameOf(S, id)}`).join(' · ')}</div>` : '';
      const ex = g.exchange ? I18n.html`<div class="kg-chip">Kartentausch: ${nameOf(S, g.exchange.from)} → ${nameOf(S, g.exchange.to)} ${frenchCard(g.exchange.gave, { cls: 'mini', attrs: 'disabled tabindex="-1"' })}</div>` : '';
      const W = WorldKit, tr = W.t, left = S.players.filter((p) => p.inRound && !g.places.includes(p.id)).length;
      const chips = [t ? W.chip('♠', `${tr('Aktuell', 'Current')}: ${t.count} × ${t.rank}`, 'warn') : W.chip('✦', tr('Freie Ausspielrunde', 'Free lead')), g.passed.length ? W.chip('⏭', `${tr('Gepasst', 'Passed')}: ${g.passed.length}`) : '', W.chip('⚑', `${left} ${tr('Plätze offen', 'places open')}`)].filter(Boolean);
      return `<div class="kg-table pr-wrap wk-stage pr-stage">${W.head({ eyebrow: tr('Clubtisch', 'Club table'), title: t ? tr('Kombination am Tisch', 'Combination on the table') : tr('Der Tisch ist frei', 'The table is free'), chips })}${table}<div class="kg-chips">${passed}${places}${ex}</div></div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const t = g.table;
      const counts = {};
      for (const c of g.hand || []) counts[c[0]] = (counts[c[0]] || 0) + 1;
      const fits = (c) => myTurn && (!t || (counts[c[0]] >= t.count && pw(c) > ORDER.indexOf(t.rank)));
      const hand = (g.hand || []).map((c) => frenchCard(c, { cls: `${sel.has(c) ? 'sel' : ''} ${fits(c) ? 'can' : ''}`, attrs: myTurn ? `data-g="pick" data-c="${c}"` : 'disabled' })).join('');
      const n = sel.size;
      const ok = n && (!t || n === t.count);
      const acts = myTurn ? `<button class="btn btn-brass" data-g="play" ${ok ? '' : 'disabled'}>${n ? I18n.html`${n} × ${rn([...sel][0][0])} ablegen` : I18n.t('Karten wählen')}</button>
        ${g.canPass ? I18n.html('<button class="btn" data-g="pass">Passen</button>') : ''}` : '';
      return I18n.html`<div class="kg-hand" role="group" aria-label="Deine Karten">${hand}</div><div class="kg-acts">${acts}</div>`;
    },
    onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'pick') {
        const c = t.dataset.c;
        if (sel.has(c)) sel.delete(c);
        else { if ([...sel].some((x) => x[0] !== c[0])) sel = new Set(); sel.add(c); } // nur gleiche Werte zusammen
        kit.render();
      } else if (g === 'play') { const cards = [...sel]; sel = new Set(); send('play', { cards }); }
      else if (g === 'pass') { sel = new Set(); send('pass'); }
    },
    rules: I18n.html`<p>52 Karten, alle werden verteilt. Rangfolge (niedrig → hoch): <b>3 4 5 6 7 8 9 10 B D K A 2</b>.</p>
      <ul>
        <li>Der Starter legt 1 bis 4 Karten gleichen Werts. Danach muss man mit <b>genau so vielen</b> Karten <b>höheren Werts</b> überbieten – oder <b>passen</b>.</li>
        <li>Haben alle anderen gepasst, ist der Tisch frei. Wer zuletzt gelegt hat, spielt neu aus.</li>
        <li>Wer keine Karten mehr hat, belegt den nächsten Rang: <b>Präsident</b>, Vizepräsident … bis zum Schlusslicht.</li>
        <li>In der nächsten Runde gibt das <b>Schlusslicht</b> seine beste Karte an den Präsidenten und bekommt dessen schlechteste. Der Präsident spielt aus.</li>
        <li>Punkte: Präsident bekommt die meisten, das Schlusslicht keinen.</li>
      </ul>`,
  });
}
