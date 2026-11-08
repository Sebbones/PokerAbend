// Skip-Bo im Browser (Regeln: games/stapelrennen/room.js).
// Erst eine Karte wählen (Hand, eigener Stapel oder oberste Karte einer Ablage), dann eine Baureihe antippen.
// Mit einer Handkarte gewählt: eigene Ablage antippen = abwerfen und Zug beenden.
'use strict';
{
  const tx = (de, en) => I18n.language === 'en' ? en : de;
  let sel = null; // { kind: 'hand' | 'stock' | 'pile', index }
  // Karte: 1–4 blau, 5–8 grün, 9–12 rot (mit Form je Gruppe), große Zahl und kleine in den Ecken. Joker: dunkel mit Goldstern – deutlich anders.
  const num = (n, { cls = '', attrs = '', tag = 'button' } = {}) => {
    const corner = n === 0 ? '★' : n;
    return `<${tag} ${tag === 'button' ? 'type="button"' : 'role="img"'} class="kc kc-st ${n === 0 ? 'joker' : I18n.html`st-${Math.ceil(n / 4)}`} ${cls}" ${attrs} aria-label="${n === 0 ? 'Joker' : n}">${n ? colorMark('bgr'[Math.ceil(n / 4) - 1]) : ''}
      <span class="cr tl">${corner}</span><span class="v">${n === 0 ? I18n.html('★<small>Joker</small>') : n}</span><span class="cr br">${corner}</span></${tag}>`;
  };
  const same = (a, b) => a && b && a.kind === b.kind && (a.index ?? 0) === (b.index ?? 0) && (a.owner || null) === (b.owner || null);
  function source(t,S){
    const kind=t.dataset.kind,owner=t.dataset.owner||S.you?.id,index=Number(t.dataset.i||0),p=S.players.find((p)=>p.id===owner);
    if(!p?.inRound||owner!==S.you?.id&&owner!==S.g.partner)return null;
    let value,key=t.dataset.cardKey;
    if(kind==='hand'){const ref=kit.cards().find((r)=>r.key===key);if(owner!==S.you?.id||!ref)return null;value=ref.card;return {kind,index:ref.index,key,value,context:CardInteraction.context(S)};}
    if(kind==='stock')value=p.stock?p.stockTop:undefined;
    else if(kind==='pile'&&Number.isInteger(index)&&index>=0&&index<4)value=p.piles?.[index]?.at(-1);
    if(value===undefined||value===null)return null;
    return {kind,index,key,value,...(owner!==S.you?.id?{owner}:{}),context:CardInteraction.context(S)};
  }
  const currentSource=(S)=>sel&&sel.context===CardInteraction.context(S)?sel:null;
  const fits=(S,from,to)=>!!(from&&S.phase==='playing'&&!S.gamePaused&&S.turnId===S.you?.id&&S.g.build[to]&&(from.value===0||from.value===S.g.build[to].next));
  const payload=(s)=>({kind:s.kind,index:s.index,...(s.owner?{owner:s.owner}:{})});
  async function submit(event,data){const before=sel,result=await kit.command(event,data);if(result?.ok&&sel===before)sel=null;kit.render();}

  const kit = kitGame({
    id: 'stapelrennen',
    cardUX: true,
    sort: {color:(n)=>n===0?999:Math.ceil(n/4)*100+n,number:(n)=>n===0?13:n},
    onClear(){sel=null;},
    ring: false,
    lobby(S) {
      const players = S.players.filter((p) => p.seated), ready = players.length >= S.minPlayers;
      return `<section class="cw-lobby st-lobby"><div class="cw-lobby-art st-lobby-art" aria-hidden="true"><div class="st-art-track">${Array.from({ length: 12 }, (_, i) => `<i>${i + 1}</i>`).join('')}</div><div class="st-art-stacks">${[1,5,9,0].map((n, i) => `<span style="--fan:${i}">${num(n, { tag: 'span' })}</span>`).join('')}</div><span class="cw-art-caption">1 → 12 · ${tx('Reihe für Reihe', 'One stack at a time')}</span></div><div class="cw-brief"><span class="cw-eyebrow">SKIP-BO · ${S.variant === 'team' ? tx('Teamspiel', 'Team play') : S.variant === 'short' ? tx('Kurze Partie', 'Short game') : tx('Klassisch', 'Classic')}</span><h2>${tx('Vier Reihen.<br>Ein Ziel.', 'Four building piles.<br>One goal.')}</h2><p class="cw-lead">${tx('Baue von 1 bis 12. Nutze deine Ablagen klug. Und behalte deinen eigenen Spielstapel im Blick.', 'Build from 1 to 12. Use your discard piles wisely. Keep your own stock pile in sight.')}</p><div class="cw-facts"><span><b>${S.minPlayers === S.maxPlayers ? S.minPlayers : `${S.minPlayers}–${S.maxPlayers}`}</b>${tx('Spieler', 'Players')}</span><span><b>1–12</b>${tx('Gemeinsam bauen', 'Build together')}</span><span><b>${S.settings.stockSize}</b>${tx('Karten im Spielstapel', 'Cards in your stock pile')}</span></div><div class="cw-ready"><i class="${ready ? 'ready' : ''}"></i><b>${ready ? tx('Die Stapel können starten', 'The piles are ready') : tx('Warten auf Mitspieler', 'Waiting for players')}</b><span>${players.length}/${S.maxPlayers}</span></div><ul class="cw-roster">${players.map((p) => `<li><span class="cw-player-initial">${esc(Array.from(p.name)[0] || '?')}</span>${esc(p.name)}${p.id === S.you?.id ? `<small>${tx('du', 'you')}</small>` : ''}</li>`).join('')}</ul><p class="cw-footnote">${S.variant === 'team' ? tx('Im Team müssen beide Spielstapel leer werden. Offene Partnerstapel sind mitspielbar.', 'Both team stock piles must be cleared. You may play from your partner’s open piles.') : tx('Leere deinen Spielstapel zuerst. Eine Handkarte auf eine deiner vier Ablagen beendet deinen Zug.', 'Be first to clear your stock pile. Discarding a hand card to one of your four piles ends your turn.')}</p></div><div class="cw-brief-steps"><article><b>01</b><span>${tx('Quelle wählen', 'Choose a source')}</span><p>${tx('Hand, Spielstapel oder oberste Ablagekarte.', 'Your hand, stock pile or the top discard card.')}</p></article><article><b>02</b><span>${tx('Baureihe wählen', 'Choose a building pile')}</span><p>${tx('Die nächste Zahl ist an jeder Reihe deutlich sichtbar.', 'Every building pile shows the next required number.')}</p></article><article><b>03</b><span>${tx('Zug abschließen', 'Finish your turn')}</span><p>${tx('Eine Handkarte auf eine eigene Ablage legen.', 'Place a hand card on one of your discard piles.')}</p></article></div></section>`;
    },
    resultExtra(S) { return `<div class="cw-result st-result"><span class="cw-eyebrow">SKIP-BO</span><h3>${S.result.winners.includes(S.you?.id) ? tx('Diese Runde gehört dir.', 'This round is yours.') : tx('Die Reihen sind gebaut.', 'The building is done.')}</h3><p>${tx('Die bestätigte Rundenwertung steht oben. Für die nächste Runde werden die Stapel neu gemischt.', 'The confirmed round scores are above. The piles are shuffled for the next round.')}</p></div>`; },
    look(S) {
      const g = S.g;
      const topCard = (c) => (c === null || c === undefined ? '' : num(c, { tag: 'span' }));
      const builds = `<ul class="look-list">${g.build.map((b, i) => I18n.html`<li><b>Reihe ${i + 1}:</b> ${b.count ? `1–${b.count}${b.jokers.length ? I18n.html` (★ als ${b.jokers.map((j) => j + 1).join(', ')})` : ''}` : I18n.t('leer')} · nächste: <b>${b.next}</b></li>`).join('')}</ul>`;
      const people = S.players.filter((p) => p.inRound).sort((a, b) => (b.id === S.you?.id) - (a.id === S.you?.id));
      return [{ title: 'Baureihen in der Mitte', html: builds }, ...people.map((p) => ({
        title: p.id === S.you?.id ? I18n.t('Deine Ablagen') : I18n.html`Ablagen von ${p.name}`,
        html: I18n.html`<p class="look-stock">Stapel: <b>${p.stock} Karte${p.stock === 1 ? '' : 'n'}</b>${p.stock ? ' · oben:' : ''} ${topCard(p.stockTop)}</p>${(p.piles || []).map((pile, i) => I18n.html`<div class="look-pile"><h4>Ablage ${i + 1} · ${pile.length} Karte${pile.length === 1 ? '' : 'n'}</h4>${lookFan(pile.map((c) => num(c, { tag: 'span' })), { topLabel: 'oben – spielbar' })}</div>`).join('')}`,
      }))];
    },
    name: 'Skip-Bo',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Ziel", "Werde deinen Spielstapel (rechts von deinen Ablagen) als Erster los."],
      ["Legen", "Karte wählen – aus der Hand, vom Spielstapel oder oben von einer Ablage – und einen Bau-Stapel in der Mitte antippen. Jeder braucht die nächste Zahl."],
      ["Zug beenden", "Zum Schluss eine Handkarte auf eine deiner vier Ablagen. Die leuchten, sobald das geht."],
    ],
    short: [
      "Ziel: deinen eigenen Stapel als Erster loswerden.",
      "In der Mitte: vier Reihen von 1 bis 12, volle Reihen kommen weg.",
      "Lege aus der Hand, vom Stapel oder von deinen Ablagen – ★ Joker zählt als jede Zahl.",
      "Hand leer? Du bekommst 5 neue.",
      "Zug beenden: eine Handkarte auf eine deiner 4 Ablagen.",
      "Punkte: 25 plus 5 je Restkarte im Stapel der anderen.",
    ],
    house: () => ['Ohne Hand- und Nachziehkarten darfst du weitergeben. Kann niemand mehr legen, endet die Runde unentschieden.'],
    playerInfo: (p) => I18n.html`Stapel ${p.stock}${p.stockTop !== null && p.stockTop !== undefined ? I18n.html` (oben ${p.stockTop === 0 ? '★' : p.stockTop})` : ''} · ${p.cards} Handkarten`,
    onState(S, prev) { if (!prev||CardInteraction.context(S)!==CardInteraction.context(prev)) sel = null; },
    // Am Platz: oberste Karte des Spielstapels mit Restanzahl, darunter die vier Ablagen klein
    seat: (p) => I18n.html`<div class="st-seat"><span class="st-seat-stock">${p.stock ? num(p.stockTop, { tag: 'span' }) : '<span class="kc kc-empty"></span>'}<small>Stapel ${p.stock}</small></span>
      <span class="st-seat-piles">${(p.piles || []).map((pile) => (pile.length ? num(pile[pile.length - 1], { tag: 'span' }) : '<span class="kc kc-empty"></span>')).join('')}</span></div>
      <span>${p.cards} Handkarten</span>`,
    hint(S, myTurn) {
      if (!myTurn) return '';
      if (!sel) return tx('Karte wählen: Hand, dein Stapel oder oberste Karte einer Ablage', 'Choose a card: hand, stock pile or top discard card');
      return sel.kind === 'hand' ? tx('Jetzt eine Baureihe antippen – oder eine deiner Ablagen (= Zug beenden)', 'Choose a building pile — or one of your discard piles (= end turn)') : tx('Jetzt eine Baureihe antippen', 'Choose a building pile');
    },
    // Ziehen (Maus): auf eine Baureihe = legen, Handkarte auf eine eigene Ablage = abwerfen
    onDragStart(src,S){sel=source(src,S);},
    canDrop(src,z,S){const from=source(src,S);return z.dataset.drop==='build'?fits(S,from,Number(z.dataset.i)):z.dataset.drop==='pile'&&from?.kind==='hand'&&S.turnId===S.you?.id&&!S.gamePaused;},
    onDrop(src, z, S) {
      const from=source(src,S);if(!from)return;sel=from;
      if(z.dataset.drop==='build'&&fits(S,from,Number(z.dataset.i)))submit('play',{from:payload(from),to:Number(z.dataset.i)});
      else if(z.dataset.drop==='pile'&&from.kind==='hand')submit('discard',{index:from.index,pile:Number(z.dataset.i)});
    },
    main(S, ui = {}) {
      const g = S.g;
      const mine = S.turnId === S.you?.id;
      const me = S.players.find((p) => p.id === S.you?.id);
      const partner = S.players.find((p) => p.id === g.partner);
      const partnerHTML = partner ? I18n.html`<section class="st-partner"><div class="cw-section-head"><b>Partner: ${esc(partner.name)}</b><span>${tx('Gemeinsam zum leeren Spielstapel', 'Clear both stock piles together')}</span></div><div class="st-row">${partner.stock ? num(partner.stockTop, { cls: same(sel, { kind: 'stock', owner: partner.id }) ? 'sel' : '', attrs: mine ? `data-g="pick" data-kind="stock" data-owner="${esc(partner.id)}" data-card-key="source:${esc(partner.id)}:stock" data-drag="partner-stock" aria-pressed="${!!same(sel,{kind:'stock',owner:partner.id})}"` : 'disabled' }) : ''}${(partner.piles || []).map((p, i) => p.length ? num(p.at(-1), { cls: same(sel, { kind: 'pile', index: i, owner: partner.id }) ? 'sel' : '', attrs: mine ? `data-g="pick" data-kind="pile" data-i="${i}" data-owner="${esc(partner.id)}" data-card-key="source:${esc(partner.id)}:pile:${i}" data-drag="partner-pile-${i}" aria-pressed="${!!same(sel,{kind:'pile',index:i,owner:partner.id})}"` : 'disabled' }) : '<span class="kc kc-empty"></span>').join('')}</div><small>Offene Partnerstapel sind mitspielbar. Beide Spielstapel müssen leer werden.</small></section>` : '';
      const build = g.build.map((b, i) => I18n.html`<button type="button" class="st-build ${fits(S,currentSource(S),i) ? 'can cix-target' : ''}" data-g="build" data-i="${i}" ${mine ? 'data-drop="build"' : ''} ${fits(S,currentSource(S),i) ? '' : 'disabled'} aria-label="Baureihe ${i + 1}, braucht ${b.next}">
        <span class="st-build-index">${String(i + 1).padStart(2, '0')}</span>${b.count ? num(b.count, { tag: 'span' }) : '<span class="kc kc-empty"><span class="st-seed">1</span></span>'}<small>${tx('Nächste', 'Next')} <b class="st-need">${b.next}</b></small><progress max="12" value="${b.count}" aria-label="${tx('Karten in Baureihe', 'Cards in building pile')} ${i + 1}"></progress></button>`).join('');
      const piles = (p, own) => (p.piles || []).map((pile, i) => {
        const top = pile[pile.length - 1];
        const click = own && mine;
        const canDrop = click && sel?.kind === 'hand';
        return `<div class="st-pile ${canDrop ? 'cix-target' : ''}" ${click ? `data-drop="pile" data-i="${i}"` : ''}><span class="st-pile-index">${String(i + 1).padStart(2, '0')}</span>${top !== undefined
          ? num(top, { cls: `${same(sel, { kind: 'pile', index: i }) ? 'sel' : ''} ${canDrop ? 'drop' : ''}`, attrs: click ? `data-g="${canDrop ? 'drop' : 'pick'}" data-kind="pile" data-i="${i}" data-drag="pile${i}" data-card-key="source:${p.id}:pile:${i}" aria-pressed="${!!same(sel,{kind:'pile',index:i})}"` : 'disabled' })
          : I18n.html`<button type="button" class="kc kc-empty ${canDrop ? 'drop' : ''}" ${canDrop ? `data-g="drop" data-i="${i}"` : 'disabled'} aria-label="leere Ablage ${i + 1}"></button>`}
          <small>${canDrop ? tx('Abwerfen · Zug beenden','Discard · End turn') : pile.length > 1 ? I18n.html`${pile.length} Karten` : ''}</small></div>`;
      }).join('');
      const others = S.players.filter((p) => p.inRound && p.id !== S.you?.id).map((p) => I18n.html`<div class="st-other"><b>${esc(p.name)}</b> <button type="button" class="look-btn" data-g="look" aria-label="Ablagen von ${esc(p.name)} ansehen">${svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>')}</button>
        <div class="st-row"><div class="st-stock">${p.stock ? num(p.stockTop, { attrs: 'disabled' }) : '<span class="kc kc-empty"></span>'}<small>Stapel ${p.stock}</small></div>${piles(p, false)}</div></div>`).join('');
      // Wie am echten Tisch: deine vier Ablagen vorne, dein Spielstapel rechts daneben
      const ending = mine && sel?.kind === 'hand';
      const mineHTML = me?.inRound ? I18n.html`<section class="st-mine"><div class="cw-section-head"><span class="cw-eyebrow">${tx('DEIN BEREICH', 'YOUR PLAY AREA')}</span><span>${ending ? tx('Handkarte gewählt · Ablage beendet den Zug', 'Hand card selected · Discard to end your turn') : tx('Karte wählen, dann Ziel antippen', 'Choose a card, then tap its destination')}</span></div><div class="st-row">
        <div class="st-piles ${ending ? 'ending' : ''}"><div class="st-row">${piles(me, true)}</div><small>${ending ? I18n.html('<b>Handkarte auf eine Ablage = Zug beenden</b>') : I18n.t('Deine Ablagen')} <button type="button" class="look-btn" data-g="look" aria-label="Alle Ablagen ansehen">${svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>')}</button></small></div>
        <div class="st-stock st-goal-stock"><span class="cw-eyebrow">${tx('DEIN ZIEL', 'YOUR GOAL')}</span>${me.stock ? num(me.stockTop, { cls: I18n.html`big ${same(sel, { kind: 'stock' }) ? 'sel' : ''}`, attrs: mine ? `data-g="pick" data-kind="stock" data-drag="stock" data-card-key="source:${me.id}:stock" aria-pressed="${!!same(sel,{kind:'stock'})}"` : 'disabled' }) : '<span class="kc kc-empty big"></span>'}<small>Dein Stapel: <b>${me.stock}</b></small><span class="st-goal-note">${tx('Diesen Stapel leeren', 'Clear this pile')}</span></div>
        </div></section>` : '';
      // Am großen Tisch sitzen die Gegner mit Stapel und Ablagen an ihren Plätzen
      return `<div class="kg-table st-workbench"><header class="cw-table-head"><div><span class="cw-eyebrow">SKIP-BO · ${tx('REIHE FÜR REIHE', 'ONE STACK AT A TIME')}</span><h2>${tx('Die nächste Zahl wartet.', 'The next number awaits.')}</h2></div><span class="cw-turn ${mine ? 'is-mine' : ''}">${S.phase === 'over' ? tx('Runde beendet', 'Round complete') : mine ? tx('Du bist am Zug', 'Your turn') : `${esc(S.players.find((p) => p.id === S.turnId)?.name || '')} · ${tx('am Zug', 'on turn')}`}</span></header><section class="st-shared"><div class="cw-section-head"><span class="cw-eyebrow">${tx('GEMEINSAME BAUREIHEN', 'SHARED BUILDING PILES')}</span><span>1 → 12</span></div><div class="st-builds">${build}</div></section>${mineHTML}${partnerHTML}${ui.ring ? '' : `<section class="st-opponents"><div class="cw-section-head"><span class="cw-eyebrow">${tx('OFFENE STAPEL AM TISCH', 'PUBLIC PILES AT THE TABLE')}</span></div><div class="st-others">${others}</div></section>`}</div>`;
    },
    dock(S, myTurn) {
      const hand=kit.cards().map(({card:n,index,key})=>num(n,{cls:same(sel,{kind:'hand',index})?'sel cix-selected':'',attrs:`data-g="pick" data-kind="hand" data-i="${index}" data-card-key="${key}" aria-pressed="${!!same(sel,{kind:'hand',index})}" ${myTurn?`data-drag="${key}"`:'disabled'}`})).join('');
      const from=currentSource(S),owner=from?.owner?S.players.find((p)=>p.id===from.owner)?.name:null;
      const label=from?from.kind==='hand'?tx('Handkarte','Hand card'):from.kind==='stock'?tx('Spielstapel','Stock pile'):tx(`Ablage ${from.index+1}`,`Discard pile ${from.index+1}`):'';
      const summary=from?CardInteraction.selection({label:`${label}${owner?' · '+owner:''}: ${from.value===0?'Joker':from.value}`,html:num(from.value,{tag:'span'}),hint:from.kind==='hand'?tx('Passende Baureihe wählen. Abwerfen auf eine eigene Ablage beendet den Zug.','Choose a matching building pile. Discarding to your own pile ends the turn.'):tx('Nur passende Baureihen sind markiert.','Only matching building piles are highlighted.')}):'';
      const pass=myTurn&&S.g.canPass?I18n.html('<button type="button" class="btn" data-g="pass">Ohne Handkarte weiter</button>'):'';
      return `${summary}<div class="kg-hand" data-cix-node="hand" role="group" aria-label="${I18n.t('Deine Karten')}">${hand}</div><div class="kg-acts" data-cix-node="actions">${from?`<button type="button" class="btn btn-ghost" data-g="clear-selection">${tx('Auswahl aufheben','Clear selection')}</button>`:''}${pass}</div>`;
    },
    onClick(t,S) {
      const g = t.dataset.g;
      if (g === 'pick') {
        const next = source(t,S);if(!next)return;
        sel = same(sel, next) ? null : next;
        kit.render();
      } else if (g === 'build' && fits(S,currentSource(S),Number(t.dataset.i)))submit('play',{from:payload(sel),to:Number(t.dataset.i)});
      else if (g === 'drop' && currentSource(S)?.kind === 'hand')submit('discard',{index:sel.index,pile:Number(t.dataset.i)});
      else if (g === 'clear-selection') {sel=null;kit.render();}
      else if (g === 'pass')submit('pass',{});
      else if (g === 'look') openLook(kit.lookSheet(kit.S));
    },
    rules: I18n.html`<p>Wer zuerst seinen eigenen <b>Stapel</b> los ist, gewinnt.</p>
      <ul>
        <li>In der Mitte liegen vier <b>Baureihen</b>: jede beginnt mit 1 und geht bis 12. Volle Reihen kommen weg.</li>
        <li>Zu Beginn deines Zuges hast du 5 Handkarten. Lege beliebig viele Karten aus der Hand, von deinem Stapel oder oben von deinen Ablagen auf die Reihen.</li>
        <li><b>★ Joker</b> zählen als die Zahl, die gerade gebraucht wird.</li>
        <li>Ist deine Hand leer, bekommst du 5 neue.</li>
        <li>Zum Schluss legst du eine Handkarte auf eine deiner vier <b>Ablagen</b> – dann ist der Nächste dran.</li>
        <li>Ohne Hand- und Nachziehkarten darfst du ohne Abwerfen weitergeben. Kann niemand mehr legen, endet die Runde unentschieden.</li>
      </ul>
      <p><b>Wertung:</b> Der Gewinner bekommt 25 Punkte plus 5 für jede Karte, die die anderen noch im Stapel haben.</p>`,
  });
}
