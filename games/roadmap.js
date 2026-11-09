// Roadmap und Backlog gemeinsam pflegen: Bei jedem fertigen Päckchen/jeder fertigen Funktion
// diese Etappe mit dem Datum des passenden Git-Commits auf 'erledigt', die nächste auf 'jetzt' setzen.
// paeckchen/eintraege verweisen auf planned.js; geplante Inhalte hier nicht noch einmal abschreiben.
// Abschlussdaten geprüft: af1c42d, 1da6720, c75b458, 88f2293, e945d48, 522ebaa,
// 8bd8ec3, 2c82db2, 8197000, 703751d, b588e7d, 3d7366b (git log, Datum YYYY-MM-DD).
import { PLANNED } from './planned.js';
import { PLAYABLE_GAMES as GAMES } from './index.js';

const punkt = (id, titel, art, text, erledigt = false) => ({ id, titel, art, text, ...(erledigt ? { erledigt: true } : {}) });
const liste = (prefix, art, rows, erledigt = false) => rows.map(([titel, text], i) => punkt(`${prefix}-${i + 1}`, titel, art, text, erledigt));
const spiele = (ids) => ids.map((id) => punkt(id, GAMES[id].name, 'spiel', GAMES[id].description, true));

// Betrieb & Wartung: Update-Hinweis, Admin-Seite, Version, Browser-Fehler, Ausfall-Wächter, Backups (Speichern mitten in der Runde bleibt offen)
const BETRIEB_FERTIG = ['betrieb-1', 'betrieb-2', 'betrieb-3', 'betrieb-4', 'betrieb-5', 'betrieb-6'];

// Erledigte V2-Punkte mit dem Abschlussdatum des jeweiligen Pakets (docs/roadmap/plan.json, completed_at). Ein Punkt gilt nur dann als erledigt,
// wenn das Paket, das ihn umsetzt, in plan.json auf done steht – das prüft test/planning-consistency.test.js in beide Richtungen.
const V2_FERTIG_AM = {
  '2026-11-01': ['v2-bot-schwierigkeit', 'v2-audit', 'v2-backup-migration', 'v2-account-identity', 'technik-3', 'discord-1', 'discord-3', 'discord-4', 'v2-session-security'], // V2-00, V2-01, V2-02, V2-16
  '2026-11-07': ['discord-5', 'v2-historical-rankings', 'v2-player-profiles', 'v2-account-achievements', 'v2-profile-preferences', 'v2-privacy', 'v2-einstellungen', 'v2-erfolge-ausbauen', 'v2-online-verbessern', 'v2-liquid-glass', 'v2-platform-integration', 'v2-admin-rueckblicke', 'v2-admin-bestenlisten', 'v2-admin-sicherheit', 'gebietskampf', 'staedtehandel'], // V2-11, V2-12, V2-03, V2-04, V2-05, V2-15, V2-13, V2-14, V2-06, V2-07, V2-17
  '2026-11-08': ['v2-security-tests', 'v2-release-migration'], // V2-09, V2-10
};
const V2_FERTIG = Object.values(V2_FERTIG_AM).flat();
const v2Datum = (id) => Object.entries(V2_FERTIG_AM).find(([, ids]) => ids.includes(id))?.[0];

export const ROADMAP = [
  // Version 3.0 steht ganz oben: Bei gleichem Datum gilt die Reihenfolge der Roadmap, so führt „Was ist neu“ mit dem Release.
  { id: 'version-3', titel: 'Version 3.0', satz: 'Das große Update: 107 Spiele, eigene Konten, echte Bestenliste – und alles Bisherige bleibt erhalten.', stufe: 'erledigt', datum: '2026-11-08', punkte: [
    punkt('version-3-release', 'Version 3.0 ist da', 'funktion', 'Im Änderungsprotokoll (CHANGELOG) steht in einfachen Worten, was seit Version 2.0 neu ist. Eure Konten, Statistiken und Tische sind noch da.', true),
    punkt('version-3-schalter', 'Funktionen ein- und ausschalten', 'betrieb', 'Admins können Discord-Login, Ranked und einzelne Spiele jederzeit ein- und ausschalten. Dabei geht nichts verloren, und laufende Tische spielen weiter.', true),
    punkt('version-3-anleitung', 'Anleitung & Prüfskript fürs Aufspielen', 'betrieb', 'Eine Schritt-für-Schritt-Anleitung für Server und Updates und ein Skript, das vor und nach dem Aufspielen prüft, ob alles bereit ist.', true),
  ] },
  { id: 'sicherheit-datenschutz', titel: 'Sicherheit & Datenschutz', satz: 'Du bestimmst, was andere von dir sehen, und kannst alles herunterladen oder löschen.', stufe: 'erledigt', datum: '2026-11-08', punkte: [
    { ...punkt('datenschutz-seite', 'Datenschutzseite', 'funktion', 'Auf Deutsch und Englisch steht dort, was gespeichert wird, wie lange und wie du es löschst. IP-Adressen werden nicht gespeichert.', true), datum: '2026-11-07' },
    { ...punkt('meine-daten', 'Meine Daten', 'funktion', 'Alles, was zu dir gespeichert ist, als Datei herunterladen oder das Konto löschen.', true), datum: '2026-11-07' },
    punkt('sicherheits-durchgang', 'Gründlich geprüft', 'betrieb', 'Ein Sicherheitsdurchgang und ein Test für alle Spiele: Niemand kann fremde Karten, Würfel oder Rollen sehen.', true),
  ] },
  { id: 'ranked-bestenlisten', titel: 'Ranked & Bestenlisten', satz: 'Eine faire Bestenliste: Es zählen nur Partien unter echten, angemeldeten Menschen.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('ranked-wertung', 'Ranked-Wertung', 'funktion', 'Am Tisch steht immer, ob die Runde zählt – und warum nicht. Computer und Gäste zählen nicht mit.', true),
    punkt('ranked-bestenliste', 'Bestenliste für Woche, Monat und alle Zeiten', 'funktion', 'Je Spiel oder gesamt. Die alte Namensstatistik bleibt daneben sichtbar, und du kannst sie deinem Konto zuordnen.', true),
  ] },
  { id: 'erfolge-sammeln', titel: 'Erfolge', satz: 'Abzeichen sammeln, die zu deinem Konto gehören.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('erfolge-konto', '234 Abzeichen', 'funktion', 'Deine Erfolge gehören fest zu deinem Konto – mit Datum, wann du sie geholt hast.', true),
    punkt('erfolge-fortschritt', 'Fortschritt im Blick', 'funktion', 'Neue Herausforderungen pro Spiel und eine Übersicht, wie weit du schon bist.', true),
  ] },
  { id: 'gebietskampf-staedtehandel', titel: 'Gebietskampf & Städtehandel', satz: 'Zwei große Strategiespiele für lange Abende – sie merken sich den Stand auch nach einem Neustart.', stufe: 'erledigt', datum: '2026-11-07', punkte: spiele(['gebietskampf', 'staedtehandel']) },
  { id: 'ausblick', titel: 'Ausblick: Ideen für später', satz: 'Das ist noch nicht gebaut, nur eine Wunschliste. Was davon kommt, entscheiden wir gemeinsam.', stufe: 'spaeter', punkte: [
    punkt('discord-6', 'Tischkamera', 'discord', 'Auf Wunsch dein Kamerabild am Tisch zeigen – nur über den Browser, nie automatisch. Der Schalter dafür ist schon da, die Funktion noch nicht.'),
    punkt('app-handy', 'App fürs Handy', 'funktion', 'Der Spieleabend als App zum Installieren, mit Mitteilung, wenn du dran bist.'),
    punkt('discord-2', 'Discord-Bot', 'discord', 'Ein Bot, der im Discord Bescheid gibt, wenn jemand einen Tisch aufmacht.'),
    punkt('saisons-turniere', 'Saisons & Turniere', 'funktion', 'Bestenlisten, die in Saisons neu starten, und echte Turniere mit Auslosung.'),
    punkt('zuschauen-wiederholungen', 'Zuschauen & Wiederholungen', 'funktion', 'Fertige Partien Zug für Zug noch einmal ansehen – bei allen Spielen.'),
    punkt('tutorials', 'Tutorials', 'funktion', 'Kurze Erklärungen zum Ausprobieren, damit auch Neue sofort mitspielen können.'),
    punkt('hausregeln', 'Hausregeln', 'funktion', 'Eigene Regeln für euren Tisch festlegen und speichern.'),
    punkt('klang-animation', 'Klang, Bewegung & Figuren für jedes Spiel', 'design', 'Jedes Spiel bekommt eigene Töne, Animationen und Spielfiguren – vom Chip-Klackern im Casino bis zum Muhen bei 6 nimmt!'),
  ] },
  { id: 'einzelspieler-start', titel: 'Einzelspieler: dein Spiel, dein Tempo', satz: 'Sudoku, 2048 und Wellenwacht mit privaten lokalen Spielständen, ohne weiteren Teilnehmer.', stufe: 'erledigt', datum: '2026-10-31', punkte: spiele(['sudoku', '2048', 'wellenwacht']) },
  { id: 'einzelspieler-zukunft', titel: 'Weitere Einzelspieler-Spiele', satz: 'Alle neun Klassiker sind spielbar: Snake, Memory, Minesweeper, Nonogramm, Sokoban, Block-Puzzle, Solitär, Mahjong-Solitär und Match-3.', stufe: 'erledigt', datum: '2026-11-07', punkte: spiele(['snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3']) },
  { id: 'neue-spielwelten', titel: 'Eigene Spielwelten für alle Spiele', satz: 'Jedes der 107 Spiele hat jetzt seine eigene Spielwelt, auf dem Handy und am großen Bildschirm.', stufe: 'erledigt', datum: '2026-11-08', punkte: [
    { ...punkt('visual-scotland-yard', 'Scotland Yard: Ermittlungszentrale & Stadtkarte', 'design', 'Eigene Stadtviertel, persönliche Figuren, Fahrkarten und Ermittlungsprotokoll – auf Desktop und Handy geprüft.', true), datum: '2026-10-31' },
    punkt('visual-kartenwelten', 'UNO, Skip-Bo & Phase 10: eigene Kartenwelten', 'design', 'Farbarena, nummerierte Baureihen und Phasen-Arbeitsfläche mit eigenen Lobbys und klaren Aktionen auf Desktop und Handy.', true),
    punkt('visual-hintergruende', 'Passende Hintergründe', 'design', 'Jedes Spiel hat Farben, Tisch und Beschriftungen, die zu ihm passen – vom Kneipentisch bei Mäxchen bis zur Holzwerkstatt bei Scrabble.', true),
    punkt('visual-spielfelder', 'Eigene Spielbretter', 'design', 'Bretter, Kartenpläne und Figuren sehen bei jedem Spiel anders aus; die Regeln sind dabei gleich geblieben.', true),
    punkt('visual-material', 'Klarere Karten & Würfel', 'design', 'Spielmaterial, Werte und Symbole sind leichter zu unterscheiden.', true),
    punkt('visual-status', 'Besser sichtbarer Zug', 'design', 'Ob du dran bist, worauf der Tisch wartet und was du tun darfst, siehst du auf einen Blick.', true),
    punkt('visual-schrittweise', 'Jedes Spiel einzeln gestaltet und geprüft', 'design', 'Alle 107 Spiele wurden einzeln überarbeitet und auf Desktop und Handy getestet.', true),
  ] },
  { id: 'fahndung-und-kleine-spiele', titel: 'Scotland Yard, Hex & Würfelduell', satz: 'Verdeckte Fahndung auf eigenem Stadtplan, danach zwei kompakte neue Spiele.', stufe: 'erledigt', datum: '2026-10-31', punkte: spiele(['scotland-yard', 'hex', 'wuerfelduell']) },
  { id: 'klassiker-varianten', titel: 'Päckchen 10 – Klassiker-Varianten', satz: 'Neue Wege durch bekannte Spiele und eine ganze Lebensreise.', stufe: 'erledigt', datum: '2026-10-30', paeckchen: '10', punkte: liste('p10', 'funktion', [
    ['Varianten-Baustein', 'Host-Auswahl, sichtbare Plaketten, Verlauf und getrennte Bestenlisten bei gemeinsamen Erfolgen.'],
    ['Monopoly Klassik', 'Eigenes cremefarbenes Brett, Besitzkarten, Geldscheine und acht wählbare SVG-Figuren.'],
    ['Monopoly Tempowürfel', 'Dritter Würfel mit Zahlen, Glück, Bus und Dreierpasch nach der ersten Los-Runde.'],
    ['Monopoly Junior', '24 Felder, Pflichtkauf, doppelte Gruppenmiete und Abrechnung beim ersten Bankrott.'],
    ['UNO Flip', '112 doppelseitige Karten mit korrekt gedrehten Stapeln und sichtbaren inaktiven Handseiten.'],
    ['UNO No Mercy', '168 Karten, gleich/höher stapeln, 7–0, Roulette und Ausscheiden ab 25 Karten.'],
    ['UNO All Wild', 'Jede Karte passt, gezieltes Ziehen und verpflichtender Handtausch.'],
    ['UNO Hausregeln', '7–0-Handtausch und stapelbare +2/+4 in der Grundversion.'],
    ['Spiel des Lebens', 'Drehrad, Studium und Berufe, Familie, Häuser, Kredite und verdeckte Lebensmomente.'],
    ['Schnelles Leben', 'Kurzer Lebensweg mit denselben wichtigen Entscheidungen.'],
    ['Dreifach-Kniffel', 'Drei getrennte Punkteblätter mit Faktoren ×1, ×2 und ×3.'],
    ['Mensch ärgere Dich nicht · Sechseck', '60 Streckenfelder für bis zu sechs Farben.'],
    ['Mensch ärgere Dich nicht · Teams', 'Gemeinsam acht Figuren ins Ziel bringen und nach dem eigenen Zieleinlauf den Partner ziehen.'],
    ['Vier gewinnt · Pop Out', 'Eigene unterste Steine herausziehen.'],
    ['Fünf in einer Reihe', '9×6-Gitter mit Fünferreihen.'],
    ['Schiffe versenken · Salvo', 'Gleichzeitige verdeckte Salven nach der eigenen Flottenstärke.'],
    ['Skip-Bo · Teams', 'Partnerstapel mitnutzen, beide Spielstapel leeren.'],
    ['Skip-Bo · Kurze Partie', 'Zehn Karten im eigenen Spielstapel.'],
    ['Phase 10 · Teams', 'Gemeinsam ausgelegte Phasen und gemeinsame Strafpunktwertung.'],
    ['Phase 10 · Kurze Partie', 'Nur fünf Phasen.'],
    ['Monopoly Deal · Schnelle Partie', 'Zwei vollständige Farben statt drei.'],
  ], true) },
  { id: 'monopoly-co', titel: 'Päckchen 9 – Monopoly & Co.', satz: 'Verdeckt Karten wählen, Grundstücke sammeln und eine eigene Stadt bespielen.', stufe: 'erledigt', datum: '2026-10-29', paeckchen: '9', punkte: spiele(['sechs-nimmt', 'monopoly-deal', 'monopoly']) },
  { id: 'hub-paket', titel: 'Hub-Paket: Roadmap & Gerade online', satz: 'Planung und Mitspieler bekommen ihren festen Platz im Hub.', stufe: 'erledigt', datum: '2026-10-29', punkte: [
    punkt('roadmap-seite', 'Roadmap im Hub', 'funktion', 'Etappen mit Filtern, Fortschritt und Regeln für geplante Spiele.', true),
    punkt('gerade-online', 'Gerade online', 'funktion', 'Sehen, wer da ist, zuschauen oder mitspielen – mit privater Sichtbarkeit.', true),
    punkt('backlog-ergaenzen', 'Fehlende Spiele nachtragen', 'funktion', 'Der Backlog enthält auch die bisher fehlenden Spiele und Party-Funktionen.', true),
  ] },
  { id: 'ticket-board', titel: 'Ticket-Board – Ideen & Fehler melden', satz: 'Ideen und Fehler direkt im Hub sammeln und gemeinsam bewerten.', stufe: 'erledigt', datum: '2026-10-29', punkte: liste('tickets', 'funktion', [
    ['Tickets erstellen', 'Ideen und Fehler im Hub erfassen, abstimmen und kommentieren.'],
    ['Status & Verwaltung', 'Neu, geplant, in Arbeit, erledigt oder abgelehnt; ein Admin verwaltet die Tickets.'],
    ['Markdown-Export', 'Tickets zur Weiterarbeit als Markdown exportieren.'],
  ], true) },
  { id: 'party-modi', titel: 'Päckchen 7 – Party-Modi', satz: 'Mehrere Partyspiele werden zu einem gemeinsamen Programm.', stufe: 'erledigt', datum: '2026-10-29', paeckchen: '7', punkte: [
    punkt('party-mix', 'Party-Mix', 'funktion', 'Gewählte Partyspiele in zufälliger Reihenfolge, gleicher Raum und laufende Gesamtwertung.', true),
    punkt('party-turnier', 'Party-Turnier', 'funktion', 'Ein Turnier über mehrere Spiele mit Platzierungspunkten und Siegerehrung.', true),
    punkt('eigene-playlist', 'Eigene Playlist', 'funktion', 'Reihenfolge, Rundenzahl und Regeln pro Spiel; Vorlagen im Browser und Fortschritt am Tisch speichern.', true),
    punkt('team-duell', 'Team-Duell', 'funktion', 'Aufteilung in zwei feste Teams mit gemeinsamer Wertung bei geeigneten Partyspielen.', true),
  ] },
  { id: 'zeichnen', titel: 'Päckchen 7b – Zeichnen', satz: 'Eigene Bilder, überraschende Beschriftungen und gemeinsames Raten.', stufe: 'erledigt', datum: '2026-10-29', paeckchen: '7b', punkte: [punkt('zeichenwerkzeug', 'Zeichenwerkzeug', 'funktion', 'Stift, Farben, Radierer und Rückgängig mit Maus, Stift oder Finger.', true), ...spiele(['kritzelpost', 'bildunterschrift', 'malen-raten'])] },
  { id: 'design-toene', titel: 'Design & Töne', satz: 'Jedes Spiel bekommt mehr Atmosphäre und passt besser auf jeden Bildschirm.', stufe: 'erledigt', datum: '2026-10-29', punkte: liste('design', 'design', [
    ['Themen pro Spiel', 'Bilder, kurze Animationen und passende Töne für die verschiedenen Spiele.'],
    ['Anpassbare Spielfelder', 'Das Spielfeld passt sich der Bildschirmgröße an; im Querformat gibt es eine eigene Anordnung.'],
    ['Kartengröße unter „Ich“', 'Normal, groß oder sehr groß pro Spieler einstellen.'],
  ], true) },
  { id: 'spieleabend', titel: 'Spieleabend als Ganzes', satz: 'Aus einzelnen Partien wird ein geplanter Abend mit gemeinsamer Erinnerung.', stufe: 'erledigt', datum: '2026-10-30', punkte: liste('abend', 'funktion', [
    ['Abend-Modus', 'Alle Spiele tragen Platzierungspunkte zur gemeinsamen Abendwertung bei.'],
    ['Abend-Rückblick', 'Ergebnisse und besondere Momente eines Abends zusammen ansehen.'],
    ['Termin & Spiele-Abstimmung', 'Einen Termin planen, Zusagen sammeln und über die Spiele abstimmen.'],
    ['Erfolge & Abzeichen', 'Persönliche Meilensteine über mehrere Abende sammeln.'],
  ]).map((p) => ({ ...p, erledigt: true, datum: '2026-10-30' })) },
  { id: 'benachrichtigungen', titel: 'Benachrichtigungen', satz: 'Eine Nachricht, wenn du dran bist oder der Tisch auf dich wartet.', stufe: 'jetzt', punkte: [punkt('push', 'Push-Mitteilungen', 'funktion', 'Bisher meldet nur Poker „Du bist dran!“, und nur solange der Tab offen ist und du Mitteilungen erlaubt hast. „Du bist dran“ und „Tisch wartet“ auch außerhalb des Tabs und bei allen Spielen fehlen noch.') ] },
  { id: 'betrieb', titel: 'Betrieb & Wartung', satz: 'Updates, Fehler und Sicherungen sind geregelt. Offen ist nur das Weiterspielen mitten in der Runde nach einem Neustart.', stufe: 'spaeter', punkte: liste('betrieb', 'betrieb', [
    ['Update-Hinweis', 'Vor einem geplanten Neustart rechtzeitig am Tisch Bescheid sagen.'],
    ['Admin-Seite', 'Zustand und Verwaltung der laufenden Instanz an einem Ort.'],
    ['Version & „Was ist neu“', 'Die aktuelle Version und ihre Änderungen im Hub zeigen.'],
    ['Browser-Fehler', 'Fehler aus dem Browser nachvollziehbar erfassen.'],
    ['Ausfall-Wächter', 'Den vorhandenen /health-Endpunkt von außen überwachen.'],
    ['Backups & Restore-Test', 'Backups außer Haus speichern und ihre Wiederherstellung regelmäßig prüfen.'],
    ['Speichern mitten in der Runde', 'Gebietskampf, Städtehandel, Party-Brett und Survival-Abend machen nach einem Neustart genau dort weiter. Bei den übrigen Spielen muss die laufende Runde neu gestartet werden.'],
  ]).map((p) => (BETRIEB_FERTIG.includes(p.id) ? { ...p, erledigt: true, datum: ['v2-erfolge-ausbauen','v2-online-verbessern'].includes(p.id) ? '2026-11-07' : '2026-11-01' } : p)) },
  { id: 'technik', titel: 'Technik aufräumen', satz: 'Tests, Spieler-IDs und Versionsnummern sind aufgeräumt. Offen ist nur der Umzug der Daten in eine Datenbank.', stufe: 'spaeter', punkte: liste('technik', 'betrieb', [
    ['Tests aufteilen', 'Ein Befehl startet alle Tests; sie sind in schnelle und langsame Bereiche aufgeteilt und werden nachts automatisch durchlaufen.'],
    ['SQLite', 'Persistente Daten strukturiert in einer Datenbank halten. Bisher liegen sie in einfachen Dateien.'],
    ['Feste Spieler-ID', 'In der Bestenliste zählt eine feste Identität statt nur des Namens.'],
    ['Paket-Metadaten', 'Beschreibung und Versionsnummer sind aktuell (Version 3.0.0).'],
  ]).map((p) => ({ 'technik-1': { ...p, erledigt: true, datum: '2026-11-08' }, 'technik-4': { ...p, erledigt: true, datum: '2026-11-08' } })[p.id] || p) },
  { id: 'englisch', titel: 'Deutsch & Englisch', satz: 'Die Sprachwahl gibt es, fast alles ist übersetzt. Bei 13 Spielen fehlen noch einzelne Texte im Spielfeld.', stufe: 'spaeter', punkte: [
    punkt('sprachwahl', 'Persönliche Sprachwahl', 'funktion', 'Deutsch oder Englisch auf Anmeldung, Startseite und in den Spieleinstellungen wählen. Im Browser gespeichert, während laufender Runden ohne Neuladen umschaltbar.', true),
    punkt('party-fragen-englisch', '423 zweisprachige Party-Aufgaben', 'funktion', 'Alle eingebauten Fragen von Schätzmeister, Schlagfertig und Wer hat das gesagt? sind auf Deutsch und Englisch verfügbar. Eigene Texte bleiben unverändert.', true),
    punkt('englische-seite', 'Vollständige englische Oberfläche & Inhalte', 'funktion', 'Bei Blackjack, Bröckelboden, Hex, Kronenjagd, Laser-Hüpfer, Mäxchen, Mühle, Schlagfertig, Schwimmen, Shut the Box, Wer hat das gesagt?, Würfelduell und Zehntausend sind einzelne Texte im Spielfeld noch deutsch. Bis dahin bleibt dort der deutsche Text sichtbar.'),
  ] },
  { id: 'echtzeit', titel: 'Päckchen 8 – Echtzeit', satz: 'Alle bewegen sich gleichzeitig im gemeinsamen Spielfeld.', stufe: 'erledigt', datum: '2026-10-29', paeckchen: '8', punkte: [punkt('bauart-c', 'Bauart-C-Baustein', 'funktion', 'Serverberechnete Bewegung, kleine Zustandsbilder, Tastatur, Touch und Echtzeit-Bots.', true), ...spiele(['broeckelboden', 'kronenjagd', 'laser-huepfer'])] },
  { id: 'discord-login', titel: 'Discord-Login, Gastmodus & Spieler-ID', satz: 'Freiwillig mit Discord anmelden oder als Gast mitspielen – jeder hat eine feste Game-ID.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('discord-1', 'Optionaler Discord-Login', 'discord', 'Wer möchte, meldet sich sicher mit Discord an und erhält ein dauerhaftes Spielerprofil. Admins können den Login ein- und ausschalten.', true),
    punkt('discord-3', 'Als Gast spielen', 'discord', 'Ohne Discord-Konto weiterhin Lobbys erstellen, Freunden per Raumcode beitreten und normal spielen.', true),
    punkt('discord-4', 'Feste Game-ID', 'discord', 'Jeder Browser erhält eine unveränderliche, kurze Kennung für Profil und Statistiken.', true),
    punkt('discord-5', 'Faire Bestenlisten', 'discord', 'Nur gültige Partien unter angemeldeten Menschen zählen; Gäste und Computergegner werden nicht gewertet.', true),
  ] },
  { id: 'v2-spielerkomfort', titel: 'Mehr Einstellungen & Spielerkomfort', satz: 'Jeder gestaltet die Oberfläche so, wie sie zum eigenen Spieleabend passt.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('v2-liquid-glass', 'Gleiches Design für Konto-Seiten', 'design', 'Profil, Einstellungen, Bestenliste, Erfolge und Admin sehen jetzt aus wie die Startseite.'),
    punkt('v2-einstellungen', 'Mehr Anzeige-Einstellungen', 'funktion', 'Spielkategorien, Menübereiche, Bestenlisten, Rückblicke und Erfolge einzeln ein- oder ausblenden.'),
    punkt('v2-online-verbessern', 'Gerade online verbessert', 'funktion', 'Online, abwesend und unsichtbar stimmen auch mit mehreren Geräten und Tabs; private Tische bleiben geschützt.'),
    punkt('v2-erfolge-ausbauen', 'Mehr Errungenschaften', 'funktion', 'Neue Erfolge und Herausforderungen pro Spiel sowie übersichtliche Fortschrittsanzeigen.'),
    punkt('v2-bot-schwierigkeit', 'Bot-Schwierigkeitsgrade', 'funktion', 'Leicht, Mittel und Schwer für geeignete Computergegner auswählen.'),
  ] },
  { id: 'v2-admin-verwaltung', titel: 'Adminverwaltung für Ergebnisse & Rückblicke', satz: 'Fehlerhafte Einträge sicher moderieren und Änderungen nachvollziehbar halten.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('v2-admin-rueckblicke', 'Rückblicke verwalten', 'betrieb', 'Admins können Rückblicke suchen, korrigieren, ausblenden und bei Bedarf löschen oder wiederherstellen.'),
    punkt('v2-admin-bestenlisten', 'Bestenlisten verwalten', 'betrieb', 'Falsche Wertungen werden mit Änderungsprotokoll korrigiert; Rangfolge und Erfolge werden neu berechnet.'),
    punkt('v2-admin-sicherheit', 'Sichere Adminrechte', 'betrieb', 'Admin-Aktionen nur mit eigener Berechtigung, Bestätigung und protokollierten Änderungen.'),
  ] },
  { id: 'v2-profile', titel: 'Dauerhafte Konten, Profile & Privatsphäre', satz: 'Auf Wunsch wiedererkannt werden und selbst über sichtbare Daten entscheiden.', stufe: 'erledigt', datum: '2026-11-07', punkte: [
    punkt('v2-account-identity', 'Dauerhafte Konten & Spieler-IDs', 'funktion', 'Jeder Browser hat ein Konto mit fester interner ID und kurzer öffentlicher Game-ID; Computergegner sind getrennt, zwei Geräte lassen sich verbinden. Mit Discord anmelden geht auch.'),
    punkt('v2-player-profiles', 'Eigene Spielerprofile', 'funktion', 'Ein Profil über die öffentliche Game-ID finden; ein Namenswechsel trennt die eigene Geschichte nicht.'),
    punkt('v2-account-achievements', 'Erfolge dem Konto zuordnen', 'funktion', 'Neue Erfolge gehören eindeutig zum jeweiligen Konto; alte Namensstatistiken werden nur auf Wunsch übernommen.'),
    punkt('v2-profile-preferences', 'Einstellungen auf mehreren Geräten', 'funktion', 'Kontoeinstellungen gelten auf allen verbundenen Geräten; Gäste behalten ihre lokale Browser-Auswahl.'),
    punkt('v2-privacy', 'Privatsphäre selbst bestimmen', 'funktion', 'Öffentliche Profile und Erfolge lassen sich unabhängig davon steuern, welche Bereiche im eigenen Menü sichtbar sind.'),
  ] },
  { id: 'v2-grundlagen', titel: 'V2 sicher vorbereiten & einführen', satz: 'Bestehende Spiele, Ergebnisse und Zugänge sind bei den Neuerungen geschützt geblieben.', stufe: 'erledigt', datum: '2026-11-08', punkte: [
    punkt('v2-audit', 'Bestehendes sorgfältig geprüft', 'betrieb', 'Vor den neuen Kontofunktionen wurden Zugänge, gespeicherte Daten und mögliche Risiken nachvollziehbar geprüft.'),
    punkt('v2-backup-migration', 'Gesicherter Datenumzug', 'betrieb', 'Datenänderungen laufen mit Sicherung, Wiederherstellung und einem Rückweg.'),
    punkt('v2-session-security', 'Sichere Anmeldung & Abmeldung', 'funktion', 'Anmeldungen werden geprüft, Sitzungen sicher beendet; Gruppenpasswort und Adminrechte bleiben getrennt.'),
    punkt('v2-historical-rankings', 'Bisherige Bestenlisten erhalten', 'funktion', 'Alte namensbasierte Ergebnisse bleiben als Historie sichtbar, getrennt von der neuen Ranked-Wertung.'),
    punkt('v2-platform-integration', 'Vorhandene Bereiche mit Konten verbunden', 'funktion', 'Tickets, Abendplanung, Rückblicke und Anwesenheit gehören jetzt zum Konto, ohne fremde Rechte zu übertragen.'),
    punkt('v2-security-tests', 'Sicherheit & Bestand nachgeprüft', 'betrieb', 'Zugänge und Privatsphäre sind getestet, und alle bestehenden Spiele und Räume wurden weiter geprüft.'),
    punkt('v2-release-migration', 'Schrittweise Einführung', 'betrieb', 'Neue Funktionen lassen sich kontrolliert freischalten; Anleitung, Prüfskript und Rückweg sind dokumentiert.'),
  ] },
  { id: 'poker-extras', titel: 'Poker-Extras', satz: 'Vorhandener Komfort und weitere Varianten für den Pokertisch.', stufe: 'spaeter', punkte: [
    punkt('turnier-blinds', 'Turniermodus mit steigenden Blinds', 'funktion', 'Blind-Level nach Zeit oder Händen mit konfigurierbarer Steigerung sind vorhanden.', true),
    punkt('time-bank', 'Time Bank', 'funktion', 'Zusätzliche, begrenzte Bedenkzeit pro Spieler.'),
    punkt('pre-actions', 'Pre-Actions', 'funktion', 'Check, Check/Fold und Call als Vorab-Aktionen sind vorhanden.', true),
    ...liste('poker-extra', 'funktion', [['Straddle', 'Optionaler zusätzlicher Blindeinsatz vor dem Geben.'], ['Bomb Pot', 'Gemeinsam mit einem festgelegten Einsatz direkt zum Flop.'], ['Run It Twice', 'Bei All-in die verbleibenden Gemeinschaftskarten zweimal geben.'], ['7-2-Bonus', 'Zusätzlicher Bonus für einen Sieg mit Sieben und Zwei.'], ['Rabbit Hunt', 'Nach einer beendeten Hand die nicht mehr gegebenen Gemeinschaftskarten ansehen.'], ['Hand-Replay', 'Eine vergangene Hand mit ihren einzelnen Aktionen erneut abspielen.']]),
  ] },
  { id: 'party-extras', titel: 'Party-Extras', satz: 'Bekannte Spiele mit wechselnden Zusatzregeln und neuen Abendformaten.', stufe: 'erledigt', datum: '2026-11-08', punkte: [
    punkt('modifikatoren', 'Modifikatoren', 'funktion', 'Abschaltbare Raumoptionen für Schätzmeister, Schlagfertig und Wer hat das gesagt?: doppelte Punkte, umgekehrte Wertung oder Zeitdruck; für eine Partie oder bis ausgeschaltet.', true),
    punkt('chaos-modus', 'Chaos-Modus', 'funktion', 'Optionale, vor dem Start offen gezogene Zusatzregeln in den drei unterstützten Partyspielen; standardmäßig aus.', true),
    punkt('survival-abend', 'Survival-Abend', 'funktion', 'Abendprogramm mit 1–5 Leben: letzter Platz verliert ein Leben, Ausgeschiedene schauen zu, der letzte Überlebende gewinnt. Mit Gleichstands- und Sicherheitsregeln.', true),
  ] },
  { id: 'spaetere-spiele', titel: 'Weitere Spiele', satz: 'Alle 41 Spiele aus der Wunschliste sind gebaut und spielbar.', stufe: 'erledigt', datum: '2026-11-08', paeckchen: 'spaeter', punkte: spiele(['risiko-wuerfeln','story-chaos','zahlenreihe','wuerfeljagd','monsterwuerfel','wuerfel-auktion','backgammon','hearts','five-card-draw','scrabble','omaha-hi-lo','short-deck','seven-card-stud','exploding-deck','doppelagent','luegenbaron','stichmeister','labyrinth-brett','schatzinsel','jaeger-schatten','infektionsjagd','letzter-schutzplatz','regelwahnsinn','geschenkfaenger','rhythmus-rausch','stillgestanden','bomben-duell','schubsarena','scheinwerfer-flucht','minenlauf','labyrinth-chaos','puzzle-panik','wortjagd','kistenchaos','gummiband-challenge','turmbauer','fallenbauer','geschenkdiebe','schatzgraeber','brueckenroulette','reaktor-notfall']) },
  { id: 'grosse-projekte', titel: 'Große Projekte', satz: 'Schach und das Party-Brett sind fertig. Offen sind noch das 3D-Experiment und die Discord Activity.', stufe: 'gross', paeckchen: 'gross', punkte: [
    ...spiele(['schach']),
    { ...punkt('party-brett', 'Party-Brett', 'funktion', 'Laternenpfad mit echten Party-Minispielen, Platzierungsbewegung, Ereignisfeldern, Items und Sabotage; Brett und Ergebnisse bleiben beim Wiederverbinden und Serverneustart erhalten.', true), datum: '2026-11-08' },
    punkt('3d-experiment', '3D-Experiment', 'design', '3D-Würfel als begrenzter Test für eine räumliche Darstellung.'),
    punkt('discord-activity', 'Discord Activity', 'discord', 'Direkt gemeinsam im Discord-Sprachkanal spielen.'),
  ] },
  { id: 'skat-doppelkopf-fertig', titel: 'Skat & Doppelkopf', satz: 'Die beiden großen deutschen Kartenspiele mit Computer-Mitspielern, Varianten und eigenen Kartenwelten.', stufe: 'erledigt', datum: '2026-11-07', punkte: spiele(['skat', 'doppelkopf']) },
  { id: 'wer-bin-ich-fertig', titel: 'Wer bin ich?', satz: 'Begriffe erraten und durch Ja/Nein-Fragen eingrenzen.', stufe: 'erledigt', datum: '2026-10-28', punkte: spiele(['wer-bin-ich']) },
  { id: 'phase10-fertig', titel: 'Phase-10-Verbesserungen', satz: 'Feste Joker, längere Auslagen und bessere Kartenauswahl.', stufe: 'erledigt', datum: '2026-10-28', punkte: [punkt('phase10-komfort', 'Auslagen & Kartenauswahl', 'funktion', 'Joker-Zuordnung und Auswahl am Tisch verbessert.', true)] },
  { id: 'paket6-fertig', titel: 'Päckchen 6', satz: 'Gleichzeitige Solo-Aufgaben und neue Party-Runden.', stufe: 'erledigt', datum: '2026-10-28', punkte: [
    ...spiele(['zahlenzoo', 'gedaechtnis-kueche', 'pfeilfieber', 'sortierstation', 'tickendes-paket', 'werwolf']),
    punkt('bauart-b', 'Bauart-B-Baustein', 'funktion', 'Gemeinsamer Seed, lokale Eingabe und Ergebnisprüfung auf dem Server.', true),
  ] },
  { id: 'paket5-fertig', titel: 'Päckchen 5', satz: 'Drei Würfel- und drei Brettspiele.', stufe: 'erledigt', datum: '2026-10-28', punkte: spiele(['wuerfelpoker', 'luegenwuerfel', 'chicago', 'reversi', 'dame', 'domino']) },
  { id: 'paket4-fertig', titel: 'Päckchen 4', satz: 'Weitere Kartenspiele bis zum Omaha-Poker.', stufe: 'erledigt', datum: '2026-10-28', punkte: spiele(['mogeln', 'praesident', 'durak', 'omaha']) },
  { id: 'zurueck-fertig', titel: 'Zurück-Taste am Handy repariert', satz: 'Vom Tisch wieder zur Startseite statt zum schwarzen Bildschirm.', stufe: 'erledigt', datum: '2026-10-28', punkte: [punkt('zurueck-routing', 'Browser-Verlauf', 'fehler', 'Raum-Adressen und Zurück-Navigation funktionieren zusammen.', true)] },
  { id: 'tisch-komfort-fertig', titel: 'Raum verlassen & Spiel beenden', satz: 'Den Platz behalten, eine Runde abbrechen oder den Tisch schließen.', stufe: 'erledigt', datum: '2026-10-28', punkte: [punkt('tisch-komfort', 'Raumsteuerung & Stapelansicht', 'funktion', 'Platz behalten oder verlassen, Runden ohne Wertung abbrechen und Stapel ansehen.', true)] },
  { id: 'hub-fertig', titel: 'Hub-Startseite', satz: 'Profil, Spielkatalog, Favoriten und offene Tische.', stufe: 'erledigt', datum: '2026-10-27', punkte: [punkt('hub-start', 'Hub-Navigation', 'design', 'Startseite mit Navigation auf Desktop und Handy.', true)] },
  { id: 'paket2b-fertig', titel: 'Päckchen 2b', satz: 'Gemeinsam schätzen, antworten und bluffen.', stufe: 'erledigt', datum: '2026-10-27', punkte: spiele(['schlagfertig', 'werhatdasgesagt']) },
  { id: 'schutz-fertig', titel: 'Passwortschutz & HTTPS über Traefik', satz: 'Geschützter Zugang und verschlüsselte Verbindung im Server-Betrieb.', stufe: 'erledigt', datum: '2026-10-27', punkte: [punkt('passwort-https', 'Gruppenpasswort & Traefik', 'betrieb', 'Passwortschutz vorhanden; Traefik ersetzt Caddy im Deployment.', true)] },
  { id: 'bots-fertig', titel: 'Computer-Mitspieler, Mühle & Zehntausend', satz: 'Optionale Computer-Mitspieler und zwei weitere Spiele.', stufe: 'erledigt', datum: '2026-10-25', punkte: [...spiele(['muehle', 'zehntausend']), punkt('computer-mitspieler', 'Computer-Mitspieler', 'funktion', 'Bots im Host-Menü hinzufügen oder entfernen; eigene Strategien für unterstützte Spiele.', true)] },
  { id: 'v1-fertig', titel: 'V1 Poker', satz: 'Der erste gemeinsame Pokertisch im Browser.', stufe: 'erledigt', datum: '2026-10-24', punkte: spiele(['poker']) },
].map((section) => ({ ...section, punkte: section.punkte.map((p) => (V2_FERTIG.includes(p.id) ? { ...p, erledigt: true, datum: v2Datum(p.id) } : p)) }));

// „Was ist neu“: die neuesten erledigten Punkte (mit Datum), neueste zuerst; bei gleichem Datum gilt die Reihenfolge der Roadmap
export function whatsNew(limit = 8, roadmap = resolvedRoadmap()) {
  const rows = [];
  roadmap.forEach((etappe, order) => etappe.punkte.forEach((p) => {
    const datum = p.datum || (etappe.stufe === 'erledigt' ? etappe.datum : null);
    if (p.erledigt && datum) rows.push({ id: p.id, titel: p.titel, text: p.text, art: p.art, datum, order });
  }));
  return rows.sort((a, b) => b.datum.localeCompare(a.datum) || a.order - b.order).slice(0, limit).map(({ order, ...row }) => row);
}

export function resolvedRoadmap(planned = PLANNED) {
  const used = new Set();
  const explicit = new Set(ROADMAP.flatMap((e) => e.eintraege || []));
  const result = ROADMAP.map(({ eintraege = [], ...etappe }) => {
    const entries = planned.filter((p) => eintraege.includes(p.id) || p.paeckchen === etappe.paeckchen && !explicit.has(p.id));
    const punkte = [...etappe.punkte.filter((p) => !entries.some((entry) => entry.id === p.id)), ...entries.map((p) => {
      used.add(p.id);
      return { id: p.id, titel: p.name, art: p.type === 'feature' ? 'funktion' : 'spiel', text: p.beschreibung || p.description, plannedId: p.id, ...(p.type === 'feature' ? {} : { spiel: p }) };
    })].map((p) => p.art === 'spiel' && !p.spiel && GAMES[p.id] ? { ...p, spiel: { ...GAMES[p.id], create: undefined, restore: undefined, events: undefined, options: undefined, status: 'available' } } : p);
    return { ...etappe, punkte };
  });
  for (const p of planned.filter((p) => !used.has(p.id))) {
    const target = result.find((e) => e.paeckchen === (p.paeckchen === 'gross' ? 'gross' : 'spaeter'));
    target.punkte.push({ id: p.id, titel: p.name, art: p.type === 'feature' ? 'funktion' : 'spiel', text: p.beschreibung || p.description, plannedId: p.id, ...(p.type === 'feature' ? {} : { spiel: p }) });
  }
  return result;
}
