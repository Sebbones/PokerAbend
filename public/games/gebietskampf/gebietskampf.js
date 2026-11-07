// Gebietskampf im Browser (Regeln: games/gebietskampf/). Die Karte „Meridia“ ist ein SVG: Gebiet antippen statt ziehen.
// Würfel und Zugprüfung liegen beim Server – dieser Code zeigt nur den Zustand und schickt Wünsche (gkPlace, gkAttack …).
'use strict';
{
  const tx = (de, en) => (I18n.language === 'en' ? en : de);
  const COLORS = ['#d9534f', '#4a8fd8', '#e0b341', '#5fb36b', '#a273d1', '#e58a3c'];
  const GLYPH = ['●', '▲', '■', '◆', '★', '✚'];
  const COLOR_NAMES = [['Rot', 'Red'], ['Blau', 'Blue'], ['Gelb', 'Yellow'], ['Grün', 'Green'], ['Violett', 'Purple'], ['Orange', 'Orange']];
  const SYMBOL = [['⚑', 'Fahne', 'Banner'], ['⛨', 'Schild', 'Shield'], ['♨', 'Fackel', 'Torch']];
  const NEUTRAL = '#8b8f99';
  let sel = { from: null, to: null }, amt = 1, dice = 3, zoom = null, pan = null, panKey = null, lastKey = '';

  const colorOf = (g, owner) => (owner && g.colors[owner] !== undefined ? COLORS[g.colors[owner]] : NEUTRAL);
  const nameOf = (S, id) => (id ? S.players.find((p) => p.id === id)?.name || '?' : tx('Neutral', 'Neutral'));
  const terr = (g, t) => g.map.nodes.find((n) => n.id === t);
  const adj = (g) => { const m = new Map(g.map.nodes.map((n) => [n.id, []])); for (const [a, b] of g.map.edges) { m.get(a).push(b); m.get(b).push(a); } return m; };

  // Konvexe Hülle (Monotone Chain) – damit jede Landmasse einen weichen Hintergrund bekommt
  function hull(points) {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop(); lower.push(q); }
    for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop(); upper.push(q); }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
  }

  function clearSelection() { sel = { from: null, to: null }; }
  // Welche Gebiete kann man gerade antippen, und wozu?
  function targets(S) {
    const g = S.g, me = S.you?.id, mine = S.turnId === me && S.phase === 'playing', a = adj(g), out = { pick: new Set(), hit: new Set() };
    if (!mine) return out;
    const own = (t) => g.owners[t] === me;
    if (g.stage === 'reinforce' && g.reserve > 0 && !g.needTrade) { for (const n of g.map.nodes) if (own(n.id)) out.pick.add(n.id); }
    else if (g.stage === 'attack' && !g.pending && !g.reserve) {
      for (const n of g.map.nodes) if (own(n.id) && g.armies[n.id] >= 2 && a.get(n.id).some((x) => !own(x))) out.pick.add(n.id);
      if (sel.from !== null) for (const x of a.get(sel.from)) if (!own(x)) out.hit.add(x);
    } else if (g.stage === 'fortify') {
      if (sel.from === null) { for (const n of g.map.nodes) if (own(n.id) && g.armies[n.id] >= 2) out.pick.add(n.id); }
      else {
        const seen = new Set([sel.from]), queue = [sel.from];
        while (queue.length) for (const x of a.get(queue.shift())) if (own(x) && !seen.has(x)) { seen.add(x); queue.push(x); }
        for (const x of seen) if (x !== sel.from) out.hit.add(x);
      }
    }
    return out;
  }

  function mapSVG(S) {
    const g = S.g, me = S.you?.id, t = targets(S), conts = g.map.continents;
    // Zuschnitt auf die tatsächlich genutzten Gebiete (kleine Karte: weniger Meer)
    const xs = g.map.nodes.map((n) => n.x), ys = g.map.nodes.map((n) => n.y), pad = 62, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad - 14, vb = [x0, y0, Math.max(...xs) + pad - x0, Math.max(...ys) + pad - y0].join(' ');
    const halos = conts.map((c) => {
      const pts = hull(g.map.nodes.filter((n) => n.c === c.id).map((n) => [n.x, n.y]));
      return `<polygon class="gk-halo" points="${pts.map((p) => p.join(',')).join(' ')}" fill="${c.color}" stroke="${c.color}" stroke-width="64" stroke-linejoin="round"/>`;
    }).join('');
    const labels = conts.map((c) => {
      const ns = g.map.nodes.filter((n) => n.c === c.id), cx = ns.reduce((n, p) => n + p.x, 0) / ns.length, cy = Math.min(...ns.map((n) => n.y)) - 44;
      const lang = I18n.language === 'en' ? c.nameEn : c.name;
      return `<text class="gk-cont" x="${cx}" y="${cy}" text-anchor="middle">${esc(lang)} +${c.bonus}</text>`;
    }).join('');
    const lines = g.map.edges.map(([a, b]) => {
      const A = terr(g, a), B = terr(g, b), sea = A.c !== B.c;
      return `<line class="gk-edge ${sea ? 'sea' : ''}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }).join('');
    const tokens = g.map.nodes.map((n) => {
      const owner = g.owners[n.id], color = colorOf(g, owner), idx = owner ? g.colors[owner] : null, armies = g.armies[n.id];
      const cls = ['gk-t', owner === me ? 'mine' : '', t.pick.has(n.id) ? 'pick' : '', t.hit.has(n.id) ? 'hit' : '', sel.from === n.id ? 'from' : '', sel.to === n.id ? 'to' : '', g.last?.to === n.id ? 'recent' : ''].join(' ');
      const who = owner ? `${nameOf(S, owner)} (${tx(...COLOR_NAMES[idx])})` : tx('Neutral', 'Neutral');
      const act = t.hit.has(n.id) ? (g.stage === 'fortify' ? tx(', hierher verschieben', ', move here') : tx(', angreifen', ', attack')) : t.pick.has(n.id) ? tx(', antippen', ', tap') : '';
      return `<g class="${cls}" tabindex="0" role="button" data-g="gk-t" data-t="${n.id}" transform="translate(${n.x} ${n.y})" aria-label="${esc(n.name)}: ${esc(who)}, ${armies} ${tx('Truppen', 'armies')}${act}">
        <circle class="gk-hit-area" r="34" fill="transparent"/>
        <circle class="gk-ring" r="30"/><circle class="gk-disc" r="24" fill="${color}"/>
        <text class="gk-glyph" y="-9" text-anchor="middle">${idx === null ? '' : GLYPH[idx]}</text>
        <text class="gk-num" y="9" text-anchor="middle">${armies}</text>
        <text class="gk-name" y="44" text-anchor="middle">${esc(n.name)}</text></g>`;
    }).join('');
    return `<svg class="gk-svg" viewBox="${vb}" role="group" aria-label="${tx('Weltkarte Meridia', 'World map of Meridia')}" style="width:${Math.round(zoom * 100)}%">${halos}${labels}${lines}${tokens}</svg>`;
  }

  const stageName = (st) => ({ reinforce: tx('Verstärken', 'Reinforce'), attack: tx('Angreifen', 'Attack'), fortify: tx('Verschieben', 'Fortify') }[st]);
  const cardLabel = (g, c) => (c.t === null ? `★ ${tx('Joker', 'Wild')}` : `${SYMBOL[c.s][0]} ${terr(g, c.t)?.name || ''}`);

  function sidePanel(S) {
    const g = S.g, me = S.you?.id;
    const players = S.players.filter((p) => g.colors[p.id] !== undefined);
    const rows = players.map((p) => `<li class="${p.out ? 'out' : ''} ${p.id === S.turnId ? 'turn' : ''}"><span class="gk-chip" style="background:${COLORS[g.colors[p.id]]}" aria-hidden="true">${GLYPH[g.colors[p.id]]}</span><b>${esc(p.name)}${p.id === me ? ` (${tx('du', 'you')})` : ''}</b>
      <small>${p.out ? tx('ausgeschieden', 'eliminated') : `${p.terr} ${tx('Gebiete', 'territories')} · ${p.troops} ${tx('Truppen', 'armies')} · ${p.cards} ${tx('Karten', 'cards')}`}</small></li>`).join('');
    const own = g.map.continents.map((c) => {
      const ids = g.map.nodes.filter((n) => n.c === c.id), owners = new Set(ids.map((n) => g.owners[n.id])), full = owners.size === 1 && [...owners][0];
      return `<li><span class="gk-dot" style="background:${c.color}"></span>${esc(I18n.language === 'en' ? c.nameEn : c.name)} <b>+${c.bonus}</b>${full ? ` <small>· ${esc(nameOf(S, full))}</small>` : ''}</li>`;
    }).join('');
    let battle = '';
    if (g.last) {
      const l = g.last, face = (v, k) => `<i class="gk-die ${k}">${v}</i>`;
      battle = `<section class="gk-battle" aria-label="${tx('Letzter Kampf', 'Last battle')}"><h3>${tx('Letzter Kampf', 'Last battle')}</h3>
        <p>${esc(terr(g, l.from).name)} → ${esc(terr(g, l.to).name)}</p>
        <div class="gk-dice"><span>${tx('Angriff', 'Attack')}</span>${l.att.map((v) => face(v, 'att')).join('')}<span>${tx('Abwehr', 'Defence')}</span>${l.def.map((v) => face(v, 'def')).join('')}</div>
        <p>${tx(`Verluste: Angreifer ${l.atkLoss}, Verteidiger ${l.defLoss}`, `Losses: attacker ${l.atkLoss}, defender ${l.defLoss}`)}${l.conquered ? ` · <b>${tx('erobert!', 'conquered!')}</b>` : ''}</p></section>`;
    }
    const hand = g.hand?.length ? `<section class="gk-hand" aria-label="${tx('Deine Karten', 'Your cards')}"><h3>${tx('Deine Karten', 'Your cards')} (${g.hand.length})</h3><ul>${g.hand.map((c) => `<li class="${c.t === null ? 'wild' : ''}">${esc(cardLabel(g, c))}</li>`).join('')}</ul><small>${tx('Nächster Tausch', 'Next trade')}: +${g.nextTrade}</small></section>` : '';
    const mission = g.mission ? `<section class="gk-mission ${g.mission.done ? 'done' : ''}"><h3>${tx('Deine geheime Mission', 'Your secret mission')}</h3><p>${esc(tx(g.mission.de, g.mission.en))}</p></section>` : '';
    return `<aside class="gk-side"><section><h3>${tx('Spieler', 'Players')}</h3><ul class="gk-players">${rows}</ul></section>${mission}${hand}${battle}<section><h3>${tx('Landmassen', 'Continents')}</h3><ul class="gk-conts">${own}</ul></section></aside>`;
  }

  function statusStrip(S) {
    const g = S.g, mine = S.turnId === S.you?.id, steps = ['reinforce', 'attack', 'fortify'];
    const parts = g.reinforcement ? `${g.reinforcement.territories} ${tx('aus Gebieten', 'from territories')}${g.reinforcement.continents.length ? ` + ${g.reinforcement.continents.map((c) => c.bonus).join(' + ')} ${tx('Landmasse', 'continent')}` : ''}` : '';
    return `<div class="gk-strip" role="status"><ol class="gk-steps">${steps.map((st) => `<li class="${g.stage === st ? 'on' : ''}">${stageName(st)}</li>`).join('')}</ol>
      <span class="gk-chipline"><b>${esc(nameOf(S, S.turnId))}</b> ${mine ? '' : tx('ist dran', 'is playing')}</span>
      ${g.stage === 'reinforce' ? `<span class="gk-reserve" title="${esc(parts)}">${tx('Verstärkung', 'Reserve')}: <b>${g.reserve}</b></span>` : ''}
      <span class="gk-zoom" role="group" aria-label="Zoom"><button type="button" class="btn" data-g="gk-zoom" data-z="-" aria-label="${tx('Verkleinern', 'Zoom out')}">−</button><button type="button" class="btn" data-g="gk-zoom" data-z="fit" aria-label="${tx('Ganze Karte', 'Fit map')}">⤢</button><button type="button" class="btn" data-g="gk-zoom" data-z="+" aria-label="${tx('Vergrößern', 'Zoom in')}">+</button></span></div>`;
  }

  const kit = kitGame({
    id: 'gebietskampf', name: 'Gebietskampf', ring: false, direction: false,
    onState(S) {
      const g = S.g; if (!g) return;
      const key = `${S.roundNo}:${S.turnId}:${g.turnNo}:${g.stage}:${g.pending ? 1 : 0}`;
      if (key !== lastKey) { clearSelection(); lastKey = key; }
      if (sel.from !== null && (g.owners[sel.from] !== S.you?.id || (g.stage === 'attack' && g.armies[sel.from] < 2))) clearSelection();
      if (sel.to !== null && g.stage === 'attack' && g.owners[sel.to] === S.you?.id) clearSelection();
    },
    keepMain(S) {
      const el = document.querySelector('.gk-viewport'), key = `${S.roundNo}`;
      pan = el && panKey === key ? [el.scrollLeft, el.scrollTop] : null; panKey = key; return false;
    },
    afterRender() {
      const el = document.querySelector('.gk-viewport'); if (!el) return;
      if (pan) el.scrollTo(...pan); else el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      if (!el.dataset.keys) { el.dataset.keys = '1'; }
    },
    get short() {
      return [tx('Verstärkung setzen: eigenes Gebiet antippen. Danach angreifen: eigenes Gebiet, dann ein Nachbargebiet des Gegners antippen.', 'Reinforce: tap your own territory. Then attack: tap your territory, then an enemy neighbour.'),
        tx('Höhere Würfel gewinnen, bei Gleichstand gewinnt die Verteidigung. Erobern gibt am Zugende eine Karte.', 'Higher dice win; ties go to the defender. Conquering earns a card at turn end.'),
        tx('Drei gleiche, drei verschiedene oder Joker-Karten gegen Truppen tauschen. Am Ende einmal verschieben.', 'Trade three matching, three different or wild cards for armies. Fortify once at the end.')];
    },
    get rules() { return `<p>${tx('Meridia ist eine erfundene Karte mit sechs Landmassen. Jede Landmasse gibt Bonus-Verstärkung, wenn sie dir ganz gehört.', 'Meridia is an invented map with six continents. Each continent grants bonus armies if you hold all of it.')}</p><ul>
      <li>${tx('Verstärkung: Gebiete geteilt durch drei (mindestens 3) plus Landmassen-Boni.', 'Reinforcements: territories divided by three (at least 3) plus continent bonuses.')}</li>
      <li>${tx('Angriff: bis zu 3 Angriffswürfel gegen bis zu 2 Abwehrwürfel; die Würfel fallen auf dem Server.', 'Attack: up to 3 attack dice against up to 2 defence dice; the server rolls the dice.')}</li>
      <li>${tx('Karten: pro Zug mit Eroberung eine Karte; Sätze tauschen, ab 5 Karten Pflicht; eigenes Gebiet auf der Karte +2.', 'Cards: one per turn with a conquest; trade sets, mandatory from 5 cards; your own territory on a card gives +2.')}</li>
      <li>${tx('Sieg: Weltherrschaft oder – in der Variante – die geheime Mission.', 'Victory: world domination or – in the variant – the secret mission.')}</li></ul>`; },
    playerInfo(p) { return p.out ? tx('ausgeschieden', 'eliminated') : p.terr !== undefined ? `${p.terr} ${tx('Gebiete', 'terr.')} · ${p.troops} ${tx('Truppen', 'armies')}` : ''; },
    hint(S, mine) {
      const g = S.g;
      if (!mine) return tx(`${nameOf(S, S.turnId)} ist am Zug.`, `${nameOf(S, S.turnId)} is playing.`);
      if (g.needTrade) return tx('Du hast zu viele Karten – tausche einen Satz ein.', 'You hold too many cards – trade a set.');
      if (g.pending) return tx('Gebiet erobert! Wie viele Truppen ziehen nach?', 'Territory conquered! How many armies move in?');
      if (g.stage === 'reinforce') return g.reserve ? tx(`Tippe eigene Gebiete an, um ${g.reserve} Truppen zu verteilen.`, `Tap your territories to place ${g.reserve} armies.`) : tx('Verstärkung verteilt – weiter zum Angriff.', 'Reinforcements placed – on to the attack.');
      if (g.stage === 'attack') return sel.from === null ? tx('Tippe ein eigenes Gebiet mit mindestens 2 Truppen an.', 'Tap one of your territories with at least 2 armies.') : sel.to === null ? tx('Tippe ein markiertes gegnerisches Nachbargebiet an.', 'Tap a highlighted enemy neighbour.') : tx('Wähle die Würfel und greife an.', 'Choose dice and attack.');
      return sel.from === null ? tx('Verschieben: Gebiet mit Truppen antippen – oder Zug beenden.', 'Fortify: tap a territory with armies – or end your turn.') : sel.to === null ? tx('Tippe das Zielgebiet an.', 'Tap the destination.') : tx('Wie viele Truppen verschieben?', 'How many armies?');
    },
    main(S) {
      const g = S.g;
      if (zoom === null) zoom = window.innerWidth < 760 ? 2 : 1;
      return `<section class="gk-wrap">${statusStrip(S)}<div class="gk-board"><div class="gk-viewport" tabindex="0" aria-label="${tx('Verschiebbare Weltkarte', 'Scrollable world map')}">${mapSVG(S)}</div>${sidePanel(S)}</div></section>`;
    },
    dock(S, mine) {
      const g = S.g, btn = (data, label, cls = 'btn', extra = '') => `<button type="button" class="${cls}" ${data} ${extra}>${label}</button>`;
      if (!mine) return '';
      const row = (inner) => `<div class="kg-acts gk-acts">${inner}</div>`;
      const amounts = (max) => `<span class="gk-amts" role="group" aria-label="${tx('Menge', 'Amount')}">${[1, 5, 'all'].map((a) => `<button type="button" class="btn ${String(amt) === String(a) ? 'btn-brass' : ''}" data-g="gk-amt" data-a="${a}" aria-pressed="${String(amt) === String(a)}">${a === 'all' ? tx('Alle', 'All') : a}</button>`).join('')}</span>`;
      if (g.needTrade) {
        return row(g.sets.slice(0, 4).map((set) => btn(`data-g="gk-trade" data-cards="${set.join(',')}"`, `${tx('Tauschen', 'Trade')}: ${set.map((i) => (g.hand[i].t === null ? '★' : SYMBOL[g.hand[i].s][0])).join(' ')} (+${g.nextTrade})`, 'btn btn-brass')).join(''));
      }
      if (g.pending) {
        const e = g.pending.extra, half = Math.ceil(e / 2);
        return row(`${btn('data-g="gk-occ" data-n="0"', tx('Keine nachziehen', 'Move none'))}${half !== e && half > 0 ? btn(`data-g="gk-occ" data-n="${half}"`, `+${half}`) : ''}${btn(`data-g="gk-occ" data-n="${e}"`, `${tx('Alle', 'All')} +${e}`, 'btn btn-brass')}`);
      }
      if (g.stage === 'reinforce') {
        const trade = g.canTrade && g.sets.length ? btn(`data-g="gk-trade" data-cards="${g.sets[0].join(',')}"`, `${tx('Karten tauschen', 'Trade cards')} (+${g.nextTrade})`) : '';
        return row(`${g.reserve ? amounts(g.reserve) : ''}${trade}${btn('data-g="gk-next"', tx('Zum Angriff', 'Start attack'), 'btn btn-brass', g.reserve ? 'disabled' : '')}`);
      }
      if (g.stage === 'attack') {
        const max = sel.from === null ? 0 : Math.min(3, g.armies[sel.from] - 1), d = Math.min(dice, max || 1);
        const dieBtns = sel.to !== null ? `<span class="gk-amts" role="group" aria-label="${tx('Würfel', 'Dice')}">${[1, 2, 3].filter((x) => x <= max).map((x) => `<button type="button" class="btn ${d === x ? 'btn-brass' : ''}" data-g="gk-dice" data-d="${x}" aria-pressed="${d === x}">${x} 🎲</button>`).join('')}</span>${btn(`data-g="gk-attack" data-d="${d}"`, tx('Angreifen', 'Attack'), 'btn btn-brass')}${btn(`data-g="gk-attack" data-d="${d}" data-blitz="1"`, tx('Blitz', 'Blitz'))}` : '';
        return row(`${dieBtns}${sel.from !== null ? btn('data-g="gk-clear"', tx('Auswahl aufheben', 'Clear'), 'btn btn-ghost') : ''}${btn('data-g="gk-next"', tx('Verschieben …', 'Fortify …'))}${btn('data-g="gk-end"', tx('Zug beenden', 'End turn'))}`);
      }
      const max = sel.from === null ? 0 : g.armies[sel.from] - 1;
      const move = sel.to !== null ? `${[1, Math.ceil(max / 2), max].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => btn(`data-g="gk-fort" data-n="${v}"`, `${v === max ? tx('Alle', 'All') + ' ' : ''}${v}`, v === max ? 'btn btn-brass' : 'btn')).join('')}` : '';
      return row(`${move}${sel.from !== null ? btn('data-g="gk-clear"', tx('Auswahl aufheben', 'Clear'), 'btn btn-ghost') : ''}${btn('data-g="gk-end"', tx('Zug beenden', 'End turn'), 'btn btn-brass')}`);
    },
    onClick(el, S) {
      const g = S.g, me = S.you?.id, mine = S.turnId === me && S.phase === 'playing', d = el.dataset;
      const zoomBy = (z) => { zoom = z === 'fit' ? 1 : Math.max(1, Math.min(4, zoom + (z === '+' ? 0.5 : -0.5))); pan = null; kit.render(); };
      if (d.g === 'gk-zoom') { zoomBy(d.z); return; }
      if (!mine) return;
      if (d.g === 'gk-amt') { amt = d.a === 'all' ? 'all' : Number(d.a); kit.render(); }
      else if (d.g === 'gk-dice') { dice = Number(d.d); kit.render(); }
      else if (d.g === 'gk-clear') { clearSelection(); kit.render(); }
      else if (d.g === 'gk-trade') send('gkTrade', { cards: d.cards.split(',').map(Number) });
      else if (d.g === 'gk-next') { clearSelection(); send('gkNext'); }
      else if (d.g === 'gk-end') { clearSelection(); send('gkEnd'); }
      else if (d.g === 'gk-occ') send('gkOccupy', { n: Number(d.n) });
      else if (d.g === 'gk-attack') { const from = sel.from, to = sel.to; send('gkAttack', { from, to, dice: Number(d.d), blitz: d.blitz === '1' }); if (d.blitz !== '1') { /* Auswahl bleibt, solange das Gebiet noch angreifen kann */ } }
      else if (d.g === 'gk-fort') { const from = sel.from, to = sel.to; clearSelection(); send('gkFortify', { from, to, n: Number(d.n) }); }
      else if (d.g === 'gk-t') {
        const t = Number(d.t), tg = targets(S), own = g.owners[t] === me;
        if (g.stage === 'reinforce') { if (tg.pick.has(t)) send('gkPlace', { t, n: amt === 'all' ? g.reserve : Math.min(Number(amt), g.reserve) }); }
        else if (g.stage === 'attack' && !g.pending) {
          if (tg.hit.has(t)) { sel.to = t; kit.render(); }
          else if (tg.pick.has(t)) { sel = sel.from === t ? { from: null, to: null } : { from: t, to: null }; kit.render(); }
          else if (own || sel.from !== null) { clearSelection(); kit.render(); }
        } else if (g.stage === 'fortify') {
          if (tg.hit.has(t)) { sel.to = t; kit.render(); }
          else if (tg.pick.has(t)) { sel = sel.from === t ? { from: null, to: null } : { from: t, to: null }; kit.render(); }
        }
      }
    },
  });
  // Tastatur: Enter und Leertaste auf einem Gebiet wirken wie ein Tippen
  document.addEventListener('keydown', (e) => {
    const el = e.target?.closest?.('.gk-t');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
}
