// Mogeln im Browser (Regeln: games/mogeln/room.js). Karten antippen (mehrere möglich), „Ablegen“, oder „Mogeln!“ rufen.
'use strict';
{
  let sel = new Set();
  const RANK_NAME = { A: 'Asse', T: 'Zehner', J: 'Buben', Q: 'Damen', K: 'Könige' };
  const rn = (r) => I18n.language === 'en' ? ({A:'aces',2:'twos',3:'threes',4:'fours',5:'fives',6:'sixes',7:'sevens',8:'eights',9:'nines',T:'tens',J:'jacks',Q:'queens',K:'kings'}[r] || r) : RANK_NAME[r] || I18n.html`${r}er`;
  const ORDER = 'A23456789TJQK';
  const nameOf = (S, id) => esc(S.players.find((p) => p.id === id)?.name ?? '?');
  const sortHand = (h) => [...h].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]) || a[1].localeCompare(b[1]));

  const kit = kitGame({
    id: 'mogeln',
    name: 'Mogeln',
    intro: [
      ['Ziel', 'Wirf alle deine Karten ab. Wer als Erster keine Karten mehr hat, gewinnt.'],
      ['Dein Zug', 'Tipp Karten an und leg sie verdeckt ab. Du behauptest, es seien Karten des angesagten Werts – ob es stimmt, ist egal.'],
      ['Mogeln!', 'Glaubst du dem Vorgänger nicht, tipp auf „Mogeln!“. Die Karten werden aufgedeckt: Der Lügner nimmt den Stapel – oder du, wenn es gestimmt hat.'],
    ],
    short: [
      'Reihum wird in fester Folge angesagt: Ass, 2, 3 … König, wieder Ass.',
      'Du legst 1 bis 4 Karten verdeckt ab und behauptest, es seien Karten des angesagten Werts.',
      'Jeder andere darf „Mogeln!“ rufen. War gelogen, nimmt der Lügner den Stapel, sonst der Zweifler.',
      'Wer den Stapel nimmt, fängt an. Wer zuerst keine Karten mehr hat (und nicht erwischt wird), gewinnt.',
    ],
    house: () => [],
    playerInfo: (p) => I18n.html`${p.cards} Karte${p.cards === 1 ? '' : 'n'}`,
    seat: (p) => I18n.html`${fanHTML(p.cards)}<span>${p.cards} Karte${p.cards === 1 ? '' : 'n'}</span>`,
    onState(S, prev) {
      if (S.turnId !== S.you?.id || S.moveNo !== prev?.moveNo) { const h = new Set(S.g?.hand || []); sel = new Set([...sel].filter((c) => h.has(c))); }
    },
    hint(S, myTurn) {
      const g = S.g;
      if (!myTurn) return I18n.html`${nameOf(S, S.turnId)} ist dran – angesagt: <b>${rn(g.need)}</b>${g.canCall ? ' · glaubst du es nicht? „Mogeln!“' : ''}`;
      return I18n.html`Du bist dran: leg Karten verdeckt ab und sag „${rn(g.need)}“ – egal, was es wirklich ist`;
    },
    main(S) {
      const g = S.g, W = WorldKit, t = W.t, L = g.last, myTurn = S.turnId === S.you?.id && S.phase === 'playing';
      const claim = L ? `<div class="mg-claim wk-panel"><span class="wk-label">${t('Behauptung (verdeckt gelegt)', 'Claim (laid face down)')}</span><b>${nameOf(S, L.by)}: ${L.count} × ${rn(L.rank)}</b><small>${t('Ob es stimmt, sieht man nur nach „Mogeln!“.', 'You only find out after “Cheat!”.')}</small></div>` : `<div class="mg-claim wk-panel"><span class="wk-label">${t('Behauptung', 'Claim')}</span><b>${t('Der Stapel ist leer', 'The pile is empty')}</b></div>`;
      let reveal = '';
      if (g.reveal) {
        const R = g.reveal;
        reveal = `<div class="mg-reveal ${R.truth ? 'true' : 'lie'}" role="status"><b>${R.truth ? '✓' : '✗'} ${nameOf(S, R.caller)} ${t('ruft „Mogeln!“', 'calls “Cheat!”')}</b>
          <span class="mg-cards">${R.cards.map((c) => frenchCard(c, { attrs: 'disabled tabindex="-1"' })).join('')}</span>
          <span>${R.truth ? t('Es stimmte', 'It was true') : t('Gelogen', 'A lie')} – ${nameOf(S, R.taker)} ${t('nimmt den Stapel', 'takes the pile')}</span></div>`;
      }
      return `<div class="kg-table wk-stage mg-stage">${W.head({ eyebrow: t('Mogeln', 'Cheat'), title: myTurn ? t(`Du sagst: ${rn(g.need)}`, `You announce: ${rn(g.need)}`) : t(`Angesagt: ${rn(g.need)}`, `Announced: ${rn(g.need)}`), chips: [W.chip('🂠', t(`${g.pile} im Stapel`, `${g.pile} in the pile`))] })}
        <div class="mg-board"><div class="mg-need" role="status"><span class="wk-label">${t('Angesagt', 'Announced')}</span><b>${rn(g.need)}</b></div>
          <div class="mg-pile" aria-label="${t('Stapel', 'Pile')}: ${g.pile}"><span class="mg-stack">${fanHTML(Math.min(g.pile, 5))}</span><small>${g.pile} ${t('verdeckt', 'face down')}</small></div>${claim}</div>${reveal}</div>`;
    },
    dock(S, myTurn) {
      const g = S.g;
      const hand = sortHand(g.hand || []).map((c) => frenchCard(c, { cls: sel.has(c) ? 'sel' : '', attrs: myTurn ? `data-g="pick" data-c="${c}"` : 'disabled' })).join('');
      const n = sel.size;
      const acts = `${myTurn ? `<span class="wk-chip mg-count" data-i="🂠" role="status">${n}/${g.maxCards} ${I18n.content('gewählt', 'selected')}</span><button class="btn btn-brass" data-g="play" ${n && n <= g.maxCards ? '' : 'disabled'}>${n ? I18n.html`${n} Karte${n === 1 ? '' : 'n'} als ${rn(g.need)} ablegen` : I18n.t('Karten wählen')}</button>` : ''}
        ${g.canCall ? I18n.html('<button class="btn btn-danger" data-g="call">Mogeln!</button>') : ''}`;
      return I18n.html`<div class="kg-hand" role="group" aria-label="Deine Karten">${hand}</div><div class="kg-acts">${acts}</div>`;
    },
    onClick(t, S) {
      const g = t.dataset.g;
      if (g === 'pick') {
        const c = t.dataset.c;
        if (sel.has(c)) sel.delete(c); else if (sel.size < S.g.maxCards) sel.add(c); else toast(I18n.html`Höchstens ${S.g.maxCards} Karte${S.g.maxCards === 1 ? '' : 'n'} pro Zug`, true);
        kit.render();
      } else if (g === 'play') { const cards = [...sel]; sel = new Set(); send('play', { cards }); }
      else if (g === 'call') send('call');
    },
    rules: I18n.html`<p>Das ganze 52er-Blatt wird verteilt. Ziel: als Erster alle Karten loswerden.</p>
      <ul>
        <li>Reihum wird in fester Folge angesagt: <b>Ass, 2, 3 … Dame, König</b>, dann wieder Ass.</li>
        <li>Wer dran ist, legt <b>1 bis 4 Karten verdeckt</b> ab und behauptet, es seien Karten des angesagten Werts. Ob das stimmt, ist egal.</li>
        <li>Jeder andere darf bis zum nächsten Ablegen <b>„Mogeln!“</b> rufen. Dann wird die zuletzt abgelegte Gruppe aufgedeckt.</li>
        <li>War sie nicht ganz wie angesagt, nimmt der <b>Lügner</b> den ganzen Stapel auf. Stimmte die Ansage, bekommt ihn der <b>Zweifler</b>. Wer den Stapel nimmt, fängt an.</li>
        <li>Wer zuerst keine Karten mehr hat und nicht durchschaut wird, gewinnt.</li>
      </ul>`,
  });
}
