// Schwimmen (31) im Browser (Regeln: games/schwimmen/room.js). Kartenblatt französisch oder deutsch (Schalter unter „Ich“).
// Tauschen: eine eigene Karte und eine aus der Mitte antippen (egal in welcher Reihenfolge) – oder ziehen (Maus).
'use strict';
{
  const POINTS = { 7: 7, 8: 8, 9: 9, T: 10, J: 10, Q: 10, K: 10, A: 11 };
  const SUITS = 'cshd';
  // Wert wie auf dem Server: höchste Farbe, drei gleiche 30½, mit Feuer drei Asse 33 – plus welche Farbe zählt
  function value(cards, fire) {
    if (cards.length === 3 && cards.every((c) => c[0] === cards[0][0])) return { v: fire && cards[0][0] === 'A' ? 33 : 30.5, suit: null };
    let best = { v: 0, suit: null };
    for (const s of SUITS) { const v = cards.filter((c) => c[1] === s).reduce((a, c) => a + POINTS[c[0]], 0); if (v > best.v) best = { v, suit: s }; }
    return best;
  }
  const vText = (v) => (v === 30.5 ? '30½' : String(v));
  let sel = null;          // { side: 'hand' | 'mid', i }
  let closedDeal = 0;      // „Letzter Durchgang“ zugeklappt bis zu diesem Durchgang
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const lives = (p) => I18n.html`<span class="lives" aria-hidden="true">${'♥'.repeat(p.lives || 0)}</span><span class="sr-only">${p.lives} Leben</span>`;
  const badges = (p) => `${p.swimming ? I18n.html('<b class="sw-badge swim">schwimmt</b>') : ''}${p.knocked ? I18n.html('<b class="sw-badge knock">klopft</b>') : ''}`;

  const kit = kitGame({
    id: 'schwimmen',
    look: (S) => [{ title: 'Tausche in dieser Runde', note: 'Links die Karten, die abgegeben wurden, rechts die genommenen – alle liegen offen in der Mitte.',
      html: lookMoves(S.moves, { filter: (m) => /^tauscht/.test(m.t), n: 20, detail: (m) => (m.d ? `<span class="sw-mini">${m.d.gave.map((c) => deckCard(c, { attrs: 'disabled tabindex="-1"' })).join('')}</span> → <span class="sw-mini">${m.d.took.map((c) => deckCard(c, { attrs: 'disabled tabindex="-1"' })).join('')}</span>` : '') }) }],
    moveDetail: () => '',
    name: 'Schwimmen',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Ziel', I18n.html('Sammle in <b>einer Farbe</b> möglichst viele Punkte: Ass 11, Bilder 10, Zahlen nach Augen. 31 ist das Höchste.')],
      ['Dein Zug', 'Tipp eine deiner Karten und eine aus der Mitte an – dann tauschen sie. Oder alle drei tauschen, schieben oder klopfen.'],
      ['Leben', 'Wer am Ende eines Durchgangs am wenigsten hat, verliert ein Leben. Ohne Leben schwimmst du noch einmal mit – danach bist du raus.'],
    ],
    short: [
      I18n.html('Gezählt wird nur die beste <b>Farbe</b>: Ass 11, König/Dame/Bube 10, Zahlen nach Augen. Drei gleiche Werte = 30½.'),
      'Zug: eine Karte mit der Mitte tauschen, alle drei tauschen, schieben oder klopfen.',
      'Schieben alle hintereinander, kommen neue Karten in die Mitte.',
      'Klopfen (ab der zweiten Runde): jeder andere hat noch einen Zug, dann wird aufgedeckt.',
      '31 (Ass + zwei Zehner einer Farbe) beendet den Durchgang sofort.',
      'Die Niedrigsten verlieren ein Leben. Ohne Leben schwimmt man – wer dann verliert, ist raus. Der Letzte gewinnt.',
    ],
    house: () => [],
    prefs: deckPrefHTML,
    translate: deckTranslate,
    playerInfo: (p) => (p.out ? 'raus' : `${lives(p)}${badges(p)}`),
    seat: (p) => (p.out ? I18n.html('<span>raus</span>') : `${fanHTML(3)}${lives(p)}${badges(p)}`),
    sounds(S, prev) {
      if (prev.g && S.g && S.g.dealNo !== prev.g.dealNo) return 'shuffle';
      return null;
    },
    onState(S, prev) {
      if (S.turnId !== S.you?.id || prev?.g?.dealNo !== S.g?.dealNo) sel = null;
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran${g.knocker ? ' – letzter Zug nach dem Klopfen' : ''}`;
      if (sel?.side === 'hand') return 'Jetzt eine Karte aus der Mitte antippen – die beiden tauschen';
      if (sel?.side === 'mid') return 'Jetzt eine deiner Karten antippen – die beiden tauschen';
      if (g.lastTurn) return I18n.html`${nameOf(S, g.knocker)} hat geklopft – dein letzter Zug: tauschen oder schieben`;
      return 'Tipp eine deiner Karten und eine aus der Mitte an – oder alle drei tauschen, schieben, klopfen';
    },
    main(S) {
      const g = S.g;
      const myTurn = S.turnId === S.you?.id;
      const fire = S.settings.fire;
      const mid = g.middle.map((c, i) => deckCard(c, {
        cls: I18n.html`big ${sel?.side === 'mid' && sel.i === i ? 'sel' : ''} ${myTurn && sel?.side === 'hand' ? 'can' : ''}`,
        attrs: myTurn ? `data-g="mid" data-i="${i}" data-drop="mid"` : 'disabled',
      })).join('');
      const knock = g.knocker ? I18n.html`<div class="kg-chip warn">${nameOf(S, g.knocker)} hat geklopft – jeder hat noch einen Zug</div>` : '';
      const passes = g.passStreak ? I18n.html`<div class="kg-chip">${g.passStreak} von ${S.players.filter((p) => p.inRound).length} haben geschoben</div>` : '';
      // Eigener Wert groß
      let mine = '';
      if (g.hand) {
        const v = value(g.hand, fire);
        mine = I18n.html`<div class="sw-value" role="status"><small>Dein Wert</small><b>${vText(v.v)}</b>${v.suit ? I18n.html`<span>in ${deckSuitSign(v.suit)} ${esc(deckSuitName(v.suit))}</span>` : I18n.html('<span>drei gleiche</span>')}</div>`;
      }
      // Aufgedeckt: letzter Durchgang
      let last = '';
      const L = g.lastDeal;
      if (L) {
        const why = L.reason === '31' ? I18n.html`${nameOf(S, L.hero)} hatte 31!` : L.reason === 'feuer' ? I18n.html`Feuer! ${nameOf(S, L.hero)} hatte drei Asse` : L.knocker ? I18n.html`${nameOf(S, L.knocker)} hatte geklopft` : 'Aufgedeckt';
        const ids = Object.keys(L.hands).sort((a, b) => L.values[b] - L.values[a]);
        last = I18n.html`<details class="sw-last" ${closedDeal >= L.no ? '' : 'open'} data-deal="${L.no}">
          <summary>Durchgang ${L.no}: ${why}</summary>
          <ol>${ids.map((id) => {
            const lost = L.losers.includes(id);
            const p = S.players.find((x) => x.id === id);
            const fate = !lost ? '' : p?.out ? 'ist raus' : p?.swimming && !p?.lives ? 'verliert – schwimmt' : 'verliert ein Leben';
            return `<li class="${lost ? 'lost' : ''}"><b>${nameOf(S, id)}</b><span class="sw-mini">${L.hands[id].map((c) => deckCard(c, { attrs: 'disabled tabindex="-1"' })).join('')}</span>
              <span class="sw-v">${vText(L.values[id])}</span><small>${lost ? `✗ ${fate}` : ''}</small></li>`;
          }).join('')}</ol></details>`;
      }
      const W = WorldKit, t = W.t;
      const chips = [W.chip('♣', `${g.middle.length} ${t('Mittelkarten', 'middle cards')}`), g.knocker ? W.chip('✊', `${t('Geklopft', 'Knocked')}: ${nameOf(S, g.knocker)} – ${t('letzte Chance', 'last chance')}`, 'warn') : W.chip('…', t('Noch nicht geklopft', 'Nobody knocked yet')), g.hand ? W.chip('★', `${t('Dein Wert', 'Your value')} ${vText(value(g.hand, fire).v)}`, value(g.hand, fire).v >= 31 ? 'good' : '') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table sw-table wk-stage sw-stage">${W.head({ eyebrow: t('Bistrotisch', 'Bistro table'), title: myTurn ? t('Du bist dran', 'Your turn') : t('Drei Karten in der Mitte', 'Three cards in the middle'), chips })}
        <div class="sw-center">
          <div class="sw-mid" role="group" aria-label="Mitte">${mid}</div>
          ${mine}
        </div>
        <div class="kg-chips">${knock}${passes}</div>
        ${last}
      </div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const hand = (g.hand || []).map((c, i) => deckCard(c, {
        cls: `${sel?.side === 'hand' && sel.i === i ? 'sel' : ''} ${myTurn && sel?.side === 'mid' ? 'can' : ''}`,
        attrs: myTurn ? `data-g="hand" data-i="${i}" data-drag="h${i}"` : 'disabled',
      })).join('');
      let acts = '';
      if (myTurn) {
        acts = I18n.html`<button class="btn" data-g="swapAll">Alle drei tauschen</button>
          ${S.settings.passing ? I18n.html('<button class="btn" data-g="pass">Schieben</button>') : ''}
          ${g.knocker ? '' : I18n.html`<button class="btn ${g.canKnock ? 'btn-brass' : ''}" data-g="knock" ${g.canKnock ? '' : 'disabled title="Klopfen geht erst ab der zweiten Runde"'}>Klopfen</button>`}
          ${sel ? I18n.html('<button class="btn btn-ghost" data-g="nosel">Abbrechen</button>') : ''}`;
      }
      return I18n.html`<div class="kg-hand" role="group" aria-label="Deine Karten">${hand}</div><div class="kg-acts">${acts}</div>`;
    },
    // Ziehen (Maus): eigene Karte auf eine Karte der Mitte = tauschen
    onDrop(src, z) {
      if (z.dataset.drop === 'mid' && src.dataset.g === 'hand') { sel = null; send('swap', { hand: Number(src.dataset.i), middle: Number(z.dataset.i) }); }
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'hand' || g === 'mid') {
        const side = g, i = Number(t.dataset.i);
        if (sel && sel.side !== side) {
          const hand = side === 'hand' ? i : sel.i, middle = side === 'mid' ? i : sel.i;
          sel = null;
          send('swap', { hand, middle });
        } else { sel = sel?.side === side && sel.i === i ? null : { side, i }; kit.render(); }
      } else if (g === 'swapAll') { sel = null; send('swapAll'); }
      else if (g === 'pass') { sel = null; send('pass'); }
      else if (g === 'knock') { sel = null; send('knock'); }
      else if (g === 'nosel') { sel = null; kit.render(); }
    },
    rules: I18n.html`<p>32 Karten (7 bis Ass). Jeder hat 3 Karten, 3 liegen offen in der Mitte.</p>
      <p><b>Wert:</b> Gezählt wird nur die höchste Summe <b>einer Farbe</b> – Ass 11, König, Dame, Bube 10, Zahlen nach Augen. Drei gleiche Werte (z. B. drei 8er) = 30½. Das Beste ist <b>31</b>: Ass und zwei Zehnerkarten einer Farbe.</p>
      <ul>
        <li><b>Zug:</b> eine Karte mit der Mitte tauschen, alle drei tauschen, schieben (nichts tun) oder klopfen.</li>
        <li>Schieben alle hintereinander, kommen neue Karten in die Mitte.</li>
        <li><b>Klopfen</b> geht ab der zweiten Runde und ersetzt deinen Zug. Danach hat jeder andere noch genau einen Zug, dann wird aufgedeckt.</li>
        <li>Hat jemand <b>31</b>, endet der Durchgang sofort.</li>
        <li>Wer am wenigsten hat, verliert ein Leben – bei Gleichstand alle Betroffenen. Der Verlierer fängt den nächsten Durchgang an.</li>
        <li>Ohne Leben <b>schwimmt</b> man und spielt noch einmal mit. Wer dann wieder verliert, ist raus. Der Letzte gewinnt das Spiel.</li>
        <li>Hausregel <b>Feuer</b>: drei Asse = 33 – alle anderen verlieren sofort ein Leben.</li>
      </ul>`,
  });
  // „Letzter Durchgang“ zuklappen merkt sich, welcher Durchgang es war
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches?.('.sw-last') && !d.open) closedDeal = Math.max(closedDeal, Number(d.dataset.deal));
  }, true);
}
