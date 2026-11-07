// Backlog: die zentrale Arbeitsliste für alle noch geplanten Spiele und Party-Funktionen. Neue Ideen kommen nur noch hierher.
//
// Spiel-Eintrag: id, name, description (ein Satz), category ('karten'|'wuerfel'|'brett'|'party'), minPlayers, maxPlayers, duration (Minuten),
//   status ('next' | 'planned'), paeckchen ('4', '5' … 'spaeter', 'gross'), bauart (nur Party: 'A' Runden/Text, 'B' gleichzeitig solo mit gleichem Seed –
//   jeder spielt lokal, der Server prüft das Ergebnis –, 'C' Echtzeit zusammen), vorbild (optional, nur Mechanik), rules (3–8 Stichpunkte,
//   Standardregeln), houseRules (Ideen für Hausregeln), art (SVG, Bausteine in art-kit.js).
// Feature-Eintrag (kein Spiel, erscheint auf der Roadmap): id, name, type: 'feature', paeckchen, status, beschreibung.
//
// Sichtbarkeit im Hub: 'next' steht in seiner Kategorie ausgegraut mit der Plakette „Bald“ (kein Hosten, Klick zeigt Beschreibung und Regeln).
// 'planned' erscheint auf der Roadmap; 'next' bleibt zusätzlich mit „Bald“ in der Spieleliste.
//
// Ablauf: Wird ein Spiel gebaut, kommt es nach games/<id>/, wird in games/index.js registriert und fliegt hier raus.
// Bei jedem fertigen Päckchen/jeder fertigen Funktion auch games/roadmap.js pflegen:
// Etappe mit dem Commit-Datum auf 'erledigt', die nächste auf 'jetzt' setzen.
// Fertig: Päckchen 9, Abend-Modus, Abend-Rückblick, Termin & Spiele-Abstimmung und Erfolge & Abzeichen.
// Ist ein Päckchen fertig, werden die Einträge des nächsten Päckchens auf status 'next' gesetzt. (Fertig: Päckchen 2b – Schlagfertig, Wer hat das gesagt? – Päckchen 4 – Mogeln, Präsident, Durak, Omaha – Päckchen 5 – Würfelpoker, Lügenwürfel, Chicago, Reversi, Dame, Domino – und Päckchen 6 – Zahlenzoo, Gedächtnisküche, Pfeilfieber, Sortierstation, Tickendes Paket, Werwolf samt Bauart-B-Baustein.)
// Fertig: Päckchen 10 mit Klassiker-Varianten und Spiel des Lebens. Als Nächstes: Benachrichtigungen.
import { fan, cardsChip, dice, stairs, swim, bubbles, numberLine, flapBox, battle, mill, connect4, pawns, reversi, checkers, dominoes, hexBoard, chess, territory, glyph } from './art-kit.js';

const spiel = (o) => ({ type: 'game', status: 'planned', houseRules: [], ...o });
const funktion = (o) => ({ type: 'feature', status: 'planned', ...o });
const CARD = { fill: '#F7F3E8' };

import { SINGLEPLAYER_PLANNED } from './singleplayer/planned.js';
export const PLANNED = [
  ...SINGLEPLAYER_PLANNED,




  spiel({ id: 'regelwahnsinn', name: 'Regelwahnsinn', category: 'party', bauart: 'A', minPlayers: 3, maxPlayers: 12, duration: 10, paeckchen: 'spaeter',
    description: "Jede Runde eine neue Regel: Wer den Überblick behält, sammelt Punkte.",
    rules: ["Alle starten mit einer einfachen offenen Grundaufgabe für die Runde.","Nach jeder Runde kommt eine weitere sichtbare Zusatzregel dazu.","Korrekte Antworten unter allen aktiven Regeln bringen Punkte; die höchste Summe gewinnt."], art: glyph('arrows'),
  }),
  spiel({ id: 'jaeger-schatten', name: 'Jäger & Schatten', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: "Im gemeinsamen Echtzeitfeld jagen, ausweichen und unerkannt entkommen.",
    rules: ["Ein Teil der Spieler jagt, die übrigen verstecken sich als Schatten auf dem Feld.","Alle bewegen sich gleichzeitig; Berührung durch einen Jäger deckt einen Schatten auf.","Nach Ablauf der Zeit gewinnen die entkommenen Schatten, sonst das Jägerteam."], art: glyph('agent'),
  }),
  spiel({ id: 'infektionsjagd', name: 'Infektionsjagd', category: 'party', bauart: 'C', minPlayers: 3, maxPlayers: 12, duration: 5, paeckchen: 'spaeter',
    description: "Eine Berührung steckt an – bleibt jemand bis zum Schluss unentdeckt?",
    rules: ["Ein zufälliger Spieler beginnt infiziert, alle anderen fliehen im gemeinsamen Feld.","Wer von einem Infizierten berührt wird, gehört ebenfalls zu dessen Team.","Die Überlebenden gewinnen nach Ablauf der Zeit; vorher gewinnt eine vollständige Infektion."], art: glyph('monster'),
  }),
  spiel({ id: 'letzter-schutzplatz', name: 'Letzter Schutzplatz', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 12, duration: 5, paeckchen: 'spaeter',
    description: "Rechtzeitig einen sicheren Platz erreichen, bevor die nächste Gefahr kommt.",
    rules: ["Alle bewegen sich gleichzeitig auf einer Fläche mit markierten Schutzplätzen.","Vor jeder Gefahrenphase werden die sicheren Plätze angezeigt und eine Frist läuft.","Außerhalb eines Schutzplatzes scheidest du aus; bis zum Schluss werden Plätze weniger."], art: glyph('shield'),
  }),
  spiel({ id: 'kistenchaos', name: 'Kistenchaos', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: "Kisten in Echtzeit verschieben und trotz des Gedränges das eigene Ziel erreichen.",
    rules: ["Alle bewegen sich gleichzeitig auf einem Feld voller verschiebbarer Kisten.","Kisten müssen zu passenden Zielen geschoben werden und dürfen andere Wege versperren.","Eine feste Spielzeit entscheidet; die meisten richtig platzierten Kisten gewinnen."], art: glyph('puzzle'),
  }),
  funktion({ id: 'survival-abend', name: 'Survival-Abend', paeckchen: 'spaeter', beschreibung: 'Ein Party-Programm auf Basis von Päckchen 7: Wer eine Runde verliert, verliert ein Leben; am Ende gewinnt, wer übrig bleibt.' }),
  funktion({ id: 'chaos-modus', name: 'Chaos-Modus', paeckchen: 'spaeter', beschreibung: 'Zufällig gewählte Zusatzregeln verändern jede Partie; alle sehen die aktiven Regeln vor dem Start.' }),


  // ---------- Später ----------


  spiel({
    id: 'gummiband-challenge', name: 'Gummiband-Challenge', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Ein Gummiband möglichst lange in der Zielzone halten.',
    rules: [
      'Alle spielen gleichzeitig solo, die Zielzone verändert sich für alle gleich (gleicher Seed).',
      'Man dehnt das Gummiband per Tipp oder Druck und muss die Spannung in der Zone halten.',
      'Außerhalb der Zone gibt es keine Punkte; reißt das Band (zu stark), ist der Durchgang vorbei.',
      'Der Server prüft die Eingaben, wer die meiste Zeit in der Zone war, gewinnt.',
    ],
    houseRules: ['Zone wird kleiner', 'Mehrere Durchgänge'],
    art: glyph('rope', '#C99A45'),
  }),
  spiel({
    id: 'geschenkfaenger', name: 'Geschenkfänger', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Geschenke mit dem Korb fangen und Bomben ausweichen.',
    rules: [
      'Alle sehen denselben Fall von Geschenken und Bomben (gleicher Seed), jeder spielt lokal.',
      'Man bewegt einen Korb nach links und rechts und fängt Geschenke.',
      'Verschiedene Geschenke geben verschiedene Punkte; eine Bombe nimmt Punkte weg.',
      'Nach 30 Sekunden gewinnt, wer die meisten Punkte hat; der Server prüft den Ablauf.',
    ],
    houseRules: ['Goldene Geschenke', 'Korb wird mit jeder Bombe kleiner'],
    art: glyph('gift', '#B8433F'),
  }),
  spiel({
    id: 'rhythmus-rausch', name: 'Rhythmus-Rausch', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Im Takt tippen: Je genauer, desto mehr Punkte.',
    rules: [
      'Alle bekommen dieselbe Notenfolge (gleicher Seed), die in Bahnen auf eine Linie zulaufen.',
      'Man tippt genau dann, wenn eine Note die Linie erreicht.',
      'Perfekte, gute und verpasste Treffer geben unterschiedlich viele Punkte; Serien geben einen Bonus.',
      'Der Server wertet die Tipp-Zeitpunkte aus; die höchste Punktzahl gewinnt.',
    ],
    houseRules: ['Nur eine Bahn', 'Schnelleres Tempo'],
    art: glyph('note', '#5A468F'),
  }),
  spiel({
    id: 'puzzle-panik', name: 'Puzzle-Panik', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Ein Schiebepuzzle so schnell wie möglich lösen.',
    rules: [
      'Alle bekommen dasselbe verwürfelte Schiebepuzzle (gleicher Seed).',
      'Man verschiebt Teile in die Lücke, bis das Bild oder die Zahlenreihe stimmt.',
      'Gewonnen hat, wer zuerst fertig ist; nicht Fertige werden nach Fortschritt gewertet.',
      'Der Server prüft die Zugfolge.',
    ],
    houseRules: ['Größeres Puzzle', 'Strafsekunden pro unnötigem Zug'],
    art: glyph('puzzle', '#1F57C3'),
  }),
  spiel({
    id: 'wortjagd', name: 'Wortjagd', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'In einem Buchstabenfeld so viele Wörter wie möglich finden.',
    rules: [
      'Alle sehen dasselbe 4×4-Buchstabenfeld (gleicher Seed) und haben 60 Sekunden Zeit.',
      'Wörter entstehen aus Buchstaben, die waagerecht, senkrecht oder diagonal nebeneinanderliegen; kein Feld doppelt.',
      'Wörter ab drei Buchstaben zählen, längere Wörter geben mehr Punkte.',
      'Wörter, die mehrere Spieler gefunden haben, zählen für niemanden.',
      'Der Server prüft die Wörter mit einer Wortliste.',
    ],
    houseRules: ['Auch doppelt gefundene Wörter zählen', '5×5-Feld', 'Mindestlänge 4'],
    art: glyph('letters', '#7A5238'),
  }),
  spiel({
    id: 'stillgestanden', name: 'Stillgestanden!', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    vorbild: 'Rotes Licht, grünes Licht – nur die Mechanik',
    description: 'Bei Grün laufen, bei Rot stillstehen – wer sich bewegt, muss zurück.',
    rules: [
      'Alle starten an einer Linie und laufen in Echtzeit zum Ziel.',
      'Bei grünem Signal darf man laufen, bei rotem muss man stillstehen.',
      'Wer sich bei Rot bewegt, geht zurück zum Start oder bekommt einen Zeitaufschlag.',
      'Wer zuerst das Ziel erreicht, gewinnt die Runde; die Signale kommen zufällig.',
    ],
    houseRules: ['Ohne Rückkehr zum Start', 'Fake-Signal'],
    art: glyph('figure', '#B8433F'),
  }),
  spiel({
    id: 'schatzgraeber', name: 'Schatzgräber', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Alle graben gleichzeitig in der Arena nach Schätzen – und weichen den Bomben aus.',
    rules: [
      'In einer Arena liegen verborgene Schätze und einige Bomben.',
      'Jeder bewegt sich in Echtzeit und gräbt unter sich; beim Graben steht man kurz still.',
      'Schätze geben Punkte, Bomben werfen einen kurz zurück.',
      'Nach der Spielzeit gewinnt, wer die meisten Schätze hat.',
    ],
    houseRules: ['Metalldetektor-Hinweise', 'Gegner können Fundstellen stehlen'],
    art: glyph('shovel', '#7A5238'),
  }),
  spiel({
    id: 'minenlauf', name: 'Minenlauf', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Über ein verminntes Feld zum Ziel – mit Zahlenhinweisen.',
    rules: [
      'Alle bekommen dasselbe Feld (gleicher Seed), Minen sind versteckt.',
      'Jedes aufgedeckte Feld zeigt, wie viele Minen in den Nachbarfeldern liegen.',
      'Man legt sich einen sicheren Weg von der linken zur rechten Seite.',
      'Eine Mine kostet Strafzeit; es gewinnt, wer zuerst und mit den wenigsten Fehlern durch ist.',
    ],
    houseRules: ['Mit Flaggen', 'Mehr Minen'],
    art: glyph('mines', '#2A2A2A'),
  }),
  spiel({
    id: 'labyrinth-chaos', name: 'Labyrinth-Chaos', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Ein Labyrinth, dessen Wände sich verändern – wer zuerst raus ist, gewinnt.',
    rules: [
      'Alle laufen gleichzeitig durch dasselbe Labyrinth zum Ausgang.',
      'In regelmäßigen Abständen öffnen und schließen sich einzelne Wände.',
      'Wer zuerst den Ausgang erreicht, bekommt die meisten Punkte, danach absteigend.',
      'Mehrere Durchgänge mit wachsender Größe.',
    ],
    houseRules: ['Nebel: nur die nähere Umgebung sichtbar', 'Schlüssel einsammeln'],
    art: glyph('maze', '#235D49'),
  }),
  spiel({
    id: 'schubsarena', name: 'Schubsarena', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Gegner von der schrumpfenden Plattform schubsen.',
    rules: [
      'Alle stehen auf einer runden Plattform und bewegen sich in Echtzeit.',
      'Mit einem Stoß schiebt man andere ein Stück zur Seite; der Stoß braucht kurz zum Aufladen.',
      'Wer von der Plattform fällt, scheidet aus; die Fläche wird mit der Zeit kleiner.',
      'Wer zuletzt auf der Plattform steht, gewinnt die Runde.',
    ],
    houseRules: ['Eis-Plattform (rutschig)', 'Stoß-Kraft wächst mit der Zeit'],
    art: glyph('push', '#1F57C3'),
  }),
  spiel({
    id: 'scheinwerfer-flucht', name: 'Scheinwerfer-Flucht', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, paeckchen: 'spaeter',
    description: 'Ein Scheinwerfer sucht die Arena ab – wer erwischt wird, fliegt raus.',
    rules: [
      'Ein Scheinwerfer wandert über eine Arena, alle bewegen sich in Echtzeit.',
      'Wer im Licht steht, sammelt Hitze; wird sie zu groß, scheidet man aus.',
      'Im Dunkeln bleiben ist sicher, aber Schlüssel für den Ausgang liegen im Hellen.',
      'Wer mit genug Schlüsseln als Erster den Ausgang erreicht, gewinnt.',
    ],
    houseRules: ['Zwei Scheinwerfer', 'Schneller werdendes Licht'],
    art: glyph('spotlight', '#2A2A2A'),
  }),
  spiel({
    id: 'brueckenroulette', name: 'Brückenroulette', category: 'party', bauart: 'A', minPlayers: 3, maxPlayers: 8, duration: 10, paeckchen: 'spaeter',
    description: 'Alle wählen gleichzeitig eine Planke – die vollste bricht.',
    rules: [
      'Pro Runde wählen alle gleichzeitig und geheim eine von drei Planken einer Brücke.',
      'Die Planke, auf der die meisten stehen, bricht (bei Gleichstand entscheidet der Zufall).',
      'Wer darauf stand, verliert einen Punkt; alle anderen kommen heil rüber.',
      'Nach acht Runden gewinnt, wer die wenigsten Punkte verloren hat.',
    ],
    houseRules: ['Vier Planken', 'Die leerste Planke bricht'],
    art: glyph('bridge', '#7A5238'),
  }),
  funktion({ id: 'modifikatoren', name: 'Modifikatoren', type: 'feature', paeckchen: 'spaeter', beschreibung: 'Zufällige oder vom Host gewählte Regelwürze für Partyspiele, z. B. doppelte Punkte, umgekehrte Wertung oder Zeitdruck – gilt für eine Runde oder die Partie.' }),

  // ---------- Groß ----------

  spiel({
    id: 'staedtehandel', name: 'Städtehandel (Catan-inspiriert)', category: 'brett', minPlayers: 2, maxPlayers: 4, duration: 60, paeckchen: 'gross',
    description: 'Rohstoffe erwürfeln, tauschen und eine eigene Stadt aufbauen.',
    rules: [
      'Das Spielfeld besteht aus sechseckigen Landschaften mit Zahlenchips; jede liefert einen Rohstoff.',
      'Wer an der Reihe ist, würfelt: Alle Siedlungen neben Feldern mit dieser Zahl bekommen Rohstoffe.',
      'Mit Rohstoffen baut man Straßen, Siedlungen und Städte oder kauft Entwicklungskarten.',
      'Man darf mit anderen Spielern und mit der Bank tauschen.',
      'Wer zuerst 10 Siegpunkte hat, gewinnt.',
    ],
    houseRules: ['Räuber bei einer Sieben', 'Längste Straße und größte Armee als Bonus', 'Spielfeld zufällig'],
    art: hexBoard(['#7FD39A', '#C99A45', '#E3C08A', '#9DB7E8', '#D33B35', '#F7F3E8', '#1C7A43']),
  }),
  spiel({
    id: 'gebietskampf', name: 'Gebietskampf (Risiko-inspiriert)', category: 'brett', minPlayers: 2, maxPlayers: 5, duration: 90, paeckchen: 'gross',
    description: 'Truppen verteilen, würfeln und Gebiete erobern, bis nur noch einer übrig ist.',
    rules: [
      'Eine Weltkarte ist in Gebiete geteilt; die Gebiete werden unter den Spielern verteilt und mit Truppen besetzt.',
      'Zu Beginn jeder Runde bekommt man Verstärkung nach Gebieten und Kontinenten und setzt sie frei ein.',
      'Man greift benachbarte Gebiete an: Angreifer und Verteidiger würfeln, die höheren Augen gewinnen, Verluste werden abgezogen.',
      'Wer ein Gebiet erobert, zieht Truppen nach; pro Runde mit einer Eroberung gibt es eine Karte.',
      'Am Ende des Zuges darf man einmal Truppen verschieben.',
      'Gewonnen hat, wer alle anderen besiegt oder seine geheime Mission erfüllt.',
    ],
    houseRules: ['Missionen statt Weltherrschaft', 'Kartentausch-Bonus steigt', 'Schnelle Variante mit weniger Gebieten'],
    art: territory(),
  }),
  // Erhaltene Ideen aus dem alten Party-Katalog (PR #2): ausschließlich Backlog, nicht startbar.
  spiel({
    id: 'turmbauer', name: 'Turmbauer', category: 'party', bauart: 'B', minPlayers: 2, maxPlayers: 10, duration: 2, paeckchen: 'spaeter',
    description: 'Bewegliche Blöcke im richtigen Moment auf dem eigenen Turm stapeln.',
    rules: ['Alle erhalten dieselbe Folge beweglicher Blöcke für ihren eigenen Turm.', 'Ein Tipp hält den nächsten Block an; passende Flächen sollen möglichst übereinanderliegen.', 'Nach der vereinbarten Zeit gewinnt der höchste gültige Turm.'],
    art: stairs(['#B78254', '#C99A45', '#E0C884']),
  }),
  spiel({
    id: 'geschenkdiebe', name: 'Geschenkdiebe', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 3, paeckchen: 'spaeter',
    description: 'Geschenke einsammeln und sie den anderen in einer gemeinsamen Arena wieder abluchsen.',
    rules: ['Alle bewegen sich gleichzeitig auf einer gemeinsamen Spielfläche.', 'Geschenke können eingesammelt und durch erlaubte Begegnungen anderen abgenommen werden.', 'Nach Ablauf der Runde gewinnt, wer die meisten Geschenke behalten hat.'],
    art: glyph('crown'),
  }),
  spiel({
    id: 'fallenbauer', name: 'Fallenbauer', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 4, paeckchen: 'spaeter',
    description: 'Gemeinsam Fallen platzieren und anschließend den entstandenen Parcours bestehen.',
    rules: ['Zuerst platzieren alle nacheinander Hindernisse auf einem gemeinsamen Parcours.', 'Anschließend versuchen alle gleichzeitig, das Ziel ohne Treffer zu erreichen.', 'Erfolgreiche Zieleinläufe bringen Punkte; nach den vereinbarten Runden zählt die Gesamtsumme.'],
    art: glyph('flag'),
  }),
  spiel({
    id: 'reaktor-notfall', name: 'Reaktor-Notfall', category: 'party', bauart: 'A', minPlayers: 2, maxPlayers: 8, duration: 6, paeckchen: 'spaeter',
    description: 'Gemeinsam Rätsel lösen, bevor eine fiktive Anlage überhitzt.',
    rules: ['Die Gruppe erhält mehrere zusammengehörige Hinweise und kleine Rätsel.', 'Richtige gemeinsame Entscheidungen stabilisieren die Anlage; Fehler kosten Zeit.', 'Alle gewinnen gemeinsam, wenn sie die Aufgaben vor Ablauf des Timers lösen.'],
    art: glyph('pen'),
  }),
  spiel({
    id: 'bomben-duell', name: 'Bomben-Duell', category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 3, paeckchen: 'spaeter',
    description: 'In einer eigenen Spielarena Sprengladungen setzen und rechtzeitig in Deckung gehen.',
    rules: ['Alle bewegen sich auf einem eigenen gemeinsamen Raster mit Hindernissen.', 'Platzierte Sprengladungen lösen nach einer sichtbaren Vorwarnzeit aus.', 'Wer die Runde übersteht, erhält Punkte; nach mehreren Runden gewinnt die höchste Summe.'],
    art: glyph('bomb'),
  }),
  funktion({ id: 'party-brett', name: 'Party-Brett', type: 'feature', paeckchen: 'gross', beschreibung: 'Ein Brettspiel, auf dem die Partyspiele als Aufgaben liegen: Ereignisfelder, Items und Sabotage sorgen für Abwechslung, Minispiele entscheiden um Felder und Punkte.' }),
];

// Nur die Spiele (ohne Funktionen) – das schickt der Server an die Startseite
export const plannedGames = () => PLANNED.filter((e) => e.type !== 'feature');
