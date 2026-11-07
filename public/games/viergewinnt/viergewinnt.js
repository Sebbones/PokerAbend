// Vier gewinnt im Browser (Regeln: games/viergewinnt/room.js). Spalte antippen = Stein fällt hinein.
// Wohin er fällt, zeigt ein blasser Vorschau-Stein; die Gewinn-Reihe leuchtet.
'use strict';
{
  const COLOR = ['Rot', 'Gelb'];
  const MARK = ['r', 'y']; // Farbsymbole: Dreieck, Kreis
  let seenLast = null;     // zuletzt gezeigter Stein (für die Fall-Animation)
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const landing = (board, cols, rows, c) => { for (let r = rows - 1; r >= 0; r--) if (board[r * cols + c] === null) return r; return -1; };
  const disc = (color, cls = '', style = '') => `<span class="vg-disc vg-${color} ${cls}" ${style}>${colorMark(MARK[color])}</span>`;

  const kit = kitGame({
    id: 'viergewinnt',
    name: 'Vier gewinnt',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Ziel', 'Vier eigene Steine in eine Reihe bringen – waagerecht, senkrecht oder schräg.'],
      ['Dein Zug', 'Tipp eine Spalte an: Dein Stein fällt ganz nach unten. Ein blasser Stein zeigt vorher, wo er landet.'],
      ['Aufpassen', 'Blockiere die Reihen deines Gegners. Ist das Feld voll und niemand hat vier, ist es unentschieden.'],
    ],
    short: [
      'Abwechselnd einen Stein in eine der 7 Spalten werfen – er fällt nach unten.',
      'Wer zuerst vier in einer Reihe hat (waagerecht, senkrecht oder diagonal), gewinnt.',
      'Volles Feld ohne vier = unentschieden. Wer anfängt, wechselt jede Partie.',
    ],
    house: () => [],
    playerInfo: (p) => (p.color === null || p.color === undefined ? '' : `<span class="vg-dot vg-${p.color}">${colorMark(MARK[p.color])}</span>${COLOR[p.color]}`),
    hint(S, myTurn) {
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      const c = S.g.colors[S.you.id];
      return I18n.html`Tipp eine Spalte an – dein ${c === 0 ? 'roter' : 'gelber'} Stein fällt nach unten`;
    },
    main(S) {
      const g = S.g;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const mine = g.colors[S.you?.id];
      const win = new Set(g.win || []);
      const fresh = g.last !== null && g.last !== seenLast;
      const cols = [...Array(g.cols).keys()].map((c) => {
        const land = landing(g.board, g.cols, g.rows, c);
        const cells = [...Array(g.rows).keys()].map((r) => {
          const i = r * g.cols + c;
          const owner = g.board[i];
          let inner = '';
          if (owner !== null) {
            const drop = fresh && i === g.last && !motionOff() ? `style="--fall:${r + 1}"` : '';
            inner = disc(g.colors[owner], `${win.has(i) ? 'win' : ''} ${drop ? 'drop' : ''}`, drop);
          } else if (myTurn && r === land) inner = disc(mine, 'ghost');
          return `<span class="vg-cell">${inner}</span>`;
        }).join('');
        const can = myTurn && land >= 0;
        return can
          ? I18n.html`<button type="button" class="vg-col" data-g="col" data-c="${c}" aria-label="Spalte ${c + 1}">${cells}</button>`
          : `<div class="vg-col" role="presentation">${cells}</div>`;
      }).join('');
      if (fresh) seenLast = g.last;
      const filled = g.board.filter((x) => x !== null).length;
      const W = WorldKit, t = W.t, need = g.need || 4;
      const chips = [W.chip('◎', `${g.cols} × ${g.rows}`), W.chip('▬', `${need} ${t('in einer Reihe', 'in a row')}`, need > 4 ? 'warn' : ''), S.variant === 'popout' ? W.chip('⇩', t('Pop Out: unten herausziehen', 'Pop Out: pull from the bottom')) : '', mine !== undefined && mine !== null ? W.chip(MARK[mine] ? '●' : '●', `${t('Du', 'You')}: ${t(mine === 0 ? 'Rot' : 'Gelb', mine === 0 ? 'Red' : 'Yellow')}`) : ''].filter(Boolean);
      return I18n.html`<div class="kg-table vg-wrap wk-stage vg-stage">${W.head({ eyebrow: t('Spielrahmen', 'Game frame'), title: g.win ? t('Reihe gelegt!', 'Line completed!') : myTurn ? t('Du bist dran', 'Your turn') : t('Am Zug', 'On the move'), chips })}<div class="vg-frame"><div class="vg-board" style="grid-template-columns:repeat(${g.cols},minmax(0,1fr))" role="grid" aria-label="Spielfeld, ${filled} von ${g.cols * g.rows} Feldern belegt">${cols}</div><span class="vg-foot" aria-hidden="true"></span></div>
        ${g.win ? I18n.html`<p class="vg-banner" role="status">${g.need || 4} in einer Reihe: ${nameOf(S, g.board[g.win[0]])}!</p>` : ''}</div>`;
    },
    dock: (S) => (S.g.canPop || []).map((c) => I18n.html`<button class="btn" data-g="pop" data-c="${c}">Spalte ${c + 1} unten herausziehen</button>`).join(''),
    onClick(t) { if (t.dataset.g === 'col') send('drop', { col: Number(t.dataset.c) }); if (t.dataset.g === 'pop') send('pop', { col: Number(t.dataset.c) }); },
    rules: I18n.html`<p>7 Spalten, 6 Reihen. Die Steine fallen immer ganz nach unten.</p>
      <ul>
        <li>Abwechselnd wirft jeder einen Stein in eine Spalte, die noch nicht voll ist.</li>
        <li>Wer zuerst <b>vier eigene Steine in einer Reihe</b> hat – waagerecht, senkrecht oder diagonal –, gewinnt.</li>
        <li>Ist das Feld voll und niemand hat vier, ist es <b>unentschieden</b>.</li>
        <li>Wer anfängt, wechselt jede Partie. Rot spielt, wer zuerst am Tisch saß.</li>
        <li>Läuft die Zeit pro Zug ab, wirft der Computer für dich.</li>
      </ul>`,
  });
}
