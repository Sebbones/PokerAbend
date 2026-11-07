// Gedächtnisküche im Browser (Regeln und Wertung: public/games/gedaechtnis-kueche/logic.js). Rezept merken, dann die Zutaten in der Reihenfolge antippen.
'use strict';
{
  // Eigene Zutatenzeichnungen (gleicher Strich, jede Zutat mit eigener Silhouette); Reihenfolge wie INGREDIENTS in logic.js
  const ICONS = ["<path d=\"M24 44 15 18c-1-6 17-6 18 0z\" fill=\"#e8892b\"/><path d=\"M19 24h6M21 32h6\" stroke=\"#a9591a\"/><path d=\"M24 14c-4-3-5-7-3-10 3 1 5 4 3 10zm0 0c4-3 8-4 10-2-1 3-5 4-10 2z\" fill=\"#5fa35a\"/>","<path d=\"M24 8c10 6 16 16 10 26-3 5-7 6-10 6s-7-1-10-6C8 24 14 14 24 8z\" fill=\"#d9a8c7\"/><path d=\"M24 8c-6 8-6 20 0 32M24 8c6 8 6 20 0 32\" fill=\"none\" stroke=\"#a06a8f\"/><path d=\"M24 8V3\" stroke=\"#5fa35a\" stroke-width=\"3\"/>","<circle cx=\"24\" cy=\"27\" r=\"15\" fill=\"#d9463c\"/><path d=\"m24 13-6-5 6 2 6-2-6 5zm0 0v4\" fill=\"#5fa35a\" stroke=\"#3d7a3a\"/><path d=\"M16 22c1-3 3-4 5-4\" stroke=\"#f6b0a8\" fill=\"none\"/>","<path d=\"M5 34V22L43 14v20z\" fill=\"#f0c24a\"/><path d=\"M5 22 43 14M5 34h38\" fill=\"none\"/><circle cx=\"16\" cy=\"28\" r=\"3\" fill=\"#c99a1f\"/><circle cx=\"30\" cy=\"26\" r=\"4\" fill=\"#c99a1f\"/><circle cx=\"37\" cy=\"31\" r=\"2\" fill=\"#c99a1f\"/>","<ellipse cx=\"24\" cy=\"26\" rx=\"13\" ry=\"16\" fill=\"#f5efe0\"/><circle cx=\"24\" cy=\"30\" r=\"6\" fill=\"#f0b73a\"/><path d=\"M15 18c1-4 4-6 7-6\" stroke=\"#fff\" fill=\"none\"/>","<path d=\"M6 24C6 12 14 6 24 6s18 6 18 18z\" fill=\"#c8553d\"/><circle cx=\"16\" cy=\"16\" r=\"3\" fill=\"#f5efe0\"/><circle cx=\"28\" cy=\"13\" r=\"2.5\" fill=\"#f5efe0\"/><circle cx=\"33\" cy=\"20\" r=\"2\" fill=\"#f5efe0\"/><path d=\"M18 24h12v12c0 4-12 4-12 0z\" fill=\"#efe3c6\"/>","<path d=\"M10 14c10-4 28 2 30 20-8-2-12-6-14-10-4 0-10 0-16-10z\" fill=\"#d63a2c\"/><path d=\"M10 14c-2-3-1-6 1-8\" stroke=\"#4f9a4d\" stroke-width=\"3\" fill=\"none\"/>","<path d=\"M8 28c0-10 8-16 18-16 9 0 14 6 14 14 0 9-8 14-18 14-8 0-14-4-14-12z\" fill=\"#b98a55\"/><circle cx=\"18\" cy=\"26\" r=\"1.6\" fill=\"#6b4a28\"/><circle cx=\"28\" cy=\"20\" r=\"1.6\" fill=\"#6b4a28\"/><circle cx=\"30\" cy=\"32\" r=\"1.6\" fill=\"#6b4a28\"/>"];
  const icon = (k, cls = '') => `<svg class="gk-ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false" stroke="#3a2a1a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
  soloGame({
    id: 'gedaechtnis-kueche',
    name: 'Gedächtnisküche',
    terms: { waitWrite: 'kocht …' },
    intro: [
      ['Ziel', 'Merk dir das Rezept: Die Zutaten erscheinen nacheinander.'],
      ['Nachkochen', 'Tipp danach die Zutaten in genau der Reihenfolge an. Der erste Fehler beendet die Folge.'],
      ['Länger', 'Jede Runde wird das Rezept eine Zutat länger.'],
    ],
    short: [
      'Alle sehen dasselbe Rezept: eine Folge von Zutaten, jeweils kurz.',
      'Danach verschwindet es, und du tippst die Zutaten in der richtigen Reihenfolge an.',
      'Jede Runde ist das Rezept eine Zutat länger; ein Fehler beendet die Folge.',
      'Punkte nach Länge der richtig erinnerten Folge, dazu ein Bonus fürs ganze Rezept und für Tempo.',
    ],
    rules: I18n.html`<p>Ein Rezept ist eine Folge von Zutaten. Alle bekommen dasselbe Rezept und sehen die Zutaten kurz nacheinander.</p>
      <ul>
        <li>Danach verschwindet das Rezept, und du tippst die Zutaten <b>in derselben Reihenfolge</b> an.</li>
        <li>Der <b>erste Fehler</b> beendet die Folge: Du bekommst Punkte für die Zutaten, die bis dahin stimmten (10 je Zutat).</li>
        <li>Das ganze Rezept richtig: +20 und bis zu +10 für Tempo.</li>
        <li>Jede Runde wird das Rezept <b>eine Zutat länger</b>.</li>
        <li>Hausregel: Rezept rückwärts nennen (Host-Menü).</li>
      </ul>`,
    timed: false,
    phase(c) {
      const len = c.round.seq.length, per = c.round.showMsPerItem;
      if (c.t >= len * per + 200) return 'recall';
      const i = Math.min(len - 1, Math.floor(c.t / per));
      return I18n.html`show:${i}:${c.t >= len * per || (c.t % per) >= 600 ? 1 : 0}`; // zweite Zahl: Pause zwischen den Zutaten
    },
    sig(c) { return `${this.phase(c)}|${(c.local.taps || []).length}`; },
    render(c) {
      const ph = this.phase(c);
      if (ph !== 'recall') {
        const [, i, gap] = ph.split(':').map(Number);
        const idx = i, ing = c.L.INGREDIENTS[c.round.seq[idx]];
        const t = WorldKit.t;
        return `<div class="wk-stage gk-stage">${WorldKit.head({ eyebrow: t('Merken', 'Memorise'), title: t(`Zutat ${idx + 1} von ${c.round.seq.length}`, `Ingredient ${idx + 1} of ${c.round.seq.length}`), chips: [WorldKit.chip('👁', t('Rezeptkarte sichtbar', 'Recipe card visible'), 'warn')] })}<div class="gk-show" role="status"><div class="gk-card"><span class="gk-big" aria-label="${esc(ing.name)}">${gap ? '' : icon(c.round.seq[idx])}</span><b>${gap ? '' : esc(ing.name)}</b></div>${c.round.reverse ? `<small>${t('Später rückwärts nennen', 'Name them backwards later')}</small>` : ''}</div></div>`;
      }
      const taps = c.local.taps || [];
      const W = WorldKit, t = W.t;
      const row = `<div class="gk-taps" aria-label="${t('Bisher', 'So far')}: ${taps.length} / ${c.round.expected.length}">${c.round.expected.map((_, k) => `<i class="${k < taps.length ? 'on' : ''}"><small>${k + 1}</small>${k < taps.length ? icon(taps[k]) : ''}</i>`).join('')}</div>`;
      const btns = c.L.INGREDIENTS.map((x, k) => `<button type="button" class="gk-ing" data-g="gk-tap" data-i="${k}" aria-label="${esc(x.name)}">${icon(k)}<small>${esc(x.name)}</small></button>`).join('');
      return `<div class="wk-stage gk-stage">${W.head({ eyebrow: t('Wiedergeben', 'Recall'), title: c.round.reverse ? t('Rückwärts nachkochen', 'Cook it backwards') : t('Nachkochen', 'Cook it again'), chips: [W.chip('✎', `${taps.length} / ${c.round.expected.length}`)] })}<div class="gk-recall"><small>${c.round.reverse ? t('Tipp die Zutaten rückwärts an (die letzte zuerst)', 'Tap the ingredients backwards (the last one first)') : t('Tipp die Zutaten in der Reihenfolge an', 'Tap the ingredients in order')}</small>${row}<div class="so-btns gk-board">${btns}</div></div></div>`;
    },
    hint: (c) => (c.t < c.round.seq.length * c.round.showMsPerItem + 200 ? 'Merk dir die Zutaten' : 'Tipp die Zutaten in der richtigen Reihenfolge an'),
    onClick(el, c) {
      if (el.dataset.g !== 'gk-tap') return;
      const taps = c.local.taps ||= [];
      taps.push(Number(el.dataset.i));
      const k = taps.length - 1;
      if (taps[k] !== c.round.expected[k] || taps.length === c.round.expected.length) { c.submit({ taps }); return; }
      c.refresh();
    },
    payload: (c) => ({ taps: c.local.taps || [] }),
    solution: (sol) => I18n.html`<div class="sm-answer" role="status"><small>Das Rezept war${sol.reverse ? ' (rückwärts)' : ''}</small><b class="gk-recipe">${sol.recipe.map((i) => icon(i, 'mini')).join(' ')}</b></div>`,
  });
}
