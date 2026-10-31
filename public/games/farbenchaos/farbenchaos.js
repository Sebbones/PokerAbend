// UNO im Browser (Regeln: games/farbenchaos/room.js). Sichere Auswahl mit ausdrücklicher Bestätigung über kitShedding.
'use strict';
{
  const tx = (de, en) => I18n.language === 'en' ? en : de;
  const THEMES = {
    classic: ['Modern Card Table', 'Farbe bekennen.', 'Show your colours.', 'Gleiche Farbe oder Zahl. Deine Hausregeln, dein Spiel.', 'Match a colour or number. Your house rules, your game.'],
    flip: ['Dual World', 'Zwei Seiten. Ein Spiel.', 'Two sides. One game.', 'Hell und dunkel. Jede Wendung verändert den Tisch.', 'Light and dark. Every flip changes the table.'],
    'no-mercy': ['Extreme Edition', 'Jede Karte zählt.', 'Every card counts.', 'Strafketten, starke Aktionen. Bei 25 Karten scheidest du aus.', 'Draw chains, powerful actions. Reaching 25 cards eliminates you.'],
    'all-wild': ['Wild Card Universe', 'Deine Aktion. Dein Universum.', 'Your action. Your universe.', 'Jede Karte passt. Entscheide, welche Aktion jetzt zählt.', 'Every card fits. Choose the action that matters now.'],
    'halloween-ghosthunt': ['Haunted Investigation', 'Die Geisterjagd beginnt.', 'The ghost hunt begins.', 'Halloween Special – Die Geisterjagd beginnt. Alle Classic-Regeln und wählbaren Hausregeln bleiben erhalten.', 'Halloween Special — the ghost hunt begins. All Classic rules and configurable house rules still apply.'],
  };
  const themeOf = (S) => Object.hasOwn(THEMES, S?.variant) ? S.variant : 'classic';
  const variantLabel = (S) => ({ classic: tx('Klassisch', 'Classic'), flip: 'Flip', 'no-mercy': 'No Mercy', 'all-wild': 'All Wild', 'halloween-ghosthunt': tx('Spuknacht', 'Ghost Night') }[themeOf(S)]);
  const variantBrief = (S) => { const t = THEMES[themeOf(S)]; return tx(t[3], t[4]); };
  const COLOR = { r: 'Rot', y: 'Gelb', g: 'Grün', b: 'Blau', w: 'Schwarz', p: 'Pink', t: 'Türkis', o: 'Orange', v: 'Lila' };
  const LABEL = { S: 'Aussetzen', R: 'Richtungswechsel', D: 'plus zwei', W: 'Farbwahl', F: 'plus vier', I: 'plus eins', H: 'plus fünf', B: 'Farbwahl plus zwei', L: 'Flip', E: 'Alle aussetzen', C: 'Zieh bis Farbe', A: 'Alle ablegen', U: 'plus sechs', Z: 'plus zehn', V: 'Richtung plus vier', Q: 'Farbroulette', K: 'Zwei aussetzen', T: 'Gezieltes plus zwei', X: 'Hände tauschen' };
  const drawValues = { D: 2, F: 4, I: 1, H: 5, B: 2, U: 6, Z: 10, V: 4, T: 2 };
  // All glyphs and investigation illustrations are original inline vectors.
  const icon = (body, cls = '') => `<svg class="fc-symbol ${cls}" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const SKIP = icon('<circle cx="20" cy="20" r="13"/><path d="m11 29 18-18"/>');
  const REV = icon('<path d="M8 14h23l-7-7M32 26H9l7 7M8 14l7 7M32 26l-7-7"/>');
  const WHEEL = icon('<path d="M20 4 36 20 20 36 4 20Z"/><path d="M20 4v32M4 20h32"/><path d="M20 8v9H11Z" fill="#ec5e59" stroke="none"/><path d="M23 11h6l4 6H23Z" fill="#ecc94f" stroke="none"/><path d="M23 23h9l-9 9Z" fill="#55b98c" stroke="none"/><path d="M8 23h9v9Z" fill="#598fde" stroke="none"/>');
  const GHOST = icon('<path d="M9 34V17a11 11 0 0 1 22 0v17l-6-4-5 4-5-4Z"/><circle cx="16" cy="17" r="1.3" fill="currentColor"/><circle cx="24" cy="17" r="1.3" fill="currentColor"/><path d="M17 24q3 3 6 0"/>', 'fc-ghost');
  const SIGIL = icon('<circle cx="20" cy="20" r="15"/><path d="m20 6 5 9 10 5-10 5-5 9-5-9-10-5 10-5Z"/><circle cx="20" cy="20" r="4"/>');
  const BIG = {
    S: SKIP, R: REV, W: WHEEL, L: icon('<path d="M20 5a15 15 0 0 0 0 30Z" fill="currentColor"/><path d="M20 5a15 15 0 0 1 0 30ZM20 5v30"/>'),
    E: `<span class="fc-composite">${SKIP}<b>∀</b></span>`,
    C: icon('<circle cx="16" cy="16" r="10"/><path d="m24 24 11 11M16 9v14M9 16h14"/>'),
    A: icon('<rect x="7" y="7" width="17" height="23" rx="2"/><path d="M28 12h5v23H16v-3M10 18h11M17 13l5 5-5 5"/>'),
    V: `<span class="fc-composite">${REV}<b>+4</b></span>`, Q: icon('<circle cx="20" cy="20" r="12"/><path d="M20 8v24M8 20h24M11 11l18 18M11 29l18-18M32 10l3 8-8-2"/>'),
    K: `<span class="fc-composite">${SKIP}<b>×2</b></span>`, T: `<span class="fc-composite">${icon('<circle cx="20" cy="20" r="10"/><path d="M20 4v10M20 26v10M4 20h10M26 20h10"/>')}<b>+2</b></span>`,
    X: icon('<rect x="3" y="7" width="12" height="18" rx="2"/><rect x="25" y="15" width="12" height="18" rx="2"/><path d="M17 12h16l-5-5M23 28H7l5 5"/>'),
  };
  for (const [key, n] of Object.entries(drawValues)) if (!BIG[key]) BIG[key] = `+${n}`;
  const themeName = (variant) => variant === 'halloween-ghosthunt' ? 'ghosthunt' : variant;
  const card = (c, { cls = '', attrs = '', inactive = false } = {}, S = null) => {
    const variant = themeOf(S), theme = themeName(variant), value = c[0], colour = c[1];
    const dark = variant === 'flip' && (inactive ? !S?.g?.side : !!S?.g?.side);
    const symbol = BIG[value] || value, corner = drawValues[value] ? `+${drawValues[value]}` : value === 'W' ? '◇' : value === 'E' ? '∀' : value === 'K' ? '×2' : BIG[value] ? `<span class="fc-corner-symbol">${BIG[value]}</span>` : value;
    const name = CardInteraction.term(LABEL[value] || value);
    const haunted = variant === 'halloween-ghosthunt';
    const illustration = haunted ? value === 'W' ? SIGIL : value === 'F' ? icon('<path d="M10 31V18q0-4 4-2V8q2-4 4 0v11V5q2-4 4 0v14V8q2-4 4 0v14l3-5q4-2 3 3l-5 13H15Z"/>') : value === 'R' ? SIGIL : GHOST : variant === 'all-wild' ? SIGIL : '';
    return `<button type="button" class="kc kc-fc fc-${colour} ${drawValues[value] ? 'fc-attack' : ''} ${cls}" data-uno-theme="${theme}" data-face="${dark ? 'dark' : 'light'}" data-action="${value}" ${attrs} aria-label="${esc(`${colour === 'w' ? '' : CardInteraction.term(COLOR[colour]) + ' '}${name}`)}">
      <span class="fc-card-border" aria-hidden="true"></span>${colorMark(colour)}<span class="cr tl">${corner}</span>
      ${illustration ? `<span class="fc-card-art" aria-hidden="true">${illustration}</span>` : ''}<span class="oval"><span class="v ${value === '6' || value === '9' ? 'ul' : ''}">${symbol}</span></span>
      <span class="fc-card-name" aria-hidden="true">${/^\d$/.test(value) ? haunted ? tx('SPUR', 'CLUE') : variant === 'flip' ? dark ? 'DARK' : 'LIGHT' : 'UNO' : esc(name)}</span><span class="cr br">${corner}</span>
    </button>`;
  };
  const deckBack = (count, S) => {
    const variant = themeOf(S), theme = themeName(variant);
    if (variant === 'flip' && S.g?.drawBack) return `<div class="fc-flip-deck" data-uno-back="flip">${card(S.g.drawBack, { cls: 'big', attrs: 'disabled', inactive: true }, S)}<span class="fc-deck-count">${count}<small>${tx('Karten', 'cards')}</small></span></div>`;
    return `<div class="kc kc-back fc-back" data-uno-back="${theme}" role="img" aria-label="${esc(tx(`Nachziehstapel: ${count} Karten`, `Draw pile: ${count} cards`))}"><span class="fc-back-grid" aria-hidden="true"></span><span class="fc-back-emblem" aria-hidden="true">${variant === 'halloween-ghosthunt' ? GHOST : variant === 'all-wild' ? SIGIL : variant === 'no-mercy' ? icon('<path d="m22 4-12 19h11l-3 13 13-20H20Z"/>') : WHEEL}</span><span class="fc-back-title">${variant === 'halloween-ghosthunt' ? tx('SPUKAKTE', 'CASE FILE') : variant === 'no-mercy' ? 'NO MERCY' : variant === 'all-wild' ? 'ALL WILD' : 'UNO'}</span><span class="fc-deck-count">${count}<small>${tx('Karten', 'cards')}</small></span></div>`;
  };
  let pendingEffect = null, activeEffect = null;
  function observePresentation(S, prev) {
    pendingEffect = null;
    if (!prev || prev.code !== S.code || prev.variant !== S.variant || S.gamePaused || prev.gamePaused) return;
    if (prev.phase !== 'playing' && S.phase === 'playing') pendingEffect = 'start';
    else if (prev.phase === 'playing' && S.phase === 'over') pendingEffect = S.result?.winners?.includes(S.you?.id) ? 'win' : 'end';
    else if (S.phase === 'playing' && S.roundNo === prev.roundNo) {
      if (S.variant === 'flip' && prev.g?.side !== S.g?.side) pendingEffect = 'flip';
      else if (S.variant === 'no-mercy' && S.players.some((p) => p.eliminated && !prev.players.find((q) => q.id === p.id)?.eliminated)) pendingEffect = 'eliminated';
      else if (S.g?.top !== prev.g?.top || S.g?.wish !== prev.g?.wish) pendingEffect = S.variant === 'halloween-ghosthunt' ? 'spectral' : 'card';
    }
  }
  function applyPresentation(S) {
    const root = document.querySelector('.kg-farbenchaos'); if (!root) return;
    root.dataset.unoVariant = themeOf(S); root.dataset.unoSide = S.g?.side ? 'dark' : 'light';
    activeEffect?.cancel(); activeEffect = null;
    const effect = pendingEffect; pendingEffect = null; delete root.dataset.unoEffect;
    if (!effect || prefs.calm || matchMedia('(prefers-reduced-motion: reduce)').matches || S.gamePaused) return;
    const area = root.querySelector(S.phase === 'over' ? '.kg-over-card' : '.kg-piles');
    if (!area?.animate) return;
    root.dataset.unoEffect = effect;
    // Only the newly authorised face is in the DOM. Never retain/animate an old hand.
    const glow = effect === 'flip' ? '' : getComputedStyle(root).getPropertyValue('--fc-glow').trim();
    const frames = effect === 'flip' ? [{ opacity: .4, transform: 'scaleX(.94)' }, { opacity: 1, transform: 'scaleX(1)' }]
      : [{ boxShadow: '0 0 0 1px transparent' }, { boxShadow: `0 0 25px 2px ${glow}` }, { boxShadow: '0 0 0 1px transparent' }];
    const animation = area.animate(frames, { duration: effect === 'flip' ? 380 : 440, easing: 'ease-out' });
    activeEffect = animation;
    animation.finished.catch(() => {}).finally(() => { if (activeEffect === animation) { activeEffect = null; delete root.dataset.unoEffect; } });
  }

  const ADJ = { r: 'rote', y: 'gelbe', g: 'grüne', b: 'blaue', p: 'pinke', t: 'türkise', o: 'orange', v: 'lila' };
  const VALUE_ACC = { S: 'ein Aussetzen', R: 'einen Richtungswechsel', D: 'eine +2', I: 'eine +1', H: 'eine +5', L: 'eine Flip-Karte', E: 'eine „Alle aussetzen“-Karte', A: 'eine „Alle ablegen“-Karte' };
  const VALS = '0123456789' + Object.keys(LABEL).join('');
  const COLORS = 'rygbptovw';
  kitShedding({
    id: 'farbenchaos',
    cardUX: true,
    cardLabel: (c) => `${c[1] === 'w' ? '' : CardInteraction.term(COLOR[c[1]]) + ' '}${CardInteraction.term(LABEL[c[0]] || c[0])}`,
    name: 'UNO',
    ring: false,
    lobby(S) {
      const variant = themeOf(S), theme = THEMES[variant], haunted = variant === 'halloween-ghosthunt';
      const players = S.players.filter((p) => p.seated), ready = players.length >= S.minPlayers;
      const examples = variant === 'all-wild' ? ['Ww','Xw','Tw','Kw'] : variant === 'flip' ? ['7r','Lb','Iy','Ww'] : variant === 'no-mercy' ? ['Zw','Fr','Qw','Ag'] : ['7r','Rb','Dy','Fw'];
      return `<section class="cw-lobby fc-lobby"><div class="cw-lobby-art fc-lobby-art" aria-hidden="true"><div class="fc-lobby-halo"></div>${haunted ? '<div class="fc-manor-silhouette"></div>' : ''}${examples.map((c, i) => `<span style="--fan:${i}">${card(c, { attrs: 'disabled' }, S)}</span>`).join('')}<span class="cw-art-caption">${theme[0]} · ${variantLabel(S)}</span></div>
        <div class="cw-brief"><span class="cw-eyebrow">${haunted ? 'UNO: ' + tx('Spuknacht', 'Ghost Night') : 'UNO · ' + variantLabel(S)}</span><h2>${tx(theme[1], theme[2])}</h2><p class="cw-lead">${variantBrief(S)}</p>
          <div class="cw-facts"><span><b>${S.minPlayers}–${S.maxPlayers}</b>${tx('Spieler', 'Players')}</span><span><b>${variant === 'all-wild' ? tx('Aktion', 'Action') : haunted ? tx('Classic', 'Classic') : variant === 'flip' ? '2' : 'UNO!'}</b>${variant === 'all-wild' ? tx('Jede Karte passt', 'Every card fits') : haunted ? tx('Alle Hausregeln wählbar', 'All house rules available') : variant === 'flip' ? tx('Kartenseiten', 'card sides') : tx('Die letzte Karte zählt', 'Make your last card count')}</span></div>
          <div class="cw-ready"><i class="${ready ? 'ready' : ''}"></i><b>${ready ? tx('Bereit für die nächste Runde', 'Ready for the next round') : tx('Warten auf Mitspieler', 'Waiting for players')}</b><span>${players.length}/${S.maxPlayers}</span></div>
          <ul class="cw-roster">${players.map((p) => `<li><span class="cw-player-initial">${esc(Array.from(p.name)[0] || '?')}</span>${esc(p.name)}${p.id === S.you?.id ? `<small>${tx('du', 'you')}</small>` : ''}</li>`).join('')}</ul>
          <p class="cw-footnote">${S.you?.isHost ? tx('Starte unten, sobald alle bereit sind. Bots und Hausregeln findest du im Host-Menü.', 'Start below when everyone is ready. Bots and house rules are in the host menu.') : tx('Der Host startet. Deine Hand bleibt nur für dich sichtbar.', 'The host will start. Only you can see your hand.')}</p>
        </div><div class="cw-brief-steps"><article><b>01</b><span>${tx('Karte wählen', 'Choose a card')}</span><p>${variant === 'all-wild' ? tx('Jede Karte passt. Ihr Symbol zeigt die Aktion.', 'Every card fits. Its symbol shows the action.') : tx('Farbe, Zahl oder Symbol beachten. Der helle Rand zeigt spielbare Karten.', 'Match the colour, number or symbol. A bright outline marks playable cards.')}</p></article><article><b>02</b><span>${haunted ? tx('Spuren lesen', 'Read the clues') : tx('Aktionen lesen', 'Read the action')}</span><p>${haunted ? tx('Spukangriff und Farbritual sind neue Motive für die bekannten Classic-Aktionen.', 'Haunting and colour rituals are new artwork for the familiar Classic actions.') : tx('Richtung, Ziehstrafe und Farbwahl bleiben auf dem Tisch sichtbar.', 'Direction, draw penalties and colour choices stay visible on the table.')}</p></article><article><b>03</b><span>${tx('Die letzte Karte', 'Your last card')}</span><p>${tx('Die geltenden Ansage- und Erwischen-Regeln stehen unter „?“.', 'Find the current call and catch rules under “?”.')}</p></article></div></section>`;
    },
    tableIntro(S) {
      const g = S.g, variant = themeOf(S), theme = THEMES[variant], haunted = variant === 'halloween-ghosthunt';
      const color = g.top?.[1] === 'w' ? g.wish : g.top?.[1], name = esc(S.players.find((p) => p.id === S.turnId)?.name || '');
      const eliminated = S.players.filter((p) => p.eliminated);
      return `<header class="cw-table-head fc-table-head"><div><span class="cw-eyebrow">${haunted ? 'UNO: ' + tx('Spuknacht', 'Ghost Night') : 'UNO · ' + theme[0]}</span><h2>${tx(theme[1], theme[2])}</h2>${haunted ? `<p class="fc-subtitle">${tx('Halloween Special – Die Geisterjagd beginnt', 'Halloween Special — the ghost hunt begins')}</p>` : ''}</div><span class="cw-turn ${S.turnId === S.you?.id ? 'is-mine' : ''}">${S.phase === 'over' ? tx('Runde beendet', 'Round complete') : S.turnId === S.you?.id ? tx('Du bist am Zug', 'Your turn') : `${name} · ${tx('am Zug', 'on turn')}`}</span></header>
        <div class="fc-state-strip"><span class="fc-current-colour fc-${color || 'w'}">${colorMark(color || 'w')}<b>${variant === 'all-wild' ? tx('Alle Karten passen', 'Every card fits') : color ? CardInteraction.term(COLOR[color]) : tx('Freie Farbwahl', 'Open colour choice')}</b></span><span>${S.dir < 0 ? '↶' : '↷'} ${tx('Spielrichtung', 'Direction')}</span>${variant === 'flip' ? `<span class="fc-side-state">${g.side ? '◐' : '◒'} ${g.side ? tx('Dunkle Seite', 'Dark side') : tx('Helle Seite', 'Light side')}</span>` : ''}${g.pending && variant !== 'no-mercy' ? `<strong>+${g.pending} ${tx('ziehen', 'to draw')}</strong>` : ''}${haunted ? `<span class="fc-investigation-status">${S.phase === 'over' ? tx('Akte geschlossen', 'Case closed') : tx('Ermittlung läuft', 'Investigation active')}</span>` : ''}</div>
        ${variant === 'no-mercy' && g.pending ? `<div class="fc-penalty-meter" role="status"><b>+${g.pending}</b><div><strong>${tx('STRAFKETTE', 'DRAW CHAIN')}</strong><span>${g.lastDraw ? tx(`Letzte Ziehkarte: +${g.lastDraw}`, `Last draw card: +${g.lastDraw}`) : tx('Offene Ziehstrafe', 'Pending draw penalty')}</span></div></div>` : ''}
        ${eliminated.length ? `<div class="fc-eliminated" role="status">${SKIP}<span>${tx('Ausgeschieden', 'Eliminated')}: ${eliminated.map((p) => esc(p.name)).join(', ')}</span></div>` : ''}`;
    },
    resultExtra(S) {
      const haunted = themeOf(S) === 'halloween-ghosthunt', won = S.result.winners.includes(S.you?.id);
      return `<div class="cw-result fc-result"><span class="fc-result-emblem" aria-hidden="true">${haunted ? GHOST : WHEEL}</span><span class="cw-eyebrow">${haunted ? 'UNO: ' + tx('Spuknacht', 'Ghost Night') : 'UNO · ' + variantLabel(S)}</span><h3>${won ? haunted ? tx('Fall gelöst.', 'Case solved.') : tx('Diese Runde gehört dir.', 'This round is yours.') : tx('Runde abgeschlossen.', 'Round complete.')}</h3><p>${tx('Die bestätigte Wertung steht oben. Die nächste Runde startet der Host.', 'The confirmed scores are above. The host starts the next round.')}</p></div>`;
    },
    backCard: deckBack,
    onState: observePresentation,
    afterRender: applyPresentation,

    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Ziel", I18n.html("Werde als Erster alle Karten los: gleiche <b>Farbe</b> oder gleiche <b>Zahl bzw. gleiches Symbol</b>.")],
      ["Bedienung", tx('Karten mit gestricheltem Rand passen. Antippen wählt aus, „Ausspielen“ bestätigt. Bei der Farbwahl wählst du anschließend einen Farbkreis.', 'Cards with a dashed outline fit. Tap to select, then confirm with “Play card”. For wild cards, choose a colour next.')],
      ["Sonderkarten", "Aussetzen, Richtungswechsel, +2, Farbwahl und +4. Der Gewinner kassiert die Punkte der Restkarten. Welche Hausregeln gelten, steht unter „?“."],
    ],
    card,
    // „Leg eine rote Karte oder eine 7“ – was gerade passt
    playHint(g) {
      const color = g.top[1] === 'w' ? g.wish : g.top[1];
      const parts = color ? [I18n.html`eine ${ADJ[color]} Karte`] : [];
      if (g.top[1] !== 'w') parts.push(VALUE_ACC[g.top[0]] || I18n.html`eine ${g.top[0]}`);
      if (g.playable.some((c) => c[1] === 'w')) parts.push('eine schwarze');
      return parts.length ? I18n.html`Leg ${parts.join(' oder ')}` : 'Leg eine beliebige Karte';
    },
    pendingHint: () => 'Leg eine Plus-Karte drauf',
    pendingText: (g) => I18n.html`+${g.pending}: der Nächste zieht ${g.pending}, außer er legt eine Plus-Karte drauf`,
    sort: {
      color: (c) => COLORS.indexOf(c[1]) * 100 + VALS.indexOf(c[0]),
      number: (c) => VALS.indexOf(c[0]) * 10 + COLORS.indexOf(c[1]),
    },
    needsWish: (c, S) => S.variant !== 'all-wild' && c[1] === 'w' && c[0] !== 'Q',
    needsTarget: (c, S) => (S.variant === 'no-mercy' || S.settings.sevenZero) && c[0] === '7' || S.variant === 'all-wild' && ['T', 'X'].includes(c[0]),
    // Farbwahl: vier große Farbkreise (mit Name und Form – nicht nur Farbe)
    wishes: (S) => (S.g.colors || ['r', 'y', 'g', 'b']).map((k) => [k, `<span class="wc-dot">${colorMark(k)}</span><span>${CardInteraction.term(COLOR[k])}</span>`, I18n.html`wish-circle fc-${k}`]),
    seat: (p, S) => p.eliminated ? I18n.html('<span>Ausgeschieden (25 Karten)</span>') : S.g.inactiveHands?.[p.id] ? I18n.html`<div class="uno-backs">${S.g.inactiveHands[p.id].map((c) => card(c, { attrs: 'disabled', cls: 'inactive', inactive: true }, S)).join('')}</div><small>Inaktive Seite · ${p.cards} Karten</small>` : null,
    extraMain(S) {
      const inactive = (c) => card(c, { attrs: 'disabled', inactive: true }, S);
      const shown = (c) => card(c, { attrs: 'disabled' }, S);
      return (S.variant === 'flip' ? I18n.html`<p class="hint">${S.g.side ? 'Dunkle' : 'Helle'} Seite · Gegner zeigen die inaktive Seite</p><div class="uno-backs">${S.players.filter((p) => p.inRound && p.id !== S.you?.id).map((p) => I18n.html`<div><small>${esc(p.name)} · inaktive Seite</small><div>${(S.g.inactiveHands?.[p.id] || []).map(inactive).join('')}</div></div>`).join('')}</div>` : '')
        + (S.g.revealed?.length ? I18n.html`<details><summary>Aufgedeckte Roulette-Karten (${S.g.revealed.length})</summary><div class="uno-backs">${S.g.revealed.map(shown).join('')}</div></details>` : '')
        + (S.g.challengeHand ? I18n.html`<details open><summary>Bei der Anfechtung vorgezeigte Hand</summary><div class="uno-backs">${S.g.challengeHand.map(shown).join('')}</div></details>` : '');
    },
    specialHint: (S, mine) => mine && S.g.colorChoice ? tx('Wähle eine Farbe für die offene Entscheidung', 'Choose a colour for the pending decision') : mine && S.g.challenge ? tx('Ziehstrafe annehmen oder die letzte Plus-Karte anfechten', 'Accept the draw penalty or challenge the last draw card') : S.variant === 'all-wild' && mine ? tx('Jede Karte passt – wähle eine Karte und bestätige die Aktion.', 'Every card fits — select a card and confirm the action.') : null,
    specialDock: (S, mine) => !mine ? null : S.g.colorChoice ? `<div class="kg-wishes">${S.g.colors.map((c) => `<button class="btn wish-circle fc-${c}" data-g="chooseColor" data-color="${c}">${CardInteraction.term(COLOR[c])}</button>`).join('')}</div>` : S.g.challenge ? `<button class="btn" data-g="acceptDraw">${tx('Strafe ziehen','Accept draw penalty')}</button><button class="btn" data-g="challengeDraw">${tx('Anfechten (+2 bei Irrtum)','Challenge (+2 if wrong)')}</button>` : null,
    onClick: (t, S, command = send) => { const g = t.dataset.g; if (g === 'chooseColor') { command('chooseColor', { color: t.dataset.color }); return true; } if (['acceptDraw', 'challengeDraw'].includes(g)) { command('challenge', { challenge: g === 'challengeDraw' }); return true; } return false; },
    // Gewählte Farbe: leuchtender Ring um die Ablage (dazu steht „Gewünscht: Rot“ darunter)
    pileClass: (g) => (g.wish && g.top?.[1] === 'w' ? I18n.html`wish-ring ring-${g.wish}` : ''),
    wishName: (w) => CardInteraction.term(COLOR[w]),
    wishLabel: 'Welche Farbe soll gelten?',
    lastWord: 'UNO!',
    short: [
      I18n.html("Leg gleiche <b>Farbe</b> oder gleiche <b>Zahl bzw. gleiches Symbol</b>."),
      I18n.html("⊘ Aussetzen, ⇄ Richtungswechsel, <b>+2</b>: der Nächste zieht 2 und setzt aus."),
      I18n.html("Farbwahl (vierfarbiger Kreis) passt immer; <b>+4</b>: dazu zieht der Nächste 4 und setzt aus."),
      "Kannst du nicht: eine Karte ziehen – passt sie, darfst du sie gleich legen.",
      "Wer zuerst keine Karten mehr hat, gewinnt die Runde.",
      "Punkte: Der Gewinner kassiert die Restkarten der anderen (Zahl = Wert, Aktion 20, Farbwahl 50).",
    ],
    house: () => ['Kein Ende bei 500 Punkten – gezählt wird über den Abend'],
    rules: I18n.html`<p>Leg eine Karte mit <b>gleicher Farbe oder gleichem Wert/Symbol</b>. Wer zuerst keine Karten mehr hat, gewinnt die Runde.</p>
      <ul>
        <li><b>⊘ Aussetzen</b>: Der Nächste setzt aus.</li>
        <li><b>⇄ Richtungswechsel</b>: Es geht andersherum weiter (zu zweit wie Aussetzen).</li>
        <li><b>+2</b>: Der Nächste zieht 2 und setzt aus.</li>
        <li><b>Farbwahl</b> (vierfarbiger Kreis): passt immer, du bestimmst die Farbe. <b>+4</b>: dazu zieht der Nächste 4 und setzt aus.</li>
        <li>+2 und +4 werden nicht gestapelt (außer mit der Hausregel „stapeln“).</li>
        <li><b>„UNO!“</b>: Mit den Hausregeln tippst du bei der vorletzten Karte selbst auf „UNO!“. Mit <b>Erwischen</b> kostet Vergessen erst etwas, wenn dich jemand meldet, bevor der Nächste spielt – dann ziehst du 2.</li>
        <li>Kannst du nicht, ziehst du eine Karte. Passt sie, darfst du sie gleich spielen, sonst „Weiter“.</li>
      </ul>
      <p><b>Wertung:</b> Der Gewinner bekommt die Punkte aller übrigen Handkarten (Zahl = Wert, Aktionskarte 20, Farbwahl 50). Viel ist gut.</p>`,
  });
}
