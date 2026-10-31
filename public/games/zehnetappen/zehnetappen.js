// Phase 10 im Browser (Regeln: games/zehnetappen/room.js).
// Hand: Karte antippen = in die aktive Gruppe der Phase legen (Feld über der Hand antippen = Gruppe wechseln), nochmal antippen = zurück.
// Ist die Phase ausgelegt: Karte wählen, dann leuchten die Auslagen, an die sie passt (Anlegen). „Abwerfen“ ist ein eigener Modus (roter Rand, Ablage leuchtet).
// Die Prüfung im Browser ist nur Anzeige – der Server entscheidet.
'use strict';
{
  const tx = (de, en) => I18n.language === 'en' ? en : de;
  const COLOR = { r: 'Rot', g: 'Grün', b: 'Blau', y: 'Gelb' };
  const SKIP = '<svg class="sym" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6.5 17.5l11-11" stroke="currentColor" stroke-width="3"/></svg>';
  let picked = new Set();  // gewählte Karte(n) zum Anlegen oder Abwerfen
  let slots = [];          // Ausleg-Felder: je Gruppe der Phase eine Liste von Karten-IDs
  let active = 0;          // aktive Gruppe: dorthin kommen angetippte Karten
  let mode = null;         // null = Standard (Auslegen bzw. Anlegen), 'discard' = Abwerfen
  let slotKey = '';        // Runde + Phase – wechselt sie, werden die Felder geleert
  let skipFor = null;      // Aussetzen-Karte, für die gerade jemand gewählt wird
  let draggingId = null;
  const clearSelection=()=>{picked.clear();slots=slots.map(()=>[]);skipFor=null;draggingId=null;mode=null;};

  // Karte im bekannten Aufbau: Farbe, große Zahl in der Mitte, kleine in den Ecken; Joker mit „J“, Aussetzen mit eigenem Zeichen
  const card = (c, { cls = '', attrs = '', tag = 'button', badge = '' } = {}) => {
    const label = c.c === 'j' ? 'Joker' : c.c === 's' ? CardInteraction.term('Aussetzen') : `${CardInteraction.term(COLOR[c.c])} ${c.n}`;
    const corner = c.c === 'j' ? 'J' : c.c === 's' ? SKIP : c.n;
    const face = c.c === 'j' ? I18n.html('<b class="ze-j">J</b><small>Joker</small>') : c.c === 's' ? `${SKIP}<small>${CardInteraction.term('Aussetzen')}</small>` : `<b>${c.n}</b>`;
    return `<${tag} ${tag === 'button' ? 'type="button"' : 'role="img"'} class="kc kc-ze ze-${c.c} ${cls}" ${attrs} aria-label="${esc(I18n.t(label))}">${colorMark(c.c)}
      <span class="cr tl">${corner}</span><span class="v">${face}</span><span class="cr br">${corner}</span>${badge}</${tag}>`;
  };
  const TYPE = { set: 'gleiche Zahl', run: 'Folge', color: 'eine Farbe' };
  const SET_WORD = { 2: 'Zwilling', 3: 'Drilling', 4: 'Vierling', 5: 'Fünfling' };
  const groupName = (gr) => (gr.type === 'set' ? tx(SET_WORD[gr.size],`${gr.size} of a kind`) : gr.type === 'run' ? tx(`${gr.size}er-Folge`,`${gr.size}-card run`) : tx(`${gr.size} einer Farbe`,`${gr.size} of one colour`));
  // Passen die Karten als Gruppe? (wie auf dem Server: Joker füllen Lücken, Aussetzen nie, mindestens eine echte Karte)
  function validGroup(type, cards) {
    if (cards.some((c) => c.c === 's')) return false;
    const nat = cards.filter((c) => c.c !== 'j');
    if (!nat.length) return false;
    if (type === 'set') return new Set(nat.map((c) => c.n)).size <= 1;
    if (type === 'color') return new Set(nat.map((c) => c.c)).size <= 1;
    if (cards.length > 12) return false;
    const ns = nat.map((c) => c.n);
    if (new Set(ns).size !== ns.length) return false;
    return Math.max(...ns) - Math.min(...ns) + 1 <= cards.length;
  }
  // Kurzer Grund, warum ein Feld noch nicht passt (null = passt)
  function reason(gr, cards, exact) {
    if (!cards.length) return tx(`noch ${gr.size} Karten`,`${gr.size} cards still needed`);
    if (cards.some((c) => c.c === 's')) return tx('Aussetzen gehört in keine Gruppe','Skip cards cannot go in a group');
    const nat = cards.filter((c) => c.c !== 'j');
    if (!nat.length) return tx('mindestens eine echte Karte nötig','At least one natural card is required');
    if (gr.type === 'set' && new Set(nat.map((c) => c.n)).size > 1) return tx('verschiedene Zahlen','Different numbers');
    if (gr.type === 'color' && new Set(nat.map((c) => c.c)).size > 1) return tx('verschiedene Farben','Different colours');
    if (gr.type === 'run') {
      const ns = nat.map((c) => c.n).sort((a, b) => a - b);
      const dup = ns.find((n, i) => n === ns[i - 1]);
      if (dup) return tx(`${dup} doppelt`,`${dup} occurs twice`);
      if (cards.length > 12) return tx('höchstens 12 Karten','At most 12 cards');
      if (ns[ns.length - 1] - ns[0] + 1 > cards.length) { for (let v = ns[0]; v <= ns[ns.length - 1]; v++) if (!ns.includes(v)) return tx(`keine Folge – ${v} fehlt`,`Not a run — ${v} is missing`); }
    }
    if (cards.length < gr.size) return tx(`noch ${gr.size - cards.length} Karte${gr.size - cards.length === 1 ? '' : 'n'}`,`${gr.size-cards.length} more card${gr.size-cards.length===1?'':'s'} needed`);
    if (exact && cards.length > gr.size) return tx(`genau ${gr.size} Karten`,`Exactly ${gr.size} cards`);
    return null;
  }
  // Passt die Karte an diese ausgelegte Gruppe? Seiten: 'set' (Satz/Farbe), 'high', 'low' – wie auf dem Server (Joker haben feste Werte)
  function sides(gr, c) {
    if (c.c === 's') return [];
    if (gr.type === 'set') return c.c === 'j' || c.n === gr.vals[0] ? ['set'] : [];
    if (gr.type === 'color') return c.c === 'j' || c.c === gr.vals[0] ? ['set'] : [];
    const lo = gr.vals[0], hi = gr.vals[gr.vals.length - 1];
    if (c.c === 'j') return [...(hi < 12 ? ['high'] : []), ...(lo > 1 ? ['low'] : [])];
    return c.n === hi + 1 && hi < 12 ? ['high'] : c.n === lo - 1 && lo > 1 ? ['low'] : [];
  }
  const jokerLabel = (gr, i) => `★ = ${gr.type === 'color' ? COLOR[gr.vals[i]] : gr.vals[i]}`;
  const groupCards = (gr, tag = 'span') => gr.cards.map((c, i) => (c.c === 'j'
    ? `<span class="ze-cw">${card(c, { tag })}<small class="ze-jv">${jokerLabel(gr, i)}</small></span>` : card(c, { tag }))).join('');

  const meOf = (S) => S.players.find((p) => p.id === S.you?.id);
  const handCard = (S, id) => S.g.hand.find((c) => c.id === id);
  const slotCards = (S, i) => (slots[i] || []).map((id) => handCard(S, id)).filter(Boolean);
  const slotReason = (S, i) => reason(S.g.myGroups[i], slotCards(S, i), S.settings.exactSize);
  const slotOk = (S, i) => slotReason(S, i) === null;
  const slotOf = (id) => slots.findIndex((l) => l.includes(id));
  // Modus: 'lay' (Phase vorbereiten), 'hit' (anlegen), 'discard' (abwerfen)
  const modeOf = (S) => (mode === 'discard' ? 'discard' : meOf(S)?.laidDone ? 'hit' : 'lay');
  const canAct = (S) => S.turnId === S.you?.id && S.g?.step === 'play';

  function doDiscard(S) {
    const id = [...picked][0];
    const c = handCard(S, id);
    if (!c) return;
    // Aussetzen mit freier Wahl: Knöpfe mit den Namen statt Eintippen
    if (c.c === 's' && S.settings.skipChoose) { skipFor = id; kit.render(); return; }
    const target = c.c === 's' ? S.players.find((p) => p.inRound && p.id !== S.you.id)?.id : '';
    kit.command('discard', { card: id, target }).then((r) => { if (r?.ok) { picked.clear(); mode = null; } kit.render(); });
  }
  function doHit(S, owner, group, end) {
    const id = [...picked][0];
    if (id === undefined) return;
    kit.command('hit', { card: id, owner, group, end }).then((r) => { if (r?.ok) picked.clear(); kit.render(); });
  }

  // The existing selection renderer lives on the table; validation and actions stay unchanged.
  function selectionGroups(S) {
    const g = S.g, me = meOf(S), m = modeOf(S), inRound = !!me?.inRound;
      // Ausleg-Leiste über der Hand: ein Feld je Gruppe
      const bar = inRound && !me.laidDone && g.myGroups.length && m !== 'discard' ? I18n.html`<div class="ze-slots" role="group" aria-label="Phase auslegen: Gruppen">${g.myGroups.map((gr, i) => {
        const cards = slotCards(S, i);
        const why = slotReason(S, i);
        const exact = S.settings.exactSize;
        return I18n.html`<div class="ze-slot ${why === null ? 'ok' : ''} ${active === i ? 'active' : ''}" data-drop="slot" data-i="${i}">
          <button type="button" class="ze-slot-head" data-g="slot" data-i="${i}" aria-pressed="${active === i}" aria-label="${tx(`Gruppe ${i+1}: ${groupName(gr)} wählen`,`Choose group ${i+1}: ${groupName(gr)}`)}">
            <b>${tx('Gruppe','Group')} ${i + 1}: ${groupName(gr)}</b><small>${cards.length}/${gr.size}${exact ? '' : '+'}${why === null ? ' ✓' : ''}</small></button>
          <div class="ze-slot-cards">${cards.length ? cards.map((c) => card(c, { attrs: `data-g="unslot" data-id="${c.id}" title="${tx('Zurück auf die Hand','Return to hand')}"` })).join('') : `<span class="ze-empty">${active === i ? tx('Karten antippen – sie kommen hierher','Select cards to place them here') : tx('Feld antippen, dann Karten wählen','Choose a group, then select cards')}</span>`}</div>
          <div class="ze-why ${why === null ? 'ok' : ''}" role="status">${why === null ? tx('✓ passt','✓ valid') : esc(why)}</div></div>`;
      }).join('')}</div>` : '';
    return bar;
  }

  const kit = kitGame({
    id: 'zehnetappen',
    cardUX: true,
    onClear: clearSelection,
    ring: false,
    lobby(S) {
      const players = S.players.filter((p) => p.seated), ready = players.length >= S.minPlayers, limit = S.variant === 'short' ? 5 : 10;
      return `<section class="cw-lobby ze-lobby"><div class="cw-lobby-art ze-lobby-art" aria-hidden="true"><div class="ze-art-phase">${Array.from({ length: limit }, (_, i) => `<i>${i + 1}</i>`).join('')}</div><div class="ze-art-group">${['r','g','b'].map((c) => card({c,n:7}, {tag:'span'})).join('')}<b>✓</b></div><div class="ze-art-group ze-art-run">${[3,4,5,6].map((n,i) => card({c:'rgby'[i],n}, {tag:'span'})).join('')}</div><span class="cw-art-caption">${tx('Deine nächste Phase', 'Your next phase')}</span></div><div class="cw-brief"><span class="cw-eyebrow">PHASE 10 · ${S.variant === 'team' ? tx('Teamspiel', 'Team play') : S.variant === 'short' ? tx('Kurze Partie', 'Short game') : tx('Klassisch', 'Classic')}</span><h2>${tx('Schritt für Schritt.<br>Phase für Phase.', 'Step by step.<br>Phase by phase.')}</h2><p class="cw-lead">${tx('Sammle Sätze, baue Folgen und halte deine nächste Aufgabe im Blick. Jede ausgelegte Phase bringt dich weiter.', 'Collect sets, build runs and focus on your next task. Each completed phase takes you further.')}</p><div class="cw-facts"><span><b>${S.minPlayers === S.maxPlayers ? S.minPlayers : `${S.minPlayers}–${S.maxPlayers}`}</b>${tx('Spieler', 'Players')}</span><span><b>${limit}</b>${tx('Phasen', 'Phases')}</span><span><b>J</b>${tx('Joker helfen', 'Wild cards help')}</span></div><div class="cw-ready"><i class="${ready ? 'ready' : ''}"></i><b>${ready ? tx('Bereit für Phase eins', 'Ready for phase one') : tx('Warten auf Mitspieler', 'Waiting for players')}</b><span>${players.length}/${S.maxPlayers}</span></div><ul class="cw-roster">${players.map((p) => `<li><span class="cw-player-initial">${esc(Array.from(p.name)[0] || '?')}</span>${esc(p.name)}${p.id === S.you?.id ? `<small>${tx('du', 'you')}</small>` : ''}</li>`).join('')}</ul><p class="cw-footnote">${tx('Erst ziehen, dann auslegen oder anlegen, zum Schluss eine Karte abwerfen. Die Gruppen zeigen dir, was noch fehlt.', 'Draw first, lay down or add cards, then discard one card. The groups show what is still missing.')}</p></div><div class="cw-brief-steps"><article><b>01</b><span>${tx('Aufgabe lesen', 'Read your task')}</span><p>${tx('Deine Phase und ihr Fortschritt stehen zusammen.', 'Your phase and its progress stay together.')}</p></article><article><b>02</b><span>${tx('Gruppen bauen', 'Build your groups')}</span><p>${tx('Karten wählen und gültige Sätze oder Folgen vorbereiten.', 'Choose cards and prepare valid sets or runs.')}</p></article><article><b>03</b><span>${tx('Passend abschließen', 'Complete your turn')}</span><p>${tx('Auslegen, anlegen und abwerfen sind klar getrennte Schritte.', 'Laying down, adding cards and discarding are distinct steps.')}</p></article></div></section>`;
    },
    resultExtra(S) { return `<div class="cw-result ze-result"><span class="cw-eyebrow">PHASE 10</span><h3>${tx('Runde ausgewertet.', 'Round scored.')}</h3><p>${tx('Die bestätigte Wertung und die erreichten Phasen findest du im Stand. Der Host startet die nächste Runde.', 'Find confirmed scores and completed phases in the standings. The host starts the next round.')}</p></div>`; },
    look(S) {
      const laid = Object.entries(S.g.laid).filter(([, gs]) => gs.length).map(([id, gs]) => I18n.html`<div class="look-pile"><h4>${esc(S.players.find((p) => p.id === id)?.name ?? '?')} · Phase ${S.players.find((p) => p.id === id)?.phase ?? ''}</h4>${gs.map((gr) => `<p class="hint" style="margin:6px 0 2px">${TYPE[gr.type]}</p><div class="look-fan">${groupCards(gr)}</div>`).join('')}</div>`).join('');
      const thrown = S.moves.filter((m) => m.t === 'wirft ab' && m.d).slice(-5).map((m) => card(m.d, { tag: 'span' }));
      return [{ title: 'Ausgelegte Phasen', html: laid || I18n.html('<p class="hint">Noch hat niemand eine Phase ausgelegt.</p>') },
        { title: 'Ablage – die letzten 5 Karten', note: 'Ganz rechts liegt die oberste Karte.', html: lookFan(thrown, { topLabel: 'oben' }) }];
    },
    moveDetail: (m) => (m.d && m.d.c ? `<span class="look-d">${m.d.c === 'j' ? 'Joker' : m.d.c === 's' ? 'Aussetzen' : `${COLOR[m.d.c]} ${m.d.n}`}</span>` : ''),
    name: 'Phase 10',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Ziel", "Schaff die zehn Phasen nacheinander. Deine aktuelle Phase steht oben groß."],
      ["Dein Zug", "Erst eine Karte ziehen (Stapel oder Ablage), zum Schluss eine Karte abwerfen."],
      ["Auslegen", "Karten antippen: Sie wandern in die aktive Gruppe über deiner Hand. Steht überall ✓, tippst du „Phase auslegen“."],
    ],
    short: [
      "Jede Runde versuchst du, deine aktuelle Phase auszulegen (Liste unter „Alle Regeln“). Die Mengen sind Mindestangaben – du darfst mehr Karten legen.",
      "Zug: eine Karte ziehen (Stapel oder Ablage), evtl. auslegen und anlegen, eine Karte abwerfen.",
      I18n.html("<b>J</b> Joker ersetzen jede Karte, bleiben in Auslagen aber fest liegen. Aussetzen lässt jemanden einmal aussetzen."),
      "Wer seine Phase ausgelegt hat, darf überall anlegen.",
      "Die Runde ist vorbei, wenn jemand keine Karten mehr hat – wer ausgelegt hat, kommt eine Phase weiter.",
      "Wer zuerst Phase 10 schafft, gewinnt (Gleichstand: weniger Strafpunkte).",
    ],
    house: (S) => (S.settings.exactSize ? [I18n.t('Phase nur mit genauer Kartenanzahl auslegen')] : []),
    playerInfo: (p, S) => I18n.html`Phase ${p.phase}${p.laidDone ? ' ✓' : ''} · ${p.cards} Karten · ${p.penalty} Strafp.${p.skipped ? I18n.html(' · <b>setzt aus</b>') : ''}${p.partner ? I18n.html` · Partner: ${esc(S.players.find((q) => q.id === p.partner)?.name || '')}` : ''}`,
    seat: (p) => I18n.html`${fanHTML(p.cards)}<span>${p.cards} Karten</span><span>Phase ${p.phase}${p.laidDone ? I18n.html(' <b>✓ ausgelegt</b>') : ''}</span>${p.skipped ? I18n.html('<b class="kg-call">setzt aus</b>') : ''}`,
    // „Stand“: Phasen aller Spieler als Tabelle
    standExtra(S) {
      const list = S.players.filter((p) => p.seated || p.inRound);
      if (!list.length || S.phase === 'lobby') return '';
      return I18n.html`<h3>Phasen</h3><table class="standings ze-phases"><thead><tr><th>Name</th><th>Phase</th><th class="num">Strafpunkte</th></tr></thead><tbody>
        ${list.map((p) => `<tr><td><span class="mini-av">${avatarHTML(p)}</span> ${esc(p.name)}</td>
          <td><b>${p.phase ?? '–'}</b>/${S.variant === 'short' ? 5 : 10} ${p.laidDone ? I18n.html('<span class="ze-ok">✓ liegt</span>') : ''}<small class="ze-ptext">${esc(S.g?.phases?.[p.id] || '')}</small></td>
          <td class="num">${p.penalty ?? 0}</td></tr>`).join('')}</tbody></table>`;
    },
    hint(S, myTurn) {
      const g = S.g;
      const m = modeOf(S);
      if (skipFor !== null) return tx('Wer soll aussetzen?', 'Who should skip a turn?');
      if (!myTurn) return `${esc(S.players.find((p) => p.id === S.turnId)?.name ?? '?')} ${tx('ist dran – du kannst schon Karten in die Gruppen legen','is on turn — you may already prepare your groups')}`;
      if (g.step === 'draw') return tx('Zieh eine Karte – vom Stapel oder die oberste der Ablage', 'Draw a card — from the deck or the top of the discard pile');
      if (m === 'discard') return tx('Abwerfen: genau eine Karte wählen, dann „Abwerfen“ oder die Ablage antippen', 'Discard: choose exactly one card, then confirm “Discard” or choose the discard pile');
      if (m === 'hit') return picked.size ? tx('Die leuchtenden Auslagen passen – antippen zum Anlegen', 'Highlighted groups fit — choose one to add your card') : tx('Anlegen: Karte wählen – oder „Abwerfen“, wenn du fertig bist', 'Add cards: select a card — or choose “Discard” when finished');
      return tx('Karten antippen: Sie kommen in die aktive Gruppe. Passt alles, „Phase auslegen“ – zum Schluss abwerfen', 'Select cards for the active group. Once valid, confirm “Lay phase” — then discard');
    },
    // Farbe: Rot, Grün, Blau, Gelb, dann Aussetzen und Joker; Zahl: 1–12, dann Aussetzen und Joker
    sort: {
      color: (c) => ('rgbysj'.indexOf(c.c)) * 100 + (c.n || 0),
      number: (c) => (c.c === 's' ? 1300 : c.c === 'j' ? 1400 : (c.n || 0) * 10 + 'rgby'.indexOf(c.c)),
    },
    // Ziehen (Maus): Karte in ein Ausleg-Feld, auf eine Auslage = anlegen, auf die Ablage = abwerfen
    onDrop(src, z, S) {
      const id = Number(src.dataset.id);
      draggingId=null;
      if (z.dataset.drop === 'slot') { putInSlot(S, id, Number(z.dataset.i)); return; }
      if (z.dataset.drop === 'discard') { mode='discard';picked = new Set([id]);doDiscard(S);return; }
      if (z.dataset.drop === 'group') { picked = new Set([id]);const gr=S.g.laid[z.dataset.owner]?.[Number(z.dataset.group)],c=handCard(S,id);if(gr&&c&&sides(gr,c).length===1)doHit(S,z.dataset.owner,Number(z.dataset.group),sides(gr,c)[0]);else kit.render(); }
    },
    onDragStart(src,S){draggingId=Number(src.dataset.id);if(meOf(S)?.laidDone)picked=new Set([draggingId]);},
    onDragEnd(){draggingId=null;},
    canDrop(src,z,S){
      const c=handCard(S,Number(src.dataset.id));if(!c||!meOf(S)?.inRound||S.gamePaused)return false;
      if(z.dataset.drop==='slot'){const i=Number(z.dataset.i);return !meOf(S).laidDone&&modeOf(S)!=='discard'&&c.c!=='s'&&!!S.g.myGroups[i]&&(!S.settings.exactSize||slotOf(c.id)===i||slots[i].length<S.g.myGroups[i].size);}
      if(!canAct(S))return false;if(z.dataset.drop==='discard')return true;
      const gr=S.g.laid[z.dataset.owner]?.[Number(z.dataset.group)];return z.dataset.drop==='group'&&meOf(S).laidDone&&!!gr&&sides(gr,c).length>0;
    },
    onState(S,prev) {
      const ids = new Set((S.g?.hand || []).map((c) => c.id));
      picked = new Set([...picked].filter((id) => ids.has(id)));
      const key = `${S.code}:${S.you?.id}:${S.variant}:${S.roundNo}:${S.g?.myPhase}:${(S.g?.myGroups || []).length}`;
      if (key !== slotKey || meOf(S)?.laidDone) { slotKey = key; slots = (S.g?.myGroups || []).map(() => []); active = 0; }
      slots = slots.map((l) => l.filter((id) => ids.has(id)));
      if (active >= slots.length) active = 0;
      if(!ids.has(skipFor))skipFor=null;
      if(prev&&CardInteraction.context(S)!==CardInteraction.context(prev))draggingId=null;
      if (S.turnId !== S.you?.id) { skipFor = null; mode = null; picked.clear(); }
    },
    main(S) {
      const g = S.g;
      const me = meOf(S);
      const name = (id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
      const playing = canAct(S);
      const m = modeOf(S);
      const one = picked.size === 1 ? handCard(S, [...picked][0]) : null;
      const hitting = playing && m === 'hit' && one;
      const limit = S.variant === 'short' ? 5 : 10, n = Math.min(g.myPhase, limit);
      const phase = me?.inRound ? I18n.html`<div class="ze-phase"><div><small>Deine Phase</small><b>Phase ${n}: ${esc(g.phaseText)}</b>${S.settings.exactSize ? '' : I18n.html('<small class="ze-min">Mengen sind Mindestangaben – mehr Karten sind erlaubt</small>')}</div>
        <div class="ze-progress" role="img" aria-label="Phase ${n} von ${limit}">${[...Array(limit)].map((_, i) => `<i class="${i < n - 1 ? 'done' : i === n - 1 ? 'now' : ''}"></i>`).join('')}<span>${n}/${limit}</span></div></div>` : '';
      const laid = Object.entries(g.laid).filter(([, gs]) => gs.length).map(([id, gs]) => `<div class="ze-laid"><b>${name(id)}</b>${gs.map((gr, i) => {
        const sd = hitting ? sides(gr, one) : [];
        const fits = sd.length > 0;
        const both = fits && one.c === 'j' && gr.type === 'run' && sd.length === 2;
        const label = I18n.html`Gruppe ${TYPE[gr.type]} von ${name(id)}${fits ? ' – passt, antippen zum Anlegen' : ''}`;
        return `<div class="ze-group ${fits ? 'can' : ''}" ${playing && m === 'hit' ? 'data-drop="group"' : ''} data-owner="${id}" data-group="${i}">
          <button type="button" class="ze-gbtn" data-g="hit" data-owner="${id}" data-group="${i}" ${fits && !both ? '' : 'disabled'} aria-label="${label}">
            <small>${TYPE[gr.type]}${gr.type === 'run' ? ` ${gr.vals[0]}–${gr.vals[gr.vals.length - 1]}` : ''}</small><span class="ze-cards">${groupCards(gr)}</span></button>
          ${both ? I18n.html`<span class="ze-ends"><button type="button" class="btn btn-sm btn-brass" data-g="hit" data-owner="${id}" data-group="${i}" data-side="low">${tx('unten','Low')} (${gr.vals[0] - 1})</button><button type="button" class="btn btn-sm btn-brass" data-g="hit" data-owner="${id}" data-group="${i}" data-side="high">${tx('oben','High')} (${gr.vals[gr.vals.length - 1] + 1})</button></span>` : ''}</div>`;
      }).join('')}</div>`).join('');
      const targetPile = playing && (m === 'discard' && picked.size === 1 || draggingId !== null);
      const top = g.top ? card(g.top, { cls: 'big', attrs: 'disabled' }) : '<div class="kc kc-empty"></div>';
      const ownTurn = S.phase === 'playing' && S.turnId === S.you?.id;
      return I18n.html`<div class="kg-table ze-workbench">
        <header class="cw-table-head"><div><span class="cw-eyebrow">PHASE 10 · ${tx('DEINE KARTENWERKSTATT', 'YOUR CARD WORKSPACE')}</span><h2>${tx('Plane deine nächste Phase.', 'Plan your next phase.')}</h2></div><span class="cw-turn ${ownTurn ? 'is-mine' : ''}">${S.phase === 'over' ? tx('Runde beendet', 'Round complete') : ownTurn ? tx('Du bist am Zug', 'Your turn') : `${name(S.turnId)} · ${tx('am Zug', 'on turn')}`}</span></header>
        ${me?.inRound ? `<ol class="ze-flow" aria-label="${tx('Schritte deines Zugs', 'Your turn steps')}"><li ${ownTurn && g.step === 'draw' ? 'aria-current="step"' : ''}><b>01</b>${tx('Ziehen', 'Draw')}</li><li ${ownTurn && g.step === 'play' && m !== 'discard' ? 'aria-current="step"' : ''}><b>02</b>${me.laidDone ? tx('Anlegen', 'Add cards') : tx('Auslegen', 'Lay down')}</li><li ${ownTurn && m === 'discard' ? 'aria-current="step"' : ''}><b>03</b>${tx('Abwerfen', 'Discard')}</li></ol>` : ''}
        <div class="ze-top">${phase}
        <div class="kg-piles"><div class="kg-pile">${backCard(g.deck)}<small>Stapel</small></div>
          <div class="kg-pile ${targetPile ? 'ze-target' : ''}" ${playing ? 'data-drop="discard"' : ''}><button type="button" class="ze-pile-btn" data-g="discard-pile" ${targetPile ? '' : 'disabled'} aria-label="Ablage${targetPile ? ' – hier abwerfen' : ''}">${top}</button><small>${targetPile ? 'Hier abwerfen' : I18n.t('Ablage')}</small></div></div></div>
        ${selectionGroups(S)}
        <section class="ze-public"><div class="cw-section-head"><span class="cw-eyebrow">${tx('OFFENE AUSLAGEN', 'PUBLIC GROUPS')}</span><span>${tx('Hier kannst du nach deiner Phase anlegen', 'Add cards here after completing your phase')}</span></div><div class="ze-table">${laid || I18n.html('<p class="hint">Noch hat niemand eine Phase ausgelegt.</p>')}</div></section>
      </div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const me = meOf(S);
      const m = modeOf(S);
      const inRound = !!me?.inRound;
      const chosen = m === 'lay' ? slots.flat().length : picked.size;
      const counter = inRound && (m === 'lay' || picked.size || m === 'discard')
        ? `<div class="ze-count" data-cix-node="phase-count" role="status"><span>${tx(`${chosen} ausgewählt`,`${chosen} selected`)}${m === 'discard' ? tx(' (zum Abwerfen: genau 1)',' (discard: exactly 1)') : ''}</span>${chosen ? `<button type="button" class="btn btn-sm btn-ghost" data-g="clear">${tx('Auswahl aufheben','Clear selection')}</button>` : ''}</div>` : '';
      const hand = kit.cards().map(({card:c,key}) => {
        const si = m === 'lay' ? slotOf(c.id) : -1;
        const isPick = picked.has(c.id);
        const cls = `${si >= 0 ? 'ze-sel' : ''} ${isPick ? (m === 'discard' ? 'ze-disc' : 'ze-sel') : ''} ${draggingId===c.id?'cix-selected':''}`;
        const badge = si >= 0 ? `<i class="ze-badge" aria-hidden="true">${si + 1}</i><i class="cix-phase-order" aria-hidden="true">#${slots[si].indexOf(c.id)+1}</i>` : '';
        return card(c, { cls, badge, attrs: `data-g="pick" data-id="${c.id}" data-card-key="${key}" aria-pressed="${si >= 0 || isPick || draggingId===c.id}" data-drag="${c.id}"` });
      }).join('');
      let acts = '';
      if (skipFor !== null) {
        const others = S.players.filter((p) => p.inRound && p.id !== S.you.id);
        acts = `${others.map((p) => `<button class="btn" data-g="skipwho" data-who="${esc(p.id)}">${esc(p.name)} · ${tx('aussetzen lassen','skip a turn')}</button>`).join('')}<button class="btn btn-ghost" data-g="noskip">${tx('Abbrechen','Cancel')}</button>`;
      } else if (myTurn && g.step === 'draw') {
        acts = `<button class="btn btn-brass" data-g="draw-deck">${tx('Vom Stapel ziehen','Draw from deck')}</button>
          <button class="btn" data-g="draw-discard" ${!g.top || g.top.c === 's' ? `disabled title="${tx('Aussetzen darf man nicht aufnehmen','Skip cards cannot be picked up')}"` : ''}>${tx('Ablage nehmen','Take discard')}</button>`;
      } else if (myTurn) {
        const done = me?.laidDone;
        const ready = !done && slots.length && slots.every((_, i) => slotOk(S, i));
        acts = `${done ? '' : `<button class="btn ${ready ? 'btn-brass' : ''}" data-g="lay" ${ready ? '' : `disabled title="${tx('Erst alle Gruppen passend füllen','Complete all groups first')}"`}>${tx('Phase auslegen','Lay phase')}</button>`}
          ${m === 'discard' ? `<button class="btn btn-outline-red ze-discard-btn" data-g="discard" ${picked.size === 1 ? '' : `disabled title="${tx('Genau eine Karte auswählen','Select exactly one card')}"`}>${tx('Abwerfen','Discard')}</button><button class="btn btn-ghost" data-g="mode-back">${done ? tx('Zurück zum Anlegen','Back to adding cards') : tx('Zurück zum Auslegen','Back to preparing groups')}</button>`
            : `<button class="btn" data-g="mode-discard">${tx('Karte abwerfen …','Discard a card …')}</button>`}`;
      }
      const one=picked.size===1?handCard(S,[...picked][0]):draggingId!==null?handCard(S,draggingId):null;
      const summary=one?CardInteraction.selection({label:one.c==='j'?'Joker':one.c==='s'?CardInteraction.term('Aussetzen'):`${CardInteraction.term(COLOR[one.c])} ${one.n}`,html:card(one,{tag:'span'}),hint:m==='discard'?tx('Abwerfen beendet deinen Zug.','Discarding ends your turn.'):tx('Nur passende Auslagen sind markiert. Bei Jokern das Ende selbst wählen.','Only matching groups are highlighted. Choose the end for a wild card.')}):'';
      return I18n.html`${counter}${summary}<div class="kg-hand ze-hand" data-cix-node="hand" role="group" aria-label="Deine Karten">${hand}</div><div class="kg-acts" data-cix-node="actions">${acts}</div>`;
    },
    async onClick(t, S) {
      const g = t.dataset.g;
      const m = modeOf(S);
      if (g === 'pick') {
        const id = Number(t.dataset.id);
        if (m === 'lay') {
          if (slotOf(id) >= 0) slots = slots.map((l) => l.filter((x) => x !== id));
          else if (slots.length) putInSlot(S, id, active);
          kit.render();
        } else if (picked.has(id)) { picked.delete(id); kit.render(); }
        else { picked = new Set([id]); kit.render(); } // anlegen/abwerfen: genau eine Karte
      } else if (g === 'slot') { active = Number(t.dataset.i); kit.render(); }
      else if (g === 'unslot') { const id = Number(t.dataset.id); slots = slots.map((l) => l.filter((x) => x !== id)); kit.render(); }
      else if (g === 'clear') { picked.clear(); slots = slots.map(() => []); kit.render(); }
      else if (g === 'mode-discard') { mode = 'discard'; picked.clear(); kit.render(); }
      else if (g === 'mode-back') { mode = null; picked.clear(); kit.render(); }
      else if (g === 'draw-deck') kit.command('draw', { from: 'deck' });
      else if (g === 'draw-discard') kit.command('draw', { from: 'discard' });
      else if (g === 'lay') kit.command('lay', { cards: slots.flat(), groups: slots }).then((r) => { if (r?.ok) { slots = slots.map(() => []); picked.clear(); } kit.render(); });
      else if (g === 'hit') doHit(S, t.dataset.owner, Number(t.dataset.group), t.dataset.side || null);
      else if (g === 'discard' || g === 'discard-pile') { if (picked.size === 1) doDiscard(S); }
      else if (g === 'skipwho') { const id = skipFor; kit.command('discard', { card: id, target: t.dataset.who }).then((r) => { if (r?.ok) { picked.clear(); mode = null;skipFor=null; } kit.render(); }); }
      else if (g === 'noskip') { skipFor = null; kit.render(); }
    },
    rules: I18n.html`<p>Zehn Phasen nacheinander. Jede Runde versuchst du, deine aktuelle Phase auszulegen:</p>
      <ol class="ze-list"><li>2 Drillinge</li><li>Drilling + 4er-Folge</li><li>Vierling + 4er-Folge</li><li>7er-Folge</li><li>8er-Folge</li>
        <li>9er-Folge</li><li>2 Vierlinge</li><li>7 Karten einer Farbe</li><li>Fünfling + Zwilling</li><li>Fünfling + Drilling</li></ol>
      <ul>
        <li><b>Zug:</b> eine Karte ziehen (Stapel oder Ablage), dann evtl. auslegen, dann eine Karte abwerfen.</li>
        <li><b>Mindestmengen:</b> „4er-Folge“ heißt mindestens vier Karten in Folge, „Drilling“ mindestens drei gleiche, „7 einer Farbe“ mindestens sieben. Du darfst also gleich mehr Karten in eine Gruppe legen (Hausregel im Host-Menü: nur die genaue Anzahl).</li>
        <li><b>Auslegen:</b> Karten antippen – sie kommen in die aktive Gruppe über deiner Hand (Gruppe wechseln: Feld antippen). Jedes Feld zeigt, ob es passt. Am Computer kannst du Karten auch ziehen.</li>
        <li>Wer ausgelegt hat, darf in späteren Zügen Karten an alle ausgelegten Gruppen <b>anlegen</b>: Karte wählen, die leuchtenden Auslagen passen. Folgen wachsen an beiden Enden.</li>
        <li><b>Joker</b> (J) ersetzen jede Karte. In Auslagen bekommt jeder Joker beim Legen einen <b>festen Wert</b> (steht als „★ = 7“ dabei) und bleibt für immer liegen – er lässt sich nicht tauschen oder aufnehmen. <b>Aussetzen</b> abwerfen: jemand deiner Wahl setzt einmal aus.</li>
        <li>Die Runde endet, wenn jemand keine Karten mehr hat. Wer seine Phase ausgelegt hat, ist eine weiter.</li>
        <li>Strafpunkte für Restkarten: 1–9 = 5, 10–12 = 10, Aussetzen 15, Joker 25.</li>
        <li>Wer zuerst Phase 10 schafft, gewinnt das Spiel (bei Gleichstand weniger Strafpunkte).</li>
      </ul>`,
  });

  // Karte in ein Ausleg-Feld legen (aus anderen Feldern wird sie dabei herausgenommen)
  function putInSlot(S, id, i) {
    if (!slots[i]) return;
    slots = slots.map((l, k) => (k === i ? [...l.filter((x) => x !== id), id] : l.filter((x) => x !== id)));
    active = i;
    kit.render();
  }
}
