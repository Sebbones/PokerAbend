// Dame im Browser (Regeln: games/dame/room.js). Stein antippen, dann ein markiertes Zielfeld. Bei Mehrfachsprüngen jeden Sprung einzeln.
'use strict';
{
  const COLOR = ['Weiß', 'Schwarz'];
  const MARK = ['y', 'b'];
  let sel = null;
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const cname = (i) => `${'abcdefgh'[i % 8]}${8 - Math.floor(i / 8)}`;

  const kit = kitGame({
    id: 'dame',
    name: 'Dame',
    direction: false,
    intro: [
      ['Ziel', 'Schlag alle gegnerischen Steine oder nimm ihnen alle Züge.'],
      ['Ziehen', 'Stein antippen, dann ein leuchtendes Feld. Gewöhnliche Steine ziehen schräg vorwärts.'],
      ['Schlagzwang', 'Du musst springen, wenn du kannst – auch rückwärts. Geht ein weiterer Sprung, tipp ihn gleich an.'],
    ],
    short: [
      'Steine ziehen diagonal ein Feld vorwärts und schlagen vorwärts und rückwärts durch Überspringen.',
      'Es besteht Schlagzwang; Mehrfachsprünge müssen zu Ende gezogen werden.',
      'Wer die letzte Reihe erreicht, wird Dame (zieht und schlägt diagonal beliebig weit).',
      'Wer nicht mehr ziehen kann, verliert. Weiß fängt an.',
    ],
    house: () => [],
    playerInfo: (p) => (p.color === null || p.color === undefined ? '' : I18n.html`<span class="dm-dot dm-${p.color}">${colorMark(MARK[p.color])}</span>${COLOR[p.color]} · ${p.pieces} Steine`),
    onState(S) { if (S.turnId !== S.you?.id) sel = null; else if (S.g?.chain != null) sel = S.g.chain; },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      if (g.chain !== null) return 'Weiterspringen mit demselben Stein';
      return g.mustJump ? 'Schlagzwang: spring über einen Gegner' : sel === null ? 'Wähl einen Stein' : 'Wähl ein leuchtendes Feld';
    },
    main(S) {
      const g = S.g;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const from = sel !== null && g.legal[sel] ? sel : g.chain;
      const targets = new Set(from !== null && from !== undefined ? g.legal[from] || [] : []);
      const movable = new Set(Object.keys(g.legal).map(Number));
      const cells = g.board.map((p, i) => {
        const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
        const last = g.last && (g.last.from === i || g.last.to === i);
        let inner = '';
        if (p) {
          const c = p.toLowerCase() === 'w' ? 0 : 1;
          inner = `<span class="dm-piece dm-${c} ${p === p.toUpperCase() ? 'king' : ''} ${from === i ? 'sel' : ''}" aria-hidden="true">${p === p.toUpperCase() ? '♛' : colorMark(MARK[c])}</span>`;
        } else if (targets.has(i)) inner = '<span class="dm-hint" aria-hidden="true"></span>';
        const label = p ? `${cname(i)} ${COLOR[p.toLowerCase() === 'w' ? 0 : 1]}${p === p.toUpperCase() ? ' Dame' : ''}` : `${cname(i)}${targets.has(i) ? ', Zielfeld' : ''}`;
        const act = myTurn && ((p && movable.has(i) && g.chain === null) || targets.has(i));
        return act ? `<button type="button" class="dm-cell ${dark ? 'dark' : 'light'} can ${last ? 'last' : ''}" data-g="cell" data-c="${i}" aria-label="${label}">${inner}</button>`
          : `<div class="dm-cell ${dark ? 'dark' : 'light'} ${last ? 'last' : ''}" role="gridcell" aria-label="${label}">${inner}</div>`;
      }).join('');
      const W = WorldKit, t = W.t, n = (c) => g.board.filter((p) => p && (p.toLowerCase() === 'w' ? 0 : 1) === c).length, kings = (c) => g.board.filter((p) => p && p === p.toUpperCase() && (p.toLowerCase() === 'w' ? 0 : 1) === c).length;
      const chips = [W.chip('○', `${t('Weiß', 'White')} ${n(0)}${kings(0) ? ` (♛ ${kings(0)})` : ''}`), W.chip('●', `${t('Schwarz', 'Black')} ${n(1)}${kings(1) ? ` (♛ ${kings(1)})` : ''}`), g.chain !== null && g.chain !== undefined ? W.chip('⚔', t('Mehrfachschlag: weiterziehen', 'Multi-jump: keep going'), 'warn') : '', sel !== null && myTurn ? W.chip('✔', `${t('Gewählt', 'Selected')}: ${cname(sel)}`, 'good') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table dm-wrap wk-stage dm-stage">${W.head({ eyebrow: t('Turnierbrett', 'Tournament board'), title: myTurn ? t('Du bist dran', 'Your turn') : t('Am Zug', 'On the move'), chips })}<div class="dm-board" role="grid" aria-label="Spielfeld">${cells}</div></div>`;
    },
    dock: () => '',
    onClick(t, S) {
      if (t.dataset.g !== 'cell') return;
      const i = Number(t.dataset.c);
      const g = S.g;
      const from = sel !== null && g.legal[sel] ? sel : g.chain;
      if (from !== null && from !== undefined && (g.legal[from] || []).includes(i)) { sel = null; send('move', { from, to: i }); return; }
      if (g.legal[i]) { sel = sel === i ? null : i; kit.render(); }
    },
    rules: I18n.html`<p>Deutsche Dame auf 8 × 8 Feldern, gezogen wird nur auf den dunklen. Weiß (wer die Partie anfängt) beginnt.</p>
      <ul>
        <li>Gewöhnliche Steine ziehen <b>schräg ein Feld vorwärts</b>. Sie <b>schlagen</b> vorwärts <b>und rückwärts</b>, indem sie einen Gegner überspringen.</li>
        <li>Es besteht <b>Schlagzwang</b>. Geht nach einem Sprung ein weiterer Sprung mit demselben Stein, muss er gezogen werden (tipp ihn einzeln an).</li>
        <li>Erreicht ein Stein die letzte Reihe, wird er <b>Dame</b> und der Zug endet. Damen ziehen und schlagen diagonal <b>beliebig weit</b>.</li>
        <li>Wer keinen Stein mehr hat oder nicht mehr ziehen kann, verliert. Nach 50 Zügen ohne Schlag und ohne Steinzug ist es unentschieden.</li>
        <li>Läuft die Zeit pro Zug ab, zieht der Computer für dich.</li>
      </ul>`,
  });
}
