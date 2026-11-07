// Wer bin ich? im Browser (Regeln: games/wer-bin-ich/room.js). Jeder trägt einen Stirn-Zettel; den eigenen sieht man nicht („?“).
// Der Server schickt den eigenen Begriff nie mit, bis er erraten ist – hier wird nur angezeigt, was ankommt. Alles Eingegebene wird als Text ausgegeben.
'use strict';
{
  PARTY_IDS.add('wer-bin-ich'); // Anstupser-Einblendung aus party-kit.js
  let guessMode = false;
  let fresh = new Set();     // gerade erratene Zettel (Aufflug-Animation)
  let noteDraft = null;
  const ANS = { ja: 'Ja', nein: 'Nein', weiss: 'Weiß nicht', unklar: 'Unklar' };
  const pl = (S, id) => S.players.find((p) => p.id === id);
  const nm = (S, id) => esc(pl(S, id)?.name ?? '?');
  const noteKey = (S) => I18n.html`wb-note:${S.code}`;
  const inGame = (S) => !!S.you?.inRound;

  function noteBox(S) {
    if (noteDraft === null) { try { noteDraft = localStorage.getItem(noteKey(S)) || ''; } catch { noteDraft = ''; } }
    const mine = (S.g.hist || []).filter((h) => h.by === S.you?.id);
    const rows = mine.map((h) => (h.t === 'q'
      ? `<li class="${h.res}"><b>${{ ja: I18n.t('Ja'), nein: I18n.t('Nein'), unklar: '?' }[h.res]}</b> ${h.text ? esc(h.text) : I18n.html('<i>(per Voice)</i>')}</li>`
      : I18n.html`<li class="${h.ok ? 'ja' : 'nein'}"><b>${h.ok ? '✓' : '✗'}</b> Geraten: ${esc(h.text)}</li>`)).join('');
    const hints = (S.g.hints || []).filter((h) => h.for === S.you?.id).map((h) => I18n.html`<li class="hint"><b>Tipp</b> ${esc(h.text)}</li>`).join('');
    return I18n.html`<details class="wb-notes" open><summary>Was ich schon weiß</summary>
      <ol class="wb-known">${hints}${rows || I18n.html('<li class="none">Noch nichts – stell deine erste Frage.</li>')}</ol>
      <label class="sr-only" for="wb-note">Eigene Notiz</label>
      <textarea id="wb-note" class="pk-text" rows="2" maxlength="300" placeholder="Eigene Notizen (nur für dich, bleiben in diesem Browser)">${esc(noteDraft)}</textarea></details>`;
  }

  function cards(S) {
    const g = S.g;
    const list = S.players.filter((p) => p.inRound);
    return I18n.html`<ul class="wb-table" aria-label="Stirn-Zettel">${list.map((p, i) => {
      const me = p.id === S.you?.id;
      const w = g.words?.[p.id];
      const solved = g.solved.includes(p.id);
      const place = g.solved.indexOf(p.id) + 1;
      const turn = S.turnId === p.id && S.phase === 'playing';
      const rot = (((i * 37) % 7) - 3) * 0.9;
      const text = w ? esc(w) : (g.stage === 'words' ? '…' : '?');
      let status = '';
      if (solved) status = I18n.html`Platz ${place} · ${g.qs[p.id] ?? 0} Fragen`;
      else if (g.gaveUp.includes(p.id)) status = 'ausgeschieden';
      else if (p.skipped) status = 'setzt aus';
      else if (turn) status = 'ist dran';
      else status = I18n.html`${g.qs[p.id] ?? 0} Fragen`;
      const ans = p.answered || p.writing ? ' ✓' : '';
      return `<li class="wb-card ${me ? 'me' : ''} ${solved ? 'solved' : ''} ${turn ? 'turn' : ''} ${fresh.has(p.id) ? 'fly' : ''}">
        <span class="wb-who"><span class="wb-av" aria-hidden="true">${avatarHTML(p)}</span><b>${esc(p.name)}${me ? I18n.html(' <small>(du)</small>') : ''}</b></span>
        <span class="wb-note ${w ? '' : 'blank'} ${w && w.length > 14 ? 'long' : ''}" style="--rot:${rot}deg" aria-label="${w ? I18n.html`Zettel: ${esc(w)}` : 'Zettel: unbekannt'}">${text}</span>
        <small class="wb-status">${status}${ans}</small></li>`;
    }).join('')}</ul>`;
  }

  function centre(S) {
    const g = S.g;
    if (g.stage === 'words') return I18n.html`<div class="wb-centre"><b>Begriffe werden geschrieben …</b><span>${S.players.filter((p) => p.inRound && p.writing).length} von ${S.players.filter((p) => p.inRound).length} fertig</span></div>`;
    const asker = nm(S, S.turnId);
    if (g.sub === 'vote' && g.q) {
      const n = S.players.filter((p) => p.inRound).length - 1;
      return I18n.html`<div class="wb-centre big"><small>${asker} fragt</small><b class="wb-q">${g.q.text ? esc(g.q.text) : 'Frage per Voice'}</b><span>${g.q.answered.length} von ${n} haben geantwortet</span></div>`;
    }
    if (g.sub === 'gvote' && g.gv) return I18n.html`<div class="wb-centre big"><small>${nm(S, g.gv.by)} rät</small><b class="wb-q">„${esc(g.gv.text)}“</b><span>Zählt das? ${g.gv.answered.length} Stimmen</span></div>`;
    const L = g.lastQ;
    const last = L ? `<div class="wb-result ${L.res}" role="status"><b>${ANS[L.res].toUpperCase()}</b><span>${nm(S, L.by)}${L.text ? `: ${esc(L.text)}` : ''} · ${L.counts.ja}:${L.counts.nein}${L.counts.weiss ? I18n.html` · ${L.counts.weiss}× weiß nicht` : ''}</span></div>` : '';
    return I18n.html`<div class="wb-centre">${last}<span>${asker} ist dran${g.turnQ ? I18n.html` (${g.turnQ}. Frage in diesem Zug)` : ''}</span></div>`;
  }

  const kit = kitGame({
    id: 'wer-bin-ich',
    name: 'Wer bin ich?',
    noBots: true,
    ring: false,
    direction: false,
    intro: [
      ['Dein Zettel', 'Alle sehen den Begriff auf deiner Stirn – nur du nicht. Finde heraus, wer oder was du bist.'],
      ['Fragen', 'Stell reihum Ja/Nein-Fragen (per Voice). Die anderen antworten per Knopf, die Mehrheit gilt.'],
      ['Raten', 'Wenn du es weißt, tipp auf „Ich rate“. Wer es schneller errät, bekommt mehr Punkte.'],
    ],
    short: [
      'Jeder hat einen geheimen Begriff auf der Stirn: Alle sehen ihn, nur man selbst nicht.',
      'Reihum eine Ja/Nein-Frage stellen (per Voice, optional auch als Text). Die anderen antworten Ja, Nein oder Weiß nicht – die Mehrheit gilt.',
      'Bei „Ja“ darf man weiterfragen, sonst ist der Nächste dran (einstellbar).',
      'Statt zu fragen kann man raten. Treffer zählen auch bei Tippfehlern und anderen Artikeln, sonst stimmen die anderen ab.',
      'Punkte: wer früher rät, bekommt mehr, dazu Bonus für wenige Fragen.',
    ],
    house: (S) => [
      S.settings.fixedQ ? I18n.html`Feste Anzahl Fragen pro Zug: ${S.settings.fixedQ}` : S.settings.follow ? I18n.t('Bei „Ja“ weiterfragen') : 'Nach jeder Frage ist der Nächste dran',
      ...(S.settings.maxQ ? [I18n.html`Höchstens ${S.settings.maxQ} Fragen pro Spieler`] : []),
      ...(S.settings.hints ? [I18n.t('Hinweis-Hilfe nach 15 Fragen')] : []),
      ...(S.settings.penalty ? [I18n.t('Falsch geraten: eine Runde aussetzen')] : []),
    ],
    playerInfo(p, S) {
      if (S.phase !== 'playing') return '';
      return p.place ? I18n.html`Platz ${p.place}` : p.gaveUp ? 'ausgeschieden' : I18n.html`${p.qs ?? 0} Fragen`;
    },
    status(S) {
      if (S.phase !== 'playing' || !S.g) return null;
      return S.g.stage === 'words' ? 'Begriffe schreiben' : { ask: I18n.t('Fragen'), vote: I18n.t('Antworten'), gvote: 'Abstimmung' }[S.g.sub] || null;
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!g || S.phase !== 'playing') return '';
      if (!inGame(S)) return 'Du schaust zu – du siehst alle Zettel';
      if (g.stage === 'words') return g.myTarget ? I18n.html`Schreib einen Begriff für ${pl(S, g.myTarget)?.name ?? '?'} – wer ihn bekommt, weiß nicht, von wem er kommt` : 'Begriffe werden geschrieben';
      if (g.hintReq?.by === S.you.id) return I18n.html`Schreib einen kurzen Tipp für ${pl(S, g.hintReq.for)?.name ?? '?'}`;
      if (g.sub === 'vote') return g.q?.by === S.you.id ? 'Die anderen antworten gerade' : 'Antworte: Ja, Nein oder Weiß nicht';
      if (g.sub === 'gvote') return g.gv?.by === S.you.id ? 'Die anderen stimmen ab' : 'Zählt der Tipp?';
      if (g.solved.includes(S.you.id)) return 'Du hast es geschafft – jetzt antwortest du nur noch';
      return myTurn ? 'Du bist dran: stell deine Frage (per Voice) und tipp „Frage gestellt“ – oder rate' : I18n.html`${nm(S, S.turnId)} ist dran`;
    },
    sounds(S, prev) {
      const a = S.g, b = prev.g;
      if (!a || !b) return null;
      if (a.solved.length > b.solved.length) return 'call';
      if (a.lastQ && JSON.stringify(a.lastQ) !== JSON.stringify(b.lastQ)) return a.lastQ.res === 'ja' ? 'chips' : 'end';
      return null;
    },
    onState(S, prev) {
      if (S.g && prev?.g) { const n = S.g.solved.filter((id) => !prev.g.solved.includes(id)); if (n.length) { fresh = new Set(n); setTimeout(() => { fresh = new Set(); }, 1800); } }
      if (S.g?.sub !== 'ask' || S.turnId !== S.you?.id) guessMode = false;
      if (S.phase === 'lobby') noteDraft = null;
    },
    main(S) {
      const g = S.g;
      if (!g || !g.stage) return '';
      const notes = inGame(S) && g.stage === 'play' ? noteBox(S) : '';
      const hint = g.hints?.length ? I18n.html`<div class="wb-hints"><small>Tipps:</small> ${g.hints.map((h) => `<i>${nm(S, h.for)}: ${esc(h.text)}</i>`).join('')}</div>` : '';
      const W = WorldKit, t = W.t, solved = (g.solved || []).length, total = S.players.filter((p) => p.inRound).length;
      const chips = [g.stage === 'words' ? W.chip('✎', t('Begriffe werden geschrieben', 'Writing the terms'), 'warn') : W.chip('❓', t('Fragerunde', 'Question round')), W.chip('✔', `${solved} / ${total} ${t('erraten', 'solved')}`, solved ? 'good' : ''), inGame(S) ? W.chip('🔒', t('Dein eigener Zettel bleibt verdeckt', 'Your own note stays hidden')) : ''].filter(Boolean);
      return `<div class="kg-table wb-wrap wk-stage wb-stage">${W.head({ eyebrow: t('Ratesalon', 'Guessing salon'), title: g.stage === 'words' ? t('Begriffe für die Stirnzettel', 'Terms for the headbands') : t('Wer bin ich?', 'Who am I?'), chips })}${centre(S)}${hint}${cards(S)}${notes}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      if (!g || !inGame(S) || S.phase !== 'playing') return '';
      const me = S.you.id;
      const host = S.you.isHost ? I18n.html('<button class="btn btn-ghost" data-g="wb-skip" title="Diesen Schritt jetzt beenden">Weiter</button>') : '';
      if (g.stage === 'words') {
        return I18n.html`<form class="pk-form wb-form" data-wb="word"><label class="sr-only" for="wb-in">Begriff</label><input id="wb-in" class="pk-input" type="text" maxlength="40" value="${esc(g.myDraft ?? '')}" placeholder="Begriff für ${esc(pl(S, g.myTarget)?.name ?? '?')}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send"><button class="btn btn-brass pk-send" type="submit">${g.myDraft ? I18n.t('Ändern') : I18n.t('Fertig')}</button></form><div class="kg-acts">${host}</div>`;
      }
      if (g.hintReq?.by === me) return I18n.html`<form class="pk-form wb-form" data-wb="hint"><label class="sr-only" for="wb-in">Tipp</label><input id="wb-in" class="pk-input" type="text" maxlength="80" placeholder="Kurzer Tipp für ${esc(pl(S, g.hintReq.for)?.name ?? '?')} (ohne den Begriff zu verraten)" autocomplete="off" spellcheck="false"><button class="btn btn-brass pk-send" type="submit">Tipp senden</button></form>`;
      if (g.sub === 'vote' && g.q && g.q.by !== me) {
        return I18n.html`<div class="wb-answers" role="group" aria-label="Antwort">${['ja', 'nein', 'weiss'].map((a) => `<button type="button" class="wb-ans wb-${a} ${g.q.mine === a ? 'on' : ''}" data-g="wb-answer" data-a="${a}" aria-pressed="${g.q.mine === a}">${ANS[a]}</button>`).join('')}</div><div class="kg-acts">${host}</div>`;
      }
      if (g.sub === 'gvote' && g.gv && g.gv.by !== me) {
        return I18n.html`<div class="wb-answers" role="group" aria-label="Zählt der Tipp?"><button type="button" class="wb-ans wb-ja ${g.gv.mine === true ? 'on' : ''}" data-g="wb-vote" data-ok="1" aria-pressed="${g.gv.mine === true}">Zählt</button><button type="button" class="wb-ans wb-nein ${g.gv.mine === false ? 'on' : ''}" data-g="wb-vote" data-ok="0" aria-pressed="${g.gv.mine === false}">Zählt nicht</button></div><div class="kg-acts">${host}</div>`;
      }
      if (g.sub === 'ask' && myTurn && !g.solved.includes(me)) {
        const tip = g.canHint ? I18n.html('<button class="btn btn-sm" data-g="wb-hint">Um einen Tipp bitten</button>') : '';
        if (guessMode) return I18n.html`<form class="pk-form wb-form" data-wb="guess"><label class="sr-only" for="wb-in">Dein Begriff</label><input id="wb-in" class="pk-input" type="text" maxlength="40" placeholder="Ich bin …" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="send"><button class="btn btn-brass pk-send" type="submit">Raten</button><button type="button" class="btn btn-ghost" data-g="wb-noguess">Zurück</button></form>`;
        return I18n.html`<form class="pk-form wb-form" data-wb="ask"><label class="sr-only" for="wb-in">Frage (optional als Text)</label><input id="wb-in" class="pk-input" type="text" maxlength="120" placeholder="Deine Ja/Nein-Frage (per Voice – Text ist optional)" autocomplete="off" spellcheck="false" enterkeyhint="send"><button class="btn btn-brass pk-send" type="submit">Frage gestellt</button></form>
          <div class="kg-acts"><button class="btn" data-g="wb-guess">Ich rate</button>${tip}${host}</div>`;
      }
      // Warten: den, auf den alle warten, anstupsen
      const wait = g.sub === 'ask' && S.settings.nudge && S.turnId !== me ? I18n.html`<button class="btn btn-sm" data-g="wb-nudge" data-id="${esc(S.turnId)}">${nm(S, S.turnId)} anstupsen 👉</button>` : '';
      return `<div class="kg-acts">${wait}${host}</div>`;
    },
    dockKey: (S) => `${S.phase}|${S.roundNo}|${S.you?.playing}|${S.players.filter((p) => p.seated).length}|${S.you?.inRound}|${S.you?.isHost}|${S.g?.stage}|${S.g?.sub}|${S.turnId}|${S.g?.q?.by}|${S.g?.q?.mine}|${S.g?.gv?.by}|${S.g?.gv?.mine}|${S.g?.hintReq?.by}|${S.g?.canHint}|${guessMode}|${S.g?.myDraft ?? ''}|${S.g?.solved?.includes(S.you?.id)}`,
    afterRender() { if (matchMedia('(pointer: fine)').matches && !document.activeElement?.closest?.('#kg-panel')) $('#wb-in')?.focus({ preventScroll: true }); },
    hostExtra(S) {
      const off = S.phase === 'playing';
      const cats = Object.entries(S.categories || {}).map(([k, n]) => `<label class="toggle"><span>${esc(n)}</span><input type="checkbox" data-wb-cat="${esc(k)}" ${S.settings.cats?.includes(k) ? 'checked' : ''} ${off ? 'disabled' : ''}></label>`).join('');
      const modes = [['mutual', 'Gegenseitig: jeder schreibt für einen zugelosten Mitspieler'], ['category', 'Aus Kategorie: Begriffe aus einer Liste'], ['custom', 'Eigene Liste des Hosts']];
      return I18n.html`<section class="wb-host" aria-label="Begriffe"><h3>Woher kommen die Begriffe?</h3>
        <div class="wb-modes" role="radiogroup">${modes.map(([v, l]) => `<label class="toggle"><span>${esc(l)}</span><input type="radio" name="wb-mode" data-wb-mode="${v}" ${S.settings.mode === v ? 'checked' : ''} ${off ? 'disabled' : ''}></label>`).join('')}</div>
        ${S.settings.mode === 'category' ? I18n.html`<h3>Kategorien</h3><div class="kg-switches">${cats}</div>` : ''}
        ${S.settings.mode === 'custom' ? I18n.html`<label class="field"><span>Eigene Begriffe, einer pro Zeile (keine Mitspieler oder Privatpersonen)</span><textarea id="wb-custom" class="pk-text" rows="6" maxlength="8000" ${off ? 'disabled' : ''}>${esc((S.custom || []).join('\n'))}</textarea></label>
          <button type="button" class="btn" data-g="wb-save" ${off ? 'disabled' : ''}>Begriffe speichern</button><p class="hint" style="margin:0">${(S.custom || []).length} gespeichert – du brauchst mindestens so viele wie Mitspieler.</p>` : ''}</section>`;
    },
    resultExtra(S) {
      const R = S.g?.reveal;
      if (!R) return '';
      const ids = S.players.filter((p) => R.words[p.id] !== undefined);
      return I18n.html`<table class="standings wb-reveal"><thead><tr><th>Name</th><th>Begriff</th><th class="num">Fragen</th></tr></thead><tbody>${ids.map((p) => {
        const place = R.solved.indexOf(p.id) + 1;
        return `<tr><td>${esc(p.name)}${place ? I18n.html` <small>(Platz ${place})</small>` : I18n.html(' <small>(nicht erraten)</small>')}</td><td><span class="wb-note mini">${esc(R.words[p.id])}</span></td><td class="num">${R.qs[p.id] ?? 0}</td></tr>`;
      }).join('')}</tbody></table>`;
    },
    onClick(el, S) {
      const g = el.dataset.g;
      if (g === 'wb-answer') send('wbAnswer', { answer: el.dataset.a });
      else if (g === 'wb-vote') send('wbVote', { ok: el.dataset.ok === '1' });
      else if (g === 'wb-guess') { guessMode = true; kit.render(); }
      else if (g === 'wb-noguess') { guessMode = false; kit.render(); }
      else if (g === 'wb-hint') send('wbHintAsk').then((r) => r?.ok && toast('Ein Mitspieler schreibt dir gleich einen Tipp'));
      else if (g === 'wb-skip') send('next');
      else if (g === 'wb-nudge') send('nudge', { id: el.dataset.id }).then((r) => r?.ok && toast(I18n.t('Angestupst 👉')));
      else if (g === 'wb-save') send('custom', { text: $('#wb-custom')?.value ?? '' }).then((r) => r?.ok && toast(I18n.html`${r.count} Begriffe gespeichert`));
      void S;
    },
    rules: I18n.html`<p>Jeder bekommt einen geheimen Begriff „auf die Stirn“ (Person, Figur, Tier, Gegenstand …). Alle anderen sehen ihn, nur du selbst nicht.</p>
      <ul>
        <li><b>Fragen:</b> Reihum stellst du eine Ja/Nein-Frage – gesprochen, zum Beispiel über Discord; als Text eintippen ist optional. Alle anderen antworten per Knopf: <b>Ja</b>, <b>Nein</b> oder <b>Weiß nicht</b>. Die Mehrheit gilt (bei Gleichstand „Unklar“).</li>
        <li>Bei „Ja“ darfst du weiterfragen, bei „Nein“ oder „Unklar“ ist der Nächste dran (Hausregeln: feste Anzahl Fragen pro Zug, Höchstzahl Fragen).</li>
        <li><b>Raten:</b> Statt zu fragen tippst du „Ich rate“ und gibst den Begriff ein. Groß-/Kleinschreibung, Umlaute (ae = ä), Artikel und kleine Tippfehler (ab 6 Buchstaben) werden verziehen. Sonst stimmen die anderen ab: „Zählt“ oder „Zählt nicht“. Richtig: Dein Zettel wird für dich aufgedeckt, du antwortest ab jetzt nur noch. Falsch: Der Nächste ist dran.</li>
        <li><b>Begriffe:</b> „Gegenseitig“ (jeder schreibt für einen zugelosten Mitspieler, niemand erfährt, von wem es kommt), „Aus Kategorie“ oder „Eigene Liste“ des Hosts.</li>
        <li><b>Punkte:</b> Platz 1 ist, wer es am schnellsten errät. (Spieler − Platz + 1) × 100, dazu 10 Punkte für jede Frage unter 20. Die Runde endet, wenn alle bis auf einen erraten haben (oder das Zeitlimit abläuft).</li>
        <li><b>Hilfen:</b> Unter „Was ich schon weiß“ stehen deine Fragen und Antworten. Mit der Hausregel Hinweis-Hilfe darfst du nach 15 Fragen um einen Tipp bitten.</li>
      </ul>`,
  });

  // Eingaben (Begriff, Frage, Raten, Tipp)
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest?.('form[data-wb]');
    if (!f || session?.game !== 'wer-bin-ich') return;
    e.preventDefault();
    const input = f.querySelector('input');
    const text = input.value.trim();
    const kind = f.dataset.wb;
    if (!text && kind !== 'ask') { toast(I18n.t('Schreib erst etwas hin'), true); return; }
    const ev = { word: 'wbWord', ask: 'wbAsk', guess: 'wbGuess', hint: 'wbHintWrite' }[kind];
    const r = await send(ev, { text });
    if (r?.ok) { input.value = ''; sfx?.('card'); if (kind === 'guess') guessMode = false; } else if (r?.error) toast(r.error, true);
  });
  // Notizen merken, Modus und Kategorien im Host-Menü
  document.addEventListener('input', (e) => {
    if (e.target.id === 'wb-note' && session?.game === 'wer-bin-ich') { noteDraft = e.target.value; try { localStorage.setItem(noteKey(kit.S), noteDraft); } catch { /* egal */ } }
  });
  document.addEventListener('change', (e) => {
    if (session?.game !== 'wer-bin-ich') return;
    const mode = e.target.dataset?.wbMode;
    if (mode) { e.target.blur(); send('settings', { mode }); } // Fokus raus, damit sich das Menü mit den neuen Feldern neu zeichnet
    else if (e.target.dataset?.wbCat !== undefined) {
      const cats = [...document.querySelectorAll('[data-wb-cat]')].filter((c) => c.checked).map((c) => c.dataset.wbCat);
      if (!cats.length) { e.target.checked = true; toast('Mindestens eine Kategorie', true); return; }
      e.target.blur();
      send('settings', { cats });
    }
  });
}
