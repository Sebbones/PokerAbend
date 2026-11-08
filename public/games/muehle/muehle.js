// Mühle im Browser (Regeln: games/muehle/room.js). Brett als SVG, Punkte als Knöpfe darüber.
// Setzen: freien Punkt antippen. Ziehen: eigenen Stein antippen, dann ein leuchtendes Ziel. Mühle: leuchtenden gegnerischen Stein nehmen.
'use strict';
{
  const XY = [
    [0, 0], [3, 0], [6, 0], [6, 3], [6, 6], [3, 6], [0, 6], [0, 3],
    [1, 1], [3, 1], [5, 1], [5, 3], [5, 5], [3, 5], [1, 5], [1, 3],
    [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [2, 3],
  ];
  const MILLS = [];
  for (const r of [0, 8, 16]) for (const s of [0, 2, 4, 6]) MILLS.push([r + s, r + s + 1, r + ((s + 2) % 8)]);
  for (const m of [1, 3, 5, 7]) MILLS.push([m, m + 8, m + 16]);
  const COLOR = ['Weiß', 'Schwarz'];
  let from = null; // gewählter eigener Stein beim Ziehen
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const pos = (p) => I18n.html`left:${((XY[p][0] + 0.5) / 7) * 100}%;top:${((XY[p][1] + 0.5) / 7) * 100}%`;
  const closes = (board, who, to, src = null) => { const b = [...board]; if (src !== null) b[src] = null; b[to] = who; return MILLS.some((m) => m.includes(to) && m.every((q) => b[q] === who)); };
  const stone = (color) => `<span class="mu-stone mu-${color}" aria-hidden="true"></span>`;

  // Linien des Bretts: drei Quadrate und die vier Verbindungen
  const LINES = [[0, 0, 6, 6], [1, 1, 5, 5], [2, 2, 4, 4]].map(([a, b, c, d]) => `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}"/>`).join('')
    + '<path d="M3 0V2M3 4V6M0 3H2M4 3H6"/>';

  const kit = kitGame({
    id: 'muehle',
    moveDetail: (m) => (m.d && m.d.to !== undefined ? I18n.html`<span class="look-d">${m.d.from === null || m.d.from === undefined ? '' : I18n.html`Punkt ${m.d.from + 1} → `}Punkt ${m.d.to + 1}</span>` : ''),
    name: 'Mühle',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Setzen', 'Abwechselnd setzt jeder seine 9 Steine auf freie Punkte. Drei eigene in einer Linie sind eine Mühle.'],
      ['Ziehen', 'Danach tippst du einen eigenen Stein an und ziehst ihn auf einen leuchtenden Nachbarpunkt. Mit nur 3 Steinen darfst du springen.'],
      ['Mühle!', 'Für jede neue Mühle nimmst du dem anderen einen Stein. Wer nur noch 2 Steine hat oder nicht mehr ziehen kann, verliert.'],
    ],
    short: [
      'Jeder hat 9 Steine. Erst abwechselnd setzen, dann entlang der Linien auf freie Nachbarpunkte ziehen.',
      'Drei eigene Steine in einer Linie = Mühle: Nimm dem anderen einen Stein (Steine in Mühlen sind geschützt).',
      'Mit nur noch 3 Steinen darfst du auf jeden freien Punkt springen.',
      'Verloren hat, wer nur noch 2 Steine hat oder nicht mehr ziehen kann.',
      'Unentschieden: 50 Züge ohne Schlagen oder dreimal dieselbe Stellung.',
    ],
    house: () => [],
    playerInfo: (p) => (p.color === null || p.color === undefined ? '' : I18n.html`<span class="mu-dot mu-${p.color}"></span>${I18n.t(COLOR[p.color])} · ${p.hand ? I18n.html`${p.hand} zum Setzen · ` : ''}${p.stones} auf dem Brett${p.flying ? I18n.html(' · <b>springt</b>') : ''}`),
    onState(S, prev) { if (S.turnId !== prev?.turnId || S.g?.step !== 'move') from = null; },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      if (g.step === 'remove') return I18n.html('<b>Mühle!</b> Tipp einen rot markierten Stein an, um ihn zu nehmen');
      if (g.legal?.place) return I18n.html`Setz einen Stein auf einen freien Punkt (noch ${g.inHand[S.you.id]})`;
      if (from !== null) return g.flying ? I18n.t('Du springst: tipp einen freien Punkt an') : I18n.t('Tipp ein leuchtendes Ziel an');
      return g.flying ? I18n.t('Du hast nur noch 3 Steine und darfst springen – tipp einen eigenen Stein an') : I18n.t('Tipp einen eigenen Stein an, der ziehen kann');
    },
    main(S) {
      const g = S.g;
      const me = S.you?.id;
      const myTurn = S.turnId === me && S.phase === 'playing';
      const myColor = g.colors[me];
      const legal = myTurn ? g.legal : null;
      const removable = new Set(myTurn ? g.removable || [] : []);
      const movable = new Set(legal?.moves ? Object.keys(legal.moves).map(Number) : []);
      const targets = new Set(from !== null && legal?.moves?.[from] ? legal.moves[from] : []);
      const placeable = new Set(legal?.place || []);
      const last = g.lastMove;
      const pts = g.board.map((owner, p) => {
        const color = owner === null ? null : g.colors[owner];
        const cls = [color === null ? 'empty' : '', last && (last.to === p || last.from === p) ? 'last' : '', from === p ? 'sel' : ''];
        let action = null, label = '';
        if (removable.has(p)) { action = 'take'; cls.push('hit'); label = I18n.html`${COLOR[color]}en Stein nehmen`; }
        else if (placeable.has(p)) { action = 'place'; cls.push('can'); if (closes(g.board, me, p)) cls.push('mill'); label = 'hier setzen'; }
        else if (targets.has(p)) { action = 'to'; cls.push('target'); if (closes(g.board, me, p, from)) cls.push('mill'); label = 'hierhin ziehen'; }
        else if (movable.has(p)) { action = 'from'; cls.push('mine'); label = 'diesen Stein ziehen'; }
        const inner = (color === null ? '' : stone(color)) + (cls.includes('mill') ? I18n.html('<em class="mu-millmark">Mühle</em>') : '') + (cls.includes('hit') ? '<b class="mu-x" aria-hidden="true">✕</b>' : '');
        const name = I18n.html`Punkt ${p + 1}${color === null ? ' frei' : ` ${COLOR[color]}`}`;
        return action
          ? `<button type="button" class="mu-pt ${cls.join(' ')}" style="${pos(p)}" data-g="${action}" data-p="${p}" aria-label="${name} – ${label}">${inner}</button>`
          : `<span class="mu-pt ${cls.join(' ')}" style="${pos(p)}" role="img" aria-label="${name}">${inner}</span>`;
      }).join('');
      // Gebildete Mühlen als goldene Linie
      const mills = (g.mills || []).map((m) => { const [a, , c] = m.map((p) => XY[p]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/>`; }).join('');
      const side = (id) => `<div class="mu-side ${id === S.turnId ? 'turn' : ''}"><span class="mu-stack">${'<i></i>'.repeat(g.inHand[id] || 0)}</span>
        <small>${nameOf(S, id)} (${COLOR[g.colors[id]]}): ${g.inHand[id] ? I18n.html`${g.inHand[id]} zum Setzen` : 'alle gesetzt'}</small></div>`;
      const ids = Object.keys(g.colors).sort((x, y) => g.colors[x] - g.colors[y]);
      const W = WorldKit, t = W.t, placing = Object.values(g.inHand).some((n) => n > 0);
      const chips = [W.chip(placing ? '◉' : '↔', placing ? t('Phase: Setzen', 'Phase: placing') : t('Phase: Ziehen', 'Phase: moving'), ''), removable.size ? W.chip('✕', t('Mühle! Gegnerischen Stein nehmen', 'Mill! Take an opposing stone'), 'warn') : (g.mills || []).length ? W.chip('▬', `${(g.mills || []).length} ${t('Mühle(n) stehen', 'mill(s) formed')}`, 'good') : '', from !== null && myTurn ? W.chip('✔', t('Stein gewählt – Ziel antippen', 'Stone selected – tap a target'), 'good') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table mu-wrap wk-stage mu-stage">${W.head({ eyebrow: t('Mühlebrett', 'Mill board'), title: myTurn ? t('Du bist dran', 'Your turn') : t('Am Zug', 'On the move'), chips })}
        <div class="mu-sides">${ids.map(side).join('')}</div>
        <div class="mu-board ${myColor === 1 ? 'me-black' : ''}" role="group" aria-label="Mühle-Brett">
          <svg viewBox="-0.5 -0.5 7 7" class="mu-lines" aria-hidden="true">${LINES}<g class="mu-mills">${mills}</g></svg>${pts}</div>
        ${g.drawLimit ? I18n.html`<small class="mu-quiet">Züge ohne Schlagen: ${g.quiet} von ${g.drawLimit}</small>` : ''}</div>`;
    },
    dock(S, myTurn) { return myTurn && from !== null ? I18n.html('<button class="btn btn-ghost" data-g="unsel">Anderen Stein wählen</button>') : ''; },
    onClick(t) {
      const g = t.dataset.g, p = Number(t.dataset.p);
      if (g === 'place') send('place', { point: p });
      else if (g === 'from') { from = from === p ? null : p; kit.render(); }
      else if (g === 'to') { const f = from; from = null; send('move', { from: f, to: p }); }
      else if (g === 'take') send('capture', { point: p });
      else if (g === 'unsel') { from = null; kit.render(); }
    },
    rules: I18n.html`<p>Ein Brett mit 24 Punkten auf drei Quadraten. Jeder hat 9 Steine, Weiß spielt, wer zuerst am Tisch saß. Wer anfängt, wechselt jede Partie.</p>
      <ul>
        <li><b>Setzen:</b> abwechselnd einen Stein auf einen freien Punkt, bis alle 9 gesetzt sind.</li>
        <li><b>Ziehen:</b> abwechselnd einen eigenen Stein entlang einer Linie auf den benachbarten freien Punkt.</li>
        <li><b>Springen:</b> Wer nur noch 3 Steine hat, darf auf jeden freien Punkt springen (Hausregel, Standard an).</li>
        <li><b>Mühle:</b> Drei eigene Steine in einer Linie, neu gebildet – auch beim Setzen. Dann nimmst du einen gegnerischen Stein, aber keinen aus einer Mühle (außer alle stehen in Mühlen). Zwei Mühlen auf einmal: trotzdem nur ein Stein.</li>
        <li><b>Verloren:</b> nur noch 2 Steine – oder kein Zug mehr möglich.</li>
        <li><b>Unentschieden:</b> 50 Züge ohne Schlagen (einstellbar) oder dreimal dieselbe Stellung.</li>
        <li>Läuft die Zeit ab, zieht der Computer für dich.</li>
      </ul>`,
  });
}
