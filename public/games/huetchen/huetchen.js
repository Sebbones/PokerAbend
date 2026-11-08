// Mensch ärgere Dich nicht im Browser (Regeln: games/huetchen/room.js). Spielbrett als 11 × 11-Raster, wie das klassische Brett:
// Startfelder mit „A“, Zielfelder und Häuser farbig gefüllt, Figuren als Hütchen von oben.
// Figur antippen → Zielfeld leuchtet (rot, wenn dort geschlagen wird); nochmal antippen oder das Zielfeld antippen → ziehen.
'use strict';
{
  // Strecke: 40 Felder im Uhrzeigersinn, Feld 0 ist das Startfeld von Rot (Farbe 0)
  const PATH = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [10, 5],
    [10, 6], [9, 6], [8, 6], [7, 6], [6, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [4, 9], [4, 8], [4, 7], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 5]];
  const GOALS = [[[1, 5], [2, 5], [3, 5], [4, 5]], [[5, 1], [5, 2], [5, 3], [5, 4]], [[9, 5], [8, 5], [7, 5], [6, 5]], [[5, 9], [5, 8], [5, 7], [5, 6]]];
  const HOUSES = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[9, 0], [10, 0], [9, 1], [10, 1]], [[9, 9], [10, 9], [9, 10], [10, 10]], [[0, 9], [1, 9], [0, 10], [1, 10]]];
  // Freie 2 × 2-Ecke neben der Mitte, je Farbe – dort steht, wer gerade würfelt
  const CORNER = ['3 / 3 / 5 / 5', '3 / 8 / 5 / 10', '8 / 8 / 10 / 10', '8 / 3 / 10 / 5'];
  const NAMES = ['Rot', 'Blau', 'Grün', 'Gelb', 'Lila', 'Orange'];
  const MARK = ['r', 'b', 'g', 'y', 'b', 'r'];
  let lastRoll = null;
  let sel = null;        // gewählte eigene Figur (Index)
  let prevPieces = null; // für die Zug-Animation
  let anim = null;       // laufende Animation (Figuren, die gerade unterwegs sind, bleiben unsichtbar)

  const where = (color, progress, i) => (progress < 0 ? HOUSES[color][i] : progress >= 40 ? GOALS[color][progress - 40] : PATH[(color * 10 + progress) % 40]);
  const absField = (color, progress) => (color * 10 + progress) % 40;
  const target = (p, d) => (p === -1 ? 0 : p + d);
  // Wen schlägt ein Zug? → Spieler-ID oder null
  function victim(g, me, piece) {
    const c = g.color[me];
    const t = target(g.pieces[me][piece], g.rolled);
    if (t >= 40) return null;
    const f = absField(c, t);
    for (const [id, list] of Object.entries(g.pieces)) if (id !== me && list.some((p) => p >= 0 && p < 40 && absField(g.color[id], p) === f)) return id;
    return null;
  }

  const kit = kitGame({
    id: 'huetchen',
    name: 'Mensch ärgere Dich nicht',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Ziel", I18n.html("Bring alle vier Figuren deiner Farbe ins Ziel. Raus aus dem Haus geht es nur mit einer <b>6</b>.")],
      ["Ziehen", "Würfeln, dann eine Figur mit weißem Rand antippen – ihr Zielfeld leuchtet. Nochmal antippen zieht."],
      ["Schlagen", "Landest du auf einer fremden Figur, muss sie zurück ins Haus. Ein rotes Zielfeld mit ✕ zeigt dir das vorher an."],
    ],
    short: [
      I18n.html("Raus aus dem Haus nur mit einer <b>6</b>."),
      "Nach einer 6 darfst du nochmal würfeln.",
      "Ohne Figur auf der Strecke: bis zu drei Versuche für die 6.",
      "Landest du auf einer fremden Figur, muss sie zurück ins Haus.",
      "Ins Ziel nur mit passender Zahl, eigene Figuren im Ziel nicht überspringen.",
      "Wer zuerst alle vier im Ziel hat, gewinnt.",
    ],
    house: () => ['Die Runde endet beim ersten Sieger'],
    playerInfo: (p, S) => (p.color !== null && p.color !== undefined ? I18n.html`<span class="hc-dot hc-${p.color}">${colorMark(MARK[p.color])}</span>${I18n.t(NAMES[p.color])} · ${p.home}/4 im Ziel${S.g?.partners?.[p.id] ? I18n.html` · Partner: ${esc(S.players.find((q) => q.id === S.g.partners[p.id])?.name || '')}` : ''}` : ''),
    direction: false, // man zieht immer im Uhrzeigersinn ums Brett
    onState(S, prev) {
      if (S.g?.rolled) lastRoll = S.g.rolled;
      const opts = S.turnId === S.you?.id ? S.g?.options || [] : [];
      if (!opts.includes(sel)) sel = null;
      if (opts.length === 1) sel = opts[0]; // nur eine Möglichkeit: gleich zeigen, wohin es geht
      if (prev?.roundNo !== S.roundNo) prevPieces = null;
    },
    hint(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      if (g.rolled && sel !== null) {
        const v = g.track === 60 ? null : victim(g, g.controlled || S.you.id, sel);
        const name = v ? esc(S.players.find((p) => p.id === v)?.name ?? '?') : '';
        return I18n.html`Du hast eine <b>${g.rolled}</b> – ${v ? I18n.html`<b class="hb-hit">schlägt ${name}!</b> ` : ''}nochmal antippen oder das leuchtende Feld = ziehen`;
      }
      if (g.rolled) return I18n.html`Du hast eine <b>${g.rolled}</b> – tipp eine Figur an, dann siehst du, wohin sie zieht`;
      return g.stuck ? I18n.html`Würfle – du brauchst eine 6 (Versuch ${g.tries + 1} von 3)` : I18n.t('Würfle');
    },
    main(S) {
      const W = WorldKit, t = W.t, g0 = S.g, mine0 = S.turnId === S.you?.id, cur0 = S.players.find((p) => p.id === S.turnId), roll0 = g0.rolled || lastRoll;
      const chips = [cur0 ? W.chip('●', `${t('Am Zug', 'On the move')}: ${esc(cur0.name)}`, mine0 ? 'good' : '') : '', roll0 ? W.chip('🎲', `${t('Gewürfelt', 'Rolled')}: ${roll0}`, roll0 === 6 ? 'warn' : '') : W.chip('…', t('Noch nicht gewürfelt', 'Not rolled yet')), g0.track === 60 ? W.chip('⬡', t('Sechseck-Brett', 'Hexagon board')) : ''].filter(Boolean);
      return `<div class="wk-stage hb-stage">${W.head({ eyebrow: t('Spielbrett', 'Game board'), title: mine0 ? t('Du bist dran', 'Your turn') : t('Das Brett', 'The board'), chips })}${this.mainBody(S)}</div>`;
    },
    mainBody(S) {
      const g = S.g;
      if (g.track === 60) return hexBoard(S);
      const cells = new Map(); // "x,y" → HTML
      const key = (x, y) => `${x},${y}`;
      const area = (x, y) => I18n.html`grid-area:${y + 1}/${x + 1}`;
      PATH.forEach(([x, y], i) => cells.set(key(x, y), i % 10 === 0
        ? I18n.html`<div class="hb-cell path start hc-bg-${i / 10}" style="${area(x, y)}"><span>A</span></div>`
        : `<div class="hb-cell path" style="${area(x, y)}"></div>`));
      GOALS.forEach((gs, c) => gs.forEach(([x, y]) => cells.set(key(x, y), `<div class="hb-cell goal hc-bg-${c}" style="${area(x, y)}"></div>`)));
      HOUSES.forEach((hs, c) => hs.forEach(([x, y]) => cells.set(key(x, y), `<div class="hb-cell house hc-bg-${c}" style="${area(x, y)}"></div>`)));
      const mine = S.turnId === S.you?.id;
      // Ziel der gewählten Figur leuchtet (rot bei Schlag) und ist selbst antippbar
      let goalCell = '';
      if (mine && g.rolled && sel !== null) {
        const me = g.controlled || S.you.id, c = g.color[me];
        const t = target(g.pieces[me][sel], g.rolled);
        const [x, y] = where(c, t, sel);
        const hit = victim(g, me, sel);
        goalCell = I18n.html`<button type="button" class="hb-target ${hit ? 'hit' : ''}" style="${area(x, y)}" data-g="move" data-piece="${sel}" aria-label="Hierhin ziehen${hit ? ' und schlagen' : ''}">${hit ? '<b>✕</b>' : ''}</button>`;
      }
      const moving = anim?.hide || new Set();
      const pieces = Object.entries(g.pieces).map(([id, list]) => {
        const c = g.color[id];
        const who = esc(S.players.find((q) => q.id === id)?.name ?? '?');
        return list.map((p, i) => {
          const [x, y] = where(c, p, i);
          const can = mine && id === (g.controlled || S.you.id) && g.options.includes(i);
          const hidden = moving.has(`${id}:${i}`) ? 'style="visibility:hidden;' : 'style="';
          const inner = `<span class="hb-top"></span>${colorMark(MARK[c])}`;
          return can
            ? I18n.html`<button type="button" class="hb-piece hc-${c} can ${sel === i ? 'sel' : ''}" ${hidden}${area(x, y)}" data-g="pick" data-piece="${i}" data-pc="${id}:${i}" aria-pressed="${sel === i}" aria-label="Figur ${i + 1} von ${who}${sel === i ? ' – gewählt' : ''}">${inner}</button>`
            : I18n.html`<span class="hb-piece hc-${c}" ${hidden}${area(x, y)}" data-pc="${id}:${i}" role="img" aria-label="Figur von ${who}">${inner}</span>`;
        }).join('');
      }).join('');
      // Mitte: Würfel; daneben (in der Ecke seiner Farbe), wer gerade würfelt
      const dice = g.rolled || lastRoll;
      const cur = S.players.find((p) => p.id === S.turnId);
      const cc = g.color[S.turnId];
      const turn = cur && cc !== undefined ? `<div class="hb-turn hc-line-${cc}" style="grid-area:${CORNER[cc]}"><span class="hc-dot hc-${cc}">${colorMark(MARK[cc])}</span>
          <b>${esc(cur.name)}</b><small>${g.rolled ? I18n.html`hat eine ${g.rolled}` : 'würfelt'}</small></div>` : '';
      return I18n.html`<div class="kg-table"><div class="hb-wrap"><div class="hb-board" role="img" aria-label="Spielbrett">${[...cells.values()].join('')}${goalCell}${pieces}
        <div class="hb-dice">${dice ? dieHTML(dice, { cls: I18n.html`big ${g.rolled ? '' : 'old'}` }) : ''}</div>${turn}</div></div></div>`;
    },
    // Figur hüpft Feld für Feld; geschlagene Figuren fliegen zurück ins Haus
    afterRender(S) {
      const g = S.g;
      if (g?.track === 60) return;
      if (!g?.pieces) return;
      const before = prevPieces;
      prevPieces = JSON.parse(JSON.stringify(g.pieces));
      if (!before || anim || motionOff()) return;
      const moves = [];
      for (const [id, list] of Object.entries(g.pieces)) {
        const c = g.color[id];
        list.forEach((p, i) => {
          const q = before[id]?.[i];
          if (q === undefined || q === p) return;
          if (p === -1) moves.push({ id, i, c, cells: [where(c, q, i), where(c, -1, i)], fly: true });
          else if (p > q) {
            const steps = [];
            for (let s = q; s <= p; s++) steps.push(where(c, s, i));
            moves.push({ id, i, c, cells: steps });
          }
        });
      }
      if (moves.length) animate(moves);
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      if (g.track === 60 && g.rolled) return g.options.map((piece) => I18n.html`<button class="btn btn-brass" data-g="move" data-piece="${piece}">Figur ${piece + 1} ziehen</button>`).join('');
      if (g.rolled) return sel !== null ? I18n.html`<button class="btn btn-brass" data-g="move" data-piece="${sel}">Ziehen</button>` : '';
      const tries = g.stuck ? I18n.html` (Versuch ${g.tries + 1} von 3)` : '';
      return I18n.html`<button class="btn btn-brass" data-g="roll">Würfeln${tries}</button>`;
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'roll') send('roll');
      else if (g === 'pick') {
        const i = Number(t.dataset.piece);
        if (sel === i) { send('move', { piece: i }); sel = null; } else { sel = i; kit.render(); }
      } else if (g === 'move') { send('move', { piece: Number(t.dataset.piece) }); sel = null; }
    },
    rules: I18n.html`<p>Jeder hat vier Figuren im Haus. Wer zuerst alle vier ins Ziel bringt, gewinnt.</p>
      <ul>
        <li>Raus kommt man nur mit einer <b>6</b> auf das eigene Startfeld (<b>A</b>). Wer keine Figur auf der Strecke hat, darf bis zu dreimal würfeln.</li>
        <li>Nach einer 6 darf man nochmal würfeln.</li>
        <li>Mit einer 6 muss man rauskommen, wenn das eigene Startfeld frei ist. Steht dort eine eigene Figur, muss sie weiter.</li>
        <li>Landest du auf einer fremden Figur, muss sie zurück ins Haus.</li>
        <li>Ins Ziel nur mit passender Zahl, eigene Figuren im Ziel kann man nicht überspringen.</li>
      </ul>
      <p><b>Bedienung:</b> Figur antippen – das Zielfeld leuchtet (rot mit ✕, wenn dort jemand geschlagen wird). Nochmal antippen oder das Zielfeld antippen zieht.</p>`,
  });

  function hexBoard(S) {
    const g = S.g, colors = ['#dc443c', '#3879df', '#3da866', '#e0b728', '#9b61c4', '#e88c36'];
    const vertex = (side, radius) => { const a = (side * 60 - 90) * Math.PI / 180; return [50 + radius * Math.cos(a), 50 + radius * Math.sin(a)]; };
    const path = Array.from({ length: 60 }, (_, i) => { const a = vertex(Math.floor(i / 10), 36), b = vertex(Math.floor(i / 10) + 1, 36), t = i % 10 / 10; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; });
    const pos = (c, p, i) => p < 0 ? (() => { const v = vertex(c, 45); return [v[0] + (i % 2 ? 2 : -2), v[1] + (i < 2 ? -2 : 2)]; })() : p >= 60 ? vertex(c, 27 - (p - 60) * 5) : path[(c * 10 + p) % 60];
    const style = ([x, y]) => I18n.html`left:${x}%;top:${y}%`;
    let fields = path.map((xy, i) => `<i class="hb-hex-cell" style="${style(xy)};${i % 10 === 0 ? I18n.html`background:${colors[i / 10]}` : ''}"></i>`).join('');
    for (let c = 0; c < 6; c++) for (let i = 0; i < 4; i++) fields += `<i class="hb-hex-cell" style="${style(pos(c, 60 + i, i))};background:${colors[c]}"></i>`;
    const mine = S.turnId === S.you?.id;
    const pieces = Object.entries(g.pieces).map(([id, list]) => list.map((p, i) => { const can = mine && id === g.controlled && g.options.includes(i); return I18n.html`<button type="button" class="hb-piece hc-${g.color[id]} ${can ? 'can' : ''} ${can && sel === i ? 'sel' : ''}" style="${style(pos(g.color[id], p, i))}" ${can ? `data-g="pick" data-piece="${i}"` : 'disabled'} aria-label="${esc(S.players.find((p) => p.id === id)?.name || '')}, Figur ${i + 1}"><span class="hb-top"></span></button>`; }).join('')).join('');
    return I18n.html`<div class="kg-table"><div class="hb-hex" aria-label="Sechseckiges Brett mit 60 Feldern">${fields}${pieces}<div class="hb-hex-die">${g.rolled ? dieHTML(g.rolled, { cls: 'big' }) : I18n.html('<b>6 Farben</b>')}</div></div></div>`;
  }

  // Animation: eine Kopie der Figur springt von Feld zu Feld (je 110 ms), die echte Figur ist so lange unsichtbar.
  // Die Kopie liegt über der Seite (position: fixed) – so übersteht sie es, wenn der Tisch zwischendurch neu gezeichnet wird.
  function animate(moves) {
    const cellRect = ([x, y]) => {
      const board = $('#kg .hb-board');
      if (!board) return null;
      const b = board.getBoundingClientRect();
      const cs = getComputedStyle(board);
      const pad = parseFloat(cs.paddingLeft), gap = parseFloat(cs.columnGap) || 0;
      const w = (b.width - 2 * pad - 10 * gap) / 11;
      return { left: b.left + pad + x * (w + gap), top: b.top + pad + y * (w + gap), w };
    };
    anim = { hide: new Set(moves.map((m) => `${m.id}:${m.i}`)) };
    kit.render(); // echte Figuren am Ziel ausblenden
    let left = moves.length;
    const done = (el) => { el.remove(); if (--left === 0) { anim = null; kit.render(); } };
    for (const m of moves) {
      const el = document.createElement('span');
      el.className = I18n.html`hb-piece hc-${m.c} hb-ghost ${m.fly ? 'fly' : ''}`;
      el.innerHTML = '<span class="hb-top"></span>';
      const place = (cell) => {
        const r = cellRect(cell);
        if (!r) return false;
        el.style.left = I18n.html`${r.left + r.w * .14}px`; el.style.top = I18n.html`${r.top + r.w * .14}px`; el.style.width = el.style.height = I18n.html`${r.w * .72}px`;
        return true;
      };
      if (!place(m.cells[0])) { done(el); continue; }
      document.body.append(el);
      const wait = m.fly ? 340 : 110;
      let k = 0;
      const step = () => {
        k++;
        if (k >= m.cells.length || !place(m.cells[k])) { setTimeout(() => done(el), wait); return; }
        setTimeout(step, wait);
      };
      requestAnimationFrame(() => requestAnimationFrame(step));
    }
  }
}
