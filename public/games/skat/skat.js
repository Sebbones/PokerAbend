'use strict';
{
  const { tx, name } = BacklogKit;
  let selected = new Set(), key = '', stage = '';
  let form = { type: 'suit', suit: 'c', ouvert: false, schneider: false, schwarz: false }, bidPick = 0;
  const commands = BacklogKit.commands('skat', () => kit, (S) => S.you?.inRound && S.turnId === S.you.id || S.g?.stage === 'deal-over' && S.you?.isHost);
  const card = (c, attrs = '', cls = '') => deckCard(c, { attrs, cls });
  const SUIT_KEYS = ['c', 's', 'h', 'd'], JACKS = ['Jc', 'Js', 'Jh', 'Jd'], RANK_ORDER = 'ATKQ987';
  const sortHand = (hand) => [...hand].sort((a, b) => {
    const ja = JACKS.indexOf(a), jb = JACKS.indexOf(b);
    if (ja >= 0 || jb >= 0) return (ja < 0 ? 9 : ja) - (jb < 0 ? 9 : jb);
    return SUIT_KEYS.indexOf(a[1]) - SUIT_KEYS.indexOf(b[1]) || RANK_ORDER.indexOf(a[0]) - RANK_ORDER.indexOf(b[0]);
  });
  const gameName = (g) => {
    if (!g) return '';
    if (g.type === 'ramsch') return 'Ramsch';
    const base = g.type === 'null' ? 'Null' : g.type === 'grand' ? 'Grand' : deckSuitName(g.suit);
    const parts = [base];
    if (g.hand) parts.push('Hand');
    if (g.ouvert) parts.push('Ouvert'); else if (g.schwarz) parts.push(tx('Schwarz angesagt', 'black announced')); else if (g.schneider) parts.push(tx('Schneider angesagt', 'Schneider announced'));
    return parts.join(' · ');
  };
  const seatLabel = (p) => ({ Vorhand: tx('Vorhand', 'Forehand'), Mittelhand: tx('Mittelhand', 'Middlehand'), Hinterhand: tx('Hinterhand · Geber', 'Rearhand · dealer') })[p.seatName] || '';
  const headline = (S) => {
    const g = S.g, who = (id) => name(S, id);
    switch (g.stage) {
      case 'bid': return g.bd.phase === 'call' ? tx(`${who(g.bd.caller)} reizt gegen ${who(g.bd.listener)}`, `${who(g.bd.caller)} bids against ${who(g.bd.listener)}`) : tx(`${who(g.bd.listener)} antwortet auf ${g.bd.value}`, `${who(g.bd.listener)} answers ${g.bd.value}`);
      case 'ramschChoice': return tx('Alle haben gepasst', 'Everyone passed');
      case 'pickup': return tx(`${who(g.declarer)} spielt mit ${g.bidValue}`, `${who(g.declarer)} plays at ${g.bidValue}`);
      case 'discard': return tx('Zwei Karten drücken', 'Pressing two cards');
      case 'declare': return tx('Spiel ansagen', 'Declare the game');
      case 'play': return g.game.type === 'ramsch' ? tx('Ramsch – wer die meisten Augen sammelt, verliert', 'Ramsch – most card points loses') : `${who(g.declarer)}: ${esc(gameName(g.game))}`;
      case 'deal-over': return g.lastDeal?.thrownIn ? tx('Eingeworfen', 'Passed in') : tx('Spiel abgerechnet', 'Game scored');
      default: return tx('Serie beendet', 'Series finished');
    }
  };
  const resultHTML = (S, d) => {
    if (!d) return '';
    if (d.thrownIn) return `<p>${tx('Alle haben gepasst – es wird neu gegeben.', 'Everyone passed – the cards are redealt.')}</p>`;
    const rows = Object.entries(d.points).map(([id, n]) => `<li><b>${name(S, id)}</b><strong>${n > 0 ? '+' : ''}${n}</strong></li>`).join('');
    if (d.ramsch) return `<div class="sk-result"><h3>Ramsch</h3><p>${d.march ? `${name(S, d.march)}: ${tx('Durchmarsch', 'all tricks')}` : tx('Verloren hat', 'Loser')}: ${(d.losers || []).map((l) => name(S, l)).join(', ')}</p><ul>${rows}</ul><p class="sk-fine">${Object.entries(d.augen).map(([id, n]) => `${name(S, id)} ${n}`).join(' · ')} ${tx('Augen', 'points')}</p></div>`;
    const e = d.eval, sp = e.spitzen;
    return `<div class="sk-result"><h3>${name(S, d.declarer)} ${e.won ? tx('gewinnt', 'wins') : e.overbid ? tx('hat sich überreizt', 'overbid') : tx('verliert', 'loses')} · ${esc(gameName(d.game))}</h3>
      <p>${d.game.type === 'null' ? '' : `${sp.mit ? tx('Mit', 'With') : tx('Ohne', 'Without')} ${sp.count} · `}${tx('Spielwert', 'Game value')} ${e.value} (${e.base} × ${e.levels}) · ${d.augen} ${tx('Augen', 'points')}${e.schneider ? ' · Schneider' : ''}${e.schwarz ? ' · ' + tx('Schwarz', 'Schwarz') : ''}${d.bock ? ' · Bock ×2' : ''}</p>
      <ul>${rows}</ul>${d.bockTriggered ? `<p class="sk-fine">${tx('Bockrunde ausgelöst: die nächsten drei Spiele zählen doppelt.', 'Bock round triggered: the next three games count double.')}</p>` : ''}</div>`;
  };
  const kit = kitGame({
    id: 'skat', name: 'Skat', ring: false, direction: false,
    get short() {
      return [
      tx('Reizen: Der Höchstbietende spielt allein gegen die beiden anderen.', 'Bidding: the highest bidder plays alone against the other two.'),
      tx('Skat aufnehmen und zwei Karten drücken oder Hand spielen; dann Farbe, Grand oder Null ansagen.', 'Take the Skat and press two cards, or play Hand; then call a suit, Grand or Null.'),
      tx('Buben sind Trumpf. Alleinspieler brauchen 61 von 120 Augen.', 'Jacks are trumps. The declarer needs 61 of 120 card points.'),
      ];
    },
    get rules() {
      return `<h3>${tx('Skat', 'Skat')}</h3>
      <p>${tx('32 Karten, drei Spieler, zehn Karten pro Hand und zwei im Skat. Vorhand sitzt links vom Geber (Hinterhand). Reizen: Mittelhand gegen Vorhand, dann Hinterhand gegen den Sieger. Reizwerte sind die möglichen Spielwerte: 18, 20, 22, 23, 24, 27, 30 …', '32 cards, three players, ten cards each and two in the Skat. Forehand sits left of the dealer (rearhand). Bidding: middlehand against forehand, then rearhand against the winner. Bids are possible game values: 18, 20, 22, 23, 24, 27, 30 …')}</p>
      <p>${tx('Der Alleinspieler nimmt den Skat auf und drückt zwei Karten, oder er spielt Hand. Dann sagt er Kreuz, Pik, Herz, Karo, Grand oder Null an. Im Handspiel sind Schneider angesagt, Schwarz angesagt und Ouvert (Karten offen) möglich. Null kennt Null, Null Hand, Null Ouvert und Null Ouvert Hand.', 'The declarer takes the Skat and presses two cards, or plays Hand. They then call clubs, spades, hearts, diamonds, Grand or Null. In a Hand game Schneider announced, Schwarz announced and Ouvert (cards open) are possible. Null comes as Null, Null Hand, Null Ouvert and Null Ouvert Hand.')}</p>
      <p>${tx('Trumpf: die vier Buben (Kreuz, Pik, Herz, Karo), im Farbspiel dazu die Trumpffarbe. Grand: nur Buben. Null: kein Trumpf, Reihenfolge A K D B 10 9 8 7. Augen: Ass 11, Zehn 10, König 4, Dame 3, Bube 2. 61 Augen gewinnen, 90 sind Schneider, alle Stiche Schwarz.', 'Trumps: the four jacks (clubs, spades, hearts, diamonds), in a suit game plus the trump suit. Grand: jacks only. Null: no trumps, order A K Q J 10 9 8 7. Card points: ace 11, ten 10, king 4, queen 3, jack 2. 61 wins, 90 is Schneider, all tricks Schwarz.')}</p>
      <p>${tx('Spielwert = Grundwert (Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24) × (Spitzen + Spielstufen). Spitzen: mit/ohne aufeinanderfolgende Trümpfe von Kreuz-Bube an. Spielstufen: Spiel 1, Hand 1, Schneider 1, Schneider angesagt 1, Schwarz 1, Schwarz angesagt 1, Ouvert 1. Null: 23, Hand 35, Ouvert 46, Ouvert Hand 59.', 'Game value = base (diamonds 9, hearts 10, spades 11, clubs 12, Grand 24) × (matadors + game levels). Matadors: with/without consecutive trumps from the jack of clubs. Levels: game 1, Hand 1, Schneider 1, Schneider announced 1, Schwarz 1, Schwarz announced 1, Ouvert 1. Null: 23, Hand 35, Ouvert 46, Ouvert Hand 59.')}</p>
      <p>${tx('Abrechnung: Gewonnen = Spielwert + 50. Verloren = −2 × Spielwert − 50, die beiden Gegner bekommen je 30. Wer mehr bietet, als sein Spiel wert ist, hat sich überreizt und verliert. Wer Null spielt, darf keinen Stich machen.', 'Scoring: won = game value + 50. Lost = −2 × game value − 50, each opponent gets 30. Bidding above the game value is an overbid and loses. In Null the declarer must not win a trick.')}</p>
      <p>${tx('Varianten (Host-Menü): Ramsch, wenn alle passen – nur Buben sind Trumpf, wer die meisten Augen sammelt, verliert sie als Minuspunkte, ein Durchmarsch bringt 120. Ohne Ramsch gibt Vorhand ein Spiel an oder wirft ein. Bockrunden: Wird ein Spiel verloren oder endet 60:60, zählen die nächsten drei Spiele doppelt.', 'Variants (host menu): Ramsch when everyone passes – only jacks are trumps, whoever collects the most points loses them as negative points, taking every trick scores 120. Without Ramsch forehand may call a game or throw in. Bock rounds: when a game is lost or ends 60:60, the next three games count double.')}</p>`;
    },
    lobbyExtra() {
      return `<section class="sk-lobby"><h3>${tx('Skat am Stammtisch', 'Skat at the regulars’ table')}</h3><p>${tx('Reizen, drücken, ansagen – drei Spieler, 32 Karten und ein ehrlicher Blick auf die Augen. Ramsch und Bockrunden stellt der Host im Menü ein.', 'Bid, press, declare – three players, 32 cards and an honest count of card points. The host enables Ramsch and Bock rounds in the menu.')}</p></section>`;
    },
    onState(S) {
      const g = S.g; if (!g) return;
      if (key !== g.key || stage !== g.stage) { key = g.key; stage = g.stage; selected.clear(); bidPick = 0; if (g.stage === 'declare') form = { type: 'suit', suit: 'c', ouvert: false, schneider: false, schwarz: false }; }
      for (const c of selected) if (!g.hand?.includes(c)) selected.delete(c);
    },
    playerInfo: (p) => `${p.matchPoints || 0} ${tx('Punkte', 'points')} · ${p.cards || 0} ${tx('Karten', 'cards')}`,
    status: (S) => S.phase === 'playing' ? `${tx('Spiel', 'Game')} ${S.g.dealNo}/${S.g.deals}${S.g.bock?.now ? ' · Bock' : ''} · ${S.g.stage === 'play' ? `${tx('Stich', 'Trick')} ${Math.min(10, Object.values(S.g.tricks).reduce((a, b) => a + b, 0) + 1)}/10` : headline(S).replace(/<[^>]+>/g, '')}` : null,
    hint(S) {
      const g = S.g, me = S.turnId === S.you?.id;
      if (g.stage === 'deal-over') return tx('Spiel abgerechnet. Der Host gibt als Nächstes neu.', 'Game scored. The host deals the next game.');
      if (!g.hand) return tx('Du schaust zu.', 'You are watching.');
      if (g.stage === 'bid') return me ? (g.bd.phase === 'call' ? tx('Du bist mit Reizen dran: Wert nennen oder passen.', 'Your bid: name a value or pass.') : tx('Hältst du das Gebot oder passt du?', 'Do you hold the bid or pass?')) : tx('Reizen läuft. Deine Hand bleibt privat.', 'Bidding is under way. Your hand stays private.');
      if (g.stage === 'ramschChoice') return me ? tx('Alle haben gepasst: Spiel ansagen oder ' + (g.ramsch ? 'Ramsch spielen.' : 'einwerfen.'), 'Everyone passed: call a game or ' + (g.ramsch ? 'play Ramsch.' : 'throw in.')) : tx('Vorhand entscheidet über das Spiel.', 'Forehand decides.');
      if (g.stage === 'pickup') return me ? tx('Skat aufnehmen oder Hand spielen?', 'Take the Skat or play Hand?') : tx('Der Alleinspieler entscheidet über den Skat.', 'The declarer decides about the Skat.');
      if (g.stage === 'discard') return me ? tx('Wähle zwei Karten zum Drücken.', 'Select two cards to press.') : tx('Der Alleinspieler drückt.', 'The declarer is pressing.');
      if (g.stage === 'declare') return me ? tx('Sag dein Spiel an.', 'Call your game.') : tx('Der Alleinspieler sagt an.', 'The declarer is calling the game.');
      return me ? tx('Eine erlaubte Karte wählen, dann Ausspielen bestätigen.', 'Select a legal card, then confirm Play.') : tx('Deine Hand bleibt privat. Warte auf deinen Stich.', 'Your hand stays private. Wait for your trick.');
    },
    main(S) {
      const g = S.g, inRound = S.players.filter((p) => p.inRound);
      let felt;
      if (g.stage === 'bid') felt = `<div class="sk-bid"><b>${g.bd.value || '—'}</b><span>${tx('aktuelles Gebot', 'current bid')}</span><small>${g.passed.map((id) => name(S, id) + ' ' + tx('passt', 'passes')).join(' · ')}</small></div>`;
      else if (['ramschChoice', 'pickup', 'discard', 'declare'].includes(g.stage)) felt = `<div class="sk-skat"><div class="sk-skat-cards">${g.stage === 'pickup' || g.stage === 'ramschChoice' ? '<i></i><i></i>' : '<i class="gone"></i><i class="gone"></i>'}</div><span>${tx('Skat', 'Skat')}</span></div>`;
      else if (g.stage === 'play') {
        const tr = g.trick.length ? g.trick : g.lastTrick?.cards || [];
        felt = tr.length ? `<div class="sk-trick">${tr.map((p) => `<article><span>${name(S, p.id)}</span>${card(p.card, 'disabled tabindex="-1"')}</article>`).join('')}</div>${!g.trick.length && g.lastTrick ? `<p>${tx('Letzter Stich', 'Last trick')}: ${name(S, g.lastTrick.winner)}</p>` : ''}` : `<p>${name(S, S.turnId)} ${tx('spielt aus', 'leads')}.</p>`;
      } else felt = resultHTML(S, g.lastDeal);
      const open = g.open ? `<div class="sk-open"><small>${tx('Ouvert – offene Karten von', 'Ouvert – open cards of')} ${name(S, g.declarer)}</small><div>${sortHand(g.open).map((c) => card(c, 'disabled tabindex="-1"')).join('')}</div></div>` : '';
      return `<div class="kg-table sk-world"><header class="sk-head"><small>SKAT</small><h2>${headline(S)}</h2><p>${g.bock?.now ? 'Bockrunde · ' : ''}${g.bock?.left ? tx(`Noch ${g.bock.left} Bockspiele`, `${g.bock.left} Bock games left`) : ''}</p></header>
        <section class="sk-felt" aria-label="${tx('Tischmitte', 'Table centre')}">${felt}</section>${open}
        <ol class="sk-ledger">${inRound.map((p) => `<li class="${p.declarer ? 'decl' : ''}"><b>${name(S, p.id)}</b><span>${seatLabel(p)}${p.declarer ? ' · ' + tx('Alleinspieler', 'declarer') : ''}</span><span>${p.tricks || 0} ${tx('Stiche', 'tricks')}</span><strong>${p.matchPoints || 0}</strong></li>`).join('')}</ol></div>`;
    },
    dockKey: (S) => JSON.stringify([S.phase, S.g?.key, S.g?.stage, S.g?.revision, S.g?.hand, [...selected], form, bidPick, S.turnId, S.gamePaused, commands.blocked(S)]),
    dock(S) {
      const g = S.g, off = commands.blocked(S), me = S.turnId === S.you.id, btn = (a, label, extra = '', cls = 'btn-brass') => `<button class="btn ${cls}" data-g="${a}" ${extra} ${off ? 'disabled' : ''}>${label}</button>`;
      if (g.stage === 'deal-over') return S.you.isHost ? btn('sk-next', tx('Nächstes Spiel', 'Next game')) : '';
      if (!g.hand) return '';
      let controls = '';
      if (me && g.stage === 'bid') {
        if (g.bd.phase === 'call') {
          const options = g.bids.filter((v) => v > g.bd.value), pick = options.includes(bidPick) ? bidPick : options[0];
          controls = `<label class="sk-pick">${tx('Gebot', 'Bid')} <select id="sk-bid" aria-label="${tx('Gebot', 'Bid')}">${options.slice(0, 40).map((v) => `<option value="${v}" ${v === pick ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${btn('sk-bid', tx('Reizen', 'Bid'), `data-v="${pick}"`)}${btn('sk-pass', tx('Passen', 'Pass'), '', '')}`;
        } else controls = `${btn('sk-hold', `${tx('Ja, halte', 'Yes, hold')} ${g.bd.value}`)}${btn('sk-pass', tx('Passen', 'Pass'), '', '')}`;
      } else if (me && g.stage === 'ramschChoice') controls = `${btn('sk-ramsch', tx('Spiel ansagen', 'Call a game'), 'data-play="1"')}${btn('sk-ramsch', g.ramsch ? 'Ramsch' : tx('Einwerfen', 'Throw in'), 'data-play="0"', '')}`;
      else if (me && g.stage === 'pickup') controls = `${btn('sk-pickup', tx('Skat aufnehmen', 'Take the Skat'), 'data-take="1"')}${btn('sk-pickup', tx('Hand spielen', 'Play Hand'), 'data-take="0"', '')}`;
      else if (me && g.stage === 'discard') controls = `<span role="status">${selected.size}/2 ${tx('zum Drücken gewählt', 'selected to press')}</span>${btn('sk-discard', tx('Drücken', 'Press'), selected.size === 2 ? '' : 'disabled')}`;
      else if (me && g.stage === 'declare') {
        const t = (type, suit, label) => `<button class="btn sk-chip ${form.type === type && (type !== 'suit' || form.suit === suit) ? 'on' : ''}" data-g="sk-form" data-k="game" data-t="${type}" data-s="${suit || ''}" aria-pressed="${form.type === type && (type !== 'suit' || form.suit === suit)}" ${off ? 'disabled' : ''}>${label}</button>`;
        const flag = (k, label) => `<label class="sk-flag"><input type="checkbox" data-g="sk-form" data-k="${k}" ${form[k] ? 'checked' : ''} ${off ? 'disabled' : ''}> ${label}</label>`;
        const ouvertOk = g.isHand || form.type === 'null';
        controls = `<div class="sk-games">${['c', 's', 'h', 'd'].map((s) => t('suit', s, deckSuitName(s))).join('')}${t('grand', '', 'Grand')}${t('null', '', 'Null')}</div>
          <div class="sk-flags">${g.isHand && form.type !== 'null' ? flag('schneider', tx('Schneider angesagt', 'Schneider announced')) + flag('schwarz', tx('Schwarz angesagt', 'Schwarz announced')) : ''}${ouvertOk ? flag('ouvert', 'Ouvert') : ''}</div>${btn('sk-declare', tx('Ansagen', 'Declare'))}`;
      } else if (g.stage === 'play') {
        const sel = [...selected][0];
        controls = `<span role="status">${sel ? '' : tx('Karte auswählen', 'Select a card')}</span>${me ? btn('sk-play', tx('Ausspielen', 'Play card'), sel && g.legal.includes(sel) ? '' : 'disabled') : ''}`;
      }
      const selectable = me && (g.stage === 'play' || g.stage === 'discard');
      return `<div class="sk-hand" aria-label="${tx('Eigene Hand', 'Your hand')}">${sortHand(g.hand).map((c) => card(c, `data-g="sk-card" data-card="${c}" aria-pressed="${selected.has(c)}" ${off || !selectable || g.stage === 'play' && !g.legal.includes(c) ? 'disabled' : ''}`, selected.has(c) ? 'sk-selected' : '')).join('')}</div><div class="sk-actions">${controls}</div>${commands.notice()}`;
    },
    onClick(t, S, e) {
      const a = t.dataset.g, g = S.g;
      if (a === 'refresh-state') return commands.refresh();
      if (commands.blocked(S)) return;
      if (a === 'sk-form') {
        if (t.dataset.k === 'game') { form.type = t.dataset.t; if (t.dataset.s) form.suit = t.dataset.s; if (form.type === 'null') { form.schneider = form.schwarz = false; } if (form.type !== 'null' && !g.isHand) form.ouvert = false; }
        else { form[t.dataset.k] = t.checked; if (t.dataset.k === 'schwarz' && t.checked) form.schneider = true; if (t.dataset.k === 'schneider' && !t.checked) form.schwarz = false; }
        return kit.render();
      }
      if (a === 'sk-card') {
        const c = t.dataset.card;
        if (g.stage === 'discard') { if (selected.has(c)) selected.delete(c); else if (selected.size < 2) selected.add(c); } else selected = new Set([c]);
        kit.render(); document.querySelector(`[data-g=sk-card][data-card="${c}"]`)?.focus({ preventScroll: true }); return;
      }
      if (e?.detail > 1) return;
      const data = { key: g.key, revision: g.revision };
      if (a === 'sk-bid') commands.run('bid', { ...data, action: 'bid', value: Number(document.getElementById('sk-bid')?.value || t.dataset.v) });
      else if (a === 'sk-hold') commands.run('bid', { ...data, action: 'hold' });
      else if (a === 'sk-pass') commands.run('bid', { ...data, action: 'pass' });
      else if (a === 'sk-ramsch') commands.run('ramschChoice', { ...data, play: t.dataset.play === '1' });
      else if (a === 'sk-pickup') commands.run('pickup', { ...data, take: t.dataset.take === '1' });
      else if (a === 'sk-discard') commands.run('discard', { ...data, cards: [...selected] });
      else if (a === 'sk-declare') commands.run('declare', { ...data, game: { ...form } });
      else if (a === 'sk-play') commands.run('play', { ...data, card: [...selected][0] });
      else if (a === 'sk-next') commands.run('nextDeal', data);
    },
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'sk-bid') { bidPick = Number(e.target.value); kit.render(); } });
}
