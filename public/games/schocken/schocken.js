// Schocken im Browser (Regeln: games/schocken/room.js). Würfel antippen = liegen lassen.
// Bierdeckel liegen als runder Stapel in der Mitte und wandern nach jedem Durchgang sichtbar zum Verlierer.
'use strict';
{
  let keep = new Set();
  let keepKey = '';
  let passKey = null; // zuletzt gezeigter Durchgang (für die Deckel-Animation)
  const held = (g, id, i) => g.forced?.[id] === i || (g.reroll?.[id] !== i && keep.has(i));
  const coaster = (cls = '') => `<span class="sc-deckel ${cls}" aria-hidden="true"></span>`;

  const kit = kitGame({
    id: 'schocken',
    look(S) {
      const g = S.g;
      const ids = Object.keys(g.dice).filter((id) => g.dice[id] && g.dice[id].length);
      return [{ title: 'Würfel auf dem Tisch', html: ids.length ? `<ul class="look-list">${ids.map((id) => `<li><b>${esc(S.players.find((p) => p.id === id)?.name ?? '?')}</b> <span class="sc-mini">${g.dice[id].map((v) => dieHTML(v, {})).join('')}</span> ${esc(g.judged[id])}${g.done.includes(id) ? ' ✓' : ''}</li>`).join('')}</ul>` : I18n.html('<p class="hint">Noch hat niemand gewürfelt.</p>') }];
    },
    name: 'Schocken',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Würfeln", "Bis zu drei Würfe. Der Erste im Durchgang legt fest, wie oft alle würfeln dürfen."],
      ["Liegen lassen", "Tipp Würfel an, die liegen bleiben sollen – sie rutschen nach vorne. Dann nochmal würfeln oder „Fertig“."],
      ["Deckel", "Der Schlechteste im Durchgang bekommt Deckel. Wer am Ende alle 13 hat, verliert die Halbzeit."],
    ],
    short: [
      "Drei Würfel, bis zu drei Würfe – Würfel antippen = liegen lassen.",
      "Der Erste legt fest, wie oft alle würfeln dürfen.",
      "Stark nach schwach: Schock aus (1-1-1), Schock X (1-1-X), General, Straße, Zahl.",
      "Der Schlechteste bekommt Deckel: Schock X = X, General 3, Straße 2, Zahl 1.",
      "Erst aus der Mitte, dann vom Besten. Wer dann keinen Deckel hat, ist raus.",
      "Wer alle 13 Deckel hat, verliert die Halbzeit.",
    ],
    house: () => ['Schock aus beendet die Halbzeit sofort', 'Gleichstand: weniger Würfe gewinnt, dann wer früher dran war'],
    playerInfo: (p, S) => I18n.html`${p.deckel || 0} Deckel${S.phase === 'playing' && S.g?.done?.includes(p.id) ? ` · ${esc(S.g.judged[p.id])}` : ''}`,
    seat: (p, S) => I18n.html`<span class="sc-seat-deckel">${coaster('mini')}<b>${p.deckel || 0}</b> Deckel</span>${S.phase === 'playing' && S.g?.dice?.[p.id] ? `<span>${esc(S.g.judged[p.id])}${S.g.done.includes(p.id) ? ' ✓' : ''}</span>` : ''}`,
    sounds: (S, prev) => { const n = (g) => Object.values(g?.throws || {}).reduce((x, y) => x + y, 0); return n(S.g) > n(prev.g) ? 'dice' : null; },
    onState(S) {
      // Neuer Wurf → Auswahl zurücksetzen
      const key = S.g && S.turnId ? `${S.roundNo}:${S.turnId}:${S.g.throws?.[S.turnId] || 0}:${S.g.forced?.[S.turnId] ?? ''}:${S.g.reroll?.[S.turnId] ?? ''}` : '';
      if (key !== keepKey) { keepKey = key; keep = new Set(); }
    },
    hint(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      const n = g.throws[S.you.id] || 0;
      if (!n) return g.first === S.you.id ? 'Würfle – du legst fest, wie oft alle würfeln dürfen' : I18n.html`Würfle – höchstens ${g.maxThrows}×`;
      if (g.reroll?.[S.you.id] !== undefined) return 'Die zweite Sechs muss neu gewürfelt werden';
      if (n >= g.maxThrows) return I18n.html`Du hast ${esc(g.judged[S.you.id])} – tipp „Fertig“`;
      return 'Tipp Würfel an, die liegen bleiben, und würfle nochmal – oder „Fertig“';
    },
    main(S) {
      const g = S.g;
      const name = (id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
      const myTurn = S.turnId === S.you?.id;
      // Oben: welche Halbzeit
      const half = S.settings.fullGame ? (g.finale ? 'Finale' : g.series.length ? '2. Halbzeit' : '1. Halbzeit') : '';
      const halfNote = S.settings.fullGame && !g.finale && g.series.length ? I18n.html`<small>Die 1. Halbzeit hat ${esc(g.series[0])} verloren</small>` : '';
      // Tablett: Würfel des Aktiven. Antippen = liegen lassen (rutscht nach vorne, mit „bleibt“ beschriftet)
      const id = S.turnId;
      const d = g.dice[id];
      const tray = d ? I18n.html`<div class="sc-tray ${myTurn ? 'mine' : ''}" aria-label="Würfel von ${name(id)}">
          <div class="sc-dice">${d.map((v, i) => {
            const kept = myTurn ? held(g, id, i) : !!g.kept[id]?.[i];
            const die = myTurn && !g.done.includes(id)
              ? dieHTML(v, { tag: 'button', cls: I18n.html`big ${kept ? 'kept' : ''}`, attrs: `type="button" data-g="keep" data-i="${i}" aria-pressed="${kept}" ${g.forced?.[id] === i || g.reroll?.[id] === i ? 'disabled' : ''}` })
              : dieHTML(v, { cls: I18n.html`big ${kept ? 'kept' : ''}` });
            return `<span class="sc-slot ${kept ? 'kept' : ''}">${die}<small>${kept ? I18n.t('bleibt') : ''}</small></span>`;
          }).join('')}</div>
          <div class="sc-judge"><small>${name(id)} · ${g.throws[id]}. Wurf von ${g.maxThrows}</small><b>${esc(g.judged[id])}</b></div>
        </div>`
        : I18n.html`<div class="sc-tray empty"><small>${name(id)} ist dran – noch nicht gewürfelt. Höchstens ${g.maxThrows} ${I18n.t(g.maxThrows === 1 ? 'Wurf' : 'Würfe')}${g.first && g.first !== id ? I18n.html` (legt ${name(g.first)} fest)` : ''}.</small></div>`;
      // Übersicht aller Würfe dieses Durchgangs (oder des letzten, bis jemand würfelt), bester zuerst
      const current = (g.rank || []).length;
      const list = current
        ? g.rank.map((p) => ({ id: p, name: g.judged[p], dice: g.dice[p], throws: g.throws[p], done: g.done.includes(p) }))
        : (g.lastPass?.rank || []).map((r) => ({ ...r, done: true }));
      const overview = list.length ? `<div class="sc-overview"><h3>${current ? 'Dieser Durchgang' : 'Letzter Durchgang'}</h3><ol>
          ${list.map((r, k) => `<li class="${k === 0 ? 'best' : k === list.length - 1 && list.length > 1 ? 'worst' : ''}">
            <span class="sc-pos">${k + 1}.</span><b>${name(r.id)}</b><span class="sc-mini">${r.dice.map((v) => dieHTML(v, {})).join('')}</span>
            <span class="sc-name">${esc(r.name)}</span><small>${r.throws}× ${r.done ? '' : '· würfelt noch'}</small></li>`).join('')}
        </ol>${!current && g.lastPass ? I18n.html`<p class="sc-result">${name(g.lastPass.worst)} bekommt <b>${g.lastPass.deckel} Deckel</b> (${esc(g.lastPass.name)} von ${name(g.lastPass.best)})</p>` : ''}</div>` : '';
      const W = WorldKit, tt = W.t;
      const chips = [W.chip('◎', `${g.stack} ${tt('Deckel in der Mitte', 'coasters in the middle')}`), half ? W.chip('½', half, g.finale ? 'warn' : '') : '', d ? W.chip('🎲', `${g.throws[id]} / ${g.maxThrows} ${tt('Würfe', 'throws')}`, g.throws[id] >= g.maxThrows ? 'warn' : '') : ''].filter(Boolean);
      return I18n.html`<div class="kg-table sc-table wk-stage sc-stage">${W.head({ eyebrow: tt('Kneipentisch', 'Pub table'), title: myTurn ? tt('Du bist dran', 'Your turn') : tt('Würfelschale', 'The dice tray'), chips })}
        ${half ? `<div class="sc-half" role="status"><b>${half}</b>${halfNote}</div>` : ''}
        <div class="sc-center">
          <div class="sc-stack" aria-label="${g.stack} Deckel in der Mitte">${[...Array(Math.min(g.stack, 13))].map((_, i) => coaster('').replace('class="sc-deckel ', `style="--i:${i}" class="sc-deckel `)).join('')}<b>${g.stack}</b><small>in der Mitte</small></div>
          ${tray}
        </div>
        ${overview}
      </div>`;
    },
    // Deckel fliegen vom Stapel (oder vom Besten) zum Verlierer – nur wenn ein neuer Durchgang ausgewertet wurde
    afterRender(S) {
      const lp = S.g?.lastPass;
      const key = lp ? `${S.roundNo}:${lp.worst}:${lp.best}:${lp.deckel}:${S.g.stack}:${JSON.stringify(lp.dice)}` : '';
      const fresh = passKey !== null && key && key !== passKey;
      passKey = key;
      if (!fresh || motionOff()) return;
      const from = lp.fromStack ? $('#kg .sc-stack') : $(I18n.html`#kg [data-pid="${CSS.escape(lp.best)}"]`);
      const to = $(I18n.html`#kg [data-pid="${CSS.escape(lp.worst)}"]`);
      if (!from || !to) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      for (let k = 0; k < Math.min(lp.deckel, 4); k++) {
        const el = document.createElement('span');
        el.className = 'sc-deckel sc-fly';
        el.style.left = I18n.html`${a.left + a.width / 2 - 22}px`; el.style.top = I18n.html`${a.top + 10 - k * 4}px`;
        document.body.append(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transitionDelay = I18n.html`${k * 40}ms`;
          el.style.transform = I18n.html`translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - 10}px) scale(.5)`;
          el.style.opacity = '.2';
        }));
        setTimeout(() => el.remove(), 520);
      }
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      const g = S.g;
      const n = g.throws[S.you.id] || 0;
      if (!n) return I18n.html('<button class="btn btn-brass" data-g="roll">Würfeln</button>');
      const d = g.dice[S.you.id] || [];
      const mustRoll = g.reroll?.[S.you.id] !== undefined;
      const heldCount = d.filter((_, i) => held(g, S.you.id, i)).length;
      const sixes = S.settings.sixToOne && n < g.maxThrows && g.forced?.[S.you.id] === undefined && d.filter((x) => x === 6).length >= 2
        ? I18n.html('<button class="btn" data-g="sixes" title="Eine der Sechsen wird zur Eins und bleibt liegen, die andere wirfst du neu">Zwei Sechsen → Eins</button>') : '';
      return sixes + I18n.html`${n < g.maxThrows ? I18n.html`<button class="btn btn-brass" data-g="roll" ${heldCount === 3 ? 'disabled' : ''}>Nochmal würfeln${heldCount ? ` (${3 - heldCount})` : ''}</button>` : ''}
        <button class="btn" data-g="stop" ${mustRoll ? 'disabled title="Erst die zweite Sechs neu würfeln"' : ''}>Fertig</button>`;
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'keep') { const i = Number(t.dataset.i); if (keep.has(i)) keep.delete(i); else keep.add(i); kit.render(); }
      else if (g === 'roll') send('roll', { keep: [...keep] });
      else if (g === 'stop') send('stop');
      else if (g === 'sixes') send('sixes');
    },
    rules: I18n.html`<p>Drei Würfel, bis zu drei Würfe. Würfel, die liegen bleiben sollen, tippst du an – der Rest wird neu geworfen.
      Wie oft gewürfelt werden darf, legt der <b>Erste</b> im Durchgang fest.</p>
      <p><b>Wertung</b> (stark nach schwach): <b>Schock aus</b> (1-1-1) · <b>Schock X</b> (1-1-X, z. B. Schock 6) · <b>General</b> (drei Gleiche) · <b>Straße</b> (drei in Folge) · <b>Zahl</b> (höchste zuerst, z. B. 6-5-3).
      Gleichstand: weniger Würfe ist besser, dann wer früher dran war.</p>
      <ul>
        <li>Der Schlechteste bekommt Deckel – so viele, wie der Wurf des Besten wert ist: Schock X = X, General = 3, Straße = 2, Zahl = 1.</li>
        <li>Erst vom Stapel in der Mitte. Ist der leer, gibt der Beste ab. Wer dann keinen Deckel hat, ist raus.</li>
        <li>Wer am Ende alle 13 hat – oder gegen einen <b>Schock aus</b> verliert –, verliert die Halbzeit.</li>
      </ul>
      <p>Der Verlierer fängt den nächsten Durchgang an. Wertung über den Abend: verlorene Halbzeiten (wenig ist gut).</p>`,
  });
}
