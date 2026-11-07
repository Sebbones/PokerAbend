// Würfelpoker im Browser (Regeln: games/wuerfelpoker/room.js). Würfeln, Würfel zum Behalten antippen, wieder würfeln oder aufhören.
'use strict';
{
  let keep = new Set();
  let seen = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const mini = (dice) => `<span class="wp-mini">${dice.map((d) => dieHTML(d, { cls: 'small' })).join('')}</span>`;

  const kit = kitGame({
    id: 'wuerfelpoker',
    name: 'Würfelpoker',
    direction: false,
    intro: [
      ['Ziel', 'Wirf mit fünf Würfeln die beste Pokerhand. Wer die schlechteste hat, bekommt einen Strich.'],
      ['Dein Zug', 'Würfeln, dann gute Würfel antippen (sie bleiben liegen) und den Rest neu würfeln – bis zu dreimal.'],
      ['Ausscheiden', 'Wer die eingestellte Strichzahl erreicht, ist raus. Der Letzte gewinnt.'],
    ],
    short: [
      'Pro Zug bis zu drei Würfe; nach jedem Wurf legst du Würfel beiseite und würfelst den Rest neu.',
      'Hände: Fünfling, Vierling, Full House, große Straße (2–6), kleine Straße (1–5), Drilling, zwei Paare, Paar, hohe Karte.',
      'Wer zuerst dran ist, legt fest, wie oft alle anderen höchstens würfeln.',
      'Die schlechteste Hand bekommt einen Strich. Wer genug Striche hat, scheidet aus.',
    ],
    house: () => [],
    playerInfo: (p, S) => (p.out ? 'raus' : `${'✗'.repeat(p.strikes || 0)}${'·'.repeat(Math.max(0, (S?.g?.strikesMax || 0) - (p.strikes || 0)))}`),
    seat: (p, S) => (p.out ? I18n.html('<span>raus</span>') : I18n.html`<span>${p.strikes || 0} von ${S.g?.strikesMax ?? '?'} Strichen</span>${S.g?.results?.[p.id] ? `<span>${esc(S.g.results[p.id].name)}</span>` : ''}`),
    sounds(S, prev) { return S.g && prev.g && S.g.throws > prev.g.throws ? 'dice' : null; },
    onState(S) {
      const key = `${S.turnId}:${S.g?.hands}:${S.g?.throws}`;
      if (key !== seen) { seen = key; keep = new Set(); }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran`;
      if (!g.throws) return I18n.html`Würfel! Du hast bis zu ${g.maxThrows} Würfe${g.limit ? I18n.html` (der Erste hat bei ${g.limit} aufgehört)` : ''}`;
      return I18n.html`Tipp die Würfel an, die liegen bleiben sollen – der Rest wird neu gewürfelt (${g.throws} von ${g.maxThrows})`;
    },
    main(S) {
      const g = S.g, W = WorldKit, t = W.t;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const pick = myTurn && g.throws && g.throws < g.maxThrows;
      const slots = g.dice.map((d, i) => {
        const kept = pick ? keep.has(i) : g.kept.includes(i);
        const die = dieHTML(d, pick ? { tag: 'button', cls: I18n.html`big ${kept ? 'kept' : ''}`, attrs: `type="button" data-g="keep" data-i="${i}" aria-pressed="${kept}" aria-label="${t('Würfel', 'Die')} ${i + 1}: ${d}${kept ? ', ' + t('behalten', 'kept') : ''}"` } : { cls: I18n.html`big ${kept ? 'kept' : ''}` });
        return `<span class="wp-slot ${kept ? 'kept' : ''}">${die}<small>${kept ? '✓ ' + t('behalten', 'kept') : '&nbsp;'}</small></span>`;
      }).join('');
      const left = Math.max(0, g.maxThrows - g.throws);
      const chips = [W.chip('🎲', t(`Wurf ${g.throws} von ${g.maxThrows}`, `Roll ${g.throws} of ${g.maxThrows}`)), W.chip('↻', t(`${left} übrig`, `${left} left`), left ? '' : 'warn')];
      const tray = `<div class="wp-tray"><span class="wk-label">${t('Aktueller Wurf', 'Current roll')} · ${nameOf(S, S.turnId)}${g.throws ? '' : ' · ' + t('noch nicht gewürfelt', 'not rolled yet')}</span><div class="wp-dice">${slots}</div>${g.current ? `<b class="wp-cat">${esc(g.current)}</b>` : `<span class="wp-cat dim">${t('Noch keine Hand', 'No hand yet')}</span>`}</div>`;
      const rows = Object.entries(g.results).map(([id, r]) => `<li><b class="wk-grow">${nameOf(S, id)}</b>${mini(r.dice)}<span>${esc(r.name)}</span></li>`).join('');
      const L = g.last;
      const last = L ? `<details class="wp-last wk-panel" open><summary>${t(`Runde ${L.no} (abgeschlossen)`, `Round ${L.no} (finished)`)}: ${L.losers.length ? t('Strich für ', 'Strike for ') + L.losers.map((id) => nameOf(S, id)).join(', ') : t('kein Strich', 'no strike')}</summary>
        <ol>${Object.entries(L.results).map(([id, r]) => `<li class="${L.losers.includes(id) ? 'lost' : ''}"><b class="wk-grow">${nameOf(S, id)}</b>${mini(r.dice)}<span>${esc(r.name)}${L.losers.includes(id) ? ' ✗' : ''}</span></li>`).join('')}</ol></details>` : '';
      return `<div class="kg-table wk-stage wp-stage">${W.head({ eyebrow: t('Würfelpoker', 'Dice poker'), title: myTurn ? t('Du bist am Wurf', 'Your roll') : t(`${nameOf(S, S.turnId)} würfelt`, `${nameOf(S, S.turnId)} is rolling`), chips })}
        <div class="wp-board">${tray}<aside class="wp-side">${rows ? `<div><span class="wk-label">${t('Fertig in dieser Runde', 'Done this round')}</span><ul class="wk-ledger wp-results" aria-label="${t('Fertig in dieser Runde', 'Done this round')}">${rows}</ul></div>` : `<p class="wk-sub">${t('Noch niemand ist fertig.', 'Nobody is done yet.')}</p>`}</aside></div>${last}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      if (!myTurn) return '';
      const can = g.throws < g.maxThrows;
      const roll = !g.throws ? I18n.html('<button class="btn btn-brass" data-g="throw">Würfeln</button>')
        : can ? `<button class="btn btn-brass" data-g="throw">${keep.size ? I18n.html`${5 - keep.size} neu würfeln` : 'Alle neu würfeln'}</button>` : '';
      return `<div class="kg-acts">${roll}${g.throws ? I18n.html('<button class="btn" data-g="stop">Fertig</button>') : ''}</div>`;
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'keep') { const i = Number(t.dataset.i); if (keep.has(i)) keep.delete(i); else keep.add(i); kit.render(); }
      else if (g === 'throw') { const k = [...keep]; keep = new Set(); send('throw', { keep: k }); }
      else if (g === 'stop') send('stop');
    },
    rules: I18n.html`<p>Fünf Würfel, die beste Pokerhand gewinnt die Runde.</p>
      <ul>
        <li>Pro Zug bis zu <b>drei Würfe</b>. Nach jedem Wurf legst du Würfel beiseite (antippen) und würfelst den Rest neu.</li>
        <li>Wer in einer Runde als <b>Erster</b> dran ist, legt mit der Zahl seiner Würfe fest, wie oft alle anderen höchstens würfeln dürfen.</li>
        <li>Hände von oben nach unten: <b>Fünfling, Vierling, Full House, große Straße (2–6), kleine Straße (1–5), Drilling, zwei Paare, Paar, hohe Karte</b>. Bei gleicher Hand zählt die höhere Augenzahl.</li>
        <li>Wer die schlechteste Hand hat, bekommt einen <b>Strich</b> (bei Gleichstand alle Betroffenen; haben alle dasselbe, gibt es keinen).</li>
        <li>Wer die eingestellte Strichzahl erreicht, scheidet aus. Der Letzte gewinnt. Der Verlierer der Runde fängt die nächste an.</li>
      </ul>`,
  });
}
