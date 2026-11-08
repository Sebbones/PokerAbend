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






  // ---------- Später ----------



  // ---------- Groß ----------

  // Erhaltene Ideen aus dem alten Party-Katalog (PR #2): ausschließlich Backlog, nicht startbar.
];

// Nur die Spiele (ohne Funktionen) – das schickt der Server an die Startseite
export const plannedGames = () => PLANNED.filter((e) => e.type !== 'feature');
