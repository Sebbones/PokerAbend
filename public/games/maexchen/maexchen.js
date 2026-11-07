// Mäxchen im Browser (Regeln: games/maexchen/room.js). Der eigene Wurf ist nur für einen selbst sichtbar.
// Würfel liegen unter einem Becher; „Anheben“ zeigt den Wurf nur dir. Beim Anzweifeln hebt sich der Becher für alle.
'use strict';
{
  const MAEXCHEN = 21;
  const vName = (v) => (v === MAEXCHEN ? 'Mäxchen' : v % 11 === 0 ? I18n.html`Pasch ${v / 11}` : String(v));
  const digits = (v) => (v === MAEXCHEN ? [2, 1] : [Math.floor(v / 10), v % 10]);
  const valueOf = ([a, b]) => { const hi = Math.max(a, b), lo = Math.min(a, b); return hi === 2 && lo === 1 ? MAEXCHEN : hi * 10 + lo; };
  const special = (v) => (v === MAEXCHEN ? 'mx-max' : v % 11 === 0 ? 'mx-pasch' : '');
  let lifted = false;   // eigener Becher angehoben (nur bei dir)
  let blindMode = false; // „Ungesehen weitergeben“: Ansage-Knöpfe geben ungesehen weiter
  let revealKey = '';   // welches Aufdecken schon gezeigt wurde (Animation nur einmal)

  // Becher (selbst gezeichnet): Lederbecher mit Rand und Naht
  const CUP = `<svg class="mx-cup-svg" viewBox="0 0 120 110" aria-hidden="true">
    <path d="M16 12h88l-10 88H26z" fill="#7A4A2A"/><path d="M16 12h88l-2 14H18z" fill="#5E3820"/>
    <path d="M24 40h72M22 64h76" stroke="#94603A" stroke-width="2" stroke-dasharray="5 4"/>
    <ellipse cx="60" cy="100" rx="34" ry="6" fill="#4A2C18"/></svg>`;
  // Bühne: Würfel auf dem Filz, Becher darüber – angehoben oder zu
  const stage = ({ dice = null, open = false, cls = '', label = '' }) => `<div class="mx-stage ${open ? 'open' : ''} ${cls}" role="img" aria-label="${esc(label)}">
      <div class="mx-felt"></div>
      <div class="mx-dice">${(dice || [0, 0]).map((d) => dieHTML(d, { cls: I18n.html`big ${dice ? '' : 'hidden'}` })).join('')}</div>
      <div class="mx-cup">${CUP}</div>
    </div>`;

  const kit = kitGame({
    id: 'maexchen',
    look: (S) => [{ title: 'Ansagen in dieser Runde', note: 'Nur das, was gesagt wurde – die echten Würfel bleiben unter dem Becher.',
      html: lookMoves(S.moves, { filter: (m) => /^(sagt|ungesehen|zweifelt|lässt)/.test(m.t), n: 20 }) }],
    name: 'Mäxchen',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Würfeln", "Du würfelst verdeckt. Tipp auf den Becher – nur du siehst den Wurf."],
      ["Ansagen", I18n.html("Tipp einen Wert an, der höher ist als die letzte Ansage – ehrlich oder geblufft. <b>Mäxchen</b> (2 und 1) ist das Höchste.")],
      ["Glauben oder zweifeln", "Der Nächste glaubt (und würfelt selbst) oder zweifelt an. Wer beim Aufdecken falsch liegt, verliert ein Leben."],
    ],
    short: [
      "Würfle verdeckt mit zwei Würfeln – nur du siehst den Wurf.",
      I18n.html("Die höhere Zahl steht vorne: 5 und 3 = 53. Pasch schlägt jede Zahl, <b>Mäxchen</b> (2 und 1) schlägt alles."),
      "Sag einen Wert an, der höher ist als der letzte – ehrlich oder geblufft.",
      "Der Nächste glaubt (und würfelt selbst) oder zweifelt an.",
      "Aufgedeckt: gelogen → der Ansager verliert ein Leben, sonst der Zweifler.",
      "Ohne Leben ist man raus, der Letzte gewinnt.",
    ],
    house: () => ['Auf Mäxchen: anzweifeln oder gelten lassen (kostet 1 Leben)'],
    playerInfo: (p, S) => (p.out || (S.phase !== 'lobby' && !p.inRound && p.seated && !p.lives) ? 'raus' : I18n.html`<span class="lives" aria-hidden="true">${'♥'.repeat(p.lives || 0)}</span><span class="sr-only">${p.lives} Leben</span>`),
    onState(S, prev) {
      if (!S.g?.cup) lifted = false;
      if (S.turnId !== S.you?.id || S.g?.cup || !S.g?.last) blindMode = false;
      if (prev?.turnId !== S.turnId) lifted = false;
    },
    hint(S, myTurn) {
      const g = S.g;
      const name = (id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
      if (!myTurn) return g.last ? I18n.html`${name(S.turnId)} ist dran: glauben oder anzweifeln?` : I18n.html`${name(S.turnId)} ist dran`;
      if (g.cup) return g.last ? I18n.html`Sag mehr als ${vName(g.last.value)} an – ehrlich oder geblufft` : 'Sag deinen Wurf an – ehrlich oder geblufft';
      if (blindMode) return I18n.html`Ungesehen weitergeben: sag mehr als ${vName(g.last.value)} an`;
      if (g.last?.value === MAEXCHEN) return I18n.html`${name(g.last.by)} sagt Mäxchen! Anzweifeln oder gelten lassen`;
      if (g.last) return I18n.html`${name(g.last.by)} sagt ${vName(g.last.value)} – glauben und würfeln oder anzweifeln`;
      return 'Würfle und sag an';
    },
    main(S) {
      const g = S.g;
      const name = (id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
      let center = '';
      if (g.reveal) {
        // Aufdecken: Becher hebt sich für alle, dann groß „Gelogen!“ oder „Stimmt!“
        const r = g.reveal;
        const lied = r.loser === r.by;
        const key = `${S.roundNo}:${r.by}:${r.value}:${r.actual}:${r.loser}`;
        const fresh = key !== revealKey;
        revealKey = key;
        center = I18n.html`<div class="mx-reveal ${fresh ? 'fresh' : ''}">
          ${stage({ dice: digits(r.actual), open: true, cls: fresh ? 'lifting' : '', label: I18n.html`Aufgedeckt: ${vName(r.actual)}` })}
          <b class="mx-verdict ${lied ? 'lie' : 'true'}" role="status">${lied ? '✗ Gelogen!' : '✓ Stimmt!'}</b>
          <p>Angesagt: <b>${vName(r.value)}</b> · unter dem Becher: <b>${vName(r.actual)}</b><br><b>${name(r.loser)}</b> verliert ${r.value === MAEXCHEN && S.settings.maexchenDouble ? 'zwei Leben' : 'ein Leben'}.</p>
        </div>`;
      } else if (g.cup) {
        // Eigener Wurf: Becher zu, „Anheben“ zeigt ihn nur dir
        const v = valueOf(g.cup);
        center = `<div class="mx-mine">
          <button type="button" class="mx-lift" data-g="lift" aria-pressed="${lifted}" aria-label="${lifted ? 'Becher wieder zu' : 'Becher anheben – nur du siehst den Wurf'}">
            ${stage({ dice: g.cup, open: lifted, label: lifted ? I18n.html`Dein Wurf: ${vName(v)}` : 'Becher zu' })}</button>
          <small>${lifted ? I18n.html`Dein Wurf: <b class="mx-val">${vName(v)}</b> – nur du siehst ihn` : 'Tipp auf den Becher: Anheben zeigt den Wurf nur dir'}</small>
        </div>`;
      } else if (g.last) {
        center = I18n.html`<div class="mx-said"><small>${name(g.last.by)} sagt</small><b class="${special(g.last.value)}">${vName(g.last.value)}</b>
          ${stage({ label: 'Becher zu' })}<small>Becher zu – glaubst du es?</small></div>`;
      } else center = I18n.html`<div class="mx-said"><small>Neue Runde</small><b>Würfeln und ansagen</b>${stage({ open: true, label: 'Leerer Becher' })}</div>`;
      // Rangliste der Würfe zum Aufklappen, stärkster oben
      const last = g.last?.value;
      const ranks = I18n.html`<details class="mx-ranks"><summary>Rangliste der Würfe</summary>
        <ol>${[...g.values].reverse().map((v) => `<li class="${special(v)} ${v === last ? 'now' : ''}">${vName(v)}${v === MAEXCHEN ? I18n.html(' <small>(2 und 1)</small>') : ''}${v === last ? I18n.html(' <small>← zuletzt angesagt</small>') : ''}</li>`).join('')}</ol></details>`;
      const W = WorldKit, t = W.t, mineTurn = S.turnId === S.you?.id;
      const chips = [g.last ? W.chip('⬆', `${t('Angesagt', 'Announced')}: ${vName(g.last.value)}`, g.last.value === MAEXCHEN ? 'warn' : '') : W.chip('…', t('Noch nichts angesagt', 'Nothing announced yet')), g.cup ? W.chip('🔒', t('Dein Wurf ist privat', 'Your roll is private'), 'good') : W.chip('🥃', t('Becher zu', 'Cup closed')), g.reveal ? W.chip('👁', t('Aufgedeckt', 'Revealed'), g.reveal.loser === g.reveal.by ? 'bad' : 'good') : ''].filter(Boolean);
      return `<div class="kg-table wk-stage mx-table">${W.head({ eyebrow: t('Kneipentisch', 'Pub table'), title: mineTurn ? t('Du bist dran', 'Your turn') : t('Becher am Tisch', 'The cup on the table'), chips })}<div class="mx-zone mx-public" aria-label="${t('Öffentlich', 'Public')}">${center}</div>${ranks}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      if (!myTurn) return '';
      // Ansage: große Knöpfe, nur Werte über der letzten Ansage; Päsche und Mäxchen hervorgehoben
      const buttons = (action) => {
        const from = g.last ? g.values.indexOf(g.last.value) + 1 : 0;
        const real = g.cup ? valueOf(g.cup) : null;
        return I18n.html`<div class="mx-say" role="group" aria-label="Ansage">${g.values.slice(from).map((v) => `<button class="btn mx-v ${special(v)} ${v === real && lifted ? 'real' : ''}" data-g="${action}" data-v="${v}" ${v === real && lifted ? 'title="Das ist dein Wurf"' : ''}>${vName(v)}${v === real && lifted ? ' ✓' : ''}</button>`).join('')}</div>`;
      };
      if (g.cup) return buttons('announce');
      if (blindMode) return I18n.html`${buttons('blind')}<div class="kg-acts"><button class="btn btn-ghost" data-g="noblind">Doch nicht</button></div>`;
      if (g.last?.value === MAEXCHEN) return I18n.html('<button class="btn btn-outline-red" data-g="doubt">Anzweifeln</button><button class="btn" data-g="accept">Gelten lassen (1 Leben)</button>');
      if (g.last) {
        const blind = S.settings.blindPass ? I18n.html('<button class="btn" data-g="blindmode">Ungesehen weitergeben …</button>') : '';
        return I18n.html`<button class="btn btn-outline-red" data-g="doubt">Anzweifeln</button><button class="btn btn-brass" data-g="roll">Glauben und würfeln</button>${blind}`;
      }
      return I18n.html('<button class="btn btn-brass" data-g="roll">Würfeln</button>');
    },
    onClick(t) {
      const g = t.dataset.g;
      if (g === 'roll') send('roll');
      else if (g === 'lift') { lifted = !lifted; kit.render(); }
      else if (g === 'announce') send('announce', { value: Number(t.dataset.v) });
      else if (g === 'doubt') send('doubt');
      else if (g === 'accept') send('accept');
      else if (g === 'blindmode') { blindMode = true; kit.render(); }
      else if (g === 'noblind') { blindMode = false; kit.render(); }
      else if (g === 'blind') send('blind', { value: Number(t.dataset.v) });
    },
    rules: I18n.html`<p>Zwei Würfel unter dem Becher. Die höhere Zahl steht vorne: 5 und 3 = <b>53</b>.</p>
      <p><b>Reihenfolge:</b> 31 &lt; 32 &lt; 41 &lt; … &lt; 65 &lt; Pasch 1 &lt; … &lt; Pasch 6 &lt; <b>Mäxchen</b> (2 und 1). Die ganze Liste steht am Tisch unter „Rangliste der Würfe“.</p>
      <ul>
        <li>Du würfelst verdeckt und sagst einen Wert an, der <b>höher</b> sein muss als die letzte Ansage – ehrlich oder geblufft.</li>
        <li>Der Nächste glaubt dir (und würfelt selbst) oder <b>zweifelt an</b>. Dann wird aufgedeckt: Gelogen → du verlierst ein Leben, sonst der Zweifler.</li>
        <li>Bei Mäxchen geht es um zwei Leben (Hausregel). Auf Mäxchen kann man nur anzweifeln oder es gelten lassen (ein Leben, ohne Aufdecken).</li>
        <li>Wer verliert, fängt neu an. Ohne Leben ist man raus – der Letzte gewinnt.</li>
      </ul>`,
  });
}
