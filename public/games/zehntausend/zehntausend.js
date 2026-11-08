// Zehntausend im Browser (Regeln: games/zehntausend/room.js). Würfel antippen = zum Herauslegen wählen, die Wertung steht sofort daneben.
'use strict';
{
  const fmt = (n) => Number(n || 0).toLocaleString(I18n.locale);
  const base = (f) => (f === 1 ? 1000 : f * 100);
  // Gleiche Wertung wie auf dem Server: beste Aufteilung, jeder Würfel muss punkten (sonst -1)
  function scoreDice(vals, { straight = 2000, threePairs = true } = {}) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const v of vals) c[v]++;
    let best = -1;
    if (vals.length === 6) {
      if ([1, 2, 3, 4, 5, 6].every((f) => c[f] === 1)) best = Math.max(best, straight);
      if (threePairs && c.filter((n) => n === 2).length === 3) best = Math.max(best, 1500);
    }
    const go = (f, acc) => {
      if (f > 6) { best = Math.max(best, acc); return; }
      const n = c[f], single = f === 1 ? 100 : f === 5 ? 50 : 0;
      for (let k = 0; k <= n; k++) {
        if ((k > 0 && k < 3) || (n - k && !single)) continue;
        go(f + 1, acc + (k ? base(f) * 2 ** (k - 3) : 0) + (n - k) * single);
      }
    };
    if (vals.length) go(1, 0);
    return best > 0 ? best : -1;
  }
  function bestTake(vals, opts) {
    let best = null;
    for (let m = 1; m < 1 << vals.length; m++) {
      const idx = vals.map((_, i) => i).filter((i) => m & (1 << i));
      const s = scoreDice(idx.map((i) => vals[i]), opts);
      if (s > 0 && (!best || s > best.points || (s === best.points && idx.length > best.idx.length))) best = { idx, points: s };
    }
    return best;
  }
  let sel = new Set();
  let selKey = '';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');

  const kit = kitGame({
    id: 'zehntausend',
    look(S) {
      const g = S.g;
      const ids = Object.keys(g.banked).sort((a, b) => g.banked[b] - g.banked[a]);
      return [{ title: 'Punkte aller', note: I18n.html`Ziel: ${fmt(g.target)}`, html: `<ul class="look-list">${ids.map((id) => `<li><b>${esc(S.players.find((p) => p.id === id)?.name ?? '?')}</b>: ${fmt(g.banked[id])}${g.entered.includes(id) ? '' : I18n.t(' · noch nicht drin')}</li>`).join('')}</ul>` }];
    },
    name: 'Zehntausend',
    direction: false,
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ['Würfeln', 'Wirf die Würfel und tipp an, welche du herauslegst – jeder muss punkten: 1 = 100, 5 = 50, drei gleiche = Augen × 100 (drei Einser 1.000).'],
      ['Zocken oder sichern', 'Mit den übrigen Würfeln weiterwürfeln – oder „Aufhören“ und die Zugpunkte anschreiben. Punktet ein Wurf gar nicht, ist der ganze Zug weg.'],
      ['Gewinnen', 'Zum ersten Anschreiben brauchst du 350 in einem Zug. Wer zuerst 10.000 hat, gewinnt – die anderen haben noch einen letzten Zug.'],
    ],
    short: [
      'Würfeln, dann mindestens einen punktenden Würfel herauslegen – danach weiterwürfeln oder aufhören und anschreiben.',
      '1 = 100, 5 = 50. Drei gleiche = Augenzahl × 100 (drei Einser 1.000), jeder weitere gleiche verdoppelt.',
      'Straße 1–6 = 2.000, drei Paare = 1.500. Gewertet wird nur innerhalb eines Wurfs.',
      'Punktet ein Wurf gar nicht, sind alle Punkte dieses Zuges weg. Haben alle 6 gepunktet, geht es mit allen 6 weiter.',
      'Erstes Anschreiben ab 350 Punkten in einem Zug. Wer zuerst 10.000 hat, gewinnt (die anderen haben noch einen Zug).',
    ],
    house: () => [],
    playerInfo: (p) => (p.banked === undefined ? '' : `${fmt(p.banked)}${p.entered ? '' : I18n.t(' · noch nicht drin')}${p.lastTurn ? I18n.t(' · letzter Zug') : ''}`),
    onState(S) {
      const g = S.g;
      const key = g ? `${S.roundNo}:${S.turnId}:${g.dice.join(',')}:${g.rolled}:${g.aside.length}` : '';
      if (key !== selKey) { selKey = key; sel = new Set(); }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} würfelt${g.turnPoints ? I18n.html` – Zug ${fmt(g.turnPoints)}` : ''}`;
      if (g.rolled) return I18n.t('Tipp die Würfel an, die du herauslegst – jeder muss punkten');
      if (!g.turnPoints) return g.final ? 'Dein letzter Zug – würfle' : I18n.t('Würfle');
      return g.canBank ? I18n.html`Weiterwürfeln mit ${g.remaining} Würfel${g.remaining === 1 ? '' : 'n'} – oder ${fmt(g.turnPoints)} sichern` : I18n.html`Noch nicht eingestiegen: ${fmt(g.entry)} nötig – weiterwürfeln`;
    },
    main(S) {
      const g = S.g;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      // Punktestände zum Ziel
      const ids = Object.keys(g.banked).sort((a, b) => g.banked[b] - g.banked[a]);
      const track = `<div class="zt-track">${ids.map((id) => `<div class="zt-row ${id === S.turnId ? 'turn' : ''} ${id === S.you?.id ? 'me' : ''}">
        <span class="zt-name">${nameOf(S, id)}${g.entered.includes(id) ? '' : I18n.html(' <small>(noch nicht drin)</small>')}</span>
        <span class="zt-bar" aria-hidden="true"><i style="width:${Math.min(100, (g.banked[id] / g.target) * 100)}%"></i></span>
        <b>${fmt(g.banked[id])}</b></div>`).join('')}</div>`;
      const final = g.final ? I18n.html`<p class="zt-banner" role="status">${nameOf(S, g.final.by)} hat ${fmt(g.target)} – letzte Runde für: ${g.final.left.map((id) => nameOf(S, id)).join(', ') || '–'}</p>` : '';
      const loss = g.lastLoss && !g.rolled && !g.turnPoints ? I18n.html`<p class="zt-loss" role="status">Niete! ${nameOf(S, g.lastLoss.id)}${g.lastLoss.points ? I18n.html` verliert ${fmt(g.lastLoss.points)}` : ''} (${g.lastLoss.dice.join(' ')})</p>` : '';
      // Herausgelegt in diesem Zug
      const aside = g.aside.length ? `<div class="zt-aside">${g.aside.map((a) => `<span class="zt-group">${a.dice.map((d) => dieHTML(d, { cls: 'small' })).join('')}<b>+${fmt(a.points)}</b></span>`).join('')}</div>` : '';
      // Aktueller Wurf: antippen = auswählen
      const pick = [...sel].map((i) => g.dice[i]);
      const score = pick.length ? scoreDice(pick, g.scoring) : 0;
      const dice = g.rolled ? g.dice.map((d, i) => (myTurn
        ? dieHTML(d, { tag: 'button', cls: I18n.html`big ${sel.has(i) ? 'kept' : ''}`, attrs: `type="button" data-g="pick" data-i="${i}" aria-pressed="${sel.has(i)}"` })
        : dieHTML(d, { cls: 'big' }))).join('') : I18n.html`<span class="zt-wait">${g.remaining} Würfel bereit</span>`;
      const preview = myTurn && g.rolled ? `<span class="zt-preview ${pick.length ? (score > 0 ? 'ok' : 'bad') : ''}">${pick.length ? (score > 0 ? I18n.html`Auswahl: +${fmt(score)}` : 'Auswahl punktet nicht ganz') : 'Würfel wählen'}</span>` : '';
      const W = WorldKit, tt = W.t, mineBank = g.banked[S.you?.id];
      const chips = [W.chip('⚠', `${tt('Riskiert', 'At risk')}: ${fmt(g.turnPoints)}`, g.turnPoints ? 'warn' : ''), mineBank !== undefined ? W.chip('🔒', `${tt('Gesichert', 'Banked')}: ${fmt(mineBank)}`, 'good') : '', W.chip('🎯', `${tt('Ziel', 'Target')} ${fmt(g.target)}`), g.final ? W.chip('⏳', tt('Letzte Runde', 'Final round'), 'bad') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table zt-table wk-stage zt-stage">${W.head({ eyebrow: tt('Würfelarena', 'Dice arena'), title: myTurn ? tt('Du bist dran', 'Your turn') : `${nameOf(S, S.turnId)} ${tt('würfelt', 'is rolling')}`, chips })}${final}
        <div class="zt-turn"><div class="zt-points"><small>${nameOf(S, S.turnId)} · ${tt('dieser Zug – noch nicht gesichert', 'this turn – not banked yet')}</small><b>${fmt(g.turnPoints)}</b></div>${aside}
          <div class="zt-dice">${dice}</div>${preview}</div>${loss}${track}</div>`;
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      if (g.rolled) {
        const pick = [...sel].map((i) => g.dice[i]);
        const score = pick.length ? scoreDice(pick, g.scoring) : -1;
        return I18n.html`<button class="btn btn-brass" data-g="take" ${score > 0 ? '' : 'disabled title="Jeder herausgelegte Würfel muss punkten"'}>Herauslegen${score > 0 ? ` +${fmt(score)}` : ''}</button>
          <button class="btn" data-g="best">Beste Auswahl</button>`;
      }
      const bank = g.turnPoints ? I18n.html`<button class="btn ${g.canBank ? 'btn-brass' : ''}" data-g="bank" ${g.canBank ? '' : `disabled title="Zum Einstieg brauchst du ${fmt(g.entry)} in einem Zug"`}>Aufhören: +${fmt(g.turnPoints)} sichern</button>` : '';
      return I18n.html`<button class="btn ${g.turnPoints ? '' : 'btn-brass'}" data-g="roll">Würfeln (${g.remaining} Würfel)</button>${bank}`;
    },
    onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'pick') { const i = Number(t.dataset.i); if (sel.has(i)) sel.delete(i); else sel.add(i); kit.render(); }
      else if (g === 'best') { const b = bestTake(S.g.dice, S.g.scoring); sel = new Set(b ? b.idx : []); kit.render(); }
      else if (g === 'take') send('take', { dice: [...sel] });
      else if (g === 'roll') send('roll');
      else if (g === 'bank') send('bank');
    },
    rules: I18n.html`<p>Sechs Würfel. Wer zuerst das Ziel (Standard 10.000) erreicht, löst die letzte Runde aus – danach gewinnt, wer am meisten hat.</p>
      <ul>
        <li><b>Zug:</b> würfeln, mindestens einen punktenden Würfel herauslegen. Dann mit den übrigen weiterwürfeln oder <b>aufhören</b> und die Zugpunkte anschreiben.</li>
        <li><b>Niete:</b> Punktet ein Wurf gar nicht, sind alle Punkte dieses Zuges verloren.</li>
        <li>Haben alle 6 Würfel gepunktet, darfst du mit allen 6 weiterwürfeln.</li>
        <li><b>Wertung</b> (nur innerhalb eines Wurfs, jeder herausgelegte Würfel muss punkten): 1 = 100, 5 = 50. Drei gleiche = Augenzahl × 100 (drei Einser = 1.000), vier gleiche = doppelt, fünf = vierfach, sechs = achtfach. Straße 1–6 = 2.000, drei verschiedene Paare = 1.500.</li>
        <li><b>Einstieg:</b> Das erste Mal anschreiben darfst du erst mit mindestens 350 Punkten in einem Zug.</li>
        <li>Läuft die Zeit ab, legt der Computer alles Punktende heraus und hört auf, wenn das geht.</li>
      </ul>`,
  });
}
