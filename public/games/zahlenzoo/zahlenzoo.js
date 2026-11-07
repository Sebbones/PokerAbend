// Zahlenzoo im Browser (Regeln und Wertung: public/games/zahlenzoo/logic.js). Tiere kommen ins Bild und gehen wieder – dann die Zahl zur Frage eintippen.
'use strict';
{
  soloGame({
    id: 'zahlenzoo',
    name: 'Zahlenzoo',
    intro: [
      ['Ziel', 'Tiere huschen ins Bild und wieder hinaus. Beantworte die Frage dazu mit einer Zahl – richtig und schnell gibt die meisten Punkte.'],
      ['Alle gleichzeitig', 'Alle sehen dasselbe und tippen ihre Antwort ein. Wer fertig ist, wartet auf die anderen.'],
      ['Schwerer', 'Von Runde zu Runde kommen mehr Tiere, und die Fragen werden kniffliger (Unterschied, Summe).'],
    ],
    short: [
      'Alle sehen denselben Ablauf: Tiere laufen ins Bild und wieder hinaus.',
      'Gefragt wird eine Zahl, zum Beispiel wie viele Katzen am Ende noch da sind oder wie viele Hunde und Hasen zusammen hereingekommen sind.',
      'Richtig gibt 100 Punkte, dazu bis zu 50 für Tempo.',
      'Mehrere Runden, die Schwierigkeit steigt.',
    ],
    rules: I18n.html`<p>Pro Runde laufen Tiere ins Bild und manche wieder hinaus – für alle in derselben Reihenfolge.</p>
      <ul>
        <li>Danach (oder schon währenddessen) gibst du die Zahl zur <b>Frage</b> ein, z. B. „Wie viele Katzen sind am Ende noch im Bild?“.</li>
        <li><b>Punkte:</b> richtig 100, dazu bis zu 50 für Tempo (ein Punkt weniger je Sekunde). Falsch oder keine Antwort: 0.</li>
        <li>Von Runde zu Runde kommen mehr Tiere und Tierarten dazu; Fragen nach dem Unterschied oder der Summe kommen ab Runde 2.</li>
        <li>Hausregeln: nur Zählen ohne Rechnen, ohne Zeitbonus (Host-Menü).</li>
        <li>Die Runde geht zu Ende, wenn alle abgegeben haben oder die Zeit abläuft.</li>
      </ul>`,
    timed: false,
    sig(c) { return c.t < c.round.durationMs + 500 ? I18n.html`run:${Math.floor(c.t / 150)}` : 'end'; },
    render(c) {
      const t = c.t;
      if (t >= c.round.durationMs + 500) return I18n.html('<div class="zz-over" role="status"><b>Vorbei!</b><span>Jetzt zählen und rechnen …</span></div>');
      const counts = c.L.visibleAt(c.round, t);
      const rows = c.round.types.map((id) => { const a = c.L.ANIMALS.find((x) => x.id === id); return `<div class="zz-row" aria-label="${esc(a.many)}"><span class="zz-name" aria-hidden="true">${esc(a.many)}</span><span class="zz-icons">${`<i>${a.icon}</i>`.repeat(Math.max(0, counts[id]))}</span></div>`; }).join('');
      const W = WorldKit, tt = W.t, left = Math.max(0, Math.ceil((c.round.durationMs - t) / 1000));
      return I18n.html`<div class="wk-stage zz-stage">${W.head({ eyebrow: tt('Tierpark', 'Zoo'), title: tt('Schau genau hin', 'Look closely'), chips: [W.chip('⏱', `${left} s`, left <= 3 ? 'warn' : ''), W.chip('🐾', `${c.round.types.length} ${tt('Tierarten', 'animal kinds')}`)] })}<div class="zz-scene" role="img" aria-label="Tiere im Bild">${rows}</div></div>`;
    },
    question: (c) => (c.round ? `<div class="pk-q"><h2>${esc(c.round.question.text)}</h2></div>` : ''),
    hint: () => 'Schau genau hin und tipp die Zahl ein, sobald du sie weißt',
    form: () => pkForm({ kind: 'answer', label: 'Deine Antwort als Zahl', placeholder: 'Deine Zahl', inputmode: 'numeric', max: 4, button: I18n.t('Antworten') }),
    formPayload(text) { const n = Number(String(text).replace(',', '.')); return Number.isFinite(n) ? { answer: n } : null; },
    solution: (sol) => I18n.html`<div class="sm-answer" role="status"><small>Richtig ist</small><b>${sol.answer}</b><span>${esc(sol.question)}</span></div>`,
  });
}
