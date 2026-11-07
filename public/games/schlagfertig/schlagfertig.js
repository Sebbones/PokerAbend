// Schlagfertig im Browser (Regeln: games/schlagfertig/room.js). Aufgabe beantworten, Duelle ohne Namen entscheiden, im Finale 3 Stimmen verteilen.
// Alle Texte der Mitspieler laufen durch esc() – nie als HTML.
'use strict';
{
  let activeTask = null; // Aufgabe, an der ich gerade schreibe (sonst die erste offene)
  let sel = [];          // Finale: meine gewählten Antworten (Positionen), bis ich abstimme
  let selKey = '';
  const blank = (q) => esc(q).replace('___', I18n.html('<span class="sl-blank" role="img" aria-label="Lücke">&nbsp;</span>')); // Lücke der Aufgabe sichtbar machen
  const myTasks = (S) => S.g.tasks || [];
  const current = (S) => myTasks(S).find((t) => t.idx === activeTask) || myTasks(S).find((t) => t.mine === null) || myTasks(S)[0];
  const voteKey = (S) => `${S.roundNo}:${S.g.q}:${S.g.step}`;
  // Auswahl im Finale zurücksetzen, sobald eine neue Abstimmung beginnt (oder vom Server übernehmen)
  const syncSel = (S) => { const k = voteKey(S); if (k !== selKey) { selKey = k; sel = [...(S.g.myVote || [])]; } };

  const person = (S, id) => `<span class="sl-who">${pkAvatar(S, id)}<b>${esc(pkName(S, id))}</b></span>`;

  const kit = partyGame({
    id: 'schlagfertig',
    name: 'Schlagfertig',
    terms: { unit: 'Runde', write: 'Schreiben', vote: 'Abstimmen', waitWrite: 'schreibt …', waitVote: 'wartet …', step: 'Aufgabe' },
    intro: [
      ['Schreiben', 'Jeder bekommt zwei lustige Aufgaben und schreibt seine Antworten – je witziger, desto besser. Jede Aufgabe bekommen genau zwei Spieler.'],
      ['Abstimmen', 'Pro Aufgabe stehen beide Antworten ohne Namen nebeneinander. Alle außer den beiden Autoren stimmen für die bessere ab.'],
      ['Punkte', 'Jede Stimme gibt 100 Punkte. Gehen alle Stimmen an eine Antwort, gibt es 200 Bonus: Volltreffer! In der letzten Runde antworten alle auf dieselbe Aufgabe und verteilen bis zu 3 Stimmen.'],
    ],
    short: [
      'Jede Runde bekommt jeder zwei Aufgaben, jede Aufgabe gehen an genau zwei Spieler.',
      'Beide Antworten stehen anonym nebeneinander, alle anderen stimmen ab.',
      'Jede Stimme = 100 Punkte. Alle Stimmen für eine Antwort: Volltreffer, +200.',
      'Letzte Runde (Finale): eine Aufgabe für alle, bis zu 3 Stimmen auf verschiedene fremde Antworten.',
    ],
    hint(S) {
      const G = S.g;
      if (G.stage === 'write') {
        if (!G.canWrite) return I18n.t('Du schaust zu – die Spieler schreiben gerade');
        return myTasks(S).every((t) => t.mine !== null) ? I18n.t('Fertig! Warte auf die anderen – oder tipp eine Aufgabe an, um deine Antwort zu ändern') : I18n.t('Schreib deine Antwort – je witziger, desto mehr Stimmen');
      }
      if (G.isAuthor) return I18n.t('Das sind die Antworten von dir und einem Mitspieler – du darfst hier nicht abstimmen');
      if (!G.canVote) return I18n.t('Du schaust zu – die anderen stimmen ab');
      return G.final ? I18n.html`Wähle bis zu ${G.maxPicks} Antworten, die dir gefallen – eigene geht nicht` : I18n.t('Tipp auf die bessere Antwort');
    },
    question(S) {
      const G = S.g;
      if (G.stage === 'write') { const t = current(S); return t ? `<div class="pk-q"><h2>${blank(I18n.content(t.q, t.en))}</h2></div>` : ''; }
      if (G.stage === 'vote') return `<div class="pk-q"><h2>${blank(I18n.content(G.prompt, G.promptEn))}</h2></div>`;
      return '';
    },
    board(S) {
      const G = S.g;
      if (G.stage === 'write') {
        if (!G.canWrite) return I18n.html('<div class="pk-wait"><p>Du schaust zu. Die Aufgaben und Antworten der Spieler siehst du in der Abstimmung.</p></div>');
        const cur = current(S);
        return I18n.html`<div class="sl-tasks" role="group" aria-label="Meine Aufgaben">${myTasks(S).map((t, i) => `<button type="button" class="sl-task" data-g="sl-task" data-idx="${t.idx}" aria-pressed="${t === cur}">
            <small>${G.final ? I18n.t('Deine Aufgabe') : I18n.html`Aufgabe ${i + 1} von ${myTasks(S).length}`}</small>
            <span>${t.mine === null ? I18n.t('noch offen') : `✓ ${esc(t.mine)}`}</span></button>`).join('')}</div>`;
      }
      syncSel(S);
      const picked = new Set(G.final ? sel : G.myVote || []);
      const cards = G.answers.map((a) => {
        const on = picked.has(a.i);
        const can = G.canVote && !a.mine;
        return `<button type="button" class="sl-ans${on ? ' on' : ''}${a.mine ? ' mine' : ''}${a.empty ? ' empty' : ''}" data-g="sl-vote" data-i="${a.i}" aria-pressed="${on}" ${can ? '' : 'disabled'}>
          <span class="sl-text">${esc(a.text)}</span>
          <small>${a.mine ? I18n.t('Deine Antwort') : on ? I18n.t('✓ Deine Stimme') : can ? I18n.t('Tippen zum Wählen') : ''}</small></button>`;
      }).join('');
      const W = WorldKit, t = W.t;
      const chips = [G.final ? W.chip('★', t('Finale – bis zu drei Stimmen', 'Final – up to three votes'), 'warn') : W.chip('⚔', t('Duell – zwei Antworten', 'Duel – two answers')), G.canVote ? W.chip(picked.size ? '✔' : '?', picked.size ? `${picked.size} ${t('Stimme(n) vergeben', 'vote(s) cast')}` : t('Noch keine Stimme', 'No vote yet'), picked.size ? 'good' : 'warn') : W.chip(G.isAuthor ? '🔒' : '👁', G.isAuthor ? t('Du bist Autor – keine Stimme', 'You are an author – no vote') : t('Du schaust zu', 'You are watching'))];
      return I18n.html`<div class="wk-stage sl-stage">${W.head({ eyebrow: t('Comedy-Bühne', 'Comedy stage'), title: G.final ? t('Finale: Wähle deine Favoriten', 'Final: pick your favourites') : t('Wer ist schlagfertiger?', 'Who is wittier?'), chips })}<div class="sl-answers ${G.final ? 'final' : 'duel'}" role="group" aria-label="Antworten">${cards}</div>
        ${G.final && G.canVote ? I18n.html`<p class="pk-mine">${sel.length} von ${G.maxPicks} Stimmen vergeben</p>` : ''}</div>`;
    },
    writeForm(S) {
      const G = S.g;
      const cur = current(S);
      if (!G.canWrite || !cur) return '';
      return pkForm({ kind: 'answer', label: I18n.t('Deine Antwort'), placeholder: I18n.t('Deine Antwort (höchstens 120 Zeichen)'), value: cur.mine || '', max: 120, counter: true, button: cur.mine === null ? I18n.t('Senden') : I18n.t('Ändern'), data: { task: cur.idx } });
    },
    voteDock(S) {
      const G = S.g;
      if (!G.final || !G.canVote) return '';
      syncSel(S);
      return I18n.html`<button type="button" class="btn btn-brass pk-send" data-g="sl-confirm" ${sel.length ? '' : 'disabled'}>Abstimmen (${sel.length}/${G.maxPicks})</button>`;
    },
    dockState(S) {
      const G = S.g || {};
      if (G.stage === 'write') return `${activeTask}|${myTasks(S).map((t) => t.mine).join('¦')}`;
      if (G.stage === 'vote') return `${G.step}|${G.final ? sel.join(',') : ''}|${(G.myVote || []).join(',')}`;
      return '';
    },
    focusKey: (S) => `${current(S)?.idx ?? ''}`,
    submit(kind, text, form) {
      const task = Number(form.dataset.task);
      return send('answer', { task, text }).then((r) => { if (r?.ok) activeTask = null; return r; });
    },
    reveal(S) {
      const G = S.g;
      const rows = (G.results || []).map((res) => {
        const answers = [...res.answers].sort((a, b) => b.votes - a.votes);
        return `<section class="sl-result"><h3>${blank(I18n.content(res.q, res.en))}</h3><div class="sl-pair ${G.final ? 'final' : ''}">${answers.map((a) => I18n.html`<article class="sl-card${a.fullHit ? ' hit' : ''}">
            <p class="sl-text">${a.text ? esc(a.text) : I18n.html('<i>(keine Antwort)</i>')}</p>
            ${person(S, a.id)}
            <p class="sl-votes"><b>${a.votes} Stimme${a.votes === 1 ? '' : 'n'}</b>${a.voters.length ? I18n.html`<span class="sl-voters" aria-label="Stimmen von">${a.voters.map((v) => `<span title="${esc(pkName(S, v))}">${avatarHTML(pkPlayer(S, v))}</span>`).join('')}</span>` : ''}</p>
            <p class="sl-pts">+${a.pts}${a.fullHit ? I18n.html(' <span class="sl-badge">Volltreffer! +200</span>') : ''}</p></article>`).join('')}</div></section>`;
      }).join('');
      const gains = Object.entries(G.gains || {}).sort((a, b) => b[1] - a[1]);
      return `${rows || I18n.html('<p class="hint">Diese Runde hat niemand etwas geschrieben.</p>')}
        ${gains.length ? I18n.html`<section class="sl-gains"><h3>Punkte dieser Runde</h3><ol>${gains.map(([id, n]) => `<li>${pkAvatar(S, id)}<b>${esc(pkName(S, id))}</b><span class="pk-pts">+${n}</span></li>`).join('')}</ol></section>` : ''}`;
    },
    onClick(el, S) {
      const g = el.dataset.g;
      if (g === 'sl-task') { activeTask = Number(el.dataset.idx); kit.render(); }
      else if (g === 'sl-vote') {
        const i = Number(el.dataset.i);
        if (!S.g.final) { send('vote', { choice: i }); return; }
        syncSel(S);
        sel = sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < S.g.maxPicks ? [...sel, i] : sel;
        kit.render();
      } else if (g === 'sl-confirm') { syncSel(S); send('vote', { choice: sel }).then((r) => { if (r?.ok) toast(I18n.t('Stimmen abgegeben')); }); }
    },
    custom: {
      title: 'Eigene Aufgaben für diesen Abend', noun: 'Aufgabe', plural: 'Aufgaben',
      help: I18n.html('Eine Aufgabe pro Zeile, mindestens 8 Zeichen. <b>___</b> markiert die Lücke (optional). Bis zu 100 Aufgaben.'),
      example: 'Der beste Name für unser Sofa: ___',
    },
    rules: I18n.html`<p>Eine Partie besteht aus mehreren Runden; die letzte ist das Finale. In jeder normalen Runde bekommt jeder zwei Aufgaben, und jede Aufgabe geht an genau zwei Spieler.</p>
      <ul>
        <li><b>Schreiben:</b> Jeder beantwortet seine Aufgaben. Die Antworten der anderen siehst du erst in der Abstimmung.</li>
        <li><b>Abstimmen:</b> Pro Aufgabe stehen beide Antworten ohne Namen nebeneinander. Alle außer den beiden Autoren stimmen für eine ab. Du kannst deine Wahl ändern, bis alle fertig sind.</li>
        <li><b>Punkte:</b> Jede Stimme gibt 100 Punkte. Gehen alle Stimmen (mindestens zwei) an eine Antwort, gibt es den <b>Volltreffer</b>-Bonus von 200.</li>
        <li><b>Finale:</b> Eine Aufgabe für alle. Jeder verteilt bis zu 3 Stimmen auf verschiedene Antworten (nicht auf die eigene), 100 Punkte je Stimme, kein Bonus.</li>
        <li><b>Auflösung:</b> Danach werden die Namen aufgedeckt und die Punkte verteilt.</li>
        <li>Wer nichts schreibt, steht als „(keine Antwort)“ da. Wer offline ist, hält niemanden auf.</li>
        <li><b>Anstupsen (Hausregel, Standard an):</b> Wer fertig ist, kann Trödler antippen, 15 Sekunden vor Schluss stupst das Spiel selbst an.</li>
        <li>Zuschauer dürfen auf Wunsch des Hosts mit abstimmen; ihre Stimmen zählen für die Autoren. Der Host kann eigene Aufgaben ergänzen.</li>
      </ul>`,
  });
}
