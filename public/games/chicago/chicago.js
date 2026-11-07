// Chicago im Browser (Regeln: games/chicago/room.js). Einfach würfeln: Trifft die Summe die Zielzahl der Runde, gibt es diese Punkte.
'use strict';
{
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const pair = (d, cls = '') => `<span class="ch-pair">${d.map((x) => dieHTML(x, { cls })).join('')}</span>`;

  const kit = kitGame({
    id: 'chicago',
    name: 'Chicago',
    direction: false,
    intro: [
      ['Ziel', 'Sammle die meisten Punkte in elf Runden.'],
      ['Würfeln', 'Jeder würfelt pro Runde einmal mit zwei Würfeln. Zielzahl in Runde 1 ist 2, dann 3 … bis 12.'],
      ['Treffer', 'Ergibt die Augensumme genau die Zielzahl, bekommst du diese Zahl als Punkte.'],
    ],
    short: [
      'Elf Runden mit den Zielzahlen 2 bis 12 (in dieser Reihenfolge).',
      'Reihum würfelt jeder einmal mit zwei Würfeln.',
      'Summe = Zielzahl: Du bekommst die Zielzahl als Punkte.',
      'Nach Runde 11 gewinnt, wer die meisten Punkte hat. Bei Gleichstand gibt es ein Stechen.',
    ],
    house: () => [],
    playerInfo: (p) => (p.chicago === undefined ? '' : I18n.html`${p.chicago} Punkte`),
    seat: (p, S) => I18n.html`<span>${p.chicago ?? 0} Punkte</span>${S.g?.rolled?.[p.id] ? pair(S.g.rolled[p.id], 'small') : ''}`,
    sounds(S, prev) { return S.g && prev.g && JSON.stringify(S.g.rolled) !== JSON.stringify(prev.g.rolled) && Object.keys(S.g.rolled).length ? 'dice' : null; },
    hint(S, myTurn) {
      const g = S.g;
      if (g.stage === 'tie') return myTurn ? 'Stechen: würfle – die höhere Summe gewinnt' : I18n.html`Stechen – ${nameOf(S, S.turnId)} würfelt`;
      return myTurn ? I18n.html`Würfle: Ziel ist die ${g.target}` : I18n.html`${nameOf(S, S.turnId)} ist dran`;
    },
    main(S) {
      const g = S.g, W = WorldKit, t = W.t, tie = g.stage === 'tie';
      const players = S.players.filter((p) => p.inRound), rolled = players.filter((p) => g.rolled[p.id]);
      const last = rolled.length ? rolled[rolled.length - 1] : null, lastDice = last ? g.rolled[last.id] : null;
      const sum = (d) => d[0] + d[1], hit = (d) => !tie && sum(d) === g.target;
      // Elf Rundenmarken: erledigt (mit Treffer-Haken), laufend, kommend
      const done = new Map(g.history.map((h) => [h.target, Object.values(h.rolls).some((d) => sum(d) === h.target)]));
      const markers = Array.from({ length: 11 }, (_, i) => i + 2).map((n) => {
        const state = tie || n < g.target ? 'done' : n === g.target ? 'now' : 'next';
        return `<li class="ch-mark ${state}" ${n === g.target && !tie ? 'aria-current="step"' : ''}><b>${n}</b><small>${state === 'done' ? (done.get(n) ? '✓' : '–') : state === 'now' ? '●' : ''}</small></li>`;
      }).join('');
      const chips = [W.chip('🎲', t('Zwei Würfel', 'Two dice')), tie ? W.chip('⚔', t('Stechrunde', 'Tie-break'), 'warn') : W.chip('◎', t('Treffer = Zielzahl', 'Hit = target'))];
      const current = lastDice
        ? `<div class="ch-roll"><span class="wk-label">${t('Aktueller Wurf', 'Current roll')} · ${esc(last.name)}</span><span class="ch-pair big">${lastDice.map((x) => dieHTML(x, { cls: 'big' })).join('')}</span><b class="ch-sum">${sum(lastDice)}</b>${tie ? '' : hit(lastDice) ? W.chip('✓', t('Treffer', 'Hit'), 'good') : W.chip('✗', t('Kein Treffer', 'No hit'), 'bad')}</div>`
        : `<div class="ch-roll empty"><span class="wk-label">${t('Aktueller Wurf', 'Current roll')}</span><span class="ch-wait">${t('Noch niemand hat gewürfelt', 'Nobody has rolled yet')}</span></div>`;
      const rows = players.map((p) => {
        const d = g.rolled[p.id];
        return `<li class="${d && hit(d) ? 'hit' : ''} ${p.id === S.turnId ? 'me' : ''}"><b class="wk-grow">${esc(p.name)}</b>${d ? `<span class="ch-pair">${d.map((x) => dieHTML(x, { cls: 'small' })).join('')}</span><span class="ch-n">${sum(d)}${hit(d) ? ' ✓' : ''}</span>` : `<span class="ch-n dim">${p.id === S.turnId ? t('am Zug', 'to roll') : '–'}</span>`}<span class="ch-pts" title="${t('Punkte', 'Points')}">${g.points[p.id] ?? 0}</span></li>`;
      }).join('');
      const hist = g.history.length ? `<details class="ch-hist wk-panel"><summary>${t('Frühere Runden', 'Earlier rounds')} (${g.history.length})</summary><ol>${g.history.slice().reverse().map((h) => `<li><b>${t('Ziel', 'Target')} ${h.target}</b> ${Object.entries(h.rolls).map(([id, d]) => `${nameOf(S, id)} ${sum(d)}${sum(d) === h.target ? ' ✓' : ''}`).join(' · ')}</li>`).join('')}</ol></details>` : '';
      return `<div class="kg-table wk-stage ch-stage">${W.head({ eyebrow: tie ? t('Stechen', 'Tie-break') : t(`Runde ${g.round} von ${g.rounds}`, `Round ${g.round} of ${g.rounds}`), title: tie ? t('Höhere Summe gewinnt', 'Higher total wins') : t(`Zielzahl ${g.target}`, `Target ${g.target}`), chips })}
        <ol class="ch-markers" aria-label="${t('Rundenmarken', 'Round markers')}">${markers}</ol>
        ${current}
        <div><span class="wk-label">${t('Punkte dieser Runde', 'This round')}</span><ul class="wk-ledger ch-list" aria-label="${t('Würfe dieser Runde', 'Rolls this round')}">${rows}</ul></div>${hist}</div>`;
    },
    dock(S, myTurn) { return myTurn ? I18n.html('<div class="kg-acts"><button class="btn btn-brass" data-g="throw">Würfeln</button></div>') : ''; },
    onClick(t) { if (t.dataset.g === 'throw') send('throw'); },
    rules: I18n.html`<p>Elf Runden mit zwei Würfeln.</p>
      <ul>
        <li>Die Zielzahlen sind <b>2 bis 12</b>, in dieser Reihenfolge.</li>
        <li>Reihum würfelt jeder <b>einmal</b> mit beiden Würfeln.</li>
        <li>Ergibt die Augensumme genau die Zielzahl, bekommst du <b>diese Zahl als Punkte</b>.</li>
        <li>Nach Runde 11 gewinnt, wer die meisten Punkte hat. Bei Gleichstand würfeln die Besten im <b>Stechen</b>: die höhere Summe gewinnt, sonst nochmal.</li>
      </ul>`,
  });
}
