// Wer hat das gesagt? im Browser (Regeln: games/werhatdasgesagt/room.js). Anonym antworten, dann pro Antwort den Autor aus der Spielerliste tippen.
// Alle Texte der Mitspieler laufen durch esc() – nie als HTML.
'use strict';
{
  const who = (S, id) => `<span class="wh-who">${pkAvatar(S, id)}<b>${esc(pkName(S, id))}</b></span>`;

  partyGame({
    id: 'werhatdasgesagt',
    name: 'Wer hat das gesagt?',
    terms: { unit: 'Frage', write: 'Antworten', vote: 'Raten', waitWrite: 'schreibt …', waitVote: 'rät …', step: 'Antwort' },
    intro: [
      ['Anonym antworten', 'Jede Runde kommt eine persönliche, lockere Frage. Alle antworten gleichzeitig – ohne Namen.'],
      ['Raten', 'Danach wird jede Antwort einzeln gezeigt. Alle außer dem Autor tippen, von wem sie stammt.'],
      ['Punkte', 'Richtig getippt: +100. Wer gut getarnt war, bekommt +50 für jeden, der falsch getippt hat.'],
    ],
    short: [
      'Alle beantworten dieselbe persönliche Frage anonym.',
      'Dann wird jede Antwort einzeln gezeigt – tipp den Autor in der Spielerliste an.',
      'Richtig getippt: +100. Der Autor bekommt +50 für jeden Fehltipp.',
      'Der Autor selbst rät bei seiner Antwort nicht mit.',
    ],
    hint(S) {
      const G = S.g;
      if (G.stage === 'write') return !G.canWrite ? I18n.t('Du schaust zu – die Spieler antworten gerade') : G.mine === null ? I18n.t('Antworte ehrlich – die anderen müssen dich erraten') : I18n.t('Deine Antwort steht – du kannst sie bis zum Ende der Zeit noch ändern');
      if (G.mine) return I18n.t('Das ist deine Antwort – bleib ruhig und lass die anderen raten');
      if (!G.canGuess) return I18n.t('Du schaust zu – die anderen raten');
      return G.myGuess ? I18n.t('Dein Tipp steht – du kannst ihn ändern, bis alle fertig sind') : I18n.t('Tipp den Mitspieler an, der das geschrieben hat');
    },
    question(S) { return `<div class="pk-q"><h2>${esc(I18n.content(S.g.prompt, S.g.promptEn))}</h2></div>`; },
    board(S) {
      const G = S.g, W = WorldKit, t = W.t;
      if (G.stage === 'write') {
        const state = G.mine !== null ? W.chip('✔', t('Antwort abgegeben', 'Answer submitted'), 'good') : G.canWrite ? W.chip('✎', t('Noch nicht geantwortet', 'Not answered yet'), 'warn') : W.chip('👁', t('Du schaust zu', 'You are watching'));
        return I18n.html`<div class="pk-wait"><div class="wk-chips wh-state">${state}</div>${G.mine !== null ? I18n.html`<p class="pk-mine">Deine Antwort: <b>${esc(G.mine)}</b></p>` : ''}
          <p>Die Antworten werden gleich einzeln gezeigt – ohne Namen.</p></div>`;
      }
      const grid = G.canGuess ? I18n.html`<div class="wh-grid" role="group" aria-label="Wer hat das geschrieben?">${G.candidates.map((id) => {
        const on = G.myGuess === id;
        return `<button type="button" class="wh-pick${on ? ' on' : ''}" data-g="wh-guess" data-id="${esc(id)}" aria-pressed="${on}">${pkAvatar(S, id)}<span>${esc(pkName(S, id))}</span>${on ? I18n.html('<small>✓ dein Tipp</small>') : ''}</button>`;
      }).join('')}</div>` : `<p class="pk-mine">${G.mine ? I18n.t('Das ist deine Antwort – du rätst hier nicht mit.') : I18n.t('Du schaust zu.')}</p>`;
      const chips = [G.canGuess ? (G.myGuess ? W.chip('✔', t('Tipp gesetzt', 'Guess set'), 'good') : W.chip('?', t('Noch kein Tipp', 'No guess yet'), 'warn')) : G.mine ? W.chip('🔒', t('Deine Antwort – Autor verborgen', 'Your answer – author hidden')) : W.chip('👁', t('Du schaust zu', 'You are watching'))];
      return `<div class="wk-stage wh-stage">${W.head({ eyebrow: t('Anonyme Antwort', 'Anonymous answer'), title: t('Wer hat das geschrieben?', 'Who wrote this?'), chips })}<blockquote class="wh-answer ${G.text === '(keine Antwort)' ? 'empty' : ''}"><span class="wh-seal" aria-hidden="true">?</span><p>${esc(G.text)}</p></blockquote>${grid}</div>`;
    },
    writeForm(S) {
      const G = S.g;
      if (!G.canWrite) return '';
      return pkForm({ kind: 'answer', label: I18n.t('Deine Antwort'), placeholder: I18n.t('Deine Antwort (höchstens 120 Zeichen)'), value: G.mine || '', max: 120, counter: true, button: G.mine === null ? I18n.t('Senden') : I18n.t('Ändern') });
    },
    dockState: (S) => `${S.g?.mine ?? ''}|${S.g?.step ?? ''}|${S.g?.myGuess ?? ''}`,
    submit: (kind, text) => send('answer', { text }),
    reveal(S) {
      const G = S.g;
      const rows = (G.results || []).map((r) => I18n.html`<article class="wh-card">
          <blockquote><p>${r.text ? esc(r.text) : I18n.html('<i>(keine Antwort)</i>')}</p></blockquote>
          <p class="wh-author">Geschrieben von ${who(S, r.author)}</p>
          <ul class="wh-guesses" aria-label="Tipps">${r.guesses.map((g) => `<li class="${g.right ? 'right' : 'wrong'}${g.spectator ? ' spec' : ''}">${pkAvatar(S, g.voter)}<span>${esc(pkName(S, g.voter))}</span>
            <small>${g.right ? I18n.t('✓ richtig, +100') : I18n.html`✗ tippte ${esc(pkName(S, g.target))}`}${g.spectator ? ' (Zuschauer)' : ''}</small></li>`).join('') || I18n.html('<li class="spec"><small>Niemand hat getippt</small></li>')}</ul>
          ${r.disguise ? I18n.html`<p class="wh-disguise">Gut getarnt: <b>+${r.disguise}</b> für ${esc(pkName(S, r.author))}</p>` : ''}</article>`).join('');
      const gains = Object.entries(G.gains || {}).sort((a, b) => b[1] - a[1]);
      return `${rows || I18n.html('<p class="hint">Diesmal hat niemand geantwortet.</p>')}
        ${gains.length ? I18n.html`<section class="sl-gains"><h3>Punkte dieser Frage</h3><ol>${gains.map(([id, n]) => `<li>${pkAvatar(S, id)}<b>${esc(pkName(S, id))}</b><span class="pk-pts">+${n}</span></li>`).join('')}</ol></section>` : ''}`;
    },
    onClick(el) { if (el.dataset.g === 'wh-guess') send('guess', { target: el.dataset.id }); },
    custom: {
      title: 'Eigene Fragen für diesen Abend', noun: 'Frage', plural: 'Fragen',
      help: 'Eine Frage pro Zeile, mindestens 5 Zeichen. Mit der Hausregel „Nur Fragen aus der eigenen Liste des Hosts“ spielt ihr nur diese. Bis zu 100 Fragen.',
      example: 'Was war das schlechteste Geschenk, das du je bekommen hast?',
    },
    rules: I18n.html`<p>Jede Runde kommt eine lockere, persönliche Frage. Alle beantworten sie gleichzeitig und anonym.</p>
      <ul>
        <li><b>Antworten:</b> höchstens 120 Zeichen. Die Antworten der anderen siehst du erst beim Raten.</li>
        <li><b>Raten:</b> Jede Antwort kommt einzeln. Alle außer dem Autor tippen in der Spielerliste, von wem sie stammt. Du kannst deinen Tipp ändern, bis alle fertig sind.</li>
        <li><b>Punkte:</b> Richtig getippt +100. Der Autor bekommt +50 für jeden, der falsch getippt hat – gut getarnt!</li>
        <li><b>Auflösung:</b> Am Ende der Frage siehst du, wer was geschrieben und wer wie getippt hat.</li>
        <li>Wer nichts schreibt, hält niemanden auf, und für „keine Antwort“ wird nicht geraten. Wer offline ist, wird nicht abgewartet.</li>
        <li>Zuschauer dürfen auf Wunsch des Hosts mit raten – ohne Punkte und ohne Wirkung auf die Autoren.</li>
        <li><b>Hausregel:</b> „Nur Fragen aus der eigenen Liste des Hosts“ (Host-Menü, eine Frage pro Zeile).</li>
      </ul>`,
  });
}
