# Änderungen

Hier steht, was sich im Spieleabend geändert hat, verständlich für alle, die ihn nutzen. Die technische Anleitung für den Server steht in [docs/betrieb.md](docs/betrieb.md).

## 3.0.0 – 8. November 2026

Seit Version 2.0.0 (1. November) ist sehr viel passiert. Aus 58 Spielen sind **107** geworden, jeder Spieler hat jetzt ein eigenes Konto mit Profil, es gibt eine echte Bestenliste, und der Server lässt sich besser betreuen. **Alles, was ihr bisher gespielt habt, bleibt erhalten.**

### Das Wichtigste in Kürze

* **40 neue Online-Spiele und 9 neue Einzelspieler-Spiele** (Liste unten).
* **Jeder Browser hat ein Konto mit einer Game-ID** (zum Beispiel `#K7Q2`). Euer Name kann sich ändern, eure Geschichte bleibt dran. Ein zweites Gerät lässt sich mit einem kurzen Code verbinden.
* **Echte Bestenliste (Ranked):** Gezählt werden nur Partien, in denen alle echte, angemeldete Menschen sind. Eure alten Statistiken bleiben sichtbar, und ihr könnt sie eurem Konto zuordnen.
* **Anmeldung mit Discord** (optional): Mitglieder des Discord-Servers kommen ohne Gruppenpasswort hinein; das Gruppenpasswort funktioniert weiter.
* **Profile, Erfolge und „Wer ist online?“** mit Schaltern, wer was sehen darf.
* **Einstellungen, Datenexport und Löschen:** Alles, was zu euch gespeichert ist, könnt ihr unter *Einstellungen → Meine Daten* herunterladen oder löschen. Eine kurze Datenschutzseite gibt es unter `/datenschutz` (Deutsch und Englisch).
* **Jedes Spiel hat jetzt seine eigene Spielwelt** (eigenes Aussehen statt einer Einheitsoptik), und der Computer-Gegner hat drei Stufen.
* **Neue Abendformate:** Party-Brett, Survival-Abend und optionale Zusatzregeln wie der Chaos-Modus.

### Neue Spiele zum Mitspielen

**Karten und Brett:** Backgammon, Hearts, Five Card Draw, Scrabble, Omaha Hi/Lo, Short Deck Poker, Seven Card Stud, Schach (auch als Chess960, mit Uhr), Skat, Doppelkopf, Exploding-Deck, Stichmeister, Labyrinth-Brett, Schatzinsel.

**Strategie:** Gebietskampf (eigene Weltkarte, Würfelkämpfe, Missionen) und Städtehandel (Inselaufbau mit Handel und Räuber). Beide merken sich den Spielstand sogar über einen Neustart des Servers hinweg.

**Party und Bluff:** Doppelagent, Lügenbaron, Jäger & Schatten, Infektionsjagd, Letzter Schutzplatz, Regelwahnsinn.

**Echtzeit und Action** (der Server ist Schiedsrichter, es gibt Computer-Mitspieler): Geschenkfänger, Rhythmus-Rausch, Stillgestanden!, Bomben-Duell, Schubsarena, Scheinwerfer-Flucht, Minenlauf, Labyrinth-Chaos, Puzzle-Panik, Wortjagd, Kistenchaos, Gummiband-Challenge, Turmbauer, Fallenbauer, Geschenkdiebe, Schatzgräber, Brückenroulette, Reaktor-Notfall.

**Einzelspieler** (laufen nur auf eurem Gerät, speichern nur dort): Snake, Memory, Minesweeper, Nonogramm, Sokoban, Block Puzzle, Solitaire, Mahjong Solitaire, Match-3. Dazu bleiben Sudoku, 2048 und Wellenwacht.

### Konten, Bestenliste und Profile

* **Game-ID und Geräte verbinden:** Unter *Ich → Identität* seht ihr eure Game-ID, könnt einen Code für ein zweites Gerät erzeugen und eure **alten Statistiken übernehmen** (wer zuerst kommt, bekommt sie; ein Admin kann eine falsche Zuordnung rückgängig machen).
* **Ranked:** Eine Partie zählt nur, wenn alle Mitspielenden registrierte Menschen sind (ohne Computer-Mitspieler und ohne Gäste). Am Tisch steht immer, ob die laufende Runde zählt und warum nicht. Die Bestenliste gibt es für Woche, Monat und alle Zeiten, je Spiel oder gesamt. Die alte Namensstatistik bleibt daneben bestehen.
* **Profile:** Wer sich auf euren Namen klickt, sieht (wenn ihr es erlaubt) Statistik, Lieblingsspiele, letzte Partien und Erfolge. Jede Angabe lässt sich einzeln verbergen, auch das ganze Profil.
* **Erfolge:** 234 Abzeichen, jetzt fest eurem Konto zugeordnet, mit Zeitpunkt.
* **Online-Status:** „online“, „abwesend“ und „unsichtbar“ stimmen auch mit mehreren offenen Tabs.
* **Tickets, Abendplanung und Rückblicke** gehören jetzt eurem Konto statt einem Browser-Cookie und zeigen die Game-ID bekannter Spieler.

### Einstellungen und Datenschutz

* **Eine Einstellungsseite** für Darstellung, Ton, Kartengröße, Startseite und Privatsphäre. Mit Konto gelten die Einstellungen auf allen verbundenen Geräten.
* **Meine Daten:** Alles als Datei herunterladen oder das Konto löschen (mit Eingabe der eigenen Game-ID).
* **Datenschutzseite** (`/datenschutz`) in Deutsch und Englisch: was gespeichert wird, wie lange, wie man es löscht. IP-Adressen werden nicht gespeichert.

### Aussehen

* **Jedes Spiel hat eine eigene Spielwelt** mit passenden Farben, Tisch und Beschriftungen: vom Kneipentisch bei Mäxchen bis zur Holzwerkstatt bei Scrabble. Alles lässt sich auf dem Handy und am großen Bildschirm bedienen.
* **Die Konto-Seiten** (Profil, Einstellungen, Bestenliste, Erfolge, Admin) sehen jetzt aus wie die Startseite.
* **Die Startseite** zeigt die Roadmap (was fertig ist, was kommt) und „Was ist neu“.

### Computer-Mitspieler

Drei Stufen (leicht, mittel, schwer) in vielen Spielen, von Poker über UNO bis Schach und Kniffel. Die Computer sehen nie eure verdeckten Karten.

### Neue Abendformate

* **Party-Brett** (Laternenpfad: ein gemeinsames Brett, Minispiele bewegen euch weiter, Items wie Schub und Schild) und **Survival-Abend** (Nachtwache: jeder hat 1 bis 5 Leben, wer verliert, verliert ein Leben) – beide über *Abendprogramm planen*, für 2 bis 12 Personen.
* **Zusatzregeln für Partyspiele** (Schätzmeister, Schlagfertig, Wer hat das gesagt?): zum Beispiel doppelte oder umgedrehte Punkte, auf Wunsch zufällig als **Chaos-Modus**. Die Regel steht vor dem Start für alle sichtbar.

### Sicherheit

Ein gründlicher Durchgang (Bericht: [docs/security-review-2026-11-08.md](docs/security-review-2026-11-08.md)): Eingaben werden strenger geprüft, die Seite bremst Dauerabfragen und das Anlegen vieler Gastkonten, die Browser-Schutzeinstellungen (CSP und weitere Header) sind verschärft, und ein automatischer Test prüft für alle Spiele, dass niemand fremde Karten, Würfel oder Rollen sehen kann. Gefunden wurde dabei kein echtes Leck.

### Für den Server und die Admins

* **Funktionen ein- und ausschalten:** Unter `/admin` → *Funktionen & Spiele* lassen sich Discord-Anmeldung, Ranked, die (noch nicht gebaute) Kamera und **jedes einzelne Spiel** sofort ein- und ausschalten. Die Grundeinstellung steht in der `.env` (`FEATURE_DISCORD`, `FEATURE_RANKED`, `FEATURE_CAMERA`, `DISABLED_GAMES`). Ausschalten löscht nie etwas.
* **Admin-Seite:** Moderation von Rückblicken, Partien, Bestenliste, Tickets und Spielern (zusammenführen), Update ankündigen, Räume schließen, Protokoll aller Änderungen.
* **Update ohne Chaos:** Ein Banner kündigt Updates an, neue Runden starten dann nicht mehr, laufende werden fertig gespielt, danach speichert der Server alles und startet neu.
* **Version und Commit** stehen unter *Ich* und auf `/health`.
* **Neue Betriebsanleitung** ([docs/betrieb.md](docs/betrieb.md)): Server von null aufsetzen, Update vom alten Stand mit Migration Schritt für Schritt, Sicherung und Wiederherstellung, Fehlersuche, Hinweise für Traefik, alle `.env`-Einstellungen mit Beispiel.
* **Release-Check** (`scripts/release-check.sh`): prüft vor dem Aufspielen `.env`, Image-Version und Sicherung und danach den Healthcheck. Er verändert nichts.
* **Sicherung und Wiederherstellung** (`scripts/backup.sh`, `scripts/restore-test.sh`) mit Prüfung, dass sich eine Sicherung wirklich einspielen lässt.
* **Wichtig beim Update:** `docker-compose.yml` reicht jetzt alle `.env`-Werte an den Container durch (vorher kamen z. B. die Discord-Werte aus der `.env` dort nicht an). Die neue Datei zusammen mit dem Image aufspielen und `.env` um den Block „Funktionen“ ergänzen.

### Unter der Haube

* **Ein Befehl für alle Tests** (`npm run test:all`) mit Coverage und Zusammenfassung; derselbe Befehl läuft nachts in der Entwicklungs-Pipeline in Teilen parallel.
* Rund 1.900 automatische Prüfungen am Server und rund 950 im Browser (Desktop und Handy), dazu ein Sammeltest, der **jedes Spiel mit Computer-Mitspielern bis zum Ende spielt** und dabei die Ansichten auf Lecks prüft.
* Version **3.0.0**.

### Bekannte Lücken

* Bei 13 Spielen (Blackjack, Bröckelboden, Hex, Kronenjagd, Laser-Hüpfer, Mäxchen, Mühle, Schlagfertig, Schwimmen, Shut the Box, Wer hat das gesagt?, Würfelduell, Zehntausend) sind einzelne Texte im Spielfeld auch bei englischer Sprache noch deutsch.
* Die Kamera-/Video-Funktion ist nur als abschaltbarer Platzhalter vorbereitet und tut noch nichts.
* Konten, Tickets, Planungen und Rückblicke werden nicht automatisch nach einer Frist gelöscht; Löschen geht über *Einstellungen → Meine Daten* bzw. den Admin.

## 2.0.0 – 1. November 2026

Erste Version mit eigener Betriebsverwaltung: Admin-Seite `/admin`, Update-Ankündigung, Version und „Was ist neu“, Fehlermeldungen aus dem Browser, Sicherung und Wiederherstellung. Zu dem Zeitpunkt gab es 58 Spiele (55 Online- und Partyspiele sowie Sudoku, 2048 und Wellenwacht).
