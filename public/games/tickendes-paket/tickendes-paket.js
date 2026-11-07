// Tickendes Paket im Browser (Regeln: games/tickendes-paket/room.js). Wer das Paket hat, tippt ein passendes Wort ein und gibt es weiter.
'use strict';
{
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  let cd = null; // Rest-Countdown beim sichtbaren Zünder: { endsAt, el }

  const kit = kitGame({
    id: 'tickendes-paket',
    name: 'Tickendes Paket',
    direction: false,
    intro: [
      ['Ziel', 'Gib das tickende Paket schnell weiter, bevor es dir in der Hand platzt.'],
      ['Weitergeben', 'Du bekommst eine Frage wie „Tier mit K“. Tipp ein passendes Wort ein – dann bekommt der Nächste das Paket.'],
      ['Minuspunkte', 'Wem das Paket platzt, bekommt einen Minuspunkt. Wer am Ende die wenigsten hat, gewinnt.'],
    ],
    short: [
      'Ein Paket tickt mit einer unbekannten Zeit und wandert von Hand zu Hand.',
      'Wer es hat, antwortet auf eine Kurzfrage mit einem Wort mit dem verlangten Anfangsbuchstaben – jedes Wort nur einmal pro Paket.',
      'Wer zu lange braucht, behält das Paket. Platzt es, gibt es einen Minuspunkt.',
      'Ob das Wort zur Kategorie passt, prüft die Gruppe – der Server prüft nur Buchstabe und Wiederholung.',
    ],
    house: (S) => (S.settings.visibleFuse ? ['Sichtbarer Countdown'] : []),
    playerInfo: (p) => I18n.html`${p.minus ?? 0} Minus${p.holder ? I18n.html(' · <b>hat das Paket</b>') : ''}`,
    seat: (p) => I18n.html`<span>${p.minus ?? 0} Minuspunkt${p.minus === 1 ? '' : 'e'}</span>${p.holder ? I18n.html('<b class="kg-call">Paket</b>') : ''}`,
    sounds(S, prev) { return S.g?.exploded?.bomb !== prev.g?.exploded?.bomb && S.g?.exploded ? 'drum' : null; },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} hat das Paket`;
      return g.prompt ? I18n.html`Schnell: ${g.prompt.cat} mit ${g.prompt.letter}!` : '';
    },
    main(S) {
      const g = S.g, W = WorldKit, t = W.t;
      const myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const exploded = g.exploded && g.exploded.bomb === g.bomb - 1;
      const holder = nameOf(S, S.turnId);
      const fuse = g.visibleFuse && g.fuseLeft !== null ? `<span class="wk-chip warn" data-i="⏱" data-fuse="${S.now + g.fuseLeft}" role="timer" aria-label="${t('Zünder', 'Fuse')}">${Math.ceil(g.fuseLeft / 1000)} s</span>` : W.chip('🔒', t('Zünder verborgen', 'Fuse hidden'));
      const seal = '<svg viewBox="0 0 120 100" aria-hidden="true" focusable="false"><path d="M12 34 60 14l48 20v50L60 96 12 84z" fill="#b98a55" stroke="#4a3220" stroke-width="3"/><path d="M12 34l48 20 48-20M60 54v42" fill="none" stroke="#4a3220" stroke-width="3"/><path d="M42 24l48 20v14L42 38z" fill="#e6d3a8" stroke="#4a3220" stroke-width="2"/><circle cx="60" cy="62" r="11" fill="#c4572c" stroke="#4a3220" stroke-width="3"/><path d="M55 62h10M60 57v10" stroke="#f6e7c4" stroke-width="2.5" stroke-linecap="round"/></svg>';
      const boom = exploded ? `<div class="tp-boom" role="status"><b>💥 ${t('Geplatzt bei', 'Burst at')} ${nameOf(S, g.exploded.id)}</b><small>${t('Ein Minuspunkt – das nächste Paket beginnt.', 'One penalty point – the next package starts.')}</small></div>` : '';
      const task = g.prompt ? `<div class="tp-task tp-prompt ${myTurn ? 'mine' : ''}"><span class="wk-label">${myTurn ? t('Du musst nennen', 'You must name') : t(`${holder} muss nennen`, `${holder} must name`)}</span><b class="tp-cat">${esc(g.prompt.cat)}</b><span class="tp-letter" aria-label="${t('mit dem Buchstaben', 'with the letter')} ${esc(g.prompt.letter)}">${esc(g.prompt.letter)}</span></div>` : '';
      const used = g.used.length ? `<div class="tp-used" aria-label="${t('Schon genannt', 'Already named')}"><span class="wk-label">${t('Schon genannt', 'Already named')}</span><div>${g.used.map((w) => `<i>${esc(w)}</i>`).join('')}</div></div>` : '';
      return `<div class="kg-table wk-stage tp-stage">${W.head({ eyebrow: t(`Paket ${g.bomb} von ${g.rounds}`, `Package ${g.bomb} of ${g.rounds}`), title: myTurn ? t('Das Paket ist bei dir', 'The package is with you') : t(`Paket bei ${holder}`, `Package with ${holder}`), chips: [fuse] })}${boom}
        <div class="tp-bench"><div class="tp-pkg ${myTurn ? 'hot' : ''}" aria-hidden="true">${seal}</div>${task}</div>${used}</div>`;
    },
    dock(S, myTurn) {
      if (!myTurn) return '';
      return I18n.html`<form class="pk-form tp-form" data-tp autocomplete="off"><label class="sr-only" for="tp-in">Dein Wort</label>
        <input id="tp-in" class="pk-input" type="text" maxlength="30" enterkeyhint="send" placeholder="Dein Wort mit ${esc(S.g.prompt?.letter ?? '')} …" autocomplete="off" autocorrect="off" spellcheck="false">
        <button class="btn btn-brass pk-send" type="submit">Weitergeben</button></form>`;
    },
    dockKey: (S) => `${S.turnId}|${S.g?.prompt?.letter}|${S.g?.prompt?.cat}|${S.phase}|${S.roundNo}|${S.you?.playing}|${S.you?.inRound}|${S.you?.isHost}|${S.players.filter((p) => p.seated).length}`,
    afterRender(S) {
      if (S.turnId === S.you?.id && matchMedia('(pointer: fine)').matches) $('#tp-in')?.focus({ preventScroll: true });
    },
    onClick() {},
    rules: I18n.html`<p>Ein Paket tickt mit einer Zeit, die niemand kennt, und wandert von Hand zu Hand.</p>
      <ul>
        <li>Wer das Paket hat, bekommt eine <b>Kurzfrage</b> („Tier mit K“) und tippt ein passendes Wort ein, das mit dem Buchstaben beginnt. Dann geht das Paket an den Nächsten.</li>
        <li>Jedes Wort darf in einem Paket nur <b>einmal</b> vorkommen. Ob es wirklich zur Kategorie passt, entscheidet die Gruppe – ein Wörterbuch gibt es nicht.</li>
        <li>Wer zu lange braucht, <b>behält</b> das Paket und bekommt eine neue Frage.</li>
        <li>Platzt das Paket, bekommt der Halter einen <b>Minuspunkt</b> und fängt das nächste Paket an.</li>
        <li>Nach den eingestellten Runden gewinnt, wer die <b>wenigsten Minuspunkte</b> hat.</li>
        <li>Hausregel: sichtbarer Countdown statt Zufallszeit.</li>
      </ul>`,
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest?.('form[data-tp]');
    if (!f || session?.game !== 'tickendes-paket') return;
    e.preventDefault();
    const input = f.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    send('answer', { text }).then((r) => { if (r?.ok) { input.value = ''; sfx?.('card'); } else if (r?.error) toast(r.error, true); });
  });
  // Sichtbarer Zünder: Sekunden herunterzählen
  setInterval(() => {
    document.querySelectorAll('[data-fuse]').forEach((el) => { el.textContent = `${Math.max(0, Math.ceil((Number(el.dataset.fuse) - gameNow(kit.S)) / 1000))} s`; });
  }, 250);
  void kit; void cd;
}
