# V2-13 und V2-14 – Erfolge und Presence

Ausdrückliche Freigabe vom 07.11.2026, direkt auf `main`. Implementierung: `20873f46782de597ec885b629c1b95d6ad269890`. Nur diese beiden Pakete sind Gegenstand dieses Auftrags. Die übrigen 16 Task-Objekte bleiben byteinhaltlich unverändert; ein Hash über ihre JSON-Darstellung wird im [Nachweis](V2-13_V2-14_EVIDENCE.json) geprüft. Keine neuen Spiele, keine Freundesliste und kein Produktivdeployment.

## V2-13

Der Katalog umfasst 234 Abzeichen: 17 bestehende allgemeine Abzeichen plus 217 neue Leistungsabzeichen. Jedes der 71 serverbasierten Raumspiele hat Einstieg (eine Partie), Routine (zehn Partien) und Meisterklasse (zehn Siege). Vier zusätzliche Meilensteine belohnen zehn unterschiedliche Spiele, einen vollständigen Abend-Modus, 100 Siege und fünf Siege in Folge. Meisterklasse und Serienerfolg sind als selten gekennzeichnet, 100 Siege als legendär. Dies sind feste Katalogstufen, keine behaupteten statistischen Seltenheitsquoten.

Neue Leistungsabzeichen verwenden ausschließlich qualifizierte, serverseitig bestätigte Runden: mindestens zwei verschiedene registrierte Menschen, keine Bots/Gäste, keine abgebrochenen Partien. Die Qualifikation wird wie bisher beim Start eingefroren. Die bisherigen 17 Abzeichen behalten ihre vorhandene Casual-Statistik und bleiben funktionsfähig. Die zwölf lokalen Solo-Spiele liefern keine serverbestätigten Ergebnisse und erhalten daraus keine öffentlichen Leistungsabzeichen.

Fortschritt wird aus der vorhandenen Rundenablage berechnet. Eindeutige Runden-IDs verhindern Doppelzählung; gleiche Abschlusszeiten behalten die tatsächliche Speicherreihenfolge. Wiederholte Auswertung und Neustart verändern weder Zähler noch erste Freischaltzeitpunkte. Beim Start werden beweisbare bestehende Ergebnisse nachgewertet; der Abruf der eigenen Erfolge gleicht spätere Änderungen ebenfalls ab. Nachträgliche Freischaltungen werden ohne Benachrichtigungsflut gespeichert. Live-Freischaltungen melden sich einmal nach dem Speichern von Bestenliste und Konto.

Für neue Abend-Modus-Ergebnisse speichert die bestehende Rundenablage nur Programm-ID, Stationsindex und Stationszahl. Der Erfolg erfordert jede Station desselben Programms als qualifiziertes Ergebnis dieser Person. Wiederholte Indizes, ausgelassene oder unqualifizierte Stationen zählen nicht als Abschluss. Alte Rückblicke enthalten nur Anzeigenamen und anonymisierte lokale Spielerreferenzen; daraus wird keine nachträgliche Kontenzuordnung erfunden. Bereits vorhandene qualifizierte Einzelrunden zählen rückwirkend für die anderen neuen Abzeichen.

Eigene Erfolge sind an das Konto gebunden. Gleiche Namen übertragen keine neuen Abzeichen; ausdrücklich verbundene Konten folgen der vorhandenen Zusammenführung. Eine spätere Löschung eines Gegners anonymisiert diesen, nimmt dem verbleibenden Spieler aber keine bestätigten Ergebnisse weg. Namenssuche und Vorschläge beachten öffentliche Erfolgs- und Statistikfreigaben; eigene Ansichten bleiben vollständig. Öffentliche Profile zeigen erworbene Abzeichen nur mit der bestehenden Freigabe `showAchievements`.

Gesperrte geheime Abzeichen liefern weder Titel, Bedingung noch Fortschritt. Nach dem Freischalten werden sie in der eigenen Ansicht und gemäß Profilfreigabe sichtbar. Die Oberfläche ergänzt Spiel-/Bereich-/Statusfilter, Fortschrittsbalken, Platin und seltene Stufen sowie zunächst 36 Karten mit „Weitere Abzeichen anzeigen“. Beim Bereichswechsel entfällt ein dazu nicht passender Spielfilter.

## V2-14

Presence unterscheidet „im Hub“, „in Lobby: X“, „spielt X“, „schaut X zu“ und „abwesend“. Die vorhandene Aktivitätsregel bleibt: versteckter Tab oder fünf Minuten ohne Eingabe bedeutet abwesend; Aktivität setzt den Zustand zurück. Ein Reconnect allein macht einen weiterhin untätigen Benutzer nicht aktiv. „Platz behalten“ kehrt in den Hub zurück; beim späteren Tischbesuch bleibt der eigene Sitz gemäß bestehender Spiellogik erhalten.

Mehrere Tabs/Geräte desselben Kontos werden nach öffentlicher Game-ID zusammengeführt; der aktivste Status gewinnt. Gleichnamige Personen bleiben getrennt. Verbindungen ohne Identitätscookie erhalten einen eigenen flüchtigen Verbindungsschlüssel. Ein vorhandener Namens-Fallback in der isolierten Komponente bleibt für ältere Aufrufer erhalten; der Live-Server verwendet ihn nicht.

Der Beitreten-Knopf erscheint nur bei nicht laufenden öffentlichen Tischen mit freien Plätzen. Zuschaueraktionen verwenden die vorhandenen servergeprüften Raumfunktionen. Eine gespeicherte öffentliche Raumansicht ist keine zusätzliche Berechtigung; beim tatsächlichen Beitritt gelten weiterhin die Raum-/Sitzprüfungen. Private Tische verraten in Presence weder Spiel noch Code und bieten dort keine Beitrittsaktion. Bereits berechtigte eigene Tische bleiben im eigenen Hub sichtbar.

`showOnline` aus V2-05 wird bei jeder Serveransicht erneut geprüft, auch für „Zuletzt online“, ohne auf eine neue Clientmeldung zu warten. Clientangaben können diese Freigabe nicht umgehen. Presence bleibt im RAM, zuletzt gesehen höchstens 24 Stunden und maximal 200 Einträge; keine neue dauerhafte Aktivitätshistorie. Browser senden alle 30 Sekunden einen Heartbeat; nach 90 Sekunden ohne Heartbeat läuft die Lease aus. Socket-Abbruch entfernt die Verbindung sofort, die gemeinsame Anzeige wird wie bisher nach zwei Sekunden gebündelt aktualisiert. Bei abruptem Netzverlust greift zusätzlich die bestehende Socket.IO-Ping-Erkennung. `pagehide` trennt den Socket, der vorhandene BFCache-/Reconnect-Ablauf bleibt erhalten.

## Prüfungen

- 69 Node-Fälle für Erfolge, Presence, Ranked, Profile, Einstellungen und Abendprogramme bestanden. Darunter 15 neue Fälle zu Qualifikation, Identität, Rückwirkung, Wiederholung, beschädigten Altdaten, Zeitgleichheit, Löschung eines Gegners, geheimen Bedingungen und Presence-Leases.
- Zehn Browserfälle auf Desktop/Handy bestanden: bestehende Erfolgsabläufe plus echte qualifizierte Freischaltung, Fortschritt, Privacy, offene Lobby, Zuschauen, gleiche Namen, mehrere Tabs, Abwesenheit und Transport-Reconnect.
- Drei vollständige Fälle mit Playwright-WebKit bestanden. Das prüft die Safari-Engine; es ist kein Test auf einem physischen iPhone oder macOS-Safari.
- [15 dauerhafte Originalbilder mit SHA-256 und Quellhashes](V2-13_V2-14_EVIDENCE.json). Ausgewählte Desktop-/Handybilder wurden visuell geprüft; kein horizontales Seitenüberlaufen in den Browserfällen.

Reproduzierbar: `node --test test/v2-13-14.test.js`, `npx playwright test test/ui/v2-13-14.spec.js test/ui/achievements.spec.js`, und `npx playwright test --config=test/ui/v2-13-14.webkit.config.js`. Die Tests starten isolierte Server mit temporären Daten. Registrierte Testkonten verwenden ausschließlich feste Testidentitäten und einen Testsitzungsschlüssel; echte Discord-Dienste und Produktivdaten werden nicht verwendet.

Die ersten Browserläufe fanden einen nicht zurückgesetzten Spielfilter und einen fälschlich als abwesend gespeicherten Hub-Rückkehrer; beide Stellen sind behoben. Weitere Fehler lagen in Testannahmen: bereits authentifizierte zweite Tabs benötigen kein Passwortformular, ein behaltener Sitz ist kein Zuschauer, ein mobiler Online-Bereich muss wieder aufgeklappt werden und WebKits Offline-Emulation unterbricht vorhandene WebSockets nicht zuverlässig. Der Test trennt deshalb den echten Transport und hält Wiederverbindungen bis zur Netzrückkehr zurück. Alle endgültigen Ergebnisse werden getrennt von fehlgeschlagenen Vorläufen dokumentiert.

Abschluss: **1.382 Node-Tests bestanden, 0 fehlgeschlagen, 3 übersprungen** (91,607 s, `artifacts/v2-13-14-final-full-node.log`). Die drei gemeinsamen Browserdateien für Einstellungen, Profile und Roadmap/Presence bestehen **30/30 Fälle**, die Erfolgs-/Featuredateien **10/10**, die reproduzierbare WebKit-Konfiguration **3/3**. Damit sind **43 gezielte Browserfälle** grün. Die vollständige projektweite Playwright-Suite wurde nicht erneut komplett ausgeführt.

Ein alter Roadmap-Test erwartete die beiden Pakete noch als geplant; nach Anpassung ist der gesamte Node-Lauf grün. Ein mobiler Einstellungsfall las den lokalen Datenschutzschalter vor Abschluss der asynchronen Anfrage; er wartet jetzt auf lokale und serverseitige Bestätigung. Der anschließende vollständige 30-Fall-Nachlauf ist grün.

Die Nachwertung erfasst vorhandene bestätigte Runden; die bestehende Plattformgrenze von 50.000 gespeicherten Runden bleibt erhalten. Es werden keine bereits entfernten Ergebnisse oder alten, nur namensbasierten Qualifikationen rekonstruiert. Keine weitere offene Aufgabe innerhalb des freigegebenen Umfangs. Kein Produktivdeployment; nach V2-13 und V2-14 stoppen.
