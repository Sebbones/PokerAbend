// Mau-Mau im Browser (Regeln: games/maumau/room.js). Bedienung kommt aus kitShedding in /games/kit.js.
// Kartenblatt unter „Ich“ umschaltbar: französisch (Kreuz, Pik, Herz, Karo) oder deutsch (Eichel, Grün, Herz, Schellen).
// Gespielt wird immer mit denselben Karten – das deutsche Blatt ist nur eine andere Ansicht (Bube = Unter, Dame = Ober).
'use strict';
{
  // Kartenblatt (französisch/deutsch) kommt aus /games/kit.js
  const german = isGermanDeck;
  const card = deckCard;
  const translate = deckTranslate;
  const suitName = deckSuitName;
  const suitSign = deckSuitSign;
  const deSuit = deckSuit;
  const RANKS = '789TJQKA';
  const SUITS = 'cshd';

  const SUIT_ACC = {
    fr: { c: 'ein ♣ Kreuz', s: 'ein ♠ Pik', h: 'ein ♥ Herz', d: 'ein ♦ Karo' },
    de: { c: 'eine Eichel', s: 'ein Grün', h: 'ein Herz', d: 'eine Schelle' },
  };
  const RANK_ACC = { 7: 'eine 7', 8: 'eine 8', 9: 'eine 9', T: 'eine 10', J: 'einen Buben', Q: 'eine Dame', K: 'einen König', A: 'ein Ass' };
  const rankAcc = (r) => (german() ? { J: 'einen Unter', Q: 'einen Ober' }[r] : null) || RANK_ACC[r];

  kitShedding({
    id: 'maumau',
    name: 'Mau-Mau',
    // Erste Schritte beim ersten Spiel (3 Schritte, abschaltbar unter „Ich“)
    intro: [
      ["Ziel", I18n.html("Werde als Erster alle Karten los. Leg eine Karte mit gleicher <b>Farbe</b> oder gleichem <b>Wert</b> auf die Ablage.")],
      ["Deine Karten", "Karten mit Goldrand passen gerade – antippen legt sie (am Computer auch auf die Ablage ziehen). Passt nichts: „Karte ziehen“."],
      ["Sonderkarten", I18n.html("<b>7</b>: der Nächste zieht 2. <b>8</b>: der Nächste setzt aus. <b>Bube</b>: du wünschst dir eine Farbe. Alles Weitere unter „?“.")],
    ],
    card,
    translate,
    // „Leg ein ♥ Herz oder einen König“ – was gerade passt
    playHint(g) {
      const suit = g.wish || g.top[1];
      const parts = [SUIT_ACC[german() ? 'de' : 'fr'][suit]];
      if (!g.wish) parts.push(rankAcc(g.top[0]));
      if (g.playable.some((c) => c[0] === 'J' && c[1] !== suit && g.top[0] !== 'J')) parts.push(rankAcc('J'));
      return I18n.html`Leg ${parts.join(' oder ')}${g.wish ? ' (gewünscht)' : ''}`;
    },
    pendingHint: () => 'Leg eine 7 drauf',
    pendingText: (g) => I18n.html`der Nächste zieht ${g.pending}, außer er legt eine 7`,
    sort: {
      color: (c) => SUITS.indexOf(c[1]) * 10 + RANKS.indexOf(c[0]),
      number: (c) => RANKS.indexOf(c[0]) * 10 + SUITS.indexOf(c[1]),
    },
    needsWish: (c) => c[0] === 'J',
    get wishes() { return [...SUITS].map((s) => [s, `${suitSign(s)} ${suitName(s)}`, !german() && (s === 'h' || s === 'd') ? 'red' : '']); },
    wishName: (w) => suitName(w),
    // Gewünschte Farbe groß neben der Ablage
    wishBadge: (w) => `<span class="mm-wish-sign ${!german() && (w === 'h' || w === 'd') ? 'red' : ''}">${german() ? deSuit(w) : SUIT_SIGN[w]}</span>`,
    wishLabel: 'Welche Farbe wünschst du dir?',
    lastWord: 'Mau!',
    prefs: deckPrefHTML,
    get short() {
      return [
        I18n.html('Leg eine Karte mit gleicher <b>Farbe</b> oder gleichem <b>Wert</b>.'),
        'Kannst du nicht: eine Karte ziehen – passt sie, darfst du sie gleich legen.',
        I18n.html('<b>7</b>: Der Nächste zieht 2 – oder legt selbst eine 7 (dann 4, 6 …).'),
        I18n.html('<b>8</b>: Der Nächste setzt aus.'),
        translate(I18n.html('<b>Bube</b>: auf alles außer Bube, du wünschst dir eine Farbe.')),
        'Wer zuerst keine Karten mehr hat, gewinnt die Runde.',
        'Punkte: die Augen der Restkarten – wenig ist gut.',
      ];
    },
    house: () => ['Ab 6 Spielern mit zwei Kartenspielen'],
    get rules() {
      return translate(I18n.html`<p>Leg eine Karte, die in <b>Farbe oder Wert</b> zur obersten Karte passt. Wer zuerst keine Karten mehr hat, gewinnt die Runde.</p>
      <ul>
        <li><b>7</b>: Der Nächste zieht 2 – außer er legt auch eine 7, dann zieht der Übernächste 4 usw.</li>
        <li><b>8</b>: Der Nächste setzt aus.</li>
        <li><b>Bube</b>: passt auf alles (nur nicht auf einen Buben) – du wünschst dir eine Farbe.</li>
        <li>Kannst du nicht, ziehst du eine Karte. Passt sie, darfst du sie gleich spielen, sonst „Weiter“.</li>
        <li>„Mau!“ bei der letzten Karte sagt die Seite für dich – außer mit der Hausregel „Mau sagen“: Dann tippst du bei der vorletzten Karte selbst auf „Mau“.</li>
      </ul>
      <p><b>Wertung über den Abend:</b> Der Gewinner bekommt 0 Punkte, alle anderen die Augen ihrer Karten (7–10 = Wert, Bube 2, Dame 3, König 4, Ass 11). Wenig Punkte sind gut.</p>`)
        + (german() ? I18n.html('<p>Deutsches Blatt: Eichel = Kreuz, Grün = Pik, Herz = Herz, Schellen = Karo; Unter = Bube, Ober = Dame.</p>') : '');
    },
  });
}
