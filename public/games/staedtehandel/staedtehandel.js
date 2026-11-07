// Städtehandel im Browser (Regeln: games/staedtehandel/). Die Insel „Aurelia“ ist ein SVG: Bauplatz antippen statt ziehen.
// Würfel, Kosten und Baurechte prüft allein der Server – dieser Code zeigt den Zustand und schickt Wünsche (ssBuild, ssBank …).
'use strict';
{
  const tx = (de, en) => (I18n.language === 'en' ? en : de);
  const RES = ['holz', 'ton', 'wolle', 'korn', 'kupfer'];
  const RN = { holz: ['Holz', 'Wood'], ton: ['Ton', 'Clay'], wolle: ['Wolle', 'Wool'], korn: ['Korn', 'Grain'], kupfer: ['Kupfer', 'Copper'], duene: ['Düne', 'Dunes'] };
  const TN = { holz: ['Wald', 'Forest'], ton: ['Tongrube', 'Clay pit'], wolle: ['Weide', 'Pasture'], korn: ['Acker', 'Fields'], kupfer: ['Gebirge', 'Mountains'], duene: ['Düne', 'Dunes'] };
  const rn = (r) => tx(...RN[r]);
  const TERRAIN = { holz: '#3e7c4c', ton: '#bd6a42', wolle: '#9fd07c', korn: '#e5c453', kupfer: '#8b93a3', duene: '#e2d2a2' };
  const COLORS = ['#d9534f', '#4a8fd8', '#e6b23c', '#5fb36b', '#a273d1', '#e58a3c'];
  const GLYPH = ['●', '▲', '■', '◆', '★', '✚'];
  const COLOR_NAMES = [['Rot', 'Red'], ['Blau', 'Blue'], ['Gelb', 'Yellow'], ['Grün', 'Green'], ['Violett', 'Purple'], ['Orange', 'Orange']];
  const COST = { road: { holz: 1, ton: 1 }, settlement: { holz: 1, ton: 1, wolle: 1, korn: 1 }, city: { korn: 2, kupfer: 3 }, dev: { wolle: 1, korn: 1, kupfer: 1 } };
  const DEV = { ritter: ['Ritter', 'Knight'], siegpunkt: ['Bauwerk', 'Landmark'], strassenbau: ['Straßenbau', 'Road building'], erfindung: ['Erfindung', 'Invention'], monopol: ['Handelsmonopol', 'Trade monopoly'] };
  // Kleine Symbole auf einem 24×24-Raster (eigene Zeichnung)
  const ICON = {
    holz: '<path d="M12 2 19 12h-4l5 8H4l5-8H5z"/><rect x="11" y="20" width="2" height="3"/>',
    ton: '<rect x="2" y="5" width="9" height="5" rx="1"/><rect x="13" y="5" width="9" height="5" rx="1"/><rect x="6" y="12" width="12" height="5" rx="1"/><rect x="2" y="19" width="9" height="4" rx="1"/><rect x="13" y="19" width="9" height="4" rx="1"/>',
    wolle: '<circle cx="8" cy="14" r="5"/><circle cx="14" cy="11" r="6"/><circle cx="18" cy="15" r="4"/><rect x="5" y="15" width="15" height="5" rx="2"/>',
    korn: '<path d="M12 22V6" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="8.5" cy="9" rx="2.2" ry="4" transform="rotate(-25 8.5 9)"/><ellipse cx="15.5" cy="9" rx="2.2" ry="4" transform="rotate(25 15.5 9)"/><ellipse cx="8.5" cy="15" rx="2.2" ry="4" transform="rotate(-25 8.5 15)"/><ellipse cx="15.5" cy="15" rx="2.2" ry="4" transform="rotate(25 15.5 15)"/><ellipse cx="12" cy="4.5" rx="2" ry="3.5"/>',
    kupfer: '<path d="M1 21 9 6l4 8 3-5 7 12z"/>',
    duene: '<path d="M1 20c4-9 8-9 11-2 3-6 7-8 11 2z"/>',
  };
  const icon = (r, size = 18, cls = '') => `<svg class="st-ic ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="currentColor">${ICON[r]}</svg>`;
  const NEUTRAL = '#8b8f99';

  let tool = null, panel = null, tab = 'bank', zoom = null, pan = null, panKey = null, lastKey = '';
  let draft = { give: {}, want: {} }, bankDraft = { give: null, get: null }, dropDraft = {}, plenty = [], monoPick = null, devMode = null;

  const colorOf = (g, p) => (p && g.colors[p] !== undefined ? COLORS[g.colors[p]] : NEUTRAL);
  const nameOf = (S, id) => S.players.find((p) => p.id === id)?.name || '?';
  const sum = (o) => RES.reduce((n, r) => n + (o[r] || 0), 0);
  const chipsOf = (cards) => RES.filter((r) => cards[r] > 0).map((r) => `<span class="st-chip">${icon(r, 15)}<b>${cards[r]}</b> ${esc(rn(r))}</span>`).join('') || `<i>${tx('nichts', 'nothing')}</i>`;
  const pip = (n) => (n ? 6 - Math.abs(7 - n) : 0);

  function clearDrafts() { draft = { give: {}, want: {} }; bankDraft = { give: null, get: null }; dropDraft = {}; plenty = []; monoPick = null; devMode = null; }

  // ---------- Brett ----------
  function toolNow(g) {
    if (g.stage === 'setup') return g.setup?.step === 'road' ? 'road' : 'settlement';
    if (g.stage === 'roadbuilding') return 'road';
    return g.stage === 'main' ? tool : null;
  }
  function boardSVG(S) {
    const g = S.g, b = g.board, me = S.you?.id, myTurn = S.turnId === me && S.phase === 'playing', t = myTurn ? toolNow(g) : null;
    const vsPts = b.vs, hex = (h) => h.vs.map((v) => vsPts[v].join(',')).join(' ');
    const robberPick = myTurn && g.stage === 'robber' ? new Set(g.legal.robber) : new Set();
    const hexes = b.hexes.map((h) => {
      const hot = h.num === 6 || h.num === 8, blocked = g.robber === h.id, pick = robberPick.has(h.id);
      const token = h.num ? `<g class="st-token ${hot ? 'hot' : ''} ${blocked ? 'dim' : ''}"><circle cx="${h.x}" cy="${h.y + 13}" r="17"/><text x="${h.x}" y="${h.y + 12}" text-anchor="middle" dominant-baseline="central">${h.num}</text><text class="st-pips" x="${h.x}" y="${h.y + 25}" text-anchor="middle">${'•'.repeat(pip(h.num))}</text></g>` : '';
      const label = `${tx(...TN[h.terrain])}${h.num ? ' ' + h.num : ''}`;
      return `<g class="st-hex ${pick ? 'pick' : ''}" ${pick ? `data-g="st-hex" data-h="${h.id}" role="button" tabindex="0" aria-label="${esc(label)}: ${tx('Räuber hierher', 'move robber here')}"` : ''}>
        <polygon class="st-land" points="${hex(h)}" fill="${TERRAIN[h.terrain]}"/>
        <g class="st-art" transform="translate(${h.x - 13} ${h.y - 38}) scale(1.08)">${ICON[h.terrain] ? `<g fill="#0000004d" stroke="none" color="#0000004d">${ICON[h.terrain]}</g>` : ''}</g>
        ${token}${blocked ? `<g class="st-robber" transform="translate(${h.x - 27} ${h.y + 4})"><title>${tx('Räuber', 'Robber')}</title><ellipse cx="0" cy="17" rx="10" ry="4" fill="#0006"/><path d="M-9 17c0-12 3-14 4-20a5 5 0 1 1 10 0c1 6 4 8 4 20z" fill="#22262e" stroke="#fff" stroke-width="1.6"/></g>` : ''}
        ${pick ? `<polygon class="st-pickhex" points="${hex(h)}"/>` : ''}</g>`;
    }).join('');
    const ports = b.ports.map((p) => {
      const A = vsPts[p.a], B = vsPts[p.b], any = p.type === 'any';
      return `<g class="st-port"><line x1="${A[0]}" y1="${A[1]}" x2="${p.x}" y2="${p.y}"/><line x1="${B[0]}" y1="${B[1]}" x2="${p.x}" y2="${p.y}"/>
        <circle cx="${p.x}" cy="${p.y}" r="17"/><text x="${p.x}" y="${p.y - (any ? 0 : 5)}" text-anchor="middle" dominant-baseline="central">${any ? '3:1' : '2:1'}</text>${any ? '' : `<g transform="translate(${p.x - 6} ${p.y + 1}) scale(.5)" fill="#fff" color="#fff">${ICON[p.type]}</g>`}<title>${any ? tx('Hafen 3:1', 'Harbour 3:1') : tx(`Hafen 2:1 ${rn(p.type)}`, `Harbour 2:1 ${rn(p.type)}`)}</title></g>`;
    }).join('');
    const roads = Object.entries(g.roads).map(([e, o]) => {
      const [a, c] = b.es[e], A = vsPts[a], C = vsPts[c];
      return `<g class="st-road"><line class="o" x1="${A[0]}" y1="${A[1]}" x2="${C[0]}" y2="${C[1]}"/><line class="i" x1="${A[0]}" y1="${A[1]}" x2="${C[0]}" y2="${C[1]}" stroke="${colorOf(g, o)}"/></g>`;
    }).join('');
    const spotIcon = (v, kind) => {
      const [x, y] = vsPts[v], city = kind === 'city';
      return `<g class="st-spot ${kind}" data-g="st-spot" data-kind="${kind}" data-at="${v}" role="button" tabindex="0" transform="translate(${x} ${y})" aria-label="${kind === 'city' ? tx('Stadt bauen', 'Build city') : tx('Siedlung bauen', 'Build settlement')}">
        <circle class="hit" r="30"/><circle class="ring" r="${city ? 17 : 14}"/></g>`;
    };
    const edgeSpot = (e) => {
      const [a, c] = b.es[e], A = vsPts[a], C = vsPts[c], x = (A[0] + C[0]) / 2, y = (A[1] + C[1]) / 2;
      return `<g class="st-spot road" data-g="st-spot" data-kind="road" data-at="${e}" role="button" tabindex="0" transform="translate(${x} ${y})" aria-label="${tx('Straße bauen', 'Build road')}"><circle class="hit" r="24"/><circle class="ring" r="11"/></g>`;
    };
    const builds = Object.entries(g.buildings).map(([v, bd]) => {
      const [x, y] = vsPts[v], idx = g.colors[bd.o], city = bd.t === 'c', col = colorOf(g, bd.o);
      const shape = city ? 'M-15 10V-3h9v-9l8-7 8 7v9h5v13z' : 'M-11 9V-2l11-10 11 10v11z';
      return `<g class="st-bld ${city ? 'city' : ''}" transform="translate(${x} ${y})"><title>${city ? tx('Stadt', 'City') : tx('Siedlung', 'Settlement')} – ${esc(nameOf(S, bd.o))}</title>
        <path d="${shape}" fill="${col}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><text y="${city ? 7 : 6}" text-anchor="middle" class="st-glyph">${GLYPH[idx] ?? ''}</text></g>`;
    }).join('');
    let spots = '';
    if (t === 'settlement') spots = g.legal.settlement.map((v) => spotIcon(v, 'settlement')).join('');
    else if (t === 'city') spots = g.legal.city.map((v) => spotIcon(Number(v), 'city')).join('');
    else if (t === 'road') spots = g.legal.road.map(edgeSpot).join('');
    const [x0, y0, w, h] = b.box;
    return `<svg class="st-svg ${zoom === 1 ? 'fit' : ''}" viewBox="${x0} ${y0} ${w} ${h}" role="group" aria-label="${tx('Inselkarte Aurelia', 'Island map of Aurelia')}" style="${zoom === 1 ? '' : `width:${Math.round(zoom * 100)}%`}"><rect class="st-sea" x="${x0}" y="${y0}" width="${w}" height="${h}"/>${ports}${hexes}${roads}${builds}${spots}</svg>`;
  }

  // ---------- Seitenleiste ----------
  function sidePanel(S) {
    const g = S.g, me = S.you?.id;
    const players = S.players.filter((p) => g.colors[p.id] !== undefined);
    const rows = players.map((p) => {
      const i = g.colors[p.id];
      return `<li class="${p.out ? 'out' : ''} ${p.id === S.turnId ? 'turn' : ''}"><span class="st-pchip" style="background:${COLORS[i]}" aria-hidden="true">${GLYPH[i]}</span>
        <b>${esc(p.name)}${p.id === me ? ` (${tx('du', 'you')})` : ''}</b><span class="st-vp" title="${tx('Siegpunkte (sichtbar)', 'Victory points (visible)')}">${p.vp ?? 0} ${tx('P', 'VP')}</span>
        <small>${p.out ? tx('ausgestiegen', 'left') : `${icon('wolle', 12)} ${p.cards ?? 0} ${tx('Karten', 'cards')} · ${p.devCards ?? 0} ${tx('Entw.', 'dev')} · ${p.knights ?? 0} ${tx('Ritter', 'knights')}${p.longest ? ` · 🛣 ${p.roadLen}` : ` · ${tx('Straße', 'road')} ${p.roadLen ?? 0}`}${p.army ? ' · ⚔' : ''}`}</small></li>`;
    }).join('');
    const bank = RES.map((r) => `<li>${icon(r, 15)} <b>${g.bankCards[r]}</b></li>`).join('');
    const costs = [['road', tx('Straße', 'Road')], ['settlement', tx('Siedlung', 'Settlement')], ['city', tx('Stadt', 'City')], ['dev', tx('Entw.-Karte', 'Dev. card')]]
      .map(([k, n]) => `<li><b>${esc(n)}</b> ${RES.filter((r) => COST[k][r]).map((r) => `${COST[k][r] > 1 ? COST[k][r] : ''}${icon(r, 13)}`).join(' ')}</li>`).join('');
    const mine = g.hand ? `<p class="st-mine">${tx('Deine Punkte', 'Your points')}: <b>${g.myPoints}</b> / ${g.target}${g.myPoints !== g.points[me] ? ` <small>(${tx('inkl. geheimer Bauwerke', 'incl. hidden landmarks')})</small>` : ''}</p>` : '';
    const awards = `<p class="st-awards">🛣 ${g.longest.holder ? `${esc(nameOf(S, g.longest.holder))} (${g.longest.len})` : tx('längste Handelsstraße: ab 5', 'longest road: from 5')}<br>⚔ ${g.army.holder ? `${esc(nameOf(S, g.army.holder))} (${g.army.n})` : tx('größte Rittermacht: ab 3', 'largest army: from 3')}</p>`;
    return `<aside class="st-side"><section><h3>${tx('Spieler', 'Players')}</h3><ul class="st-players">${rows}</ul>${mine}${awards}</section>
      <section><h3>${tx('Bank', 'Bank')}</h3><ul class="st-bank" aria-label="${tx('Vorrat der Bank', 'Bank stock')}">${bank}</ul><small>${tx('Entwicklungskarten im Stapel', 'Development cards left')}: ${g.deckLeft}</small></section>
      <section><h3>${tx('Baukosten', 'Costs')}</h3><ul class="st-costs">${costs}</ul></section></aside>`;
  }

  function statusStrip(S) {
    const g = S.g, dice = g.dice ? `<span class="st-dice" aria-label="${tx('Würfel', 'Dice')} ${g.dice[0] + g.dice[1]}"><i>${g.dice[0]}</i><i>${g.dice[1]}</i><b>= ${g.dice[0] + g.dice[1]}</b></span>` : '';
    const stage = { setup: tx('Aufbau', 'Setup'), roll: tx('Würfeln', 'Roll'), discard: tx('Abwerfen', 'Discard'), robber: tx('Räuber', 'Robber'), steal: tx('Stehlen', 'Steal'), main: tx('Handeln & Bauen', 'Trade & build'), roadbuilding: tx('Straßenbau', 'Road building') }[g.stage];
    const steps = ['roll', 'main'].map((st) => `<li class="${g.stage === st ? 'on' : ''}">${st === 'roll' ? tx('Würfeln', 'Roll') : tx('Handeln & Bauen', 'Trade & build')}</li>`).join('');
    const steal = g.last?.kind === 'steal' && g.last.res ? `<span class="st-note">${g.last.to === S.you?.id ? tx(`Du hast ${rn(g.last.res)} gestohlen`, `You stole ${rn(g.last.res)}`) : tx(`Dir wurde ${rn(g.last.res)} gestohlen`, `${rn(g.last.res)} was stolen from you`)}</span>` : '';
    return `<div class="st-strip" role="status"><ol class="st-steps" aria-label="${tx('Zugphase', 'Turn phase')}">${g.stage === 'setup' ? `<li class="on">${stage}${g.setup ? ` ${g.setup.i + 1}/${g.setup.total}` : ''}</li>` : steps}</ol>
      <span class="st-chipline"><b>${esc(nameOf(S, S.turnId))}</b> ${S.turnId === S.you?.id ? '' : tx('ist dran', 'is playing')}</span>${dice}${steal}
      <span class="st-zoom" role="group" aria-label="Zoom"><button type="button" class="btn" data-g="st-zoom" data-z="-" aria-label="${tx('Verkleinern', 'Zoom out')}">−</button><button type="button" class="btn" data-g="st-zoom" data-z="fit" aria-label="${tx('Ganzes Brett', 'Fit board')}">⤢</button><button type="button" class="btn" data-g="st-zoom" data-z="+" aria-label="${tx('Vergrößern', 'Zoom in')}">+</button></span></div>`;
  }

  // ---------- Aktionsleiste ----------
  const btn = (data, label, cls = 'btn', extra = '') => `<button type="button" class="${cls}" ${data} ${extra}>${label}</button>`;
  const stepper = (side, r, max) => {
    const v = draft[side][r] || 0;
    return `<div class="st-step"><span>${icon(r, 16)} ${esc(rn(r))}</span><button type="button" class="btn" data-g="st-step" data-side="${side}" data-r="${r}" data-d="-1" aria-label="${esc(rn(r))} −" ${v ? '' : 'disabled'}>−</button><b aria-live="polite">${v}</b><button type="button" class="btn" data-g="st-step" data-side="${side}" data-r="${r}" data-d="1" aria-label="${esc(rn(r))} +" ${max !== undefined && v >= max ? 'disabled' : ''}>+</button></div>`;
  };
  function offerCard(S) {
    const g = S.g, me = S.you?.id, o = g.offer;
    if (!o) return '';
    const names = (cards) => chipsOf(cards);
    if (o.from === me) {
      const ans = Object.entries(o.res).map(([p, v]) => {
        const nm = esc(nameOf(S, p));
        return v === 'accept' ? btn(`data-g="st-confirm" data-with="${p}" data-offer="${o.id}"`, tx(`Tauschen mit ${nm}`, `Trade with ${nm}`), 'btn btn-brass') : `<span class="st-ans ${v || 'wait'}">${nm}: ${v === 'decline' ? tx('lehnt ab', 'declines') : tx('überlegt …', 'thinking …')}</span>`;
      }).join('');
      return `<div class="st-offer mine" role="group" aria-label="${tx('Dein Angebot', 'Your offer')}"><p>${tx('Dein Angebot', 'Your offer')}: ${names(o.give)} ${tx('gegen', 'for')} ${names(o.want)}</p><div class="st-ans-row">${ans}</div>${btn('data-g="st-cancel"', tx('Zurückziehen', 'Withdraw'), 'btn btn-ghost')}</div>`;
    }
    const a = o.res[me], can = RES.every((r) => (g.hand?.[r] || 0) >= (o.want[r] || 0));
    if (a === undefined) return '';
    return `<div class="st-offer" role="group" aria-label="${tx('Angebot', 'Offer')}"><p><b>${esc(nameOf(S, o.from))}</b> ${tx('bietet', 'offers')} ${names(o.give)} ${tx('für', 'for')} ${names(o.want)}</p>
      ${a === null ? `<div class="kg-acts">${btn(`data-g="st-respond" data-offer="${o.id}" data-a="1"`, tx('Annehmen', 'Accept'), 'btn btn-brass', can ? '' : 'disabled')}${btn(`data-g="st-respond" data-offer="${o.id}" data-a="0"`, tx('Ablehnen', 'Decline'))}</div>${can ? '' : `<small>${tx('Dir fehlen die gefragten Rohstoffe.', 'You lack the requested resources.')}</small>`}` : `<small>${a === 'accept' ? tx('Du hast zugestimmt – warte auf die Entscheidung.', 'You accepted – waiting for the decision.') : tx('Du hast abgelehnt.', 'You declined.')}</small>`}</div>`;
  }
  function discardUI(S) {
    const g = S.g, need = g.discard[S.you.id], have = sum(dropDraft);
    return `<div class="st-panel" role="group" aria-label="${tx('Abwerfen', 'Discard')}"><p>${tx(`Sieben gewürfelt: Wirf ${need} Karten ab (${have}/${need})`, `A seven: discard ${need} cards (${have}/${need})`)}</p>
      <div class="st-steps2">${RES.map((r) => { const v = dropDraft[r] || 0; return `<div class="st-step"><span>${icon(r, 16)} ${esc(rn(r))} <small>(${g.hand[r]})</small></span><button type="button" class="btn" data-g="st-drop" data-r="${r}" data-d="-1" aria-label="${esc(rn(r))} −" ${v ? '' : 'disabled'}>−</button><b>${v}</b><button type="button" class="btn" data-g="st-drop" data-r="${r}" data-d="1" aria-label="${esc(rn(r))} +" ${v >= g.hand[r] || have >= need ? 'disabled' : ''}>+</button></div>`; }).join('')}</div>
      ${btn('data-g="st-discard"', tx('Abwerfen', 'Discard'), 'btn btn-brass', have === need ? '' : 'disabled')}</div>`;
  }
  function tradePanel(S) {
    const g = S.g;
    const tabs = `<div class="st-tabs" role="tablist">${['bank', 'players'].map((k) => `<button type="button" role="tab" class="btn ${tab === k ? 'btn-brass' : ''}" aria-selected="${tab === k}" data-g="st-tab" data-tab="${k}">${k === 'bank' ? tx('Bank / Hafen', 'Bank / harbour') : tx('Mit Spielern', 'With players')}</button>`).join('')}</div>`;
    if (tab === 'bank') {
      const give = RES.map((r) => `<button type="button" class="btn st-res ${bankDraft.give === r ? 'btn-brass' : ''}" data-g="st-bgive" data-r="${r}" aria-pressed="${bankDraft.give === r}" ${g.hand[r] >= g.ratios[r] ? '' : 'disabled'}>${icon(r, 16)} ${esc(rn(r))} <small>${g.ratios[r]}:1</small></button>`).join('');
      const get = RES.map((r) => `<button type="button" class="btn st-res ${bankDraft.get === r ? 'btn-brass' : ''}" data-g="st-bget" data-r="${r}" aria-pressed="${bankDraft.get === r}" ${g.bankCards[r] > 0 && bankDraft.give !== r ? '' : 'disabled'}>${icon(r, 16)} ${esc(rn(r))}</button>`).join('');
      const ok = bankDraft.give && bankDraft.get && bankDraft.give !== bankDraft.get;
      return `<div class="st-panel">${tabs}<p>${tx('Ich gebe', 'I give')}:</p><div class="st-resrow">${give}</div><p>${tx('Ich bekomme 1', 'I get 1')}:</p><div class="st-resrow">${get}</div>
        ${btn('data-g="st-bank"', ok ? tx(`${g.ratios[bankDraft.give]} ${rn(bankDraft.give)} → 1 ${rn(bankDraft.get)} tauschen`, `Trade ${g.ratios[bankDraft.give]} ${rn(bankDraft.give)} → 1 ${rn(bankDraft.get)}`) : tx('Tauschen', 'Trade'), 'btn btn-brass', ok ? '' : 'disabled')}</div>`;
    }
    const ok = sum(draft.give) > 0 && sum(draft.want) > 0 && RES.every((r) => !(draft.give[r] && draft.want[r])) && RES.every((r) => (draft.give[r] || 0) <= g.hand[r]);
    return `<div class="st-panel">${tabs}<div class="st-two"><div><p>${tx('Ich gebe', 'I give')}:</p>${RES.map((r) => stepper('give', r, g.hand[r])).join('')}</div><div><p>${tx('Ich möchte', 'I want')}:</p>${RES.map((r) => stepper('want', r, 9)).join('')}</div></div>
      ${btn('data-g="st-offer"', tx('Angebot an alle senden', 'Send offer to everyone'), 'btn btn-brass', ok && !g.offer ? '' : 'disabled')}${g.offer ? `<small>${tx('Ein Angebot läuft bereits.', 'An offer is already open.')}</small>` : ''}</div>`;
  }
  function devPanel(S) {
    const g = S.g, owned = Object.keys(DEV).map((k) => ({ k, n: g.dev.filter((x) => x === k).length })).filter((x) => x.n);
    if (!owned.length) return `<div class="st-panel"><p>${tx('Du hast keine Entwicklungskarten.', 'You have no development cards.')}</p></div>`;
    const myTurn = S.turnId === S.you.id && S.phase === 'playing';
    const rows = owned.map(({ k, n }) => {
      const pl = g.devPlayable[k], name = tx(...DEV[k]);
      if (k === 'siegpunkt') return `<li><b>${esc(name)}</b> ×${n} <small>${tx('zählt geheim 1 Punkt', 'secretly worth 1 point')}</small></li>`;
      const can = myTurn && pl > 0 && !g.devPlayed && (g.stage === 'main' || (k === 'ritter' && g.stage === 'roll'));
      const fresh = n - pl > 0 ? ` <small>(${n - pl} ${tx('neu', 'new')})</small>` : '';
      const action = k === 'ritter' ? btn('data-g="st-play" data-card="ritter"', tx('Ritter spielen', 'Play knight'), 'btn btn-brass', can ? '' : 'disabled')
        : k === 'strassenbau' ? btn('data-g="st-play" data-card="strassenbau"', tx('Straßenbau spielen', 'Play road building'), 'btn btn-brass', can && g.legal.road.length ? '' : 'disabled')
          : btn(`data-g="st-devmode" data-card="${k}"`, tx('Spielen …', 'Play …'), 'btn btn-brass', can ? '' : 'disabled');
      return `<li><b>${esc(name)}</b> ×${n}${fresh} ${action}</li>`;
    }).join('');
    let chooser = '';
    if (devMode === 'erfindung') chooser = `<p>${tx('Wähle zwei Rohstoffe von der Bank', 'Pick two resources from the bank')} (${plenty.length}/2):</p><div class="st-resrow">${RES.map((r) => `<button type="button" class="btn st-res" data-g="st-plenty" data-r="${r}" ${plenty.length >= 2 || g.bankCards[r] < 1 + plenty.filter((x) => x === r).length ? 'disabled' : ''}>${icon(r, 16)} ${esc(rn(r))}</button>`).join('')}</div>
      <div class="kg-acts">${btn('data-g="st-plenty-go"', tx('Nehmen', 'Take') + (plenty.length ? `: ${plenty.map(rn).join(' + ')}` : ''), 'btn btn-brass', plenty.length === 2 ? '' : 'disabled')}${btn('data-g="st-plenty-clear"', tx('Zurücksetzen', 'Reset'), 'btn btn-ghost')}</div>`;
    if (devMode === 'monopol') chooser = `<p>${tx('Welcher Rohstoff? Alle anderen geben dir alle Karten davon.', 'Which resource? Everyone else hands over all of it.')}</p><div class="st-resrow">${RES.map((r) => `<button type="button" class="btn st-res ${monoPick === r ? 'btn-brass' : ''}" data-g="st-mono" data-r="${r}" aria-pressed="${monoPick === r}">${icon(r, 16)} ${esc(rn(r))}</button>`).join('')}</div>${btn('data-g="st-mono-go"', tx('Monopol ausrufen', 'Claim monopoly'), 'btn btn-brass', monoPick ? '' : 'disabled')}`;
    return `<div class="st-panel"><ul class="st-devs">${rows}</ul>${chooser}</div>`;
  }

  const kit = kitGame({
    id: 'staedtehandel', name: 'Städtehandel', ring: false, direction: false,
    onState(S) {
      const g = S.g; if (!g) return;
      const key = `${S.roundNo}:${S.turnId}:${g.turnNo}:${g.stage}`;
      if (key !== lastKey) { lastKey = key; if (g.stage !== 'main') tool = null; if (S.turnId !== S.you?.id) { panel = null; clearDrafts(); } else if (g.stage !== 'main') panel = null; }
      if (tool && S.turnId === S.you?.id && g.stage === 'main' && !g.legal.can[tool]) tool = null;
      if (g.discard?.[S.you?.id] === undefined) dropDraft = {};
    },
    keepMain(S) {
      const el = document.querySelector('.st-viewport'), key = `${S.roundNo}`;
      pan = el && panKey === key ? [el.scrollLeft, el.scrollTop] : null; panKey = key; return false;
    },
    afterRender() {
      const el = document.querySelector('.st-viewport'); if (!el) return;
      if (pan) el.scrollTo(...pan); else { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; }
    },
    get short() {
      return [tx('Aufbau: Siedlung und Straße antippen. Danach: würfeln, handeln, bauen.', 'Setup: tap a settlement spot, then a road. Then: roll, trade, build.'),
        tx('Siedlungen und Städte neben einem Feld mit der gewürfelten Zahl bringen Rohstoffe. Bei einer 7 zieht der Räuber ein.', 'Settlements and cities next to a hex with the rolled number pay out. A 7 moves the robber.'),
        tx('Handeln mit Spielern (Angebot/Annahme) oder mit der Bank und den Häfen. Wer zuerst 10 Punkte hat, gewinnt.', 'Trade with players (offer/accept) or with the bank and harbours. First to 10 points wins.')];
    },
    get rules() {
      return `<p>${tx('Aurelia ist eine erfundene Insel aus Sechsecken. Baue Straßen, Siedlungen und Städte; wer in seinem Zug 10 Punkte hat, gewinnt.', 'Aurelia is an invented island of hexes. Build roads, settlements and cities; whoever has 10 points on their turn wins.')}</p><ul>
      <li>${tx('Ertrag: Siedlung 1, Stadt 2 Rohstoffe pro passender Zahl. Die Würfel fallen auf dem Server.', 'Yield: settlement 1, city 2 resources per matching number. The server rolls the dice.')}</li>
      <li>${tx('Kosten: Straße Holz+Ton · Siedlung Holz+Ton+Wolle+Korn · Stadt 2 Korn+3 Kupfer · Karte Wolle+Korn+Kupfer.', 'Costs: road wood+clay · settlement wood+clay+wool+grain · city 2 grain+3 copper · card wool+grain+copper.')}</li>
      <li>${tx('Sieben: Wer mehr als 7 Karten hält, wirft die Hälfte ab; der Räuber blockiert ein Feld und stiehlt eine Karte.', 'Seven: anyone holding more than 7 cards discards half; the robber blocks a hex and steals a card.')}</li>
      <li>${tx('Handel: Spieler-Angebote (du wählst den Partner) oder Bank 4:1, Hafen 3:1 bzw. Spezialhafen 2:1.', 'Trade: player offers (you pick the partner) or bank 4:1, harbour 3:1 or special harbour 2:1.')}</li>
      <li>${tx('Längste Handelsstraße ab 5 Abschnitten und größte Rittermacht ab 3 Rittern geben je 2 Punkte.', 'Longest road from 5 segments and largest army from 3 knights give 2 points each.')}</li></ul>`;
    },
    playerInfo(p) { return p.out ? tx('ausgestiegen', 'left') : p.vp !== undefined ? `${p.vp} ${tx('Punkte', 'pts')} · ${p.cards} ${tx('Karten', 'cards')}` : ''; },
    hint(S, mine) {
      const g = S.g, me = S.you?.id;
      if (g.discard?.[me]) return tx(`Wirf ${g.discard[me]} Karten ab.`, `Discard ${g.discard[me]} cards.`);
      if (g.offer && g.offer.from !== me && g.offer.res[me] === null) return tx(`${nameOf(S, g.offer.from)} macht dir ein Angebot.`, `${nameOf(S, g.offer.from)} made you an offer.`);
      if (!mine) return g.stage === 'discard' ? tx('Es wird abgeworfen …', 'Players are discarding …') : tx(`${nameOf(S, S.turnId)} ist am Zug.`, `${nameOf(S, S.turnId)} is playing.`);
      if (g.stage === 'setup') return g.setup.step === 'settlement' ? tx('Tippe einen markierten Platz für deine Siedlung an.', 'Tap a highlighted spot for your settlement.') : tx('Setze jetzt eine Straße an deine neue Siedlung.', 'Now place a road next to your new settlement.');
      if (g.stage === 'roll') return tx('Würfle, um Rohstoffe zu bekommen.', 'Roll the dice to collect resources.');
      if (g.stage === 'discard') return tx('Warte, bis alle abgeworfen haben.', 'Waiting for everyone to discard.');
      if (g.stage === 'robber') return tx('Tippe das Feld an, auf das der Räuber ziehen soll.', 'Tap the hex the robber should move to.');
      if (g.stage === 'steal') return tx('Wähle, von wem du eine Karte stiehlst.', 'Choose whom to steal a card from.');
      if (g.stage === 'roadbuilding') return tx(`Straßenbau: noch ${g.roadsLeft} Straße(n) gratis.`, `Road building: ${g.roadsLeft} free road(s) left.`);
      if (tool) return tx('Tippe einen markierten Platz auf dem Brett an.', 'Tap a highlighted spot on the board.');
      return tx('Baue, handle oder beende deinen Zug.', 'Build, trade or end your turn.');
    },
    dock(S, mine) {
      const g = S.g, me = S.you?.id;
      if (!g.hand) return '';
      const hand = `<div class="st-hand" role="group" aria-label="${tx('Deine Rohstoffe', 'Your resources')}">${RES.map((r) => `<span class="st-chip big ${g.hand[r] ? '' : 'zero'}">${icon(r, 20)}<b>${g.hand[r]}</b><small>${esc(rn(r))}</small></span>`).join('')}<span class="st-chip big dev">🂠<b>${g.dev.length}</b><small>${tx('Karten', 'Cards')}</small></span></div>`;
      const row = (inner) => `<div class="kg-acts st-acts">${inner}</div>`;
      let out = hand;
      if (g.discard?.[me]) return out + discardUI(S);
      const offer = offerCard(S);
      if (!mine) return out + offer;
      if (g.stage === 'roll') {
        const kn = g.devPlayable.ritter > 0 && !g.devPlayed;
        return out + row(`${btn('data-g="st-roll"', `🎲 ${tx('Würfeln', 'Roll')}`, 'btn btn-brass')}${kn ? btn('data-g="st-play" data-card="ritter"', tx('Ritter spielen', 'Play knight')) : ''}`);
      }
      if (g.stage === 'steal') return out + row(g.legal.victims.map((v) => btn(`data-g="st-steal" data-v="${v}"`, tx(`Von ${esc(nameOf(S, v))} stehlen`, `Steal from ${esc(nameOf(S, v))}`), 'btn btn-brass')).join(''));
      if (g.stage === 'roadbuilding') return out + row(btn('data-g="st-endroads"', tx('Straßenbau beenden', 'Finish road building'), 'btn btn-brass'));
      if (g.stage !== 'main') return out;
      const can = g.legal.can, left = g.left;
      const tools = [['road', tx('Straße', 'Road'), left.road], ['settlement', tx('Siedlung', 'Settlement'), left.settlement], ['city', tx('Stadt', 'City'), left.city]]
        .map(([k, n, l]) => btn(`data-g="st-tool" data-tool="${k}"`, `${n} <small>(${l})</small>`, `btn ${tool === k ? 'btn-brass' : ''}`, `aria-pressed="${tool === k}" ${can[k] ? '' : 'disabled'}`)).join('');
      return out + offer + row(`${tools}${btn('data-g="st-buydev"', tx('Karte kaufen', 'Buy card'), 'btn', can.dev ? '' : 'disabled')}${btn('data-g="st-panel" data-panel="trade"', tx('Handeln', 'Trade'), `btn ${panel === 'trade' ? 'btn-brass' : ''}`, `aria-pressed="${panel === 'trade'}"`)}${btn('data-g="st-panel" data-panel="dev"', `${tx('Karten', 'Cards')} (${g.dev.length})`, `btn ${panel === 'dev' ? 'btn-brass' : ''}`, `aria-pressed="${panel === 'dev'}"`)}${btn('data-g="st-end"', tx('Zug beenden', 'End turn'), 'btn btn-brass')}`)
        + (panel === 'trade' ? tradePanel(S) : panel === 'dev' ? devPanel(S) : '');
    },
    main(S) {
      if (zoom === null) zoom = window.innerWidth < 760 ? 2 : 1;
      return `<section class="st-wrap">${statusStrip(S)}<div class="st-board"><div class="st-viewport" tabindex="0" aria-label="${tx('Verschiebbare Inselkarte', 'Scrollable island map')}">${boardSVG(S)}</div>${sidePanel(S)}</div></section>`;
    },
    onClick(el, S) {
      const g = S.g, me = S.you?.id, mine = S.turnId === me && S.phase === 'playing', d = el.dataset;
      if (d.g === 'st-zoom') { zoom = d.z === 'fit' ? 1 : Math.max(1, Math.min(4, zoom + (d.z === '+' ? 0.5 : -0.5))); pan = null; kit.render(); return; }
      const rerender = () => kit.render();
      // Außerhalb des eigenen Zuges: abwerfen und auf Angebote antworten
      if (d.g === 'st-drop') { const r = d.r, v = (dropDraft[r] || 0) + Number(d.d); if (v >= 0 && v <= g.hand[r]) dropDraft[r] = v; rerender(); return; }
      if (d.g === 'st-discard') { send('ssDiscard', { cards: dropDraft }); dropDraft = {}; return; }
      if (d.g === 'st-respond') { send('ssRespond', { offerId: Number(d.offer), accept: d.a === '1' }); return; }
      if (!mine) return;
      switch (d.g) {
        case 'st-roll': send('ssRoll'); break;
        case 'st-end': tool = null; panel = null; clearDrafts(); send('ssEnd'); break;
        case 'st-tool': tool = tool === d.tool ? null : d.tool; rerender(); break;
        case 'st-buydev': send('ssBuyDev'); break;
        case 'st-panel': panel = panel === d.panel ? null : d.panel; devMode = null; rerender(); break;
        case 'st-tab': tab = d.tab; rerender(); break;
        case 'st-bgive': bankDraft.give = d.r; if (bankDraft.get === d.r) bankDraft.get = null; rerender(); break;
        case 'st-bget': bankDraft.get = d.r; rerender(); break;
        case 'st-bank': send('ssBank', { give: bankDraft.give, get: bankDraft.get }); bankDraft = { give: null, get: null }; break;
        case 'st-step': { const side = d.side, r = d.r, v = Math.max(0, (draft[side][r] || 0) + Number(d.d)); draft[side][r] = v; if (v && side === 'give') delete draft.want[r]; if (v && side === 'want') delete draft.give[r]; rerender(); break; }
        case 'st-offer': send('ssOffer', { give: draft.give, want: draft.want }); break;
        case 'st-confirm': send('ssConfirm', { offerId: Number(d.offer), with: d.with }); draft = { give: {}, want: {} }; break;
        case 'st-cancel': send('ssCancel'); break;
        case 'st-play': send('ssPlay', { card: d.card }); panel = null; break;
        case 'st-devmode': devMode = devMode === d.card ? null : d.card; plenty = []; monoPick = null; rerender(); break;
        case 'st-plenty': if (plenty.length < 2) plenty.push(d.r); rerender(); break;
        case 'st-plenty-clear': plenty = []; rerender(); break;
        case 'st-plenty-go': send('ssPlay', { card: 'erfindung', a: plenty[0], b: plenty[1] }); plenty = []; devMode = null; break;
        case 'st-mono': monoPick = d.r; rerender(); break;
        case 'st-mono-go': send('ssPlay', { card: 'monopol', res: monoPick }); monoPick = null; devMode = null; break;
        case 'st-endroads': send('ssEndRoads'); break;
        case 'st-steal': send('ssSteal', { victim: d.v }); break;
        case 'st-hex': send('ssRobber', { hex: Number(d.h) }); break;
        case 'st-spot': send('ssBuild', { kind: d.kind, at: Number(d.at) }); break;
        default: break;
      }
    },
  });
  // Tastatur: Enter und Leertaste auf einem Bauplatz oder Feld wirken wie ein Tippen
  document.addEventListener('keydown', (e) => {
    const el = e.target?.closest?.('.st-spot, .st-hex.pick');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
}
