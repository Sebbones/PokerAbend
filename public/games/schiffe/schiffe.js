// Schiffe versenken im Browser (Regeln: games/schiffe/room.js). Der Server schickt die gegnerischen Schiffe erst nach Spielende –
// vorher kennt diese Seite nur Treffer, Wasser und versenkte Schiffe.
// Setzen: Schiff unten wählen, aufs eigene Meer tippen (oder ziehen), „Drehen“, „Zufällig verteilen“, „Fertig“.
// Schießen: Feld im gegnerischen Meer antippen. Mit Maus schießt ein Klick, auf dem Handy erst wählen, dann „Feuer“.
'use strict';
{
  const SIZE = 10;
  const COLS = 'ABCDEFGHIJ';
  const SHIP = { 5: 'Flugzeugträger', 4: 'Schlachtschiff', 3: 'Kreuzer', 2: 'Zerstörer' };
  const cellName = (i) => `${COLS[i % SIZE]}${Math.floor(i / SIZE) + 1}`;
  const FINE = matchMedia('(pointer: fine)');

  // Gleiche Prüfung wie auf dem Server (der entscheidet am Ende trotzdem selbst)
  function shipCells(cell, size, horizontal) {
    const r = Math.floor(cell / SIZE), c = cell % SIZE;
    if (horizontal ? c + size > SIZE : r + size > SIZE) return null;
    return Array.from({ length: size }, (_, k) => (horizontal ? cell + k : cell + k * SIZE));
  }
  const around = (cell) => {
    const r = Math.floor(cell / SIZE), c = cell % SIZE, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
    }
    return out;
  };
  // Passt Schiff k an diese Stelle (gegen die anderen schon gesetzten)? → Zellen oder Fehlertext
  function fits(fleet, draft, k, cell, horizontal, touch) {
    const cells = shipCells(cell, fleet[k], horizontal);
    if (!cells) return 'Das Schiff ragt übers Meer hinaus';
    const others = new Set(), near = new Set();
    draft.forEach((d, j) => { if (d && j !== k) shipCells(d.cell, fleet[j], d.horizontal).forEach((c) => { others.add(c); around(c).forEach((n) => near.add(n)); }); });
    if (cells.some((c) => others.has(c))) return 'Da liegt schon ein Schiff';
    if (!touch && cells.some((c) => near.has(c))) return 'Schiffe dürfen sich nicht berühren – auch nicht über Eck';
    return cells;
  }
  function randomDraft(fleet, touch) {
    for (let tries = 0; tries < 500; tries++) {
      const draft = fleet.map(() => null);
      let ok = true;
      for (let k = 0; k < fleet.length && ok; k++) {
        ok = false;
        for (let n = 0; n < 200 && !ok; n++) {
          const cand = { cell: Math.floor(Math.random() * SIZE * SIZE), horizontal: Math.random() < 0.5 };
          if (Array.isArray(fits(fleet, draft, k, cand.cell, cand.horizontal, touch))) { draft[k] = cand; ok = true; }
        }
      }
      if (ok) return draft;
    }
    return fleet.map(() => null);
  }

  let draft = [];           // eigene Aufstellung beim Setzen: je Schiff { cell, horizontal } oder null
  let draftKey = '';
  let selShip = null;       // gewähltes Schiff beim Setzen
  let horizontal = true;    // Ausrichtung fürs nächste Setzen
  let aim = null;           // Handy: gewähltes Ziel, „Feuer“ schießt
  let volley = new Set(), volleyKey = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const meIn = (S) => S.you && S.g?.seas?.[S.you.id];
  const foeOf = (S, id) => Object.keys(S.g.seas).find((x) => x !== id);

  // Ein Meer zeichnen. opts: { ships: [[Zellen]], target (anklickbar zum Schießen), place (anklickbar zum Setzen), small, title }
  function board(sea, { ships = [], target = false, place = false, small = false, title = '', sel = null, label = '' }) {
    const own = new Map(); ships.forEach((cells, k) => cells.forEach((c) => own.set(c, k)));
    const sunk = new Set((sea?.sunk || []).flatMap((s) => s.cells));
    const shots = sea?.shots || {};
    let html = '<span class="sv-corner"></span>' + [...COLS].map((c) => `<span class="sv-lab">${c}</span>`).join('');
    for (let r = 0; r < SIZE; r++) {
      html += `<span class="sv-lab">${r + 1}</span>`;
      for (let c = 0; c < SIZE; c++) {
        const i = r * SIZE + c;
        const shot = shots[i];
        const cls = ['sv-cell', own.has(i) ? 'ship' : '', sunk.has(i) ? 'sunk' : '', shot === 'hit' ? 'hit' : '', shot === 'miss' ? 'miss' : '', (sel instanceof Set ? sel.has(i) : sel === i) ? 'aim' : '',
          place && selShip !== null && own.get(i) === selShip ? 'picked' : ''].filter(Boolean).join(' ');
        const mark = shot === 'hit' ? '<i aria-hidden="true">✕</i>' : shot === 'miss' ? '<i aria-hidden="true">•</i>' : '';
        const state = sunk.has(i) ? 'versenkt' : shot === 'hit' ? 'Treffer' : shot === 'miss' ? 'Wasser' : own.has(i) ? 'Schiff' : 'frei';
        const clickable = (target && !shot) || place;
        html += clickable
          ? `<button type="button" class="${cls}" data-g="${target ? 'aim' : 'cell'}" data-i="${i}" ${place ? `data-drop="cell"` : ''} aria-label="${cellName(i)} ${state}">${mark}</button>`
          : `<span class="${cls}" role="img" aria-label="${cellName(i)} ${state}">${mark}</span>`;
      }
    }
    return `<div class="sv-sea ${small ? 'small' : ''}">${title ? `<h3>${title}${label ? ` <small>${label}</small>` : ''}</h3>` : ''}<div class="sv-board" role="grid" aria-label="${esc(title || 'Meer')}">${html}</div></div>`;
  }
  const draftCells = (fleet) => draft.map((d, k) => (d ? shipCells(d.cell, fleet[k], d.horizontal) : [])).map((x) => x || []);
  const shipList = (list) => (list || []).map((s) => s.cells);

  const kit = kitGame({
    id: 'schiffe',
    name: 'Schiffe versenken',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Flotte setzen', 'Wähle unten ein Schiff und tipp aufs Meer – oder „Zufällig verteilen“. „Drehen“ stellt es quer oder längs. Dann „Fertig“.'],
      ['Schießen', 'Abwechselnd ein Feld im gegnerischen Meer antippen: • Wasser, ✕ Treffer. Versenkte Schiffe werden ganz gezeigt.'],
      ['Gewinnen', 'Wer zuerst alle Schiffe des anderen versenkt, gewinnt. Oben läuft die Zeit pro Schuss mit.'],
    ],
    short: [
      'Zwei Meere 10 × 10: deins und das des Gegners. Erst setzen beide ihre Flotte, dann wird abwechselnd geschossen.',
      'Schiffe dürfen sich nicht überlappen und nicht berühren – auch nicht über Eck.',
      'Ein Feld antippen = Schuss: • Wasser, ✕ Treffer. Danach ist der andere dran.',
      'Ist ein Schiff ganz getroffen, wird es als versenkt gezeigt.',
      'Wer zuerst alle gegnerischen Schiffe versenkt, gewinnt. Läuft die Zeit ab, wird zufällig geschossen.',
    ],
    house: () => [],
    status: (S) => (S.g?.step === 'place' ? I18n.html`Runde #${S.roundNo} · Schiffe setzen` : null),
    playerInfo: (p, S) => (S.g?.step === 'place' ? (p.ready ? '✓ bereit' : 'setzt Schiffe') : p.afloat !== null && p.afloat !== undefined ? I18n.html`${p.afloat} Schiff${p.afloat === 1 ? '' : 'e'} übrig` : ''),
    onState(S) {
      const g = S.g;
      if (!g) return;
      const vk = `${S.variant}:${S.roundNo}:${g.salvoRound}`;
      if (vk !== volleyKey) { volleyKey = vk; volley.clear(); }
      const key = `${S.roundNo}:${g.fleet.join(',')}`;
      if (key !== draftKey) { draftKey = key; draft = g.fleet.map(() => null); selShip = 0; horizontal = true; }
      // Ziel vergessen, wenn ich nicht mehr dran bin oder das Feld inzwischen beschossen ist
      if (S.turnId !== S.you?.id || g.step !== 'shoot' || (aim !== null && g.seas[foeOf(S, S.you.id)]?.shots[aim])) aim = null;
    },
    hint(S, myTurn) {
      const g = S.g;
      const mine = meIn(S);
      if (g.step === 'place') {
        if (!mine) return 'Die beiden setzen gerade ihre Schiffe';
        if (mine.ready) return I18n.html`Fertig – warte, bis ${nameOf(S, foeOf(S, S.you.id))} seine Flotte gesetzt hat`;
        if (draft.every(Boolean)) return 'Alles gesetzt – tipp „Fertig“ (oder verschieb noch Schiffe)';
        if (selShip !== null) return I18n.html`Tipp aufs Meer: dort beginnt der ${SHIP[g.fleet[selShip]]} (${g.fleet[selShip]} Felder, ${horizontal ? 'nach rechts' : 'nach unten'})`;
        return 'Wähle unten ein Schiff, dann tipp aufs Meer – oder „Zufällig verteilen“';
      }
      if (!mine) return I18n.html`${nameOf(S, S.turnId)} schießt`;
      if (S.variant === 'salvo') return g.salvoReady?.[S.you.id] ? 'Salve abgegeben – warte auf die andere Flotte' : I18n.html`Wähle ${g.salvoQuota} verschiedene Ziele. Beide Salven werden gemeinsam aufgelöst.`;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} schießt auf dein Meer`;
      if (aim !== null) return I18n.html`Ziel <b>${cellName(aim)}</b> – „Feuer“ oder ein anderes Feld wählen`;
      return 'Tipp ein Feld im gegnerischen Meer an';
    },
    main(S) {
      const W = WorldKit, t = W.t, g1 = S.g, over1 = S.phase === 'over', mine1 = meIn(S);
      const chips = [g1.step === 'place' && !over1 ? W.chip('⚓', mine1?.ready ? t('Flotte steht – warte auf den Gegner', 'Fleet ready – waiting for the opponent') : t('Phase: Schiffe setzen', 'Phase: placing ships'), mine1?.ready ? 'good' : 'warn') : over1 ? W.chip('🏁', t('Partie vorbei – beide Meere aufgedeckt', 'Game over – both seas revealed')) : W.chip('🎯', S.turnId === S.you?.id ? t('Du schießt', 'You are firing') : t('Der Gegner schießt', 'The opponent is firing'), S.turnId === S.you?.id ? 'good' : ''), S.variant === 'salvo' ? W.chip('✦', t('Salve-Variante', 'Salvo variant')) : ''].filter(Boolean);
      return `<div class="wk-stage sv-stage">${W.head({ eyebrow: t('Seekarte', 'Sea chart'), title: g1.step === 'place' && !over1 ? t('Flotte aufstellen', 'Deploy your fleet') : t('Seeschlacht', 'Sea battle'), chips })}${this.mainBody(S)}</div>`;
    },
    mainBody(S) {
      const g = S.g;
      const me = S.you?.id;
      const mine = meIn(S);
      const ids = Object.keys(g.seas);
      const over = S.phase === 'over';
      // Setzen: nur das eigene Meer, groß
      if (g.step === 'place' && !over) {
        if (!mine) return I18n.html`<div class="kg-table sv-wrap"><p class="hint">Die beiden setzen gerade ihre Schiffe – gleich geht es los.</p></div>`;
        const ships = mine.ready ? shipList(mine.ships) : draftCells(g.fleet);
        return `<div class="kg-table sv-wrap">${board(mine, { ships, place: !mine.ready, title: 'Dein Meer', label: mine.ready ? '✓ bereit' : '' })}</div>`;
      }
      // Zuschauer oder Spielende: beide Meere (nach Spielende mit allen Schiffen)
      if (!mine || over) {
        return `<div class="kg-table sv-wrap"><div class="sv-two">${ids.map((id) => board(g.seas[id], { ships: shipList(g.seas[id].ships), small: true, title: I18n.html`Meer von ${nameOf(S, id)}`, label: over ? 'aufgedeckt' : '' })).join('')}</div></div>`;
      }
      const foe = foeOf(S, me);
      const salvo = S.variant === 'salvo';
      const myTurn = salvo ? !g.salvoReady?.[me] : S.turnId === me;
      return `<div class="kg-table sv-wrap"><div class="sv-two">
        ${board(g.seas[foe], { ships: shipList(g.seas[foe].sunk), target: myTurn, sel: salvo ? volley : aim, title: I18n.html`Meer von ${nameOf(S, foe)}`, label: myTurn ? 'du schießt' : '' })}
        ${board(mine, { ships: shipList(mine.ships), small: true, title: 'Dein Meer' })}
      </div></div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const mine = meIn(S);
      if (!mine) return '';
      if (g.step === 'place') {
        if (mine.ready) return I18n.html('<button class="btn" data-g="unplace">Doch nochmal umstellen</button>');
        const ships = g.fleet.map((size, k) => `<button type="button" class="sv-ship ${selShip === k ? 'sel' : ''} ${draft[k] ? 'set' : ''}" data-g="ship" data-k="${k}" data-drag="ship${k}" aria-pressed="${selShip === k}">
            <span class="sv-hull" aria-hidden="true">${'<i></i>'.repeat(size)}</span><span>${SHIP[size]}${draft[k] ? ' ✓' : ''}</span></button>`).join('');
        const done = draft.every(Boolean);
        return I18n.html`<div class="sv-ships" role="group" aria-label="Deine Flotte">${ships}</div>
          <div class="kg-acts"><button class="btn" data-g="turn">Drehen (${horizontal ? 'quer' : 'längs'})</button>
            <button class="btn" data-g="random">Zufällig verteilen</button>
            <button class="btn btn-ghost" data-g="clear">Alles neu</button>
            <button class="btn ${done ? 'btn-brass' : ''}" data-g="ready" ${done ? '' : 'disabled title="Erst alle Schiffe setzen"'}>Fertig</button></div>`;
      }
      if (S.variant === 'salvo') return g.salvoReady?.[S.you.id] ? I18n.html('<p class="hint">Salve festgelegt</p>') : I18n.html`<button class="btn btn-brass" data-g="salvo" ${volley.size === g.salvoQuota ? '' : 'disabled'}>Salve abgeben (${volley.size}/${g.salvoQuota})</button>`;
      if (myTurn && aim !== null) return I18n.html`<button class="btn btn-brass sv-fire" data-g="fire">Feuer auf ${cellName(aim)}</button><button class="btn btn-ghost" data-g="noaim">Anderes Feld</button>`;
      return '';
    },
    // Ziehen (Maus): Schiff aus der Liste aufs Meer
    onDrop(src, z, S) {
      if (!src.dataset.k || z.dataset.drop !== 'cell') return;
      selShip = Number(src.dataset.k);
      putShip(S, Number(z.dataset.i));
    },
    onClick(t, S) {
      const g = t.dataset.g;
      const fleet = S.g.fleet;
      if (g === 'ship') { const k = Number(t.dataset.k); selShip = selShip === k ? null : k; if (selShip !== null && draft[selShip]) horizontal = draft[selShip].horizontal; kit.render(); }
      else if (g === 'cell') {
        const i = Number(t.dataset.i);
        // Tipp auf ein gesetztes Schiff ohne Auswahl: dieses Schiff wählen (zum Verschieben)
        const hitShip = draftCells(fleet).findIndex((cells) => cells.includes(i));
        if (selShip === null || (hitShip >= 0 && hitShip !== selShip && draft[selShip])) { selShip = hitShip >= 0 ? hitShip : null; if (selShip !== null) horizontal = draft[selShip].horizontal; kit.render(); return; }
        putShip(S, i);
      } else if (g === 'turn') {
        horizontal = !horizontal;
        if (selShip !== null && draft[selShip]) {
          const res = fits(fleet, draft, selShip, draft[selShip].cell, horizontal, S.settings.touch);
          if (Array.isArray(res)) draft[selShip] = { cell: draft[selShip].cell, horizontal }; else { toast(res, true); horizontal = !horizontal; }
        }
        kit.render();
      } else if (g === 'random') { draft = randomDraft(fleet, S.settings.touch); selShip = null; kit.render(); }
      else if (g === 'clear') { draft = fleet.map(() => null); selShip = 0; kit.render(); }
      else if (g === 'ready') send('place', { ships: draft });
      else if (g === 'unplace') send('unplace');
      else if (g === 'salvo') send('salvo', { cells: [...volley] });
      else if (g === 'aim') {
        const i = Number(t.dataset.i);
        if (S.variant === 'salvo') { if (volley.has(i)) volley.delete(i); else if (volley.size < S.g.salvoQuota) volley.add(i); kit.render(); return; }
        if (FINE.matches || aim === i) { aim = null; send('shoot', { cell: i }); } // Maus: sofort; Handy: zweimal tippen oder „Feuer“
        else { aim = i; kit.render(); }
      } else if (g === 'fire' && aim !== null) { const i = aim; aim = null; send('shoot', { cell: i }); }
      else if (g === 'noaim') { aim = null; kit.render(); }
    },
    rules: I18n.html`<p>Zwei Meere mit 10 × 10 Feldern (Spalten A–J, Zeilen 1–10): deins und das deines Gegners.</p>
      <ul>
        <li><b>Flotte</b> (Standard): 1 Flugzeugträger (5), 1 Schlachtschiff (4), 2 Kreuzer (3), 1 Zerstörer (2). Hausregel „Klassisch“: 1× 5, 2× 4, 3× 3, 4× 2.</li>
        <li><b>Setzen:</b> beide gleichzeitig. Schiffe liegen quer oder längs, dürfen sich nicht überlappen und nicht berühren – auch nicht über Eck (Hausregel: Berühren erlaubt).</li>
        <li><b>Schießen:</b> abwechselnd ein Feld im gegnerischen Meer. • Wasser oder ✕ Treffer – danach ist der andere dran (Hausregel: nach einem Treffer nochmal).</li>
        <li>Sind alle Felder eines Schiffs getroffen, ist es <b>versenkt</b> und wird ganz gezeigt.</li>
        <li>Wer zuerst alle gegnerischen Schiffe versenkt, gewinnt. Die Zeit pro Schuss steht oben; läuft sie ab, wird zufällig geschossen.</li>
        <li>Zuschauer sehen während des Spiels nur Treffer und Wasser – beide Flotten werden erst nach dem Spiel aufgedeckt.</li>
      </ul>`,
  });

  // Gewähltes Schiff an Zelle i setzen (Bug), danach das nächste noch freie Schiff wählen
  function putShip(S, i) {
    const fleet = S.g.fleet;
    const res = fits(fleet, draft, selShip, i, horizontal, S.settings.touch);
    if (!Array.isArray(res)) { toast(res, true); return; }
    draft[selShip] = { cell: i, horizontal };
    const next = draft.findIndex((d) => !d);
    selShip = next >= 0 ? next : null;
    kit.render();
  }
}
