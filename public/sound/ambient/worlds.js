// EXP-F5: Standard-Atmosphäre je Spiel, abgeleitet aus den Welten der Erlebnis-Roadmap.
// Ein Spielpaket kann jederzeit selbst Sound.ambient(name) setzen; das hier ist nur der Ausgangswert.
// Atmosphäre ist im Mixer standardmäßig aus (0 %), ohne Freigabe der Spieler ist also nichts zu hören.
const SALON = ['poker', 'omaha', 'omaha-hi-lo', 'seven-card-stud', 'short-deck', 'blackjack', 'wuerfelpoker', 'hearts', 'stichmeister', 'monopoly-deal', 'wuerfel-auktion', 'chicago', 'luegenbaron', 'praesident', 'mogeln'];
const KAMIN = ['maumau', 'skat', 'doppelkopf', 'durak', 'zehnetappen', 'sechs-nimmt', 'farbenchaos', 'stapelrennen', 'five-card-draw', 'exploding-deck',
  'kniffel', 'shutthebox', 'zehntausend', 'muehle', 'dame', 'reversi', 'schach', 'hex', 'viergewinnt', 'backgammon', 'scrabble', 'monopoly',
  'spiel-des-lebens', 'huetchen', 'labyrinth-brett', 'gebietskampf', 'staedtehandel', 'werhatdasgesagt', 'story-chaos', 'zahlenreihe', 'gedaechtnis-kueche'];
const KNEIPE = ['maexchen', 'schocken', 'luegenwuerfel', 'risiko-wuerfeln', 'wuerfeljagd', 'wuerfelduell', 'monsterwuerfel', 'schlagfertig', 'wer-bin-ich', 'bildunterschrift'];
const MEER = ['schwimmen', 'schiffe', 'domino', 'schatzinsel', 'schatzgraeber', 'letzter-schutzplatz', 'kistenchaos'];
const STADTREGEN = ['scotland-yard', 'doppelagent', 'kritzelpost', 'scheinwerfer-flucht', 'tickendes-paket', 'reaktor-notfall', 'sortierstation', 'pfeilfieber'];
const WALD = ['werwolf', 'jaeger-schatten', 'labyrinth-chaos', 'survival-abend'];
const JAHRMARKT = ['party-brett', 'regelwahnsinn', 'malen-raten', 'schaetzmeister', 'kronenjagd', 'schubsarena', 'rhythmus-rausch', 'bomben-duell', 'broeckelboden',
  'brueckenroulette', 'fallenbauer', 'geschenkdiebe', 'geschenkfaenger', 'gummiband-challenge', 'laser-huepfer', 'minenlauf', 'puzzle-panik', 'stillgestanden',
  'turmbauer', 'wortjagd', 'zahlenzoo', 'infektionsjagd', 'modifikatoren', 'chaos-modus'];
export const WORLD_AMBIENT = Object.freeze(Object.fromEntries([
  ...SALON.map(id => [id, 'salon']), ...KAMIN.map(id => [id, 'kamin']), ...KNEIPE.map(id => [id, 'kneipe']), ...MEER.map(id => [id, 'meer']),
  ...STADTREGEN.map(id => [id, 'stadtregen']), ...WALD.map(id => [id, 'wald-nacht']), ...JAHRMARKT.map(id => [id, 'jahrmarkt']),
]));
// Einzelspieler bleiben bewusst ohne Atmosphäre (Konzentration); sie können sie selbst setzen.
export const worldAmbient = (gameId) => (gameId && Object.hasOwn(WORLD_AMBIENT, gameId) ? WORLD_AMBIENT[gameId] : null);
