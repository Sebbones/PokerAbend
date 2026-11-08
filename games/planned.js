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




  funktion({ id: 'survival-abend', name: 'Survival-Abend', paeckchen: 'spaeter', beschreibung: 'Ein Party-Programm auf Basis von Päckchen 7: Wer eine Runde verliert, verliert ein Leben; am Ende gewinnt, wer übrig bleibt.' }),
  funktion({ id: 'chaos-modus', name: 'Chaos-Modus', paeckchen: 'spaeter', beschreibung: 'Zufällig gewählte Zusatzregeln verändern jede Partie; alle sehen die aktiven Regeln vor dem Start.' }),


  // ---------- Später ----------


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

  // Erhaltene Ideen aus dem alten Party-Katalog (PR #2): ausschließlich Backlog, nicht startbar.
  spiel({
    id: 'reaktor-notfall', name: 'Reaktor-Notfall', category: 'party', bauart: 'A', minPlayers: 2, maxPlayers: 8, duration: 6, paeckchen: 'spaeter',
    description: 'Gemeinsam Rätsel lösen, bevor eine fiktive Anlage überhitzt.',
    rules: ['Die Gruppe erhält mehrere zusammengehörige Hinweise und kleine Rätsel.', 'Richtige gemeinsame Entscheidungen stabilisieren die Anlage; Fehler kosten Zeit.', 'Alle gewinnen gemeinsam, wenn sie die Aufgaben vor Ablauf des Timers lösen.'],
    art: glyph('pen'),
  }),
  funktion({ id: 'party-brett', name: 'Party-Brett', type: 'feature', paeckchen: 'gross', beschreibung: 'Ein Brettspiel, auf dem die Partyspiele als Aufgaben liegen: Ereignisfelder, Items und Sabotage sorgen für Abwechslung, Minispiele entscheiden um Felder und Punkte.' }),
];

// Nur die Spiele (ohne Funktionen) – das schickt der Server an die Startseite
export const plannedGames = () => PLANNED.filter((e) => e.type !== 'feature');
