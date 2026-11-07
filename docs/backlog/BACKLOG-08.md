# BACKLOG-08 – Vier serverbewertete Echtzeitspiele

Umgesetzt auf `main` am 07.11.2026: `da5befa00c4fd5d80ac0f7d25e9a3ca98963a873`. Freigegeben waren ausschließlich **Geschenkfänger, Rhythmus-Rausch, Stillgestanden! und Bomben-Duell**. Keine V2-Pakete, keine weiteren Spiele. Die historische Rubrik enthält weiter 41 Spiele: **27 verifiziert, 14 offen**. Insgesamt sind 81 Raumspiele und zwölf lokale Einzelspieler registriert (93 spielbare Spiele).

## Architektur: Server als Schiedsrichter

Alle vier Spiele laufen auf der festen **50-ms-Schleife** der Arena-Räume (`STEP_MS`, Countdown, Eingabefrist und Frame-Verteilung aus `games/realtime-room.js`, Raumgrundlage `PartyArenaRoom`/`PartyRoom` wie in BACKLOG-07). Sie erben also nicht von `RealtimeRoom`, teilen aber dessen Takt, Konstanten und Frame-Weg und behalten Pause, Reconnect, Bots, Ergebnisablage und Bestenlisten-Ausschlüsse für Bots. Neu sind `games/arcade-room.js` (vier Raumklassen), `games/arcade-logic.js` (reine, seed-deterministische Regeln) und `games/arcade-bot.js`.

Der Client sendet nur **Richtungen** (`steer`), **Tipps** (`arcTap`: Bahn und geschätzte Serverzeit) und **Bombe legen** (`arcAct`). Positionen, Treffer, Punkte, Signale und Zündzeiten kommen nie vom Client. Jede Eingabe wird auf Rundenschlüssel, Runde, Teilnehmerstatus, Wertebereich und Folgenummer geprüft; Zuschauer, Ausgeschiedene, alte oder doppelte Eingaben werden abgewiesen. Tipps sind auf 14 pro Sekunde begrenzt. Eine gemeinsame Pause friert Uhr und Eingaben ein; Aussteigen bricht ohne erfundenen Sieg ab.

## Latenz fair ausgleichen

Jeder Frame enthält die Serverzeit (`elapsed`). Der Client schätzt daraus die aktuelle Serverzeit (Frame-Zeit plus Zeit seit Empfang) und zeichnet danach – Noten, Geschenke und Zündschnüre sind Funktionen der Serverzeit, nicht der lokalen Uhr. Zusätzlich schickt jede Eingabe die Nummer des zuletzt gesehenen Frames (`ack`); daraus misst der Server die Verzögerung je Person (geglättet, **höchstens 200 ms**, `LAG_CAP`).

- **Rhythmus-Rausch:** Ein Tipp trägt die vom Client geschätzte Serverzeit. Der Server rechnet sie höchstens um die selbst gemessene Verzögerung zurück und nie in die Zukunft; Fenster: perfekt ±60 ms, gut ±130 ms, knapp ±200 ms. Eine Note gilt erst als verpasst, wenn auch ein ausgeglichener Tipp sie nicht mehr treffen könnte.
- **Stillgestanden!:** Nach dem Wechsel auf Rot gilt eine Gnadenfrist von 250 ms plus der gemessenen Verzögerung (höchstens 450 ms); Gelb kündigt Rot 600 ms vorher an.
- **Geschenkfänger, Bomben-Duell:** Fall, Zündschnur und Flammen laufen nach der Serverzeit; Körbe und Figuren werden im festen 50-ms-Schritt bewegt.

**Ehrliche Grenze:** Die Verzögerungsmessung beruht auf dem vom Client gemeldeten `ack`. Ein manipulierter Client könnte sich dadurch bis zu 200 ms zusätzliche Kulanz verschaffen (bei Rhythmus-Rausch eine verschobene Trefferzeit, bei Stillgestanden! eine längere Gnadenfrist). Die Grenze ist hart gedeckelt und die Spiele sind Freundesrunden-Partyspiele; eine absolute Betrugssicherheit wird nicht behauptet.

## Regeln und Entscheidungen

- **Geschenkfänger (2–8):** Alle sehen denselben Fall (gleicher Seed), jede Person fängt mit dem eigenen Korb. Klein 10, groß 20, optional golden 50, Bombe −30 (nie unter null); optional schrumpft der Korb mit jeder Bombe bis 60 px. Standard 30 Sekunden (10–180).
- **Rhythmus-Rausch (2–8):** Gleiche Notenfolge für alle, vier Bahnen (optional eine), optional schnelleres Tempo. Perfekt 100, gut 60, knapp 25 Punkte; Serien aus perfekten/guten Treffern geben bis zu 50 Bonuspunkte je Note; Fehltipp −10 und Serienabbruch. Standard 45 Sekunden.
- **Stillgestanden! (2–8):** Wettlauf an die Ziellinie. Grün/Gelb/Rot zufällig vom Server. Bewegung bei Rot nach der Gnadenfrist: zurück zum Start (Standard) oder zwei Sekunden Stillstand; optional Fake-Signal (kurzes Rot ohne Strafe, das Flag verlässt den Server nie). Zuerst im Ziel gewinnt, gleichzeitige Ankunft teilt, sonst gewinnt der weiteste Lauf. Standard 90 Sekunden.
- **Bomben-Duell (2–8):** Raster 15×10 mit festen Pfeilern und Kisten (seed-erzeugt, Startfelder frei), Feld-für-Feld-Bewegung, eine Bombe je Person, 2,2 s sichtbare Zündschnur, Radius 2, Pfeiler stoppen, die erste Kiste wird gesprengt, Ketten zünden sofort, Flammen 450 ms. Punkte je Runde = Zahl der vorher Ausgeschiedenen (Überlebende: alle Ausgeschiedenen); 1–5 Runden (Standard 3), 75 s je Runde.

Schalter (golden, schrumpfender Korb, eine Bahn, Tempo, Rückkehr, Fake-Signal) stellt der Host am Tisch ein; das Erstellformular kennt nur Zahlenfelder. Das wurde durch einen Screenshot entdeckt: Ein Schalter im Erstellformular wäre als Text `"false"` gesendet und serverseitig als wahr gelesen worden.

## Oberfläche

Eigene inline gezeichnete SVG-Lobbys und Canvas-Szenen: Winterfenster, Neon-Bühne, Ampelstrecke und Sprengwerkstatt. Keine fremden Bilder, Logos oder Assets. Gemeinsamer Client `public/games/arcade-kit.js`: Tastatur (Pfeile/WASD, Leertaste, D F J K) und echte Touch-Halte-/Tippflächen, Regeln DE/EN im Regeln-Tab, optionale Bots für Testrunden mit einer ehrlichen Standardstufe. Gezeichnet wird mit `requestAnimationFrame`; der statische Hintergrund liegt einmal in einem Zwischenbild, bewegte Teile werden zwischen Server-Frames interpoliert.

## Nachweise

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Neue Regeltests | 32 bestanden: Punkte, Trefferfenster, Latenzausgleich, Signale, Explosionen, Rundenende, Eingabeprüfungen, Bots; vollständige Botrunden in jeder Spielerzahl (30/30/30/16 je Spiel); ein Server-Schritt mit acht Bots kostet 0,014–0,068 ms bei 1,5–1,7 KB je Frame |
| Neue Browserfälle Desktop + Handy | 8 bestanden (295,6 s), je mit sechs Spielenden: echte Tastatur- bzw. CDP-Touch-Eingabe, Server wertet Tipp/Bewegung/Bombe, DE- und EN-Regeln, Pause und Neuladen, sechs Größen ohne Seitenüberlauf, reguläres Ergebnis |
| Zeichenzeit (gemessen) | Mittelwert 0,15–0,28 ms pro Bild, Spitze bis 14,2 ms (`artifacts/backlog08-perf.log`); Chrome headless lief mit rund 240 Bildern/s (ungedrosselt). Ein echtes Handy wurde nicht gemessen; „60 fps“ ist damit ein Ziel mit großem Spielraum, kein gemessener Gerätewert |
| Breite Browserregression | 66 Fälle: 64 bestanden, 2 verfehlten die 6-Sekunden-Startfrist (Kronenjagd mobil, Laser-Hüpfer), während andere Sitzungen auf derselben Maschine eigene Playwright-Läufe ausführten. Wiederholung `realtime.spec.js --retries=2`: 6 von 6 bestanden, davon 2 erst im Wiederholungsversuch. Diese Spiele nutzen keinen BACKLOG-08-Code; die Vorläufe sind nicht als grün gewertet |

Permanente Screenshots (64, je mit SHA-256) liegen unter `docs/backlog/screenshots/backlog08/<spiel>/` und umfassen Lobby, englische Regeln, Spiel, Pause, Ergebnis sowie sechs Größen (1920×1080, 1440×900, 768×1024, 390×844, 360×800, 900×450); Quellhashes (LF-normalisiert) stehen im Manifest je Spiel:

- [Geschenkfänger](../../games/geschenkfaenger/evidence.json)
- [Rhythmus-Rausch](../../games/rhythmus-rausch/evidence.json)
- [Stillgestanden!](../../games/stillgestanden/evidence.json)
- [Bomben-Duell](../../games/bomben-duell/evidence.json)

## Bekannte Grenzen und Hinweise

- Eine laufende Arena ist kein fortsetzbarer Server-Snapshot: Reload derselben Partie behält Position und Wertung, ein Serverneustart verwendet die bestehende Wiederherstellung zwischen Runden.
- Das Verlassen eines Mitspielers beendet eine Echtzeitpartie ohne Wertung (wie die BACKLOG-07-Arenen).
- Geschenkfänger und Rhythmus-Rausch waren im Backlog als Bauart B (lokal spielen, Server prüft) geplant; sie laufen jetzt vollständig serverseitig (Bauart C). Der Backlog-Eintrag ist entsprechend erledigt, die Planung dazu entfällt.
- Ein Push startet die bestehende Test-/GHCR-Automatik; kein Produktivserver wird aktualisiert. Parallele Arbeit anderer Sitzungen im selben Arbeitsverzeichnis (BACKLOG-09, V2-06-Rücknahmen, Design-Änderungen) wurde weder angefasst noch mitcommittet.
