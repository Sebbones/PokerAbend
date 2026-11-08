// Werwolf im Browser (Regeln: games/werwolf/room.js). Jeder sieht nur seine eigene Rolle; Tote sehen alles. Besprechen tut ihr euch am Tisch (Voice).
'use strict';
{
  const ROLE = {
    dorf: ['Dorfbewohner', 'Du hast keine besonderen Fähigkeiten. Finde mit den anderen die Werwölfe und stimm am Tag ab.'],
    wolf: ['Werwolf', 'Ihr wählt nachts gemeinsam ein Opfer. Tagsüber tarnt ihr euch als Dorfbewohner.'],
    seher: ['Seherin', 'Jede Nacht darfst du die Rolle eines Spielers ansehen.'],
    hexe: ['Hexe', 'Du hast einen Heiltrank und einen Gifttrank, jeden nur einmal. Du erfährst nachts das Opfer der Werwölfe.'],
    amor: ['Amor', 'In der ersten Nacht verliebst du zwei Spieler – stirbt einer, stirbt auch der andere.'],
    jaeger: ['Jäger', 'Wenn du stirbst, darfst du sofort einen Spieler mit in den Tod nehmen.'],
  };
  let pick = []; // gewählte Ziele (Amor: zwei)
  let witchTarget = false;
  const pl = (S, id) => S.players.find((p) => p.id === id);
  const nm = (S, id) => esc(pl(S, id)?.name ?? '?');
  const role = (r) => (ROLE[r] ? I18n.t(ROLE[r][0]) : '?');

  const targets = (S, ids, act, { skip = null } = {}) => I18n.html`<div class="ww-targets" role="group" aria-label="Spieler wählen">${ids.map((id) => `<button type="button" class="ww-target ${pick.includes(id) ? 'sel' : ''}" data-g="${act}" data-id="${esc(id)}"><span class="ww-av" aria-hidden="true">${avatarHTML(pl(S, id))}</span>${nm(S, id)}</button>`).join('')}${skip ? `<button type="button" class="ww-target skip" data-g="${skip[0]}">${esc(skip[1])}</button>` : ''}</div>`;

  const kit = kitGame({
    id: 'werwolf',
    name: 'Werwolf',
    direction: false,
    intro: [
      ['Deine Rolle', 'Du bekommst eine geheime Rolle. Sieh sie dir an und sag sie niemandem – außer, du bist Werwolf oder verliebt.'],
      ['Nacht', 'In der Nacht handeln die Rollen heimlich: Werwölfe wählen ein Opfer, Seherin und Hexe nutzen ihre Fähigkeiten.'],
      ['Tag', 'Am Tag besprecht ihr euch am Tisch (per Voice) und stimmt ab, wer hingerichtet wird. Das Dorf gewinnt, wenn alle Werwölfe tot sind.'],
    ],
    short: [
      'Dorf gegen Werwölfe: Jeder hat eine geheime Rolle, der Server ist Spielleiter.',
      'Nacht: Werwölfe wählen ein Opfer, die Seherin schaut eine Rolle an, die Hexe heilt oder vergiftet, Amor verliebt zwei (erste Nacht).',
      'Tag: Das Dorf diskutiert am Tisch und stimmt ab; wer die meisten Stimmen hat, wird hingerichtet. Der Jäger nimmt jemanden mit.',
      'Das Dorf gewinnt, wenn alle Werwölfe tot sind; die Werwölfe, wenn sie mindestens so viele sind wie alle anderen.',
    ],
    house: (S) => [S.settings.revealRole ? 'Rolle wird beim Tod aufgedeckt' : 'Rolle bleibt beim Tod geheim'],
    playerInfo(p, S) {
      if (S.phase !== 'playing') return '';
      return p.dead ? I18n.html`tot${p.deadRole ? ` · ${role(p.deadRole)}` : ''}` : (p.voted ? 'hat abgestimmt' : 'lebt');
    },
    seat: (p) => `<span>${p.dead ? I18n.html`tot${p.deadRole ? ` · ${role(p.deadRole)}` : ''}` : 'lebt'}</span>`,
    sounds(S, prev) { return S.g?.stage !== prev.g?.stage && S.g?.stage === 'day' ? 'draw' : null; },
    onState(S, prev) { if (S.g?.stage !== prev?.g?.stage || S.g?.todo?.type !== prev?.g?.todo?.type) { pick = []; witchTarget = false; } },
    status(S) {
      const g = S.g;
      if (S.phase !== 'playing' || !g) return null;
      return { night: I18n.html`Nacht ${g.day}`, day: I18n.html`Tag ${g.day}`, vote: I18n.html`Abstimmung (Tag ${g.day})`, hunter: 'Der Jäger schießt' }[g.stage] || null;
    },
    hint(S) {
      const g = S.g;
      if (!g || S.phase !== 'playing') return '';
      if (g.dead) return 'Du bist tot – du siehst alles, aber verrate nichts';
      if (!S.you?.inRound) return I18n.t('Du schaust zu');
      const t = g.todo;
      if (t) return I18n.t({ amor: 'Wähl zwei Spieler, die sich verlieben', wolf: 'Wählt ein Opfer', seer: 'Wen willst du ansehen?', witch: 'Willst du etwas tun?', vote: 'Wer soll hingerichtet werden?', shoot: 'Wen nimmst du mit?' }[t.type]);
      return I18n.t({ night: I18n.t('Es ist Nacht – du schläfst'), day: 'Besprecht euch am Tisch', vote: 'Du hast abgestimmt', hunter: 'Der Jäger schießt gerade' }[g.stage] || '');
    },
    main(S) {
      const g = S.g;
      if (!g || !g.stage || g.stage === 'over') return I18n.html('<div class="kg-table ww-wrap"><p class="hint">Die Partie ist zu Ende.</p></div>');
      const me = g.role ? `<div class="ww-role ${g.role}" role="status"><small>${I18n.t(g.dead ? 'Du warst' : 'Deine Rolle')}</small><b>${role(g.role)}</b><span>${esc(I18n.t(ROLE[g.role][1]))}</span>
        ${g.wolves && g.role === 'wolf' ? I18n.html`<span class="ww-pack">Das Rudel: ${g.wolves.map((id) => nm(S, id)).join(', ')}</span>` : ''}
        ${g.lovers ? I18n.html`<span class="ww-pack">❤ Verliebt: ${g.lovers.map((id) => nm(S, id)).join(' und ')}</span>` : ''}
        ${g.potions && g.role === 'hexe' ? I18n.html`<span class="ww-pack">Heiltrank: ${g.potions.heal ? 'da' : 'verbraucht'} · Gifttrank: ${g.potions.poison ? 'da' : 'verbraucht'}</span>` : ''}</div>` : '';
      const stageBox = {
        night: I18n.html('<div class="ww-stage night"><b>🌙 Nacht</b><span>Das Dorf schläft. Wer eine Aufgabe hat, sieht sie unten.</span></div>'),
        day: I18n.html`<div class="ww-stage day"><b>☀ Tag ${g.day}</b><span>Besprecht euch am Tisch. Danach wird abgestimmt.</span>${g.deadline ? '<span class="ww-timer" data-dl="' + g.deadline + '"></span>' : ''}</div>`,
        vote: I18n.html`<div class="ww-stage vote"><b>🗳 Abstimmung</b><span>${g.voted} von ${g.voters} haben abgestimmt</span>${g.deadline ? '<span class="ww-timer" data-dl="' + g.deadline + '"></span>' : ''}</div>`,
        hunter: I18n.html('<div class="ww-stage hunter"><b>🏹 Der Jäger schießt</b></div>'),
      }[g.stage] || '';
      const lv = g.lastVote && g.stage === 'night' || g.lastVote && g.stage === 'day' || g.lastVote && g.stage === 'hunter'
        ? I18n.html`<details class="ww-last"><summary>Letzte Abstimmung (Tag ${g.lastVote.day}): ${g.lastVote.executed ? I18n.html`${nm(S, g.lastVote.executed)} hingerichtet` : 'niemand'}</summary><ul>${Object.entries(g.lastVote.votes).map(([a, b]) => `<li>${nm(S, a)} → ${b ? nm(S, b) : 'Enthaltung'}</li>`).join('')}</ul></details>` : '';
      const deaths = g.deaths.length ? I18n.html`<div class="ww-deaths"><small>Gestorben:</small> ${g.deaths.map((d) => `<i>${nm(S, d.id)}${d.role ? ` (${role(d.role)})` : ''}${d.cause === 'weg' ? ' · weg' : ''}</i>`).join('')}</div>` : '';
      const secret = g.roles ? I18n.html`<details class="ww-secret" open><summary>Alle Rollen (nur Tote sehen das)</summary><ul>${S.players.filter((p) => g.roles[p.id]).map((p) => `<li class="${g.alive.includes(p.id) ? '' : 'dead'}"><b>${esc(p.name)}</b> ${role(g.roles[p.id])}</li>`).join('')}</ul>
        ${g.nightLog ? `<ol class="ww-nlog">${g.nightLog.slice(-14).map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}</details>` : '';
      const seen = g.seen && g.seen.length ? I18n.html`<div class="ww-seen"><small>Deine Visionen:</small> ${g.seen.map((x) => `<i>${nm(S, x.id)}: ${role(x.role)}</i>`).join('')}</div>` : '';
      const alive = I18n.html`<div class="ww-alive" aria-label="Lebende Spieler"><small>Am Leben (${g.alive.length}):</small> ${g.alive.map((id) => `<i>${nm(S, id)}</i>`).join('')}</div>`;
      const W = WorldKit, t = W.t;
      const chips = [W.chip(g.stage === 'night' ? '🌙' : g.stage === 'day' ? '☀' : g.stage === 'vote' ? '🗳' : '🏹', { night: t('Nacht', 'Night'), day: `${t('Tag', 'Day')} ${g.day}`, vote: t('Abstimmung', 'Vote'), hunter: t('Der Jäger schießt', 'The hunter fires') }[g.stage] || '', g.stage === 'night' ? '' : 'warn'), W.chip('♥', `${g.alive.length} ${t('am Leben', 'alive')}`), g.role ? W.chip('🔒', t('Deine Rolle ist privat', 'Your role is private'), 'good') : ''].filter(Boolean);
      return `<div class="kg-table ww-wrap wk-stage ww-village">${W.head({ eyebrow: t('Dorfplatz', 'Village square'), title: g.stage === 'night' ? t('Das Dorf schläft', 'The village sleeps') : t('Das Dorf berät sich', 'The village deliberates'), chips })}${me}${stageBox}${seen}${alive}${deaths}${lv}${secret}</div>`;
    },
    dock(S, myTurn, ui) {
      const g = S.g;
      const t = g?.todo;
      const host = S.you?.isHost && S.phase === 'playing' && g.stage === 'day' ? I18n.html('<button class="btn btn-ghost" data-g="ww-skip">Zur Abstimmung</button>') : '';
      if (!t) return host ? `<div class="kg-acts">${host}</div>` : '';
      if (t.type === 'amor') return I18n.html`${targets(S, t.targets, 'ww-pick')}<div class="kg-acts"><button class="btn btn-brass" data-g="ww-amor" ${pick.length === 2 ? '' : 'disabled'}>Verlieben (${pick.length}/2)</button></div>`;
      if (t.type === 'wolf') return t.voted ? I18n.html('<div class="kg-acts"><span class="waiting">Du hast gewählt – die anderen Werwölfe überlegen noch</span></div>')
        : `${t.votes && Object.keys(t.votes).length ? I18n.html`<p class="hint">Bisher: ${Object.entries(t.votes).map(([w, v]) => `${nm(S, w)} → ${v ? nm(S, v) : '–'}`).join(', ')}</p>` : ''}${targets(S, t.targets, 'ww-wolf')}`;
      if (t.type === 'seer') return targets(S, t.targets, 'ww-seer');
      if (t.type === 'witch') return witchTarget ? I18n.html`${targets(S, t.targets, 'ww-poison')}<div class="kg-acts"><button class="btn btn-ghost" data-g="ww-back">Zurück</button></div>`
        : I18n.html`<div class="kg-acts"><span>${t.victim ? I18n.html`Die Werwölfe haben <b>${nm(S, t.victim)}</b> gewählt.` : 'Heute Nacht gibt es kein Opfer.'}</span>
          <button class="btn btn-brass" data-g="ww-heal" ${t.heal ? '' : 'disabled'}>Heilen</button>
          <button class="btn btn-outline-red" data-g="ww-poisonmode" ${t.poison ? '' : 'disabled'}>Vergiften …</button>
          <button class="btn" data-g="ww-none">Nichts tun</button></div>`;
      if (t.type === 'vote') return t.done ? I18n.html`<div class="kg-acts"><span class="waiting">Du hast ${t.mine ? I18n.html`für ${nm(S, t.mine)} ` : 'dich enthalten und '}abgestimmt – du kannst bis zum Ende noch ändern.</span></div>${targets(S, t.targets, 'ww-vote', { skip: ['ww-abstain', 'Enthalten'] })}${host}`
        : `${targets(S, t.targets, 'ww-vote', { skip: ['ww-abstain', 'Enthalten'] })}${host}`;
      if (t.type === 'shoot') return targets(S, t.targets, 'ww-shoot');
      return '';
    },
    dockKey: (S) => `${S.phase}|${S.roundNo}|${S.you?.playing}|${S.you?.inRound}|${S.players.filter((p) => p.seated).length}|${S.g?.stage}|${S.g?.todo?.type}|${S.g?.todo?.voted ?? ''}|${S.g?.todo?.done ?? ''}|${pick.join(',')}|${witchTarget}|${S.you?.isHost}|${S.g?.todo?.mine ?? ''}`,
    onClick(el, S) {
      const g = el.dataset.g, id = el.dataset.id;
      if (g === 'ww-pick') { pick = pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id].slice(-2); kit.render(); }
      else if (g === 'ww-amor') send('amor', { a: pick[0], b: pick[1] });
      else if (g === 'ww-wolf') send('wolfVote', { target: id });
      else if (g === 'ww-seer') send('seer', { target: id });
      else if (g === 'ww-heal') send('witch', { action: 'heal' });
      else if (g === 'ww-none') send('witch', { action: 'none' });
      else if (g === 'ww-poisonmode') { witchTarget = true; kit.render(); }
      else if (g === 'ww-back') { witchTarget = false; kit.render(); }
      else if (g === 'ww-poison') { send('witch', { action: 'poison', target: id }); witchTarget = false; }
      else if (g === 'ww-vote') send('vote', { target: id });
      else if (g === 'ww-abstain') send('vote', { target: null });
      else if (g === 'ww-shoot') send('shoot', { target: id });
      else if (g === 'ww-skip') send('next');
      void S;
    },
    rules: I18n.html`<p>Ein Dorf, in dem sich Werwölfe verstecken. Der Server ist Spielleiter und teilt jedem nur seine eigene Rolle mit. Besprecht euch am Tisch, am besten per Voice.</p>
      <ul>
        <li><b>Nacht:</b> Amor verliebt in der ersten Nacht zwei Spieler. Die <b>Werwölfe</b> wählen ein Opfer. Die <b>Seherin</b> sieht eine Rolle. Die <b>Hexe</b> erfährt das Opfer und darf es heilen oder jemanden vergiften (jeden Trank nur einmal).</li>
        <li><b>Tag:</b> Alle erfahren, wer gestorben ist, und diskutieren. Danach stimmt das Dorf ab; wer die meisten Stimmen hat, wird <b>hingerichtet</b> (bei Gleichstand niemand).</li>
        <li>Stirbt der <b>Jäger</b>, nimmt er sofort jemanden mit. Stirbt einer der <b>Verliebten</b>, stirbt auch der andere.</li>
        <li>Das <b>Dorf</b> gewinnt, wenn alle Werwölfe tot sind. Die <b>Werwölfe</b> gewinnen, wenn sie mindestens so viele sind wie alle anderen. Leben nur noch die beiden Verliebten aus verschiedenen Lagern, gewinnen sie.</li>
        <li>Tote sehen alle Rollen und das Nachtgeschehen, dürfen aber nichts verraten. Der Host stellt Rollen, Zeiten und „Rolle bei Tod aufdecken“ im Host-Menü ein.</li>
      </ul>`,
  });
  // Restzeit herunterzählen
  setInterval(() => {
    document.querySelectorAll('[data-dl]').forEach((el) => { const s = Math.max(0, Math.ceil((Number(el.dataset.dl) - gameNow(kit.S)) / 1000)); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; });
  }, 500);
}
