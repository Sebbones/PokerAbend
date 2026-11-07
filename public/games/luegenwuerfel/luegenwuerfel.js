// Lügenwürfel im Browser (Regeln: games/luegenwuerfel/room.js). Eigene Würfel ansehen, Gebot einstellen, bieten oder „Lüge!“ rufen.
'use strict';
{
  let n = 1, face = 1, seenBid = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const higher = (g, a, f) => !g.bid || a > g.bid.n || (a === g.bid.n && f > g.bid.face);
  // Kleinstes mögliche Gebot über dem letzten
  const minimal = (g) => (!g.bid ? { n: 1, face: 1 } : g.bid.face < 6 ? { n: g.bid.n, face: g.bid.face + 1 } : { n: g.bid.n + 1, face: 1 });

  const kit = kitGame({
    id: 'luegenwuerfel',
    name: 'Lügenwürfel',
    direction: false,
    intro: [
      ['Ziel', 'Du kennst nur deine eigenen Würfel. Biete, wie viele Würfel am ganzen Tisch eine Augenzahl zeigen – oder entlarve eine Lüge.'],
      ['Bieten', 'Ein Gebot muss höher sein: mehr Würfel, oder gleich viele mit höherer Augenzahl.'],
      ['Lüge!', 'Glaubst du dem Gebot nicht, ruf „Lüge!“. Alle Becher werden gehoben: Wer falsch lag, verliert einen Würfel.'],
    ],
    short: [
      'Alle haben Würfel unter dem Becher und sehen nur ihre eigenen.',
      'Gebot: „Mindestens N Würfel zeigen F“ – gemeint sind alle Würfel am Tisch.',
      'Höher heißt: mehr Würfel, oder dieselbe Anzahl mit höherer Augenzahl.',
      'Wer „Lüge!“ ruft, deckt auf: stimmt das Gebot, verliert der Zweifler einen Würfel, sonst der Bieter.',
      'Wer keine Würfel mehr hat, scheidet aus. Der Letzte gewinnt.',
    ],
    house: (S) => (S.settings.wild ? [I18n.t('Einsen zählen als Joker')] : []),
    playerInfo: (p) => (p.dice === undefined ? '' : I18n.html`${p.dice} Würfel`),
    seat: (p) => `<span>${'●'.repeat(p.dice || 0)}</span>`,
    sounds(S, prev) { return S.g && prev.g && S.g.deal !== prev.g.deal ? 'dice' : null; },
    onState(S) {
      const key = JSON.stringify(S.g?.bid) + ':' + S.g?.deal;
      if (key !== seenBid && S.g) { seenBid = key; const m = minimal(S.g); n = m.n; face = m.face; }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran${g.bid ? I18n.html` – Gebot: ${g.bid.n} × ${g.bid.face}` : ''}`;
      return g.bid ? I18n.html`Biete höher als ${g.bid.n} × ${g.bid.face} – oder ruf „Lüge!“` : 'Du fängst an: gib ein Gebot ab';
    },
    main(S) {
      const g = S.g;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const bid = g.bid ? I18n.html`<div class="lw-bid" role="status"><small>${nameOf(S, g.bid.by)} bietet</small><b>mindestens ${g.bid.n} ×</b>${dieHTML(g.bid.face, { cls: 'big' })}<small>von ${g.total} Würfeln am Tisch</small></div>`
        : I18n.html`<div class="lw-bid"><small>Noch kein Gebot – ${g.total} Würfel am Tisch</small></div>`;
      let reveal = '';
      if (g.reveal) {
        const R = g.reveal;
        const wildOn = g.wild && R.bid.face !== 1;
        const rows = Object.entries(R.cups).map(([id, cup]) => `<li><b>${nameOf(S, id)}</b><span class="lw-cup">${cup.map((d) => dieHTML(d, { cls: I18n.html`small ${d === R.bid.face || (wildOn && d === 1) ? 'kept' : 'old'}` })).join('')}</span></li>`).join('');
        reveal = I18n.html`<div class="lw-reveal ${R.truth ? 'true' : 'lie'}" role="status"><b>${nameOf(S, R.doubter)} rief „Lüge!“ – gezählt: ${R.count} × ${R.bid.face}, geboten waren ${R.bid.n}</b>
          <ul>${rows}</ul><span>${nameOf(S, R.loser)} verliert einen Würfel</span></div>`;
      }
      const W = WorldKit, t = W.t;
      const mine = g.cup ? I18n.html`<div class="lw-mine" aria-label="Deine Würfel"><small>🔒 ${t('Nur du siehst das', 'Only you can see this')} · ${t('Deine Würfel', 'Your dice')}</small><div class="lw-cup">${g.cup.map((d) => dieHTML(d, { cls: 'big' })).join('')}</div></div>` : '';
      const chips = [W.chip('🎲', `${g.total} ${t('Würfel am Tisch', 'dice on the table')}`), g.bid ? W.chip('⬆', `${t('Gebot', 'Bid')} ${g.bid.n} × ${g.bid.face}`, 'warn') : W.chip('…', t('Noch kein Gebot', 'No bid yet')), g.wild ? W.chip('★', t('Einsen sind Joker', 'Ones are wild')) : ''].filter(Boolean);
      return `<div class="kg-table lw-wrap wk-stage lw-stage">${W.head({ eyebrow: t('Würfelclub', 'Dice club'), title: myTurn ? t('Du bist am Zug', 'Your move') : t('Gebot am Tisch', 'The bid on the table'), chips })}<div class="lw-center">${bid}</div>${reveal}${mine}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      if (!myTurn) return '';
      const ok = higher(g, n, face) && n >= 1 && n <= g.total;
      const faces = [1, 2, 3, 4, 5, 6].map((f) => dieHTML(f, { tag: 'button', cls: face === f ? 'kept' : '', attrs: `type="button" data-g="face" data-f="${f}" aria-pressed="${face === f}"` })).join('');
      return I18n.html`<div class="lw-controls"><div class="lw-n"><button class="btn btn-sm" data-g="minus" aria-label="Weniger Würfel">−</button><b>${n} ×</b><button class="btn btn-sm" data-g="plus" aria-label="Mehr Würfel">+</button></div>
        <div class="lw-faces" role="group" aria-label="Augenzahl">${faces}</div></div>
        <div class="kg-acts"><button class="btn btn-brass" data-g="bid" ${ok ? '' : 'disabled'}>${ok ? I18n.html`Bieten: ${n} × ${face}` : 'Gebot muss höher sein'}</button>${g.bid ? I18n.html('<button class="btn btn-danger" data-g="doubt">Lüge!</button>') : ''}</div>`;
    },
    onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'minus') n = Math.max(1, n - 1);
      else if (g === 'plus') n = Math.min(S.g.total, n + 1);
      else if (g === 'face') face = Number(t.dataset.f);
      else if (g === 'bid') { send('bid', { n, face }); return; }
      else if (g === 'doubt') { send('doubt'); return; }
      kit.render();
    },
    rules: I18n.html`<p>Jeder hat Würfel unter einem Becher und kennt nur seine eigenen.</p>
      <ul>
        <li>Reihum gibt man ein <b>Gebot</b> ab: „Mindestens N Würfel zeigen die Augenzahl F“ – gemeint sind <b>alle Würfel am Tisch</b>.</li>
        <li>Ein neues Gebot muss höher sein: <b>mehr Würfel</b>, oder dieselbe Anzahl mit <b>höherer Augenzahl</b>.</li>
        <li>Statt zu bieten kannst du <b>„Lüge!“</b> rufen. Dann werden alle Becher gehoben und gezählt.</li>
        <li>Stimmt das Gebot (mindestens so viele), verliert der <b>Zweifler</b> einen Würfel, sonst der <b>Bieter</b>. Wer verliert, fängt die nächste Runde an.</li>
        <li>Wer keine Würfel mehr hat, scheidet aus. Der Letzte gewinnt.</li>
        <li>Hausregel: Einsen zählen als Joker.</li>
      </ul>`,
  });
}
