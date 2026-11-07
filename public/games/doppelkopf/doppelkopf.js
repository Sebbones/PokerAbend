'use strict';
{
  const { tx, name } = BacklogKit;
  let selected = new Set(), key = '', stage = '', solo = 'queens';
  const commands = BacklogKit.commands('doppelkopf', () => kit, (S) => S.you?.inRound && S.turnId === S.you.id || S.g?.stage === 'deal-over' && S.you?.isHost);
  const card = (c, attrs = '', cls = '') => deckCard(c, { attrs, cls });
  const SOLOS = () => [['queens', tx('Damensolo', 'Queens solo')], ['jacks', tx('Bubensolo', 'Jacks solo')], ['plain', tx('Fleischlos', 'Fleshless')], ['c', tx('Kreuzsolo', 'Clubs solo')], ['s', tx('Piksolo', 'Spades solo')], ['h', tx('Herzsolo', 'Hearts solo')], ['d', tx('Karosolo', 'Diamonds solo')]];
  const soloName = (s) => SOLOS().find(([k]) => k === s)?.[1] || s;
  const LEVEL = (party, l) => l === 1 ? (party === 're' ? 'Re' : 'Kontra') : [, , tx('keine 90', 'no 90'), tx('keine 60', 'no 60'), tx('keine 30', 'no 30'), tx('schwarz', 'black')][l];
  const partyName = (p) => p === 're' ? 'Re' : p === 'kontra' ? 'Kontra' : '—';
  const sortHand = (g) => [...g.hand].sort((a, b) => {
    const [sa, ra] = g.sortKeys[a], [sb, rb] = g.sortKeys[b];
    if (sa === 't' || sb === 't') return (sa === 't' ? 0 : 1) - (sb === 't' ? 0 : 1) || rb - ra;
    return 'cshd'.indexOf(sa) - 'cshd'.indexOf(sb) || rb - ra;
  });
  const contractName = (g) => !g.contract ? '' : g.contract.kind === 'solo' ? soloName(g.contract.solo) : g.contract.kind === 'hochzeit' ? tx('Hochzeit', 'Wedding') : tx('Normalspiel', 'Normal game');
  const headline = (S) => {
    const g = S.g, who = (id) => name(S, id);
    if (g.stage === 'reserve') return tx(`${who(g.reserve.current)} entscheidet: gesund oder Vorbehalt`, `${who(g.reserve.current)} decides: healthy or reservation`);
    if (g.stage === 'play') return `${esc(contractName(g))}${g.soloist ? ' · ' + who(g.soloist) : g.hochzeit ? ' · ' + who(g.hochzeit) : ''}`;
    if (g.stage === 'deal-over') return tx('Spiel abgerechnet', 'Game scored');
    return tx('Serie beendet', 'Series finished');
  };
  const resultHTML = (S, d) => {
    if (!d) return '';
    const win = d.winner ? (d.winner === 're' ? 'Re' : 'Kontra') + ' ' + tx('gewinnt', 'wins') : tx('Unentschieden', 'Draw');
    const per = Object.entries(d.per).map(([id, n]) => `<li class="${d.re.includes(id) ? 're' : 'kontra'}"><b>${name(S, id)}</b><small>${d.re.includes(id) ? 'Re' : 'Kontra'}</small><strong>${n > 0 ? '+' : ''}${n}</strong></li>`).join('');
    return `<div class="dk-result"><h3>${win} · ${d.points.re} : ${d.points.kontra} ${tx('Augen', 'points')}</h3>
      <p>${esc(d.detail.join(' · '))}${d.specials.length ? ' · ' + tx('Sonderpunkte', 'Special points') + ': ' + esc(d.specials.map((x) => `${partyName(x.party)} ${x.text}`).join(', ')) : ''}</p><ul>${per}</ul></div>`;
  };
  const kit = kitGame({
    id: 'doppelkopf', name: 'Doppelkopf', ring: false, direction: false,
    get short() {
      return [
      tx('Kreuz-Dame = Re, alle anderen sind Kontra – das zeigt sich erst im Spiel.', 'Queen of clubs = Re, everyone else is Kontra – this only shows during play.'),
      tx('Trumpf sind Dulle, Damen, Buben und Karo. Re braucht 121 von 240 Augen.', 'Trumps are the Dulle, queens, jacks and diamonds. Re needs 121 of 240 points.'),
      tx('Ansagen wie Re, Kontra oder keine 90 erhöhen den Spielwert.', 'Calls such as Re, Kontra or no 90 raise the game value.'),
      ];
    },
    get rules() {
      return `<h3>Doppelkopf</h3>
      <p>${tx('Vier Spieler, 48 Karten (doppeltes Blatt mit Neunen; wahlweise ohne Neunen mit 40 Karten), jeder bekommt zwölf bzw. zehn Karten. Augen: Ass 11, Zehn 10, König 4, Dame 3, Bube 2, Neun 0 – zusammen 240.', 'Four players, 48 cards (double deck with nines; optionally without nines, 40 cards), twelve or ten cards each. Card points: ace 11, ten 10, king 4, queen 3, jack 2, nine 0 – 240 in total.')}</p>
      <p>${tx('Trumpfreihenfolge: Herz-Zehn (Dulle), Damen (Kreuz, Pik, Herz, Karo), Buben (Kreuz, Pik, Herz, Karo), dann Karo Ass, Zehn, König, Neun. Fehlfarben: Ass, Zehn, König, Neun. Farbzwang gilt für Trumpf und Fehlfarben. Gleiche Karten: die zuerst gespielte gewinnt – nur die zweite Dulle schlägt die erste.', 'Trump order: ten of hearts (Dulle), queens (clubs, spades, hearts, diamonds), jacks (clubs, spades, hearts, diamonds), then diamond ace, ten, king, nine. Plain suits: ace, ten, king, nine. You must follow suit in trumps and plain suits. Equal cards: the first played wins – only the second Dulle beats the first.')}</p>
      <p>${tx('Re sind die Spieler mit einer Kreuz-Dame, alle anderen Kontra. Re gewinnt mit 121 Augen, Kontra mit 120 (und erhält einen Punkt „gegen die Alten“).', 'Re are the players holding a queen of clubs, everyone else is Kontra. Re wins with 121 points, Kontra with 120 (and earns a point “against the old ones”).')}</p>
      <p>${tx('Vorbehalt: Reihum meldet jeder gesund, Hochzeit (nur mit beiden Kreuz-Damen) oder ein Solo an: Damensolo, Bubensolo, Fleischlos oder Kreuz-/Pik-/Herz-/Karosolo. Ein Solo hat Vorrang vor der Hochzeit; der Solist spielt allein und bekommt das Dreifache. Bei der Hochzeit wird der Partner der erste Mitspieler, der in den ersten drei Stichen sticht; sonst spielt der Hochzeiter allein.', 'Reservations: in turn each player says healthy, wedding (only with both queens of clubs) or a solo: queens, jacks, fleshless or clubs/spades/hearts/diamonds solo. A solo beats a wedding; the soloist plays alone and scores triple. In a wedding the partner is the first player to win one of the first three tricks; otherwise the groom plays alone.')}</p>
      <p>${tx('Ansagen (vor der zweiten, dritten … Karte): Re/Kontra, keine 90, keine 60, keine 30, schwarz. Wer eine Ansage nicht erfüllt, verliert. Spielpunkte: Sieg 1, gegen die Alten 1, Re/Kontra je 2, jede weitere Ansage 1, dazu je 1 für keine 90 / 60 / 30 / schwarz gespielt. Sonderpunkte: Fuchs (gefangenes Karo-Ass), Doppelkopf (Stich mit mindestens 40 Augen) und Karlchen (Kreuz-Bube im letzten Stich).', 'Calls (before your second, third … card): Re/Kontra, no 90, no 60, no 30, black. A party that misses its call loses. Game points: win 1, against the old ones 1, Re/Kontra 2 each, every further call 1, plus 1 each for no 90 / 60 / 30 / black achieved. Special points: fox (captured ace of diamonds), Doppelkopf (trick with at least 40 points) and Karlchen (jack of clubs in the last trick).')}</p>
      <p>${tx('Variante Schweinchen: Wer beide Karo-Asse hat, spielt sie als höchste Trümpfe.', 'Variant pigs: whoever holds both aces of diamonds plays them as the highest trumps.')}</p>`;
    },
    lobbyExtra() {
      return `<section class="dk-lobby"><h3>${tx('Doppelkopf zu viert', 'Doppelkopf for four')}</h3><p>${tx('Re gegen Kontra, Hochzeit und Solos, Füchse und Karlchen. Neunen und Schweinchen stellt der Host im Menü ein.', 'Re against Kontra, weddings and solos, foxes and Karlchen. The host switches nines and pigs in the menu.')}</p></section>`;
    },
    onState(S) {
      const g = S.g; if (!g) return;
      if (key !== g.key || stage !== g.stage) { key = g.key; stage = g.stage; selected.clear(); }
      for (const c of selected) if (!g.hand?.includes(c)) selected.delete(c);
    },
    playerInfo: (p) => `${p.matchPoints || 0} ${tx('Punkte', 'points')} · ${p.cards || 0} ${tx('Karten', 'cards')}`,
    status: (S) => S.phase === 'playing' ? `${tx('Spiel', 'Game')} ${S.g.dealNo}/${S.g.deals} · ${S.g.stage === 'play' ? `${tx('Stich', 'Trick')} ${Math.min(S.g.handSize, S.g.trickNo + 1)}/${S.g.handSize}` : headline(S).replace(/<[^>]+>/g, '')}` : null,
    hint(S) {
      const g = S.g, me = S.turnId === S.you?.id;
      if (g.stage === 'deal-over') return tx('Spiel abgerechnet. Der Host gibt als Nächstes neu.', 'Game scored. The host deals the next game.');
      if (!g.hand) return tx('Du schaust zu.', 'You are watching.');
      const mine = g.myParty ? tx(`Du gehörst zu ${partyName(g.myParty)}.`, `You are on ${partyName(g.myParty)}.`) : '';
      if (g.stage === 'reserve') return me ? `${mine} ${tx('Gesund, Hochzeit oder Solo?', 'Healthy, wedding or solo?')}` : tx('Vorbehalte werden reihum gemeldet.', 'Reservations are called in turn.');
      return me ? `${mine} ${tx('Eine erlaubte Karte wählen, dann Ausspielen bestätigen.', 'Select a legal card, then confirm Play.')}` : `${mine} ${tx('Deine Hand bleibt privat.', 'Your hand stays private.')}`;
    },
    main(S) {
      const g = S.g, inRound = S.players.filter((p) => p.inRound);
      let felt;
      if (g.stage === 'reserve') felt = `<div class="dk-reserve">${g.pos.map((id) => `<span class="${g.reserve.current === id ? 'now' : ''}"><b>${name(S, id)}</b> ${g.reserve.calls[id] ? (g.reserve.calls[id] === 'healthy' ? tx('gesund', 'healthy') : g.reserve.calls[id] === 'hochzeit' ? tx('Hochzeit', 'wedding') : soloName(g.reserve.calls[id])) : '…'}</span>`).join('')}</div>`;
      else if (g.stage === 'play') {
        const tr = g.trick.length ? g.trick : g.lastTrick?.cards || [];
        felt = tr.length ? `<div class="dk-trick">${tr.map((p) => `<article><span>${name(S, p.id)}</span>${card(p.card, 'disabled tabindex="-1"')}</article>`).join('')}</div>${!g.trick.length && g.lastTrick ? `<p>${tx('Letzter Stich', 'Last trick')}: ${name(S, g.lastTrick.winner)} · ${g.lastTrick.points} ${tx('Augen', 'points')}</p>` : ''}` : `<p>${name(S, S.turnId)} ${tx('spielt aus', 'leads')}.</p>`;
      } else felt = resultHTML(S, g.lastDeal);
      const calls = ['re', 'kontra'].filter((p) => g.levels[p]).map((p) => `<span class="dk-call ${p}">${LEVEL(p, 1)}${g.levels[p] > 1 ? ' · ' + [...Array(g.levels[p] - 1)].map((_, i) => LEVEL(p, i + 2)).join(' · ') : ''}</span>`).join('');
      return `<div class="kg-table dk-world"><header class="dk-head"><small>DOPPELKOPF</small><h2>${headline(S)}</h2><p>${g.schweine ? tx('Schweinchen bei ', 'Pigs held by ') + name(S, g.schweine) + ' · ' : ''}${g.myParty ? tx('Du: ', 'You: ') + partyName(g.myParty) : ''}</p>${calls ? `<div class="dk-calls">${calls}</div>` : ''}</header>
        <section class="dk-felt" aria-label="${tx('Tischmitte', 'Table centre')}">${felt}</section>
        <ol class="dk-ledger">${inRound.map((p) => `<li class="${p.party || ''}"><b>${name(S, p.id)}</b><span>${{ Vorhand: tx('Vorhand', 'Forehand'), Mittelhand: tx('Mittelhand', 'Second'), Rückhand: tx('Rückhand', 'Third'), Geber: tx('Geber', 'Dealer') }[p.seatName] || ''}${p.party ? ' · ' + partyName(p.party) : ''}</span><span>${p.tricks || 0} ${tx('Stiche', 'tricks')}</span><strong>${p.matchPoints || 0}</strong></li>`).join('')}</ol></div>`;
    },
    dockKey: (S) => JSON.stringify([S.phase, S.g?.key, S.g?.stage, S.g?.revision, S.g?.hand, [...selected], solo, S.turnId, S.gamePaused, commands.blocked(S)]),
    dock(S) {
      const g = S.g, off = commands.blocked(S), me = S.turnId === S.you.id, btn = (a, label, extra = '', cls = 'btn-brass') => `<button class="btn ${cls}" data-g="${a}" ${extra} ${off ? 'disabled' : ''}>${label}</button>`;
      if (g.stage === 'deal-over') return S.you.isHost ? btn('dk-next', tx('Nächstes Spiel', 'Next game')) : '';
      if (!g.hand) return '';
      let controls = '';
      if (me && g.stage === 'reserve') {
        controls = `${btn('dk-reserve', tx('Gesund', 'Healthy'), 'data-choice="healthy"')}${g.hasBothQueens ? btn('dk-reserve', tx('Hochzeit', 'Wedding'), 'data-choice="hochzeit"', '') : ''}
          <label class="dk-pick">${tx('Solo', 'Solo')} <select id="dk-solo" aria-label="Solo">${SOLOS().map(([k, v]) => `<option value="${k}" ${solo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${btn('dk-reserve', tx('Solo anmelden', 'Call solo'), 'data-choice="solo"', '')}`;
      } else if (g.stage === 'play') {
        const sel = [...selected][0];
        controls = `${me && g.canAnnounce ? btn('dk-announce', `${LEVEL(g.myParty, g.canAnnounce)} ${tx('ansagen', 'call')}`, `data-level="${g.canAnnounce}"`, '') : ''}<span role="status">${sel ? '' : tx('Karte auswählen', 'Select a card')}</span>${me ? btn('dk-play', tx('Ausspielen', 'Play card'), sel && g.legal.includes(sel) ? '' : 'disabled') : ''}`;
      }
      return `<div class="dk-hand" aria-label="${tx('Eigene Hand', 'Your hand')}">${sortHand(g).map((c) => card(c, `data-g="dk-card" data-card="${c}" aria-pressed="${selected.has(c)}" ${off || !me || g.stage !== 'play' || !g.legal.includes(c) ? 'disabled' : ''}`, selected.has(c) ? 'dk-selected' : '')).join('')}</div><div class="dk-actions">${controls}</div>${commands.notice()}`;
    },
    onClick(t, S, e) {
      const a = t.dataset.g, g = S.g;
      if (a === 'refresh-state') return commands.refresh();
      if (commands.blocked(S)) return;
      if (a === 'dk-card') {
        const c = t.dataset.card; selected = new Set([c]); kit.render();
        document.querySelector(`[data-g=dk-card][data-card="${c}"]`)?.focus({ preventScroll: true }); return;
      }
      if (e?.detail > 1) return;
      const data = { key: g.key, revision: g.revision };
      if (a === 'dk-reserve') commands.run('reserve', { ...data, choice: t.dataset.choice === 'solo' ? document.getElementById('dk-solo')?.value || solo : t.dataset.choice });
      else if (a === 'dk-announce') commands.run('announce', { ...data, level: Number(t.dataset.level) });
      else if (a === 'dk-play') commands.run('play', { ...data, card: [...selected][0] });
      else if (a === 'dk-next') commands.run('nextDeal', data);
    },
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'dk-solo') solo = e.target.value; });
}
