// Domino im Browser (Regeln: games/domino/room.js). Passenden Stein antippen; passt er an beide Enden, wählst du das Ende.
'use strict';
{
  let pending = null; // Stein, für den noch das Ende gewählt wird
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const half = (n) => `<span class="dn-half" aria-hidden="true">${[...Array(9)].map((_, i) => `<i class="${PIPS[n]?.includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
  // Stein waagerecht (Kette, Hand): [a, b]
  const tile = (a, b, { cls = '', attrs = '', tag = 'span' } = {}) => I18n.html`<${tag} class="dn-tile ${cls}" ${attrs} ${tag === 'button' ? 'type="button"' : 'role="img"'} aria-label="Stein ${a} zu ${b}">${half(a)}<span class="dn-bar"></span>${half(b)}</${tag}>`;
  const parts = (t) => t.split('-').map(Number);

  const kit = kitGame({
    id: 'domino',
    name: 'Domino',
    direction: false,
    intro: [
      ['Ziel', 'Werde alle Steine los. Wer zuerst fertig ist, bekommt die Augen der Reststeine der anderen.'],
      ['Anlegen', 'Tipp einen Stein an, der zu einem Ende der Kette passt. Passt er an beide Enden, wählst du das Ende.'],
      ['Ziehen', 'Wer nichts anlegen kann, zieht aus dem Vorrat – ist er leer, setzt man aus.'],
    ],
    short: [
      '28 Steine (0 bis 6), jeder bekommt 7, der Rest ist der Vorrat.',
      'Den höchsten Pasch (sonst den höchsten Stein) legt man zuerst.',
      'Reihum einen Stein mit passender Augenzahl an ein Ende der Kette legen.',
      'Nichts passt: aus dem Vorrat ziehen, bis es passt; Vorrat leer: aussetzen.',
      'Wer zuerst alle Steine los ist, gewinnt. Ist alles blockiert, gewinnt, wer die wenigsten Augen hat.',
    ],
    house: () => [],
    playerInfo: (p) => (p.tiles === undefined ? '' : I18n.html`${p.tiles} Stein${p.tiles === 1 ? '' : 'e'}`),
    seat: (p) => I18n.html`<span>${p.tiles ?? 0} Steine</span>`,
    onState(S) { if (S.turnId !== S.you?.id) pending = null; },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      if (g.starter) return I18n.html`Du fängst an: lege ${g.starter.replace('-', '|')}`;
      if (pending) return 'Wähl das Ende der Kette';
      if (g.playable.length) return 'Tipp einen passenden Stein an';
      return g.canDraw ? 'Nichts passt – zieh aus dem Vorrat' : g.canPass ? 'Nichts passt und der Vorrat ist leer – du setzt aus' : '';
    },
    main(S) {
      const g = S.g;
      const chain = g.chain.length ? g.chain.map(([a, b]) => tile(a, b, { cls: a === b ? 'double' : '' })).join('') : I18n.html('<p class="hint">Noch kein Stein gelegt</p>');
      const W = WorldKit, t = W.t, mine = S.turnId === S.you?.id;
      const chips = [W.chip('▦', `${t('Vorrat', 'Stock')} ${g.stock}`), g.ends ? W.chip('◀', `${t('Linkes Ende', 'Left end')} ${g.ends[0]}`, 'good') : '', g.ends ? W.chip('▶', `${t('Rechtes Ende', 'Right end')} ${g.ends[1]}`, 'good') : '', W.chip('▤', `${g.chain.length} ${t('Steine in der Kette', 'tiles in the chain')}`)].filter(Boolean);
      const cap = (side, n) => `<span class="dn-cap" aria-hidden="true"><b>${n}</b><small>${side === 'L' ? t('links', 'left') : t('rechts', 'right')}</small></span>`;
      const stock = `<div class="dn-stock" role="img" aria-label="${t('Vorrat', 'Stock')}: ${g.stock}"><i></i><i></i><i></i><b>${g.stock}</b><small>${t('Vorrat', 'Stock')}</small></div>`;
      return I18n.html`<div class="kg-table dn-wrap wk-stage dn-stage">${W.head({ eyebrow: t('Dominotisch', 'Domino table'), title: mine ? t('Du bist dran', 'Your turn') : t('Die Kette', 'The chain'), chips })}<div class="dn-board"><div class="dn-band"><div class="dn-chain" role="group" aria-label="Kette">${g.ends ? cap('L', g.ends[0]) : ''}${chain}${g.ends ? cap('R', g.ends[1]) : ''}</div></div>${stock}</div></div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const can = new Map(g.playable.map((x) => [x.tile, x.sides]));
      const hand = (g.hand || []).map((t) => { const [a, b] = parts(t); return tile(a, b, { tag: 'button', cls: `${can.has(t) ? 'can' : ''} ${pending === t ? 'sel' : ''}`, attrs: myTurn && can.has(t) ? `data-g="tile" data-t="${t}"` : 'disabled' }); }).join('');
      let acts = '';
      if (myTurn && pending) acts = I18n.html`<button class="btn btn-brass" data-g="side" data-s="L">Links anlegen (${g.ends[0]})</button><button class="btn btn-brass" data-g="side" data-s="R">Rechts anlegen (${g.ends[1]})</button><button class="btn btn-ghost" data-g="cancel">Abbrechen</button>`;
      else if (myTurn && g.canDraw) acts = I18n.html('<button class="btn btn-brass" data-g="draw">Aus dem Vorrat ziehen</button>');
      else if (myTurn && g.canPass) acts = I18n.html('<button class="btn" data-g="pass">Aussetzen</button>');
      return I18n.html`<div class="kg-hand dn-hand" role="group" aria-label="Deine Steine">${hand}</div><div class="kg-acts">${acts}</div>`;
    },
    onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'tile') {
        const tl = t.dataset.t;
        const sides = S.g.playable.find((x) => x.tile === tl)?.sides || [];
        if (sides.length === 1) { pending = null; send('play', { tile: tl, side: sides[0] }); } else { pending = tl; kit.render(); }
      } else if (g === 'side' && pending) { const tl = pending; pending = null; send('play', { tile: tl, side: t.dataset.s }); }
      else if (g === 'cancel') { pending = null; kit.render(); }
      else if (g === 'draw') send('draw');
      else if (g === 'pass') send('pass');
    },
    rules: I18n.html`<p>28 Steine (0 bis 6). Jeder bekommt 7, der Rest bleibt als Vorrat liegen.</p>
      <ul>
        <li>Wer den <b>höchsten Pasch</b> hat (sonst den höchsten Stein), legt ihn zuerst.</li>
        <li>Reihum legt man einen Stein mit <b>passender Augenzahl</b> an eines der beiden Enden der Kette.</li>
        <li>Wer nichts anlegen kann, <b>zieht aus dem Vorrat</b>, bis es passt. Ist der Vorrat leer, <b>setzt</b> man aus.</li>
        <li>Wer zuerst alle Steine los ist, gewinnt und bekommt die <b>Augen der Reststeine</b> der anderen.</li>
        <li>Ist das Spiel <b>blockiert</b>, gewinnt, wer die wenigsten Augen hat (er bekommt den Unterschied).</li>
      </ul>`,
  });
}
