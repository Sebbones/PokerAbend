'use strict';
{
  const tx = (de, en) => I18n.language === 'en' ? en : de;
  let pan = [0, 0], panRound = null;
  const kit = kitGame({
    id: 'hex', name: 'Hex', ring: false, direction: false,
    keepMain(S) { const el = document.querySelector('.hx-viewport'); pan = panRound === S.roundNo && el ? [el.scrollLeft, el.scrollTop] : [0, 0]; panRound = S.roundNo; return false; },
    afterRender() { document.querySelector('.hx-viewport')?.scrollTo(...pan); },
    get short() { return [tx('Blau verbindet oben und unten, Rot links und rechts.', 'Blue connects top to bottom, red connects left to right.'), tx('Abwechselnd einen Stein auf ein freies Sechseck setzen. Kein Schlagen, kein Bewegen, kein Remis.', 'Take turns placing a stone on an empty hexagon. No captures, movement or draws.'), tx('Mit Tauschregel darf Spieler zwei nach dem ersten Stein die Seiten übernehmen.', 'With the swap rule, player two may exchange sides after the first stone.')]; },
    get rules() { return `<p>${tx('11×11 oder 9×9 sechseckige Felder. Blau verbindet den oberen mit dem unteren Rand, Rot den linken mit dem rechten. Eine lückenlose Kette gewinnt.', 'An 11×11 or 9×9 hexagonal grid. Blue connects the top and bottom edges; red connects left and right. A connected chain wins.')}</p><p>${tx('Steine bleiben liegen. Wenn die Tauschregel aktiv ist, darf der zweite Spieler nach dem ersten Stein die Farben übernehmen: Der Stein bleibt blau, die Spieler tauschen ihre Ziele. Danach ist der erste Spieler wieder dran. Jeder Zug hat optional ein Zeitlimit; ein regelkonformer Botzug übernimmt bei Ablauf.', 'Stones remain in place. With the swap rule enabled, the second player can exchange colours after the first stone: the stone stays blue, players exchange goals and the first player moves next. An optional turn timer chooses a legal bot move on timeout.')}</p>`; },
    playerInfo(p) { return p.color === 0 ? tx('Blau ↕', 'Blue ↕') : p.color === 1 ? tx('Rot ↔', 'Red ↔') : ''; },
    hint(S, mine) { return mine ? tx('Tippe ein freies Sechseck an. Die Pfeile zeigen deine Zielränder.', 'Tap an empty hexagon. Arrows show your goal edges.') : tx('Der andere Spieler setzt einen Stein.', 'The other player is placing a stone.'); },
    main(S) {
      const g = S.g, legal = new Set(g.legal), path = new Set(g.path);
      const W = WorldKit, myTurn = S.turnId === S.you?.id && S.phase === 'playing', mine = g.colors?.[S.you?.id];
      const chips = [W.chip('⬡', `${g.size} × ${g.size}`), mine === 0 || mine === 1 ? W.chip(mine === 0 ? '▲' : '◆', `${tx('Du', 'You')}: ${mine === 0 ? tx('Blau ↕', 'Blue ↕') : tx('Rot ↔', 'Red ↔')}`, 'good') : '', g.canSwap ? W.chip('⇄', tx('Seitenwechsel möglich', 'Swap available'), 'warn') : ''].filter(Boolean);
      return `<section class="hx-wrap wk-stage hx-stage">${W.head({ eyebrow: tx('Hex', 'Hex'), title: myTurn ? tx('Du bist dran', 'Your turn') : tx('Am Zug', 'On the move'), chips })}<div class="hx-key"><span class="hx-blue">${tx('Blau: oben ↕ unten', 'Blue: top ↕ bottom')}</span><span class="hx-red">${tx('Rot: links ↔ rechts', 'Red: left ↔ right')}</span></div><div class="hx-viewport" tabindex="0" aria-label="${tx('Verschiebbares Hex-Brett', 'Scrollable Hex board')}"><div class="hx-board" style="--size:${g.size}">${Array.from({ length: g.size }, (_, r) => `<div class="hx-row" style="--row:${r}">${Array.from({ length: g.size }, (_, c) => { const i = r * g.size + c, value = g.board[i], label = `${String.fromCharCode(65 + c)}${r + 1} · ${value === null ? tx('frei', 'empty') : value === 0 ? tx('Blau', 'Blue') : tx('Rot', 'Red')}`; return `<button class="hx-cell ${value === null ? '' : value === 0 ? 'blue' : 'red'} ${path.has(i) ? 'win' : ''} ${g.last === i ? 'last' : ''}" data-g="hx-cell" data-cell="${i}" aria-label="${esc(label)}" ${legal.has(i) ? '' : 'disabled'}>${value === null ? '<span>·</span>' : value === 0 ? '↕' : '↔'}</button>`; }).join('')}</div>`).join('')}</div></div></section>`;
    },
    dock(S) { return S.g.canSwap ? `<button class="btn btn-brass" data-g="hx-swap">${tx('Seiten tauschen', 'Swap sides')}</button>` : ''; },
    onClick(el) { if (el.dataset.g === 'hx-cell') send('hexPlace', { cell: Number(el.dataset.cell) }); else if (el.dataset.g === 'hx-swap') send('hexSwap'); },
  });
}
