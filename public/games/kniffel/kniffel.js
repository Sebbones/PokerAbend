// Kniffel im Browser (Regeln: games/kniffel/room.js). Würfel antippen = liegen lassen, Feld in der eigenen Spalte antippen = eintragen.
'use strict';
{
  const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  const LOWER = ['threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'kniffel', 'chance'];
  const NAME = {
    ones: 'Einser', twos: 'Zweier', threes: 'Dreier', fours: 'Vierer', fives: 'Fünfer', sixes: 'Sechser',
    threeKind: 'Dreierpasch', fourKind: 'Viererpasch', fullHouse: 'Full House', smallStraight: 'Kleine Straße', largeStraight: 'Große Straße', kniffel: 'Kniffel', chance: 'Chance',
  };
  const HINT = {
    ones: 'nur Einser zählen', twos: 'nur Zweier', threes: 'nur Dreier', fours: 'nur Vierer', fives: 'nur Fünfer', sixes: 'nur Sechser',
    threeKind: '3 gleiche: alle Augen', fourKind: '4 gleiche: alle Augen', fullHouse: '3 + 2 gleiche: 25', smallStraight: '4 in Folge: 30',
    largeStraight: '5 in Folge: 40', kniffel: '5 gleiche: 50', chance: 'alle Augen',
  };
  let keep = new Set();
  let column = 0;
  let keepKey = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');

  const kit = kitGame({
    id: 'kniffel',
    look(S) {
      const g = S.g;
      if (g.columnSheets) {
        const columns = Object.keys(g.columnSheets).flatMap((id) => [0, 1, 2].map((column) => ({ id, column })));
        const row = (f) => `<tr><th>${NAME[f]}</th>${columns.map(({ id, column }) => `<td class="num">${g.columnSheets[id][column][f] ?? '–'}</td>`).join('')}</tr>`;
        return [{ title: 'Alle drei Spalten', html: I18n.html`<div class="look-table"><table class="look-big"><thead><tr><th></th>${columns.map(({ id, column }) => `<th>${nameOf(S, id)} ×${column + 1}</th>`).join('')}</tr></thead><tbody>${[...UPPER, ...LOWER].map(row).join('')}<tr><th>Gewichtete Summe</th>${columns.map(({ id, column }) => `<td class="num">${g.columnTotals[id][column].total * (column + 1)}</td>`).join('')}</tr></tbody></table></div>` }];
      }
      const ids = Object.keys(g.sheets);
      const cell = (id, f) => { const v = g.sheets[id][f]; return `<td class="num">${v === null ? '' : v === 0 ? '–' : v}</td>`; };
      const row = (f) => `<tr><th scope="row">${NAME[f]}</th>${ids.map((id) => cell(id, f)).join('')}</tr>`;
      const head = ids.map((id) => `<th class="num" scope="col">${nameOf(S, id)}</th>`).join('');
      const sum = (label, fn) => `<tr class="kn-sum"><th scope="row">${label}</th>${ids.map((id) => `<td class="num"><b>${fn(g.totals[id])}</b></td>`).join('')}</tr>`;
      return [{ title: 'Punkteblätter aller', html: `<div class="look-table"><table class="look-big"><thead><tr><th></th>${head}</tr></thead><tbody>${UPPER.map(row).join('')}${sum('Summe oben', (t) => t.upper)}${LOWER.map(row).join('')}${sum(I18n.t('Gesamt'), (t) => t.total)}</tbody></table></div>` }];
    },
    name: 'Kniffel',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Würfeln', 'Bis zu drei Würfe pro Zug. Tipp Würfel an, die liegen bleiben sollen – die anderen werden neu geworfen.'],
      ['Eintragen', 'Nach dem Zug trägst du genau ein Feld in deiner Spalte ein. Grau stehen die Punkte, die dein Wurf dort bringt – 0 heißt streichen.'],
      ['Gewinnen', 'Nach 13 Runden ist jedes Feld voll. Oben gibt es ab 63 Punkten 35 Bonus. Die höchste Summe gewinnt.'],
    ],
    short: [
      'Fünf Würfel, bis zu drei Würfe pro Zug – Würfel antippen = liegen lassen.',
      'Nach dem Zug genau ein freies Feld eintragen (auch 0 = streichen).',
      'Oben: Einser bis Sechser zählen ihre Augen. Ab 63 Punkten oben gibt es 35 Bonus.',
      'Unten: Dreier- und Viererpasch (alle Augen), Full House 25, Kleine Straße 30, Große Straße 40, Kniffel 50, Chance (alle Augen).',
      'Nach 13 Runden gewinnt die höchste Summe.',
    ],
    house: () => [],
    playerInfo: (p, S) => { const n = S.variant === 'triple' ? 39 : 13; return p.total === null || p.total === undefined ? '' : I18n.html`${p.total} Punkte · Runde ${Math.min(n, (p.filled || 0) + 1)}/${n}`; },
    onState(S) {
      const g = S.g;
      const key = g && S.turnId ? `${S.roundNo}:${S.turnId}:${g.rolls}` : '';
      if (key !== keepKey) { keepKey = key; keep = new Set((g?.held || []).map((h, i) => (h ? i : -1)).filter((i) => i >= 0)); }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} würfelt`;
      if (!g.rolls) return I18n.t('Würfle');
      if (g.rolls < 3) return 'Würfel antippen = liegen lassen. Nochmal würfeln – oder ein Feld in deiner Spalte antippen (grau = Punkte)';
      return 'Trag ein Feld ein – grau stehen die Punkte, 0 heißt streichen';
    },
    main(S) {
      const raw = S.g, triple = S.variant === 'triple';
      const g = triple ? { ...raw, sheets: Object.fromEntries(Object.entries(raw.columnSheets).map(([id, columns]) => [id, columns[column]])), totals: Object.fromEntries(Object.entries(raw.columnTotals).map(([id, values]) => [id, values[column]])), options: raw.optionsByColumn?.[column] } : raw;
      const me = S.you?.id;
      const myTurn = S.turnId === me;
      // Würfel des Aktiven; wer dran ist, tippt sie an (liegen lassen)
      const canKeep = myTurn && g.rolls > 0 && g.rolls < 3;
      const dice = g.dice.map((v, i) => {
        const kept = canKeep ? keep.has(i) : g.held[i];
        const die = canKeep ? dieHTML(v, { tag: 'button', cls: I18n.html`big ${kept ? 'kept' : ''}`, attrs: `type="button" data-g="keep" data-i="${i}" aria-pressed="${kept}"` }) : dieHTML(v, { cls: I18n.html`big ${kept ? 'kept' : ''}` });
        return `<span class="kn-slot ${kept ? 'kept' : ''}">${die}<small>${kept ? 'bleibt' : ''}</small></span>`;
      }).join('');
      const tray = `<div class="kn-tray"><small>${nameOf(S, S.turnId)}${g.rolls ? I18n.html` · ${g.rolls}. Wurf von 3` : ' · noch nicht gewürfelt'}</small><div class="kn-dice">${dice}</div></div>`;
      // Punkteblatt: alle Spieler nebeneinander, eigene Spalte hervorgehoben
      // Eigene Spalte zuerst (auf dem Handy sonst rechts abgeschnitten), dann die anderen in Sitzreihenfolge
      const ids = Object.keys(g.sheets).sort((x, y) => (y === me) - (x === me));
      const opts = myTurn ? g.options || {} : {};
      const cell = (id, f) => {
        const v = g.sheets[id][f];
        const mc = id === me ? 'me' : '';
        if (v !== null) return `<td class="num ${mc} ${v === 0 ? 'zero' : ''}">${v === 0 ? '–' : v}</td>`;
        if (id === me && f in opts) return `<td class="num me"><button type="button" class="kn-pick ${opts[f] ? '' : 'zero'}" data-g="score" data-f="${f}" aria-label="${NAME[f]}: ${opts[f] ? I18n.html`${opts[f]} Punkte eintragen` : 'streichen'}">${opts[f]}</button></td>`;
        return `<td class="num ${mc}"></td>`;
      };
      const row = (f) => `<tr><th scope="row"><span>${NAME[f]}</span><small>${HINT[f]}</small></th>${ids.map((id) => cell(id, f)).join('')}</tr>`;
      const sumRow = (label, fn, cls = '') => `<tr class="kn-sum ${cls}"><th scope="row">${label}</th>${ids.map((id) => `<td class="num ${id === me ? 'me' : ''}">${fn(g.totals[id], id)}</td>`).join('')}</tr>`;
      const head = ids.map((id) => `<th class="num ${id === me ? 'me' : ''} ${id === S.turnId && S.phase === 'playing' ? 'turn' : ''}" scope="col">${nameOf(S, id)}${id === me ? I18n.html(' <small>(du)</small>') : ''}</th>`).join('');
      const sheet = `<div class="kn-sheet-wrap"><table class="kn-sheet"><thead><tr><th></th>${head}</tr></thead><tbody>
        ${UPPER.map(row).join('')}
        ${sumRow('Summe oben', (t) => t.upper)}
        ${sumRow(I18n.html('Bonus <small>ab 63: 35</small>'), (t) => (t.bonus ? '35' : I18n.html`<small>noch ${Math.max(0, 63 - t.upper)}</small>`))}
        ${LOWER.map(row).join('')}
        ${S.settings.extraBonus ? sumRow('Extra-Kniffel', (t) => t.extra || '–') : ''}
        ${sumRow(I18n.t('Gesamt'), (t) => `<b>${t.total}</b>`, 'total')}
        </tbody></table></div>`;
      const W = WorldKit, tt = W.t, free = Object.values(g.sheets[me] || {}).filter((v) => v === null).length;
      const chips = [W.chip('🎲', g.rolls ? `${g.rolls}. ${tt('Wurf von 3', 'roll of 3')}` : tt('Noch nicht gewürfelt', 'Not rolled yet'), g.rolls >= 3 ? 'warn' : ''), g.sheets[me] ? W.chip('✎', `${free} ${tt('Felder offen', 'boxes open')}`) : '', triple ? W.chip('×3', `${tt('Dreifachblatt', 'Triple sheet')} · ${tt('Spalte', 'column')} ×${column + 1}`, 'warn') : '', myTurn && g.options && g.rolls ? W.chip('✔', tt('Feld antippen zum Eintragen', 'Tap a box to score'), 'good') : ''].filter(Boolean);
      return `<div class="kg-table kn-table wk-stage kn-stage">${W.head({ eyebrow: tt('Würfeltablett & Punkteblatt', 'Dice tray & score sheet'), title: myTurn ? tt('Du bist dran', 'Your turn') : `${nameOf(S, S.turnId)} ${tt('ist dran', 'is playing')}`, chips })}${triple ? `<div class="kg-acts">${[0, 1, 2].map((i) => I18n.html`<button class="btn" data-g="column" data-column="${i}" aria-pressed="${column === i}">Spalte ×${i + 1}</button>`).join('')}</div>` : ''}${tray}${sheet}</div>`;
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      if (g.rolls >= 3) return '';
      const all = g.rolls && keep.size === 5;
      return `<button class="btn btn-brass" data-g="roll" ${all ? 'disabled title="Alle Würfel liegen – trag ein Feld ein"' : ''}>${g.rolls ? I18n.html`Nochmal würfeln (${g.rolls + 1}. von 3)` : I18n.t('Würfeln')}</button>`;
    },
    async onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'column') { column = Number(t.dataset.column); kit.render(); return; }
      if (g === 'keep') { const i = Number(t.dataset.i); if (keep.has(i)) keep.delete(i); else keep.add(i); kit.render(); }
      else if (g === 'roll') send('roll', { keep: [...keep] });
      else if (g === 'score') {
        const f = t.dataset.f;
        const v = S.variant === 'triple' ? S.g.optionsByColumn?.[column]?.[f] : S.g.options?.[f];
        if (!v && !(await ask({ title: I18n.html`${NAME[f]} streichen?`, text: 'Das Feld bekommt 0 Punkte und ist für dieses Spiel belegt.', ok: I18n.t('Streichen'), danger: true }))) return;
        send('score', { field: f, column });
      }
    },
    rules: I18n.html`<p>Fünf Würfel, 13 Runden. Wer am Ende die höchste Summe hat, gewinnt.</p>
      <ul>
        <li><b>Zug:</b> bis zu drei Würfe. Würfel, die liegen bleiben sollen, tippst du an – die anderen werden neu geworfen.</li>
        <li>Danach trägst du <b>genau ein</b> freies Feld in deiner Spalte ein. Passt nichts, streichst du ein Feld (0 Punkte).</li>
        <li><b>Oben:</b> Einser bis Sechser – die Summe dieser Augen. Ab 63 Punkten oben gibt es <b>35 Bonus</b>.</li>
        <li><b>Unten:</b> Dreierpasch und Viererpasch (Summe aller Würfel), Full House (3 + 2 gleiche) 25, Kleine Straße (4 in Folge) 30, Große Straße (5 in Folge) 40, Kniffel (5 gleiche) 50, Chance (Summe aller Würfel).</li>
        <li>Hausregel <b>Extra-Kniffel-Bonus</b>: Jeder weitere Kniffel bringt 50 Punkte extra, wenn das Kniffel-Feld schon 50 hat.</li>
        <li>Hausregel <b>Joker</b>: Bei einem weiteren Kniffel musst du erst das passende obere Feld nehmen. Ist das belegt, zählt er unten in jedem Feld voll (Full House 25, Straßen 30/40) – sonst oben 0.</li>
      </ul>`,
  });
}
