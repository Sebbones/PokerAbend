// Sortierstation im Browser (Regeln, Prüfung und Wertung: public/games/sortierstation/logic.js). Das vorderste Ding auf dem Band in die richtige Kiste tippen.
'use strict';
{
  const shape = (n, color) => {
    const fill = color;
    if (n === 0) return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="${fill}"/></svg>`;
    if (n === 1) return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="3" fill="${fill}"/></svg>`;
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 37 35H3z" fill="${fill}"/></svg>`;
  };
  soloGame({
    id: 'sortierstation',
    name: 'Sortierstation',
    terms: { waitWrite: 'sortiert …' },
    intro: [
      ['Ziel', 'Auf dem Band kommen Dinge an. Sortier jedes in die richtige Kiste, bevor es vorbeifährt.'],
      ['Regel', 'Oben steht, wonach sortiert wird: nach Farbe oder nach Form.'],
      ['Tempo', 'Das Band wird schneller. Richtige Treffer geben Punkte, falsche kosten welche.'],
    ],
    short: [
      'Ein Förderband bringt Dinge heran – für alle in derselben Reihenfolge.',
      'Oben steht die Regel (Farbe oder Form): Tipp das vorderste Ding in die passende Kiste.',
      'Richtig +10, falsch −5, verpasst 0. Das Band wird schneller.',
    ],
    rules: I18n.html`<p>Ein Förderband bringt Dinge mit Farbe und Form heran. Alle sehen dieselbe Reihenfolge.</p>
      <ul>
        <li>Die <b>Regel</b> steht oben: Sortiere nach <b>Farbe</b> oder nach <b>Form</b>. Tipp die passende Kiste (am Computer die Tasten 1, 2, 3).</li>
        <li>Es zählt immer das <b>vorderste</b> Ding. Wartest du zu lange, fährt es vorbei und zählt als verpasst.</li>
        <li><b>Punkte:</b> richtig +10, falsch −5 (nie unter 0), verpasst 0. Das Band wird schneller.</li>
        <li>Nach der Zeit schickt dein Gerät alle Entscheidungen mit Zeitpunkt, und der Server prüft sie.</li>
        <li>Hausregeln: Die Regel wechselt in der Mitte (Farbe, dann Form), ohne Minuspunkte.</li>
      </ul>`,
    timed: true,
    front(c) {
      const done = new Set((c.local.decisions || []).map((d) => d.i));
      return c.round.items.find((it) => !done.has(it.i) && it.t <= c.t && c.t <= it.t + it.life) || null;
    },
    sig(c) { return `${Math.floor(c.t / 80)}|${(c.local.decisions || []).length}`; },
    render(c) {
      const it = this.front(c);
      const rule = c.L.ruleAt(c.round, it ? it.t : c.t);
      const dec = c.local.decisions || [];
      const ev = c.L.evaluate(c.round, dec, { noPenalty: !!c.S.settings.noPenalty });
      const left = Math.max(0, Math.ceil((c.round.playMs - c.t) / 1000));
      const boxes = [...Array(c.round.boxes).keys()].map((b) => {
        const label = rule === 0 ? c.L.COLORS[b].name : c.L.SHAPES[b].name;
        const icon = rule === 0 ? `<span class="ss-sw" style="background:${c.L.COLORS[b].css}"></span>` : shape(b, '#E8E2D0');
        return I18n.html`<button type="button" class="ss-box" data-g="ss-box" data-b="${b}" aria-label="${label}, Taste ${b + 1}">${icon}<small>${label} <kbd>${b + 1}</kbd></small></button>`;
      }).join('');
      const item = it ? `<div class="ss-item" aria-label="${c.L.COLORS[it.color].name}, ${c.L.SHAPES[it.shape].name}">${shape(it.shape, c.L.COLORS[it.color].css)}</div>
        <div class="so-bar"><i style="width:${Math.max(0, 100 - ((c.t - it.t) / it.life) * 100)}%"></i></div>` : '<div class="ss-item empty">…</div>';
      const W = WorldKit, t = W.t;
      return `<div class="wk-stage ss-wrap ss-stage">${W.head({ eyebrow: t('Versandstation', 'Dispatch station'), title: `${t('Sortiere nach', 'Sort by')} ${c.L.ruleName(rule)}`, chips: [W.chip('★', `${ev.pts} ${t('Punkte', 'points')}`, 'good'), W.chip('⏱', `${left} s`, left <= 5 ? 'warn' : '')] })}
        <div class="ss-rulebar" aria-hidden="true">${t('Regel', 'Rule')}: <b>${c.L.ruleName(rule)}</b></div><div class="ss-belt" role="status">${item}</div><div class="ss-boxes so-btns">${boxes}</div></div>`;
    },
    hint: () => 'Tipp das vorderste Ding in die richtige Kiste',
    choose(c, b) {
      const it = this.front(c);
      if (!it || b >= c.round.boxes) return;
      (c.local.decisions ||= []).push({ i: it.i, b, t: Math.round(c.t) });
      c.refresh();
    },
    onClick(el, c) { if (el.dataset.g === 'ss-box') this.choose(c, Number(el.dataset.b)); },
    onKey(e, c) { const b = { 1: 0, 2: 1, 3: 2 }[e.key]; if (b !== undefined) { e.preventDefault(); this.choose(c, b); } },
    payload: (c) => ({ decisions: c.local.decisions || [] }),
    solution: (sol) => I18n.html`<div class="sm-answer" role="status"><small>Die Runde begann mit der Regel</small><b>${esc(sol.rule)}</b></div>`,
  });
}
