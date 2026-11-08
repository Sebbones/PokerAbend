// Blackjack im Browser (Regeln: games/blackjack/room.js). Die verdeckte Dealerkarte kennt diese Seite erst nach dem Aufdecken.
'use strict';
{
  let amount = null;   // gewählter Einsatz
  const fmt = (n) => Number(n || 0).toLocaleString(I18n.locale);
  const sign = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '±0');
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const card = (c, cls = '') => (c ? frenchCard(c, { cls, attrs: 'disabled tabindex="-1"' }) : backCard());
  const handTotal = (h) => `${h.natural ? 'Blackjack' : h.total > 21 ? I18n.html`${h.total} – über 21` : `${h.soft && h.total < 21 ? 'Soft ' : ''}${h.total}`}`;

  const kit = kitGame({
    id: 'blackjack',
    name: 'Blackjack',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Setzen', 'Wähle deinen Einsatz mit den Chip-Knöpfen und tipp „Setzen“. Gegeben wird, wenn alle gesetzt haben.'],
      ['Spielen', I18n.html('So nah wie möglich an 21, ohne drüber: <b>Karte</b> oder <b>Stehen</b>. Mit zwei Karten auch <b>Verdoppeln</b>, bei gleichem Wert <b>Teilen</b>.')],
      ['Gewinnen', 'Höher als der Dealer (oder er über 21) = Einsatz doppelt zurück. Blackjack (Ass + Zehn) zahlt 3:2.'],
    ],
    short: [
      'Ziel: näher an 21 als der Dealer, ohne über 21 zu kommen. Ass = 1 oder 11, Bilder = 10.',
      I18n.html('<b>Karte</b> nimmt eine weitere Karte, <b>Stehen</b> beendet die Hand.'),
      I18n.html('<b>Verdoppeln</b>: nur mit zwei Karten – doppelter Einsatz, genau eine Karte.'),
      I18n.html('<b>Teilen</b>: zwei Karten gleichen Werts werden zwei Hände (einmal; geteilte Asse bekommen je nur eine Karte).'),
      'Der Dealer zieht bis mindestens 17. Blackjack zahlt 3:2, Gewinn 1:1, Gleichstand gibt den Einsatz zurück.',
    ],
    house: () => [],
    status: (S) => (S.g?.step === 'bet' ? I18n.html`Hand #${S.roundNo} · Einsätze` : S.g?.step === 'insure' ? I18n.html`Hand #${S.roundNo} · Versicherung?` : null),
    playerInfo: (p, S) => I18n.html`${fmt(p.stack)} Chips${S.phase === 'playing' && S.g?.bets?.[p.id] ? I18n.html` · Einsatz ${fmt(S.g.bets[p.id])}` : S.g?.step === 'bet' && p.inRound ? (p.decided ? ' · setzt aus' : ' · setzt noch') : ''}`,
    // „Stand“: Chips aller Spieler und der Bank
    standExtra(S) {
      const list = S.players.filter((p) => p.stack !== null && p.stack !== undefined);
      if (!list.length) return '';
      return I18n.html`<h3>Chips</h3><table class="standings"><thead><tr><th>Name</th><th class="num">Chips</th><th class="num">Nachgekauft</th></tr></thead><tbody>
        ${list.map((p) => `<tr><td><span class="mini-av">${avatarHTML(p)}</span> ${esc(p.name)}</td><td class="num">${fmt(p.stack)}</td><td class="num">${p.rebuys ? `${p.rebuys}×` : '–'}</td></tr>`).join('')}
        </tbody></table><p class="hint">Bank über den Abend: <b>${sign(S.chips?.bank || 0)}</b></p>`;
    },
    onState(S, prev) {
      if (S.g?.step === 'bet' && prev?.g?.step !== 'bet') amount = null;
    },
    hint(S, myTurn) {
      const g = S.g;
      const inHand = S.you?.inRound;
      if (g.step === 'bet') {
        if (!inHand) return 'Die anderen setzen gerade';
        if (g.bets[S.you.id]) return I18n.html`Gesetzt: ${fmt(g.bets[S.you.id])} – warte auf die anderen`;
        if (S.players.find((p) => p.id === S.you.id)?.decided) return 'Du setzt diese Hand aus';
        if (g.stack < g.minBet) return g.canRebuy ? 'Zu wenig Chips – kauf nach oder setz aus' : 'Zu wenig Chips – du setzt aus';
        return I18n.html`Wähl deinen Einsatz (${fmt(g.minBet)} bis ${fmt(Math.min(g.maxBet, g.stack))}) und tipp „Setzen“`;
      }
      if (g.step === 'insure') return myTurn || (inHand && !S.players.find((p) => p.id === S.you.id)?.decided) ? 'Der Dealer zeigt ein Ass – willst du dich versichern (halber Einsatz, zahlt 2:1)?' : 'Versicherung: warte auf die anderen';
      if (g.step === 'play') {
        if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
        const h = g.hands[S.you.id][g.handIdx];
        const of = g.hands[S.you.id].length > 1 ? I18n.html` (Hand ${g.handIdx + 1} von ${g.hands[S.you.id].length})` : '';
        return I18n.html`Du hast <b>${handTotal(h)}</b>${of} – Karte oder Stehen?`;
      }
      return '';
    },
    main(S) {
      const g = S.g;
      const d = g.dealer;
      const dealerText = !d.cards.length ? 'wartet auf die Einsätze' : d.cards[1] === null ? I18n.html`zeigt ${d.total}` : d.blackjack ? 'Blackjack!' : d.total > 21 ? I18n.html`${d.total} – über 21` : String(d.total);
      const shoePct = Math.round((g.shoe / g.shoeSize) * 100);
      const dealer = I18n.html`<div class="bj-dealer"><div class="bj-dealer-head"><b>Dealer</b><span class="bj-total">${dealerText}</span></div>
        <div class="bj-cards">${d.cards.map((c) => card(c, 'big')).join('') || '<span class="kc kc-empty big"></span><span class="kc kc-empty big"></span>'}</div>
        <small class="bj-shoe">Schlitten: ${g.shoe} Karten (${shoePct} %) · Bank ${sign(g.bank)} · Einsatz ${fmt(g.minBet)}–${fmt(g.maxBet)}</small></div>`;
      // Alle Hände am Tisch (in Blackjack offen) – Einsatz, Summe, nach der Abrechnung das Ergebnis
      const ids = S.players.filter((p) => p.inRound).map((p) => p.id);
      const boxes = ids.map((id) => {
        const hs = g.hands[id];
        const cur = g.step === 'play' && S.turnId === id;
        const bet = g.bets[id];
        if (!hs) return `<div class="bj-seat ${id === S.you?.id ? 'me' : ''}"><b>${nameOf(S, id)}</b><small>${bet ? I18n.html`Einsatz ${fmt(bet)}` : S.players.find((p) => p.id === id)?.decided ? 'setzt aus' : 'setzt noch …'}</small></div>`;
        return `<div class="bj-seat ${id === S.you?.id ? 'me' : ''} ${cur ? 'turn' : ''}"><b>${nameOf(S, id)}${id === S.you?.id ? I18n.html(' <small>(du)</small>') : ''}</b>
          ${hs.map((h, k) => I18n.html`<div class="bj-hand ${cur && k === g.handIdx ? 'now' : ''} ${h.total > 21 ? 'bust' : ''}">
            <div class="bj-cards small">${h.cards.map((c) => card(c)).join('')}</div>
            <span class="bj-chip" aria-label="Einsatz ${fmt(h.bet)}">${fmt(h.bet)}${h.doubled ? ' ×2' : ''}</span><span class="bj-total">${handTotal(h)}</span></div>`).join('')}
          ${g.insured[id] ? I18n.html`<small>versichert ${fmt(g.insured[id])}</small>` : ''}
          ${g.detail?.[id] ? `<small class="bj-res">${esc(g.detail[id])}</small>` : ''}</div>`;
      }).join('');
      const rebuy = S.phase === 'over' && S.chips?.canRebuy ? I18n.html('<button class="btn" data-g="rebuy">Nachkaufen</button>') : '';
      return `<div class="kg-table bj-table">${dealer}<div class="bj-seats">${boxes}</div>${rebuy}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const me = S.you.id;
      const meP = S.players.find((p) => p.id === me);
      const host = S.you.isHost && g.step === 'bet' && S.players.some((p) => p.inRound && !p.decided) ? I18n.html('<button class="btn btn-ghost" data-g="dealNow" title="Wer noch nicht gesetzt hat, setzt diese Hand aus">Jetzt geben</button>') : '';
      if (g.step === 'bet') {
        if (meP?.decided) return `<span class="waiting">${g.bets[me] ? I18n.html`Einsatz ${fmt(g.bets[me])} – noch ${fmt(g.stack)} Chips` : 'Du setzt aus'}</span>${host}`;
        if (g.stack < g.minBet) return I18n.html`${g.canRebuy ? I18n.html('<button class="btn btn-brass" data-g="rebuy">Nachkaufen</button>') : ''}<button class="btn" data-g="sitOut">Aussetzen</button>${host}`;
        const max = Math.min(g.maxBet, g.stack);
        if (amount === null) amount = Math.min(max, Math.max(g.minBet, g.minBet * 5));
        amount = Math.min(max, Math.max(g.minBet, amount));
        const chips = [g.minBet, 25, 50, 100, 500].filter((v, i, a) => v <= max && a.indexOf(v) === i);
        return I18n.html`<div class="bj-bet" role="group" aria-label="Einsatz">
            <span class="bj-stack">Deine Chips: <b>${fmt(g.stack)}</b></span>
            <div class="bj-chips">${chips.map((v) => `<button class="btn bj-c" data-g="add" data-v="${v}">+${fmt(v)}</button>`).join('')}
              <button class="btn btn-ghost" data-g="resetBet">Min</button><button class="btn btn-ghost" data-g="maxBet">Max</button></div>
            <label class="bj-amount"><span class="sr-only">Einsatz</span><input type="number" class="input" data-g="amount" min="${g.minBet}" max="${max}" value="${amount}"></label>
          </div>
          <div class="kg-acts"><button class="btn btn-brass" data-g="bet">Setzen: ${fmt(amount)}</button><button class="btn" data-g="sitOut">Aussetzen</button>${host}</div>`;
      }
      if (g.step === 'insure') {
        if (meP?.decided) return I18n.html('<span class="waiting">Warte auf die anderen</span>');
        return I18n.html`<button class="btn" data-g="insure" data-yes="1">Versichern (${fmt(Math.floor((g.bets[me] || 0) / 2))})</button><button class="btn btn-brass" data-g="insure" data-yes="">Keine Versicherung</button>`;
      }
      if (g.step === 'play') {
        const hs = g.hands[me] || [];
        const mine = hs.map((h, k) => `<div class="bj-hand big ${myTurn && k === g.handIdx ? 'now' : ''}">${h.cards.map((c) => card(c)).join('')}<span class="bj-total">${handTotal(h)}</span></div>`).join('');
        const acts = myTurn ? I18n.html`<button class="btn btn-brass" data-g="hit">Karte</button><button class="btn" data-g="stay">Stehen</button>
          ${g.canDouble ? I18n.html('<button class="btn" data-g="double">Verdoppeln</button>') : ''}${g.canSplit ? I18n.html('<button class="btn" data-g="split">Teilen</button>') : ''}` : '';
        return `<div class="kg-hand bj-mine">${mine}</div><div class="kg-acts">${acts}</div>`;
      }
      return '';
    },
    onChange(t) { if (t.dataset.g === 'amount') { amount = Math.floor(Number(t.value)) || amount; kit.render(); } },
    onClick(t, S) {
      const g = t.dataset.g;
      const max = Math.min(S.g.maxBet, S.g.stack ?? 0);
      if (g === 'add') { amount = Math.min(max, amount + Number(t.dataset.v)); kit.render(); }
      else if (g === 'resetBet') { amount = S.g.minBet; kit.render(); }
      else if (g === 'maxBet') { amount = max; kit.render(); }
      else if (g === 'bet') send('bet', { amount });
      else if (['sitOut', 'dealNow', 'hit', 'stay', 'double', 'split', 'rebuy'].includes(g)) send(g);
      else if (g === 'insure') send('insure', { yes: !!t.dataset.yes });
    },
    rules: I18n.html`<p>Gespielt wird gegen den Dealer (die Bank) mit 6 Decks. Ziel: näher an 21 als der Dealer, ohne über 21 zu kommen.</p>
      <ul>
        <li><b>Werte:</b> 2–10 nach Augen, Bube, Dame, König 10, Ass 1 oder 11.</li>
        <li><b>Ablauf:</b> Alle setzen (Mindest- und Höchsteinsatz stehen am Tisch). Jeder bekommt 2 offene Karten, der Dealer eine offene und eine verdeckte.</li>
        <li>Zeigt der Dealer ein Ass oder eine Zehn, schaut er nach Blackjack – hat er einen, wird sofort abgerechnet.</li>
        <li><b>Karte</b> nimmt eine weitere Karte, <b>Stehen</b> beendet die Hand. <b>Verdoppeln</b> geht nur mit den ersten zwei Karten: doppelter Einsatz, genau eine Karte.</li>
        <li><b>Teilen</b> bei zwei Karten gleichen Werts (auch König und Dame) – einmal pro Hand. Geteilte Asse bekommen je nur eine Karte. Ein Blackjack nach dem Teilen zählt als 21.</li>
        <li>Der Dealer zieht bis mindestens 17 und bleibt auf Soft 17 stehen (Hausregel: zieht auf Soft 17).</li>
        <li><b>Auszahlung:</b> Blackjack 3:2 (abgerundet), Gewinn 1:1, Gleichstand: Einsatz zurück. Über 21 ist verloren.</li>
        <li>Hausregel <b>Versicherung</b>: Zeigt der Dealer ein Ass, kann man den halben Einsatz versichern – zahlt 2:1, wenn er Blackjack hat.</li>
        <li>Wer keine Chips mehr hat, kann nachkaufen (so oft, wie der Host erlaubt). Unter „Stand“ stehen alle Chips und das Ergebnis der Bank.</li>
      </ul>`,
  });
}
