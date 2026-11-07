// Reversi im Browser (Regeln: games/reversi/room.js). Ein leuchtender Punkt zeigt, wo man setzen darf; letzter Stein und umgedrehte Steine sind markiert.
'use strict';
{
  const COLOR = ['Schwarz', 'Weiß'];
  const MARK = ['b', 'y']; // Farbsymbole für die Farbenblind-Hilfe: Raute, Kreis (Weiß)
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const cname = (i) => `${'ABCDEFGH'[i % 8]}${Math.floor(i / 8) + 1}`;

  const kit = kitGame({
    id: 'reversi',
    name: 'Reversi',
    direction: false,
    intro: [
      ['Ziel', 'Am Ende sollen dir mehr Steine gehören als deinem Gegner.'],
      ['Dein Zug', 'Tipp ein Feld mit leuchtendem Punkt an. Gegnerische Steine, die du einschließt, drehen sich um.'],
      ['Ecken', 'Ecken kann dir niemand mehr wegnehmen – sie sind besonders wertvoll.'],
    ],
    short: [
      'Du setzt einen Stein so, dass eine Reihe gegnerischer Steine zwischen ihm und einem eigenen Stein liegt – alle diese Steine drehen sich um.',
      'Kannst du nicht setzen, wird für dich gepasst.',
      'Ist das Brett voll oder kann keiner mehr setzen, gewinnt, wem mehr Steine gehören.',
      'Schwarz fängt an: das ist, wer die Partie beginnt.',
    ],
    house: () => [],
    playerInfo: (p) => (p.color === null || p.color === undefined ? '' : I18n.html`<span class="rv-dot rv-${p.color}">${colorMark(MARK[p.color])}</span>${COLOR[p.color]} · ${p.discs} Steine`),
    hint(S, myTurn) {
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      return S.g.legal.length ? 'Tipp ein Feld mit Punkt an' : '';
    },
    main(S) {
      const g = S.g;
      const legal = new Set(g.legal);
      const flipped = new Set(g.flipped);
      const cells = g.board.map((owner, i) => {
        let inner = '';
        if (owner !== null) inner = `<span class="rv-disc rv-${g.colors[owner]} ${flipped.has(i) ? 'flip' : ''} ${i === g.last ? 'last' : ''}">${colorMark(MARK[g.colors[owner]])}</span>`;
        else if (legal.has(i)) inner = '<span class="rv-hint" aria-hidden="true"></span>';
        const label = owner === null ? `${cname(i)}${legal.has(i) ? ', erlaubt' : ''}` : `${cname(i)} ${COLOR[g.colors[owner]]}`;
        return legal.has(i) ? `<button type="button" class="rv-cell can" data-g="cell" data-c="${i}" aria-label="${label}">${inner}</button>` : `<div class="rv-cell" role="gridcell" aria-label="${label}">${inner}</div>`;
      }).join('');
      const W = WorldKit, t = W.t, myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const count = (color) => g.board.filter((o) => o !== null && g.colors[o] === color).length;
      const chips = [W.chip('●', `${t('Schwarz', 'Black')} ${count(0)}`), W.chip('○', `${t('Weiß', 'White')} ${count(1)}`), g.flipped.length ? W.chip('⟲', `${g.flipped.length} ${t('umgedreht', 'flipped')}`, 'warn') : '', myTurn && !g.legal.length ? W.chip('⏭', t('Du musst aussetzen', 'You must pass'), 'bad') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table rv-wrap wk-stage rv-stage">${W.head({ eyebrow: t('Turnierbrett', 'Tournament board'), title: myTurn ? t('Du bist dran', 'Your turn') : t('Am Zug', 'On the move'), chips })}<div class="rv-board" role="grid" aria-label="Spielfeld">${cells}</div></div>`;
    },
    dock: () => '',
    onClick(t) { if (t.dataset.g === 'cell') send('place', { cell: Number(t.dataset.c) }); },
    rules: I18n.html`<p>8 × 8 Felder, in der Mitte liegen je zwei schwarze und weiße Steine. Schwarz (wer die Partie anfängt) beginnt.</p>
      <ul>
        <li>Setze einen Stein so, dass in mindestens einer Richtung (waagerecht, senkrecht, diagonal) eine <b>Reihe gegnerischer Steine</b> zwischen ihm und einem eigenen Stein liegt.</li>
        <li>Alle so eingeschlossenen Steine werden <b>umgedreht</b>.</li>
        <li>Kannst du nicht setzen, wird für dich <b>gepasst</b>. Kann keiner mehr setzen oder ist das Brett voll, ist die Partie zu Ende.</li>
        <li>Es gewinnt, wem dann <b>mehr Steine</b> gehören. Ecken werden nie umgedreht.</li>
        <li>Läuft die Zeit pro Zug ab, setzt der Computer für dich.</li>
      </ul>`,
  });
}
