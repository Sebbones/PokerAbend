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

export const ROADMAP = [
  { id: 'einzelspieler-start', titel: 'Einzelspieler: dein Spiel, dein Tempo', satz: 'Sudoku, 2048 und Wellenwacht mit privaten lokalen Spielständen, ohne weiteren Teilnehmer.', stufe: 'erledigt', datum: '2026-10-31', punkte: spiele(['sudoku', '2048', 'wellenwacht']) },
  { id: 'einzelspieler-zukunft', titel: 'Weitere Einzelspieler-Spiele', satz: 'Neun einzeln geplante Arbeitspakete. Umsetzung jeweils erst nach eigener Freigabe.', stufe: 'spaeter', eintraege: ['snake','memory','minesweeper','nonogramm','sokoban','block-puzzle','solitaire','mahjong-solitaire','match-3'], punkte: [] },
  { id: 'neue-spielwelten', titel: 'Neue Spielwelten & schönere Spieloberflächen', satz: 'Scotland Yard, UNO, Skip-Bo und Phase 10 sind visuell überarbeitet. Weitere individuelle Spielwelten folgen schrittweise nach eigener Freigabe.', stufe: 'spaeter', punkte: [
    punkt('visual-scotland-yard', 'Scotland Yard: Ermittlungszentrale & Stadtkarte', 'design', 'Eigene Stadtviertel, persönliche Figuren, Fahrkarten und Ermittlungsprotokoll – auf Desktop und Handy geprüft.', true),
    punkt('visual-kartenwelten', 'UNO, Skip-Bo & Phase 10: eigene Kartenwelten', 'design', 'Farbarena, nummerierte Baureihen und Phasen-Arbeitsfläche mit eigenen Lobbys und klaren Aktionen auf Desktop und Handy.', true),
    punkt('visual-hintergruende', 'Individuelle Spielwelten', 'design', 'Thematisch passende lokale Hintergründe für weitere Spiele, mit ruhigen und gut lesbaren Spielflächen.'),
    punkt('visual-spielfelder', 'Hochwertigere Spielbretter', 'design', 'Bretter, Kartenpläne und Figuren passend zum jeweiligen Spiel verfeinern; Regeln und Zugmöglichkeiten bleiben erhalten.'),
    punkt('visual-material', 'Klarere Karten & Würfel', 'design', 'Spielmaterial, Werte und Symbole hochwertiger und leichter unterscheidbar gestalten.'),
    punkt('visual-status', 'Bessere Status- & Aktionsbereiche', 'design', 'Eigener Zug, Warten, Tickets, Punkte und erlaubte Aktionen schneller erfassen.'),
    punkt('visual-schrittweise', 'Schrittweise weitere Spiele überarbeiten', 'design', 'Für alle vorhandenen und geplanten Spiele liegen eigene Designkonzepte vor. Jede Umsetzung wird einzeln freigegeben und geprüft.'),
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
  { id: 'benachrichtigungen', titel: 'Benachrichtigungen', satz: 'Eine Nachricht, wenn du dran bist oder der Tisch auf dich wartet.', stufe: 'jetzt', punkte: [punkt('push', 'Push-Mitteilungen', 'funktion', '„Du bist dran“ und „Tisch wartet“ auch außerhalb des aktiven Tabs.') ] },
  { id: 'betrieb', titel: 'Betrieb & Wartung', satz: 'Updates, Fehler und gespeicherte Abende werden verlässlicher betreut.', stufe: 'spaeter', punkte: liste('betrieb', 'betrieb', [
    ['Update-Hinweis', 'Vor einem geplanten Neustart rechtzeitig am Tisch Bescheid sagen.'],
    ['Admin-Seite', 'Zustand und Verwaltung der laufenden Instanz an einem Ort.'],
    ['Version & „Was ist neu“', 'Die aktuelle Version und ihre Änderungen im Hub zeigen.'],
    ['Browser-Fehler', 'Fehler aus dem Browser nachvollziehbar erfassen.'],
    ['Ausfall-Wächter', 'Den vorhandenen /health-Endpunkt von außen überwachen.'],
    ['Backups & Restore-Test', 'Backups außer Haus speichern und ihre Wiederherstellung regelmäßig prüfen.'],
    ['Speichern mitten in der Runde', 'Laufende Spielstände nach einem Neustart fortsetzen.'],
  ]) },
  { id: 'technik', titel: 'Technik aufräumen', satz: 'Eine klare Grundlage für weitere Spiele und verlässliche Spielerdaten.', stufe: 'spaeter', punkte: liste('technik', 'betrieb', [
    ['Tests aufteilen', 'Die gewachsene Testsammlung in überschaubare Bereiche gliedern.'],
    ['SQLite', 'Persistente Daten strukturiert in einer Datenbank halten.'],
    ['Feste Spieler-ID', 'In der Bestenliste eine feste Identität statt nur des Namens verwenden.'],
    ['Paket-Metadaten', 'package.json-Beschreibung und Versionsnummern aktuell halten.'],
  ]) },
  { id: 'englisch', titel: 'Deutsch & Englisch', satz: 'Die Sprachwahl ist verfügbar; die vollständige Übersetzung aller Spieltexte wird ergänzt.', stufe: 'spaeter', punkte: [
    punkt('sprachwahl', 'Persönliche Sprachwahl', 'funktion', 'Deutsch oder Englisch auf Anmeldung, Startseite und in den Spieleinstellungen wählen. Im Browser gespeichert, während laufender Runden ohne Neuladen umschaltbar.', true),
    punkt('party-fragen-englisch', '423 zweisprachige Party-Aufgaben', 'funktion', 'Alle eingebauten Fragen von Schätzmeister, Schlagfertig und Wer hat das gesagt? sind auf Deutsch und Englisch verfügbar. Eigene Texte bleiben unverändert.', true),
    punkt('englische-seite', 'Vollständige englische Oberfläche & Inhalte', 'funktion', 'Noch fehlende Spielregeln, Spieltexte, Begriffe, Systemmeldungen und ältere Hub-Bereiche übersetzen. Bis dahin bleibt für fehlende Übersetzungen der deutsche Text sichtbar.'),
  ] },
  { id: 'echtzeit', titel: 'Päckchen 8 – Echtzeit', satz: 'Alle bewegen sich gleichzeitig im gemeinsamen Spielfeld.', stufe: 'erledigt', datum: '2026-10-29', paeckchen: '8', punkte: [punkt('bauart-c', 'Bauart-C-Baustein', 'funktion', 'Serverberechnete Bewegung, kleine Zustandsbilder, Tastatur, Touch und Echtzeit-Bots.', true), ...spiele(['broeckelboden', 'kronenjagd', 'laser-huepfer'])] },
  { id: 'discord-login', titel: 'Discord-Login, Gastmodus & Spieler-ID', satz: 'Freiwillig anmelden, ohne Konto mitspielen und Statistiken eindeutig zuordnen.', stufe: 'spaeter', punkte: liste('discord', 'discord', [
    ['Optionaler Discord-Login', 'Wer möchte, meldet sich sicher mit Discord an und erhält ein dauerhaftes Spielerprofil.'],
    ['Tisch-Nachricht', 'Im Discord Bescheid geben, wenn jemand einen Tisch aufmacht.'],
    ['Als Gast spielen', 'Ohne Discord-Konto weiterhin Lobbys erstellen, Freunden per Raumcode beitreten und normal spielen.'],
    ['Feste Game-ID', 'Registrierte Spieler erhalten eine unveränderliche, öffentliche Kennung für Profil und Statistiken.'],
    ['Faire Bestenlisten', 'Nur verifizierte und gültige Partien zählen öffentlich; Gäste und Computergegner werden nicht gewertet.'],
    ['Optionale Tischkamera', 'Auf Wunsch eigenes Kamerabild über den Browser am Tisch zeigen; keine automatische Übernahme von Discord-Videocalls.'],
  ]) },
  { id: 'v2-spielerkomfort', titel: 'Mehr Einstellungen & Spielerkomfort', satz: 'Jeder gestaltet die Oberfläche so, wie sie zum eigenen Spieleabend passt.', stufe: 'spaeter', punkte: [
    punkt('v2-liquid-glass', 'Liquid Glass für neue Kontoansichten', 'design', 'Das vorhandene ruhige Design später für neue Profile und Konto-Einstellungen fortführen; der bestehende Hub bleibt erhalten.'),
    punkt('v2-einstellungen', 'Mehr Anzeige-Einstellungen', 'funktion', 'Spielkategorien, Menübereiche, Bestenlisten, Rückblicke und Erfolge einzeln ein- oder ausblenden.'),
    punkt('v2-online-verbessern', 'Gerade online verbessern', 'funktion', 'Zuverlässiger Online- und Abwesenheitsstatus, mehrere Geräte erkennen und private Tische schützen.'),
    punkt('v2-erfolge-ausbauen', 'Mehr Errungenschaften', 'funktion', 'Neue Erfolge und Herausforderungen pro Spiel sowie übersichtliche Fortschrittsanzeigen.'),
    punkt('v2-bot-schwierigkeit', 'Bot-Schwierigkeitsgrade', 'funktion', 'Leicht, Mittel und Schwer für geeignete Computergegner auswählen.'),
  ] },
  { id: 'v2-admin-verwaltung', titel: 'Adminverwaltung für Ergebnisse & Rückblicke', satz: 'Fehlerhafte Einträge sicher moderieren und Änderungen nachvollziehbar halten.', stufe: 'spaeter', punkte: [
    punkt('v2-admin-rueckblicke', 'Rückblicke verwalten', 'betrieb', 'Admins können Rückblicke suchen, korrigieren, ausblenden und bei Bedarf löschen oder wiederherstellen.'),
    punkt('v2-admin-bestenlisten', 'Bestenlisten verwalten', 'betrieb', 'Falsche Wertungen mit Änderungsprotokoll korrigieren; Rangfolge und Erfolge werden konsistent neu berechnet.'),
    punkt('v2-admin-sicherheit', 'Sichere Adminrechte', 'betrieb', 'Admin-Aktionen nur mit eigener Berechtigung, Bestätigung und protokollierten Änderungen.'),
  ] },
  { id: 'v2-profile', titel: 'Dauerhafte Konten, Profile & Privatsphäre', satz: 'Auf Wunsch wiedererkannt werden und selbst über sichtbare Daten entscheiden.', stufe: 'spaeter', punkte: [
    punkt('v2-account-identity', 'Dauerhafte Konten & Spieler-IDs', 'funktion', 'Menschliche Gäste, registrierte Konten und Computergegner zuverlässig unterscheiden; bestehende Spiel-IDs beibehalten.'),
    punkt('v2-player-profiles', 'Eigene Spielerprofile', 'funktion', 'Ein Profil über die öffentliche Game-ID finden; ein Namenswechsel trennt die eigene Geschichte nicht mehr.'),
    punkt('v2-account-achievements', 'Erfolge dem Konto zuordnen', 'funktion', 'Bestätigte neue Erfolge eindeutig dem jeweiligen Konto zuordnen, ohne alte Namensstatistiken ungeprüft zu übernehmen.'),
    punkt('v2-profile-preferences', 'Einstellungen auf mehreren Geräten', 'funktion', 'Kontoeinstellungen geräteübergreifend nutzen; Gäste behalten ihre lokale Browser-Auswahl.'),
    punkt('v2-privacy', 'Privatsphäre selbst bestimmen', 'funktion', 'Öffentliche Profile und Erfolge unabhängig davon steuern, welche Bereiche im eigenen Menü sichtbar sind.'),
  ] },
  { id: 'v2-grundlagen', titel: 'V2 sicher vorbereiten & einführen', satz: 'Bestehende Spiele, Ergebnisse und Zugänge bleiben bei künftigen Erweiterungen geschützt.', stufe: 'spaeter', punkte: [
    punkt('v2-audit', 'Bestehendes sorgfältig prüfen', 'betrieb', 'Vor neuen Kontofunktionen Zugänge, gespeicherte Daten und mögliche Risiken nachvollziehbar prüfen.'),
    punkt('v2-backup-migration', 'Gesicherter Datenumzug', 'betrieb', 'Künftige Datenänderungen mit Sicherung, Wiederherstellung und einem Rückweg vorbereiten.'),
    punkt('v2-session-security', 'Sichere Anmeldung & Abmeldung', 'funktion', 'Anmeldungen prüfen, Sitzungen sicher beenden und bestehendes Gruppenpasswort sowie Adminrechte getrennt halten.'),
    punkt('v2-historical-rankings', 'Bisherige Bestenlisten erhalten', 'funktion', 'Alte namensbasierte Ergebnisse als Historie bewahren und von künftig verifizierten Ranglisten trennen.'),
    punkt('v2-platform-integration', 'Vorhandene Bereiche sicher verbinden', 'funktion', 'Tickets, Abendplanung, Rückblicke und Anwesenheit später mit Konten verbinden, ohne fremde Rechte zu übertragen.'),
    punkt('v2-security-tests', 'Sicherheit & Bestand nachprüfen', 'betrieb', 'Neue Zugänge und Privatsphäre testen und alle bestehenden Spiele und Räume weiter prüfen.'),
    punkt('v2-release-migration', 'Schrittweise Einführung', 'betrieb', 'Neue Funktionen kontrolliert freischalten, Auswirkungen dokumentieren und einen sicheren Rückweg vorsehen.'),
  ] },
  { id: 'poker-extras', titel: 'Poker-Extras', satz: 'Vorhandener Komfort und weitere Varianten für den Pokertisch.', stufe: 'spaeter', punkte: [
    punkt('turnier-blinds', 'Turniermodus mit steigenden Blinds', 'funktion', 'Blind-Level nach Zeit oder Händen mit konfigurierbarer Steigerung sind vorhanden.', true),
    punkt('time-bank', 'Time Bank', 'funktion', 'Zusätzliche, begrenzte Bedenkzeit pro Spieler.'),
    punkt('pre-actions', 'Pre-Actions', 'funktion', 'Check, Check/Fold und Call als Vorab-Aktionen sind vorhanden.', true),
    ...liste('poker-extra', 'funktion', [['Straddle', 'Optionaler zusätzlicher Blindeinsatz vor dem Geben.'], ['Bomb Pot', 'Gemeinsam mit einem festgelegten Einsatz direkt zum Flop.'], ['Run It Twice', 'Bei All-in die verbleibenden Gemeinschaftskarten zweimal geben.'], ['7-2-Bonus', 'Zusätzlicher Bonus für einen Sieg mit Sieben und Zwei.'], ['Rabbit Hunt', 'Nach einer beendeten Hand die nicht mehr gegebenen Gemeinschaftskarten ansehen.'], ['Hand-Replay', 'Eine vergangene Hand mit ihren einzelnen Aktionen erneut abspielen.']]),
  ] },
  { id: 'party-extras', titel: 'Party-Extras', satz: 'Bekannte Spiele mit wechselnden Zusatzregeln und neuen Abendformaten.', stufe: 'spaeter', eintraege: ['modifikatoren', 'chaos-modus', 'survival-abend'], punkte: [] },
  { id: 'spaetere-spiele', titel: 'Weitere Spiele', satz: 'Der übrige Backlog für kommende Spiele-Päckchen.', stufe: 'spaeter', paeckchen: 'spaeter', punkte: [] },
  { id: 'grosse-projekte', titel: 'Große Projekte', satz: 'Größere Spielsysteme und Experimente mit mehr Vorlauf.', stufe: 'gross', paeckchen: 'gross', punkte: [
    punkt('3d-experiment', '3D-Experiment', 'design', '3D-Würfel als begrenzter Test für eine räumliche Darstellung.'),
    punkt('discord-activity', 'Discord Activity', 'discord', 'Direkt gemeinsam im Discord-Sprachkanal spielen.'),
  ] },
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
];

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
