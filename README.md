# Spieleabend

Spielesammlung mit 107 Spielen: 95 Online-/Partyspiele für die Freundesgruppe sowie die lokalen Einzelspieler Sudoku, 2048, Wellenwacht, Snake, Memory, Minesweeper, Nonogramm, Sokoban, Block Puzzle, Solitaire, Mahjong Solitaire und Match-3. Bei den Online-Spielen ist der Server Geber und Schiedsrichter: Er mischt, teilt aus, würfelt, prüft jeden Zug und rechnet ab.

Der Ausbau von **„Weitere Spiele“** beginnt mit **Risiko-Würfeln, Story-Chaos und Zahlenreihe**. Das zweite Päckchen ergänzt **Würfeljagd, Monsterwürfel und Würfel-Auktion**, das dritte **Backgammon, Hearts und Five Card Draw** mit Bots und eigenen Spielwelten. Das vierte Päckchen ergänzt **Scrabble, Omaha Hi/Lo, Short Deck Poker und Seven Card Stud**. **BACKLOG-05** ergänzt **Exploding-Deck, Doppelagent und Lügenbaron** sowie separat **Schach mit Chess960** aus den großen Projekten. **BACKLOG-06** ergänzt **Stichmeister, Labyrinth-Brett und Schatzinsel** mit drei Bot-Stufen und eigenen Spielwelten ([Abschlussbericht](docs/backlog/BACKLOG-06.md)). **BACKLOG-07** ergänzt **Jäger & Schatten, Infektionsjagd, Letzter Schutzplatz und Regelwahnsinn** auf PartyRoom-Basis mit privaten Sichten, Tastatur/Touch, optionalen Bots, einstellbaren Zeiten und DE/EN-Regeln ([Abschlussbericht](docs/backlog/BACKLOG-07.md)). **BACKLOG-08** ergänzt die serverbewerteten Echtzeitspiele **Geschenkfänger, Rhythmus-Rausch, Stillgestanden! und Bomben-Duell** mit Serverzeit-Latenzausgleich, Tastatur/Touch, optionalen Bots und DE/EN-Regeln ([Abschlussbericht](docs/backlog/BACKLOG-08.md)). **BACKLOG-09** ergänzt **Schubsarena, Scheinwerfer-Flucht, Minenlauf und Labyrinth-Chaos** mit Server-Schiedsrichter, virtuellem Stick/Tippen, lösbaren Zufallsfeldern und DE/EN ([Abschlussbericht](docs/backlog/BACKLOG-09.md)). **BACKLOG-10** ergänzt **Puzzle-Panik, Wortjagd, Kistenchaos und Gummiband-Challenge** mit zertifiziert lösbaren Aufgaben, freien DE/EN-Wortlisten und Server-Schiedsrichter ([Abschlussbericht](docs/backlog/BACKLOG-10.md)). **BACKLOG-11** ergänzt **Turmbauer, Fallenbauer und Geschenkdiebe** mit Server-Schiedsrichter, privaten Türmen, sicheren Parcours, Tastatur/Touch und DE/EN ([Abschlussbericht](docs/backlog/BACKLOG-11.md)). **BACKLOG-12** schließt die Rubrik mit **Schatzgräber, Brückenroulette und Reaktor-Notfall** ab: Grabarena mit verdecktem Feld, geheime Planken-Wahl und kooperative Reaktor-Aufgaben mit privaten Hinweisen, alles mit Server-Schiedsrichter, Bots und DE/EN ([Abschlussbericht](docs/backlog/BACKLOG-12.md)). Die ursprüngliche 41er-Rubrik steht bei **41 von 41 erledigt**; Schach vergrößert ihren Nenner nicht. Regeln, Prüfungen, Bildnachweise und weiterer Fortschritt: [Backlog-Päckchen](docs/backlog/WEITERE_SPIELE.md).

**Skat und Doppelkopf** sind aus der Planung „Große Projekte“ als spielbare Kartenspiele umgesetzt (Regeln und Tests in `games/skat/` und `games/doppelkopf/`, Oberfläche in `public/games/skat/` und `public/games/doppelkopf/`). Skat: 3 Spieler, Reizen (18, 20, 22 …), Skat aufnehmen und drücken oder Hand, Farbspiel/Grand/Null (Hand, Ouvert, Schneider/Schwarz angesagt), Spitzen, Abrechnung nach Skatordnung (gewonnen Wert + 50, verloren −2 × Wert − 50, Gegner je +30); Varianten Ramsch und Bockrunden. Doppelkopf: 4 Spieler, 48 oder 40 Karten, Re/Kontra, Hochzeit, Solos (Damen, Buben, Fleischlos, Farbe), Ansagen Re/Kontra und keine 90/60/30/schwarz, Sonderpunkte Fuchs, Doppelkopf und Karlchen; Varianten ohne Neunen und Schweinchen. Beide haben Computer-Mitspieler in allen drei Stufen (Worker-Strategie) und deutsche/englische Texte.

**Gebietskampf (Risiko-inspiriert)** ist als eigenständiges Strategiespiel für 2–6 Spieler umgesetzt (Regeln und Tests in `games/gebietskampf/`, Oberfläche in `public/games/gebietskampf/`): erfundene Weltkarte Meridia mit 42 Gebieten (kleine Karte: 28), Verstärkung nach Gebieten und Landmassen-Boni, Würfelangriffe auf dem Server, Kartensätze (steigender oder fester Bonus), Verschieben, Weltherrschaft oder geheime Missionen, Bots in drei Stufen. Der Spielstand wird auch mitten im Spiel gespeichert (`rooms.json`). Details: [docs/roadmap/V2-11_GEBIETSKAMPF.md](docs/roadmap/V2-11_GEBIETSKAMPF.md).

**Städtehandel** ist als eigenständiges Hexfeld-Aufbauspiel für 3–4 Spieler (5–6 mit großem Brett) umgesetzt (Regeln und Tests in `games/staedtehandel/`, Oberfläche in `public/games/staedtehandel/`): erfundene Insel Aurelia mit eigenen Rohstoffen, Würfelertrag, Straßen, Siedlungen und Städten, Räuber, Handel mit Spielern und Bank/Häfen, Entwicklungskarten, längster Straße und größter Rittermacht, Sieg bei 10 Punkten, Bots in drei Stufen. Der Spielstand wird auch mitten im Spiel gespeichert (`rooms.json`). Details: [docs/roadmap/V2-12_STAEDTEHANDEL.md](docs/roadmap/V2-12_STAEDTEHANDEL.md).

Die Kategorie **Einzelspieler** in der Spielebibliothek startet ohne zweiten Teilnehmer oder Discord-Account. Fortschritte werden versioniert im aktuellen Browser gespeichert, beim Verlassen pausiert und lokal fortgesetzt. Es entstehen keine öffentlichen Tische oder Ranglisten aus Solo-Daten. Details, Tests, Screenshots und die neun ausschließlich geplanten weiteren Solo-Spiele: [Einzelspieler-Dokumentation](docs/solo-games/README.md).

> **Name:** Sichtbar heißt die Seite „Spieleabend“. Technisch bleibt „pokerabend“ – Repo, Docker-Image `ghcr.io/ttlpscwa/pokerabend`, Container, Volume `poker-data`, Paketname, Cookie `pa_auth` und die Browser-Speicherschlüssel `poker:…`. Sonst brechen Deployment und laufende Sitzungen.

Die alten Namen bleiben an diesen Stellen absichtlich erhalten:

| Stelle | Unverändert | Grund |
| --- | --- | --- |
| `package.json`, `package-lock.json` | Paketname `pokerabend` | Bestehende Paketidentität |
| `docker-compose.yml`, `.env.example`, `.github/workflows/docker.yml` | `pokerabend:latest` bzw. `ghcr.io/ttlpscwa/pokerabend:latest` | Bestehendes Deployment und Image |
| Docker-Dateien und diese README | Kommentare, Image-Beispiele, Repo-Link `TTLPSCWA/PokerAbend` | Technische Referenzen statt sichtbarer Markenname |
| Compose-Konfiguration | Dienst `poker`, Volume `poker-data` | Bestehende Container und gespeicherte Daten |
| `server/security.js`, `public/core.js` | Cookie `pa_auth`, Browser-Schlüssel `poker:…` | Login und Wiederverbinden bleiben gültig |
| `games/`, `public/games/`, gespeicherte Räume | IDs `farbenchaos`, `huetchen`, `zehnetappen`, `stapelrennen` | Alte Links, Module und Spielstände bleiben verwendbar |

## Verbindlicher Entwicklungsworkflow: ausschließlich main

Dieses Projekt verwendet ausschließlich den Branch `main` als aktiven Entwicklungsbranch.

Erstelle nicht eigenständig neue Git-Branches oder Pull Requests.

Alle ausdrücklich freigegebenen Änderungen werden direkt auf `main` implementiert, getestet, committed und gepusht.

Vor jedem Schreibvorgang ist der aktuelle Remote-Stand zu prüfen. Falls der Branch zwischenzeitlich verändert wurde, müssen die Änderungen zuerst sicher abgeglichen werden.

Verwende niemals Force-Push, um Konflikte zu umgehen.

Ohne ausdrückliche Freigabe darf kein neues Entwicklungsarbeitspaket begonnen werden.

Dokumentation und Planungsdateien sind keine automatische Implementierungsfreigabe.

Technische Schreibsperren auf `main` werden gemeldet; kein Ersatzbranch und keine Umgehung von Schutzregeln. Diese Regel ersetzt alte Feature-Branch-Anweisungen. Codex und Claude Code beachten [AGENTS.md](AGENTS.md) und [CLAUDE.md](CLAUDE.md).

Die [dauerhafte V2-Planung](docs/roadmap/README.md) enthält 18 Arbeitspakete (`V2-00` bis `V2-17`); zentraler Status ist [plan.json](docs/roadmap/plan.json). Nur ausdrücklich freigegebene, tatsächlich abgeschlossene Pakete tragen dort Umsetzungsnachweise; die übrigen bleiben geplant. Die [Konsolidierungsprüfung](docs/roadmap/CONSOLIDATION_2026-10-30.md) dokumentiert die Übernahme der alten Branch-Inhalte. Öffentliche Roadmap und Entwicklungsplanung sind über geprüfte IDs verknüpft. Das vorhandene Redesign und alle 46 Spiele bleiben erhalten.

Ein beauftragter Push startet derzeit Tests und GHCR-Image-Veröffentlichung, kein Repository-Workflow aktualisiert den Produktivserver. Ein Serverupdate oder eine Datenmigration benötigt eine gesonderte ausdrückliche Freigabe.

## Schnellstart

**Sprache:** Auf Anmeldung und Startseite sowie unter **Ich → Sprache** am Spieltisch kann jeder Browser zwischen Deutsch und **English (Beta)** wählen. Die Auswahl wird gespeichert und lässt sich während einer Runde ohne Neuladen ändern. Englisch umfasst die Bibliothek, gemeinsame Bedienung und 423 Party-Aufgaben; einzelne Regeln und weitere Inhalte bleiben vorerst deutsch. Umfang und Prüfnachweise: [docs/languages.md](docs/languages.md).

### Lokal mit Docker (empfohlen)

```bash
docker compose up --build
```

Danach `http://localhost:3000` öffnen. Zum Testen mit mehreren Spielern einfach ein zweites Browserfenster im Inkognito-Modus nehmen.

### Lokal ohne Docker

```bash
npm install
npm start          # oder: npm run dev (startet bei Änderungen neu)
npm test           # Engine- und Servertests
npm run test:ui    # Browserprüfungen in Chrome (1440 und 390 Pixel)
```

Voraussetzung ist Node.js 20 oder neuer.

Die Browserprüfungen benötigen lokal installiertes Chrome. Screenshots liegen unter `artifacts/block-a/`; Fehlerberichte unter `test-results/`.

Das [UI-Redesign-Protokoll](docs/ui-redesign.md) beschreibt Gestaltung, tatsächliche Änderungen, Testabdeckung und Vorher-/Nachher-Aufnahmen. Neue Vergleichsbilder lassen sich mit `node scripts/capture-ui-redesign.mjs after` erzeugen; der Aufruf nutzt einen eigenen lokalen Testserver und temporäre Daten.

## Online stellen

> **Vollständige Betriebsanleitung: [docs/betrieb.md](docs/betrieb.md)** – Server von null einrichten, Update vom alten Stand mit Migration, Sicherung und Wiederherstellung, Fehlersuche, Hinweise für Traefik und alle `.env`-Einstellungen mit Beispiel. Was sich seit Version 2.0.0 geändert hat, steht in der [CHANGELOG.md](CHANGELOG.md). Vor dem Aufspielen prüft `scripts/release-check.sh` die Einstellungen, das Image und die Sicherung (nur lesend).

//1. **Image bauen und pushen**  

   ```bash
   docker build -t ghcr.io/DEIN-NAME/pokerabend:latest . 
   docker push ghcr.io/DEIN-NAME/pokerabend:latest
   ```

   Alternativ das Repo auf GitHub legen (z. B. [https://github.com/TTLPSCWA/PokerAbend](https://github.com/TTLPSCWA/PokerAbend)): Der Workflow in `.github/workflows/docker.yml` testet bei jedem Push auf `main` und schiebt das Image automatisch nach `ghcr.io`.
   Voraussetzung auf dem Server: ein zentraler Traefik-Proxy mit dem externen Docker-Netz `proxy` (Entrypoint `websecure`, certresolver `letsencrypt`). Das Netz muss existieren, sonst startet der Tisch nicht (`docker network create proxy`).
   Die Dateien `docker-compose.yml`, `docker-compose.prod.yml` und `.env.example` hochladen.

   ```bash
   cp .env.example .env            # DOMAIN=poker.scwagaming.com, IMAGE und SITE_PASSWORD setzen
   docker context use projekt
   docker compose -f ./docker-compose.yml -f ./docker-compose.prod.yml --env-file .env up -d
   ```
   Die Domain muss per DNS-A-Record auf den Server zeigen. Traefik erkennt den Container an seinen Labels (`Host(DOMAIN)`, Port 3000) und holt das HTTPS-Zertifikat automatisch; die App selbst ist nicht direkt von außen erreichbar (nur `expose`, kein `ports`).

**Kompression (gzip über Traefik):** Die Labels in `docker-compose.prod.yml` hängen die Middleware `poker-gzip` (`compress=true`) an den Router `poker`. Die App selbst komprimiert nicht. Traefik komprimiert nur Antworten, die der Browser mit `Accept-Encoding` erlaubt, und lässt WebSocket-Verbindungen (Socket.IO-Upgrade) sowie bereits komprimierte Dateien (PNG, WOFF2) unverändert. Nach dem Deployment prüfen:

```bash
curl -sI -H 'Accept-Encoding: gzip' https://DEINE-DOMAIN/hub.js | grep -i content-encoding   # erwartet: content-encoding: gzip
curl -sI https://DEINE-DOMAIN/hub.js | grep -i content-encoding                              # ohne Header: keine Kompression
```

Die Seite `/` verlangt das Login-Cookie; ohne Cookie leitet sie um. `/style.css` und `/login.js` sind offen und eignen sich für die Prüfung ohne Anmeldung. Wenn `content-encoding` fehlt, laufen Traefik-Labels oder Router nicht (`docker compose ... config` zeigt sie). Socket.IO bleibt davon unberührt: im Browser unter „Netzwerk“ bleibt die `websocket`-Verbindung (Status 101) geöffnet.

//3. **Update einspielen:** neues Image pushen, auf dem Server wieder `pull` und `up -d`.

**Anmeldung:** Über das Gruppenpasswort `SITE_PASSWORD`. Auf dem Server ist es in der `.env` Pflicht, ohne startet nichts. Lokal ohne `SITE_PASSWORD` ist die Seite offen (nur zum Testen).

Tische und Chipstände liegen im Docker-Volume `poker-data` und überleben Neustarts. Gespeichert wird immer zwischen zwei Händen. Nach einem Neustart drückt der Host einmal auf „Spiel starten“.

## Startseite

Die Startseite ist ein Hub mit Navigation per URL-Hash (Zurück-Taste und Links funktionieren):

| Adresse | Seite |
| --- | --- |
| `#start` | Begrüßung, „Weiterspielen“, offene Tische, Deine Spiele, Code-Feld |
| `#tische` | alle offenen Tische |
| `#spiele`, `#spiele/karten`, `/wuerfel`, `/brett`, `/party` | Spieleliste mit Filtern |
| `#favoriten` | meine Favoriten |
| `#bestenliste` | Bestenliste nach Spiel und Monat |
| `#roadmap` | Etappen, geplante Spiele und Funktionen, abgeschlossene Päckchen |
| `#tickets`, `#tickets/123` | Ticket-Board und direkte Links auf einzelne Tickets |

- **Profil:** Beim ersten Besuch fragt ein Dialog nach Name und Avatar. Beides liegt im Browser (`poker:name`, `poker:avatar`) und wird beim Hosten und Beitreten verwendet. Ist der Name am Tisch schon vergeben, schlägt der Server einen freien vor („Tobi 2“).
- **Offene Tische:** Der Server schickt die Liste an alle Angemeldeten (Socket-Ereignis `lobby`, Änderungen höchstens einmal pro Sekunde): Spiel, Code, Host, wer sitzt, Plätze, Stand – nie Tokens, Karten oder Spielstände. „Dazusetzen“ und „Zuschauen“ sind ein Klick mit dem Profil. Ein Tisch erscheint, solange mindestens ein Mensch online ist. Der Host kann am Tisch unter „Host“ einstellen: **Tisch nicht in der Liste zeigen** (privat, nur per Code oder Link). Die Grenze für neue Tische lässt sich zum Testen mit `CREATE_LIMIT` erhöhen (Standard 6 pro 10 Minuten und IP).
- **Weiterspielen:** Hat der Browser ein Token für einen noch offenen Tisch (auch einen privaten), steht er ganz vorne mit „Zurück an den Tisch“.
- **Adressen und „Zurück“:** Ein Tisch hat immer die Adresse `/?t=CODE`, die Seiten der Startseite haben `/#start`, `/#spiele` … ohne `?t=`. Einen Tisch zu betreten (hosten, beitreten, Link, „Weiterspielen“) legt einen Verlaufseintrag an (`pushState`). „Zurück“ zeigt die Startseite, der Platz am Tisch bleibt erhalten (der Tisch steht unter „Weiterspielen“), „Vor“ führt wieder an den Tisch. Ein Wechsel in einen anderen Tisch oder ein anderes Spiel lädt die Seite frisch (`location.reload()`, kein zweiter Eintrag); kommt eine Seite aus dem Vor-/Zurück-Cache (bfcache), lädt sie sich ebenfalls neu. Ist ein Tisch sichtbar, aber nichts gemountet oder die Verbindung weg, erscheint nach 3 Sekunden „Verbindung verloren“ mit „Neu laden“.
- **Einladungslink `/?t=CODE`:** Mit Profil tritt man direkt bei, ohne Profil fragt erst der Profil-Dialog nach dem Namen. Gibt es den Tisch nicht mehr, kommt ein Hinweis und die Startseite.
- **Spieleliste:** Filter (Favoriten, Spielerzahl, Kurz unter 15 Minuten), Liste oder Kacheln, Favoriten und „zuletzt gespielt“ (nur in diesem Browser: `poker:favs`, `poker:recent`, `poker:view`). Noch nicht gebaute Spiele stehen in `games/planned.js`: `status: 'next'` erscheint weiter ausgegraut mit „Bald“, der übrige Backlog auf der Roadmap. Funktionen erscheinen nie als Spiel. Ab 20 Spielen gibt es eine Suche.
- **Roadmap:** `games/roadmap.js` beschreibt Etappen für Spiele, Funktionen, Design, Discord und Betrieb; `/roadmap` liefert sie nur angemeldet und ergänzt Backlog-Inhalte automatisch aus `planned.js`. Filter, Fortschritt und Spielregeln sind im Hub sichtbar. Später, große Projekte und erledigte Etappen starten eingeklappt; die Wahl wird lokal gemerkt.
- **Tickets:** Ideen und Fehler mit Titel, Beschreibung und optionalem Spielbezug sammeln. Suche, Art, Status, Spiel und Sortierung filtern das Board; die Filter werden im Browser gemerkt (`poker:ticketFilters`). „Suche & Filter“ ist einklappbar und startet am Handy geschlossen. Ein Klick auf ein Ticket öffnet die Diskussion. Eigene Tickets lassen sich bearbeiten, eigene Kommentare löschen. Eine Stimme pro Browser lässt sich jederzeit zurücknehmen; Stimmen und Bearbeitungsrechte hängen an einem privaten Cookie, nicht am Anzeigenamen. Andere Geräte oder gelöschte Cookies haben eine neue Identität.
- **Gerade online:** Zeigt Profilname, Avatar und Standort, bündelt mehrere Tabs/Geräte über denselben normalisierten Namen wie die Bestenliste und bietet den Beitritt zu gelisteten Tischen an. Private Tische verraten weder Spiel noch Code, Bots fehlen. Unter „Ich“ macht „Mich nicht als online zeigen“ die eigene Anwesenheit und den letzten Besuch unsichtbar. Hintergrund-Tabs, fünf Minuten ohne Eingabe und geparkte Verbindungen gelten als kurz weg. Online-Änderungen kommen höchstens alle zwei Sekunden; „Zuletzt online“ bleibt maximal 24 Stunden ausschließlich im Serverspeicher und entfällt nach einem Neustart. Gleichnamige Personen werden bis zur Einführung fester Spieler-IDs zusammengefasst.
- **Hosten:** Seitenpanel rechts, am Handy eine Leiste von unten – nur mit den Lobby-Feldern des Spiels (`createFields`).
- **Neues Spiel:** Ein Spielmodul bringt `minPlayers`, `maxPlayers`, `duration` (Minuten) und `art` (SVG, Bausteine in `games/art-kit.js`) mit; ein Test prüft, dass die Zahlen zum Raum passen.

## Ticket-Board

Unter **Tickets → Verwaltung anmelden** mit dem eigenen Admin-Passwort anmelden. Dafür in der `.env` **`TICKET_ADMIN_PASSWORD`** setzen und die App neu starten; die Docker-Compose-Dateien reichen die Variable an die App weiter. Die Vorlage steht in `.env.example`. Ein eigenes Passwort verwenden. Ist die Variable leer, bleibt die Verwaltungsanmeldung ausgeschaltet; normale Tickets, Stimmen, Kommentare und Exporte funktionieren trotzdem. Die Anwendung richtet kein Standard-Admin-Passwort ein.

Die Verwaltung kann jeden Tickettext bearbeiten, den Status auf **Neu, Geplant, In Arbeit, Erledigt oder Abgelehnt** setzen, Kommentare moderieren und Tickets nach Bestätigung endgültig löschen. Statuswechsel bleiben mit Zeit und Namen im Ticket sichtbar. Admin-Sitzungen gelten acht Stunden; Abmelden oder ein geändertes Admin-Passwort entziehen die Rechte. Auch das Abmelden von der gesamten Seite beendet die Admin-Sitzung. Der Anzeigename allein verleiht keine Verwaltungsrechte.

**Markdown exportieren** lädt alle Tickets der aktuellen Filterauswahl herunter, einschließlich weiterer Ergebnisseiten. **Ticket als Markdown** exportiert einen einzelnen Eintrag. Enthalten sind Beschreibung, Status, Autor, Stimmenzahl, Kommentare und Statusverlauf; Browser-Identitäten und Sitzungsdaten fehlen. Nutzereingaben erscheinen im Board als Text und werden im Export maskiert.

Tickets liegen in **`data/tickets.json`** (bzw. `DATA_DIR/tickets.json`) und damit im bestehenden Docker-Volume. Änderungen werden erst nach erfolgreichem atomaren Speichern bestätigt. Parallele Änderungen an einem Ticket werden erkannt; eine veraltete Bearbeitung überschreibt den neuen Stand nicht. Bei einer defekten Ticket-Datei bleibt diese erhalten, das Board meldet den Fehler und die Spiele bleiben nutzbar. Datei in die bestehenden Backups einschließen.

Grenzen: 100 Zeichen im Titel, 4000 in der Beschreibung, 2000 je Kommentar, 100 Kommentare und 200 Stimmen je Ticket, insgesamt 1000 Tickets. Zusätzlich gelten Limits pro IP: 12 neue Tickets und 60 Kommentare pro Stunde, 120 Stimm- bzw. Verwaltungsaktionen in zehn Minuten sowie acht fehlgeschlagene Admin-Anmeldungen in 15 Minuten. Die Schreib-API verlangt JSON, passende Herkunft und einen eigenen Anfrage-Header; Admin- und Browser-Cookies sind signiert, HttpOnly und bei HTTPS Secure.

Technik: `server/tickets.js` kapselt Daten, Rechte und Markdown; `server/ticket-api.js` stellt die geschützte HTTP-API unter `/api/tickets` bereit. `public/tickets.js` bindet das Board in den Hub ein. Kommentare behalten ihren Entwurf beim Abstimmen oder Aktualisieren. Tests: `test/tickets.test.js`, `test/ticket-api.test.js`, `test/ui/tickets.spec.js`.

## Spiele

### Neu: Scotland Yard, Hex und Würfelduell

**Scotland Yard**: 3–6 Spieler, eigener Stadtplan mit 49 Haltestellen, geheime Mr.-X-Position, öffentliche Ticketspur, Black-Tickets, Fähren und Doppelzüge. Der Host kann Mr. X zuweisen; sonst wechselt die Rolle. Detektiv-Bots kennen nur öffentliche Hinweise.

**Hex**: 2 Spieler auf 11×11 oder 9×9 Feldern, sichtbare Zielränder, optionaler Seitentausch nach dem ersten Stein und hervorgehobener Gewinnpfad. **Würfelduell**: 2–4 Spieler wählen Gegner, würfeln serverseitig Angriff gegen Verteidigung und spielen bis zum letzten Überlebenden.

Alle drei unterstützen Bots, Host-Pause, Wiederverbinden und deutsche/englische Bedienung samt Regeln. Regeln, Anpassungen und Prüfnachweise: [docs/scotland-yard-und-kleine-spiele.md](docs/scotland-yard-und-kleine-spiele.md).

### Gemeinsame Spielpause

In allen 66 Raumspielen und ihren Varianten kann ausschließlich der **Host** über **Pause** die gesamte Partie sofort anhalten. **Fortsetzen** startet sie an derselben Stelle mit der übrigen Zeit. Mitspieler und Zuschauer sehen einen gemeinsamen Pausenhinweis; Spielaktionen, Bots, Zug-/Rundentimer, Zünder und Echtzeitbewegungen warten. Auch lokal laufende Minispiele halten ihre Spielzeit und Eingaben an. Bei Poker bleibt zusätzlich „Pause nach dieser Hand“ erhalten.

Die Pause bleibt beim Wiederverbinden bestehen. Nach einem Hostwechsel kann der neue Host fortsetzen. Zur Startseite gehen, den Tisch verlassen, eine Runde gezielt abbrechen oder den Tisch schließen bleibt möglich. Eine Pause ist kein neuer dauerhafter Spielstand: Für Server-Neustarts gelten weiterhin die bestehenden Speicherregeln. Technische Details und Prüfungen: [Gemeinsame Spielpause](docs/game-pause.md).

### Päckchen 10: Varianten und Spiel des Lebens

Die **Spielvariante** wird beim Hosten und zwischen Partien unter **Host → Variante** gewählt. Ein Wechsel setzt den lokalen Tischstand und ein vorbereitetes Abendprogramm zurück. Die Auswahl bleibt bei einem Server-Neustart erhalten. Varianten sind auch pro Station im Abend-Modus wählbar. Hub-Plaketten zeigen die verfügbaren Varianten; der Verlauf nennt die aktive Variante. Die Bestenliste führt beispielsweise **UNO Flip** getrennt von UNO. Erfolge und Abzeichen zählen beide unter dem Hauptspiel zusammen.

| Spiel | Neue Varianten |
| --- | --- |
| Monopoly | Tempowürfel; Junior mit 24 Feldern und 2–4 Spielern |
| UNO | Flip (2–10), No Mercy (2–6), All Wild (2–10); Grundversion mit optionaler 7–0-Hausregel |
| Kniffel | Dreifach-Kniffel mit drei Spalten ×1, ×2, ×3 |
| Mensch ärgere Dich nicht | Sechseck mit 60 Feldern für bis zu sechs Spieler; Team 2 gegen 2 |
| Vier gewinnt | Pop Out; Fünf in einer Reihe auf 9×6 |
| Schiffe versenken | Salvo mit verdeckten, gleichzeitig aufgelösten Salven |
| Skip-Bo | Kurze Partie mit zehn Spielstapelkarten; Partnerschaft 2 gegen 2 |
| Phase 10 | Kurze Partie mit fünf Phasen; kooperative Teamvariante 2 gegen 2 |
| Monopoly Deal | Schnelle Partie: zwei vollständige Sätze gewinnen |
| Spiel des Lebens | Klassisch (ca. 45 Minuten); Schnelles Leben (ca. 20 Minuten), jeweils 2–6 Spieler |

**Monopoly** hat zusätzlich das wählbare Thema **Klassik**: cremefarbenes Brett, große Eckfelder mit eigenen Zeichnungen, Besitzkarten mit Farbkopf und Mietstaffel, farbige Geldscheine und acht eigene SVG-Spielfiguren. Jeder wählt seine Figur in der Lobby oder unter „Ich“. Eigene Stadtbretter bleiben im bisherigen Editor verfügbar. Beim Tempowürfel startet die zusätzliche Funktion für jeden Spieler erst nach seinem ersten Überqueren von Los. Zahlen werden addiert, Bus und Dreierpasch verlangen eine Zielwahl; Glück wird erst nach Abschluss des ersten Feldes ausgeführt. Standard-Startgeld: 2.500. Junior startet mit 31 Geld, bei vier Spielern mit 20; freie Grundstücke werden automatisch gekauft. Beim ersten Bankrott gewinnt das meiste Bargeld, bei Gleichstand entscheidet der Grundstückswert.

**UNO Flip** verwendet 112 physische Karten mit zwei Seiten. Flip kehrt auch die Reihenfolge beider Stapel um. Die inaktiven Seiten fremder Hände und die Rückseite des Nachziehstapels sind sichtbar; aktive fremde Handseiten bleiben auf dem Server. Zieh-bis-Farbe und Farbwahl +2 können angefochten werden. Die Partie ist bei 500 Punkten gewonnen. **No Mercy** hat 168 Karten, stapelt nach dem Wert der *letzten* Ziehkarte und scheidet Spieler sofort ab 25 Karten aus. **All Wild** löst einen verpflichtenden Handtausch vor der Siegerprüfung auf; gezieltes +2 überspringt den Betroffenen nicht. Alle Varianten haben eigene Aktionssymbole und kantige Kartenflächen ohne Original-Logo oder Oval.

**Spiel des Lebens** ist eine eigene Fassung mit serverseitigem Drehrad 1–10, kurviger Landschaft und Autos mit Familiensteckern. Studium kostet 100.000 aus zwei Krediten, direkter Beruf überspringt den Studienweg. Überquerte Zahltage zahlen Gehalt; Abschluss, Hochzeit, Hauskauf, beide Weggabelungen und Ruhestand halten die Fahrt an. Berufe haben eigene Fähigkeiten; Lebensereignisse bringen Geld, Kinder, Gehaltserhöhungen oder neue Berufe. Kredite geben je 50.000 und kosten 60.000 bei der Tilgung. Verdeckte Lebenskarten (50.000–250.000) werden erst am Ende aufgedeckt. Ruhestand bringt 4/3/2/1, danach je eine Bonuskarte. Die Endabrechnung verkauft Häuser nach geradem/ungeradem Dreh und zählt Bargeld + Hausverkäufe + Lebenskarten + 50.000 je Kind − offene Kredite. Karte vergrößern, verschieben oder mit „Zu deinem Auto“ verfolgen; Bots übernehmen alle Entscheidungen.

**Teamregeln:** Gegenüberliegende Plätze sind Partner. Bei Mensch ärgere Dich nicht zieht man erst nach vier eigenen Zielfiguren für den Partner; Partner werden nicht geschlagen. Skip-Bo folgt den Partnerschaftsregeln: offene Partnerstapel mitnutzen, beide Spielstapel leeren. Phase 10 ist eine ausdrücklich kooperative Tischvariante: Beide Partner müssen dieselbe Phase in derselben Runde auslegen, bevor beide aufsteigen; Gleichstände entscheidet ihre gemeinsame Strafpunktzahl. Ein Ausstieg beendet ein Teamspiel zugunsten des anderen Teams.

Regelgrundlagen: [Tempowürfel (Hasbro)](https://www.hasbro.com/common/instruct/00009.pdf), [Monopoly Junior (Hasbro)](https://instructions.hasbro.com/en-us/instruction/Monopoly-Junior-Game-Instructions), [UNO Flip (Mattel)](https://service.mattel.com/instruction-sheets/files/GDR44%20UNO%20Flip%5BEnglish_French_German_Spanish_Portuguese%5D%5B5LG%5D.pdf), [No Mercy (Mattel)](https://service.mattel.com/instruction_sheets/HVW18-Eng.pdf), [All Wild (Mattel)](https://service.mattel.com/instruction_sheets/HHL33-Eng.pdf), [Skip-Bo-Partnerschaft (Mattel)](https://service.mattel.com/instruction_sheets/42050-0520.pdf). Straßen-, Ereignis- und Berufstexte sowie sämtliche neuen Zeichnungen stammen aus diesem Projekt. Junior verwendet die angefragte Startgeldregel 31/20; Spiel des Lebens und Phase-10-Teams sind die oben beschriebenen eigenen Fassungen.

### Päckchen 7: Party-Abendprogramme

An einem Party-Tisch erst mitspielen, dann unter **Host → Abendprogramm planen** den Modus wählen:

- **Party-Mix:** Die ausgewählten Spiele werden auf dem Server zufällig gemischt.
- **Party-Turnier:** Mehrere Spiele in fester Reihenfolge mit Gesamtwertung und Siegerehrung.
- **Eigene Playlist:** Bis zu zwölf Spiele sortieren und je Spiel Rundenzahl, Zeiten und Regeln einstellen. Bis zu zehn benannte Vorlagen liegen in diesem Browser (`poker:partyPlaylists`).
- **Team-Duell:** Die Mitspieler auf Team 1 und Team 2 verteilen. Alle spielen einzeln, ihre Programmpunkte werden im Team addiert; gleich große Teams sind empfohlen. Werwolf und „Wer bin ich?“ sind hierfür nicht auswählbar.

**Programm übernehmen → Programm starten** beginnt die erste Partie. Nach jeder Partie geht es mit **Nächstes Programm-Spiel** im selben Raum und mit denselben Spielern weiter. Die Gesamtwertung steht jederzeit unter **Gesamtwertung** und **Stand**. Eine Platzierung zählt bei N Teilnehmern N Punkte für Platz 1, dann einen weniger je Platz; Gleichstände teilen sich den Platz. Eine Partie ohne Punkte und ohne Sieger zählt null. Zuschauer bekommen keine Programmpunkte. So lassen sich Spiele mit unterschiedlichen eigenen Punkteskalen kombinieren.

Die Teilnehmer bleiben während des Programms fest; neue Gäste können zuschauen und beim nächsten Programm mitspielen. Der Server prüft Spielerzahlen, Regeln und Teamzuordnung vor dem Start. Spiele ohne Bot-Unterstützung brauchen menschliche Mitspieler. Host-Wechsel, Wiederverbinden und private Tische funktionieren weiterhin. **Programm beenden** ist zwischen Partien möglich; eine laufende Partie kann der Host vorher wie gewohnt abbrechen. Abgebrochene Partien zählen nicht und lassen sich am gleichen Programmplatz wiederholen.

Programm, Einstellungen und bereits vergebene Programmpunkte werden im Raum gespeichert. Nach einem Server-Neustart setzt der Host fort; nur die noch nicht abgeschlossene Partie muss erneut gespielt werden. Die einzelnen Spiele werten zusätzlich wie bisher für die Bestenliste. Die Programmwertung selbst erzeugt dort keine weiteren Einträge.

### Abend-Modus: alle Spiele gemeinsam werten

Unter **Host → Abendprogramm planen → Abend-Modus · alle Spiele** lassen sich bis zu zwölf Stationen aus allen 66 Karten-, Würfel-, Brett- und Partyspielen frei zusammenstellen. Das geht an jedem Tisch, auch direkt bei Poker. Spiele im Auswahldialog sind nach Kategorien gruppiert; die gemeinsame Spielerzahl wird angezeigt. Jede Station hat eigene Regeln und Zeiten. Der Server prüft vor dem Start, ob alle Spiele zur festen Gruppe und zu vorhandenen Bots passen. Vorlagen werden wie die Party-Playlists im Browser gespeichert.

Eine abgeschlossene Spielrunde zählt als Station. Unterschiedliche Punkteskalen werden in Platzierungen umgerechnet: Bei N Teilnehmern erhält Platz 1 N Abendpunkte, jeder weitere Platz einen weniger. Gleichstände teilen den Platz. Außerhalb von Poker haben tatsächliche Sieger bei gleichen Rohpunkten Vorrang. Spiele mit wenigen guten Punkten werden entsprechend umgekehrt gewertet. Zuschauer zählen nicht. **Gesamtwertung** zeigt den laufenden Stand; nach der letzten Station erscheint die Siegerehrung.

**Poker und Omaha zählen je eine Hand.** Alle starten mit den für die Station eingestellten gleichen Chips. Der Netto-Chipgewinn dieser Hand bestimmt die Platzierung; eigene und fremde Karten sind kein Teil der Abendwertung. Automatische Folgehand, Nachkauf, Chipgeschenke und Korrekturen sind während des Programms gesperrt. Nach der Hand geht es über **Nächstes Programm-Spiel** weiter. Auch wiederholte Stationen starten frisch; eigene Fragen und Programmeinstellungen bleiben erhalten.

Raumcode, Teilnehmer-IDs, Reconnect und bestehende Speicherdateien bleiben dieselben. Nach einem Abbruch wird nur die ungewertete Station wiederholt; bereits vergebene Abendpunkte zählen genau einmal. Neue Gäste dürfen zuschauen. **Programm beenden** ist zwischen Stationen möglich. Tests: `test/evening-mode.test.js`, `test/party-program-server.test.js`, `test/ui/evening-mode.spec.js`.

### Erfolge & Abzeichen

Unter **Bestenliste → Erfolge & Abzeichen ansehen**, im Profil und in der Desktop-Seitenleiste gibt es **306 Abzeichen**: die bisherigen 17 allgemeinen Erfolge, je drei für alle 95 Raumspiele und vier weitere Meilensteine. Neue Leistungsabzeichen zählen ausschließlich qualifizierte Partien ohne Bots oder Gäste. Dazu kommen zehn verschiedene qualifizierte Spiele, ein vollständig absolvierter Abend-Modus, 100 Siege und ein geheimer Serienerfolg. Seltene und legendäre Abzeichen sind gekennzeichnet; gesperrte geheime Erfolge verraten weder Bedingung noch Fortschritt. Bereich, Spiel und Freischaltstatus sind filterbar; Fortschrittsbalken und nachladbare Karten halten die Übersicht kompakt.

**Meine Erfolge folgen der Spieler-ID**, auch nach einem Namenswechsel. Vorhandene qualifizierte Ergebnisse werden idempotent nachgewertet; wiederholter Abruf, Neustart oder derselbe Rundenabschluss vergeben nichts doppelt. Die bisherige Namenssuche zeigt nur freigegebenen historischen Fortschritt; private Statistiken und Erfolge bleiben geschützt. Die bisherigen 17 allgemeinen Abzeichen behalten ihre alte Casual-Wertung. Neue Leistungsabzeichen verwenden die bestätigte Rundenablage; lokale Solo-Spielstände sind keine verifizierten Ergebnisse. Freischaltmeldungen erscheinen nach dem dauerhaften Speichern beim betreffenden Spieler.

Quelle bleiben `leaderboard.json` und die bestehenden ersten Freischaltzeitpunkte in `accounts.json`; es gibt keine neue Ergebnisdatei. Alte Abend-Rückblicke ohne beweisbare Konten-/Stationszuordnung werden keinem Konto zugeschrieben. **Gerade online** unterscheidet Hub, Lobby, aktives Spiel, Zuschauen und Abwesenheit. Beitreten ist für offene Lobbys möglich; private Tische und unsichtbare Personen verraten keine Beitrittsdaten. Mehrere Tabs desselben Kontos erscheinen einmal, gleiche Anzeigenamen bleiben getrennt. Details, Tests und Screenshots: [V2-13/V2-14](docs/roadmap/V2-13_V2-14_ACHIEVEMENTS_PRESENCE.md).

### Termin & Spiele-Abstimmung

Unter **Start → Nächsten Abend planen** oder in der Desktop-Seitenleiste unter **Abend planen** lassen sich Spieleabende mit Name, Beschreibung und 1 bis 8 zukünftigen Terminvorschlägen anlegen. Termine liegen höchstens ein Jahr voraus; angezeigt und eingegeben wird in der lokalen Browser-Zeitzone, gespeichert wird der absolute Zeitpunkt. Über **Link kopieren** kann die Gruppe teilnehmen, auch nach einer vorher nötigen Passwort-Anmeldung.

Pro Termin gibt es **Ja / Vielleicht / Nein**; unbeantwortete Termine bleiben ausdrücklich offen. Jeder Browser kann seine Antworten ändern und für mehrere Spiele stimmen. Alle Teilnehmer dürfen weitere verfügbare Spiele vorschlagen (höchstens 30). Nicht gespeicherte Antworten bleiben beim Hinzufügen eines Spielvorschlags erhalten. **Aktualisieren** lädt die aktuellen Stimmen und verwirft ungespeicherte Antworten. Zusagen und Teilnehmernamen sind für alle mit Zugriff auf die Planung sichtbar. Die Liste unterstützt Suche, Statusfilter und Seiten mit 20 Einträgen.

Nur der Ersteller legt **einen Termin und 1 bis 12 Spiele** fest, sagt den Abend ab, öffnet die Abstimmung wieder oder löscht die Planung. Die festgelegten Spiele brauchen eine gemeinsame Spielerzahl; ihre Reihenfolge folgt der Abstimmungsliste. Eine Festlegung sperrt weitere Stimmen und Vorschläge. **Abendprogramm vorbereiten** übernimmt die Auswahl an einen neuen oder den eigenen freien Host-Tisch, ohne die Partie zu starten. Regeln und Reihenfolge lassen sich dort weiter bearbeiten. Die tatsächliche Gruppe und Bot-Unterstützung prüft der Server beim Programmstart wie bisher. Bei privaten Planungen wird der vorbereitete Tisch ebenfalls privat.

Rechte und eigene Stimmen hängen an einer signierten, nicht per JavaScript lesbaren Browser-Kennung (`pa_plan_visitor`, ein Jahr gültig), nicht am Profilnamen. Ersteller sollten denselben Browser und dessen Cookies behalten. Gleiche Namen verleihen keine fremden Rechte; Änderungen aus veralteten Ansichten werden abgewiesen. Private Planungen fehlen in der allgemeinen Liste und sind für den Ersteller sowie über bekannte zufällige Direktlinks erreichbar. Ein Direktlink lässt sich innerhalb des vorhandenen Seitenzugangs weitergeben.

Der Server speichert atomar in `DATA_DIR/evening-plans.json`; diese Datei gehört ins Daten-Backup. Bis zu 300 Planungen mit jeweils 200 Teilnehmern bleiben erhalten, bis der Ersteller sie ausdrücklich löscht. Es gibt keine automatische Löschung alter Planungen. Bei einer beschädigten Datei bleibt diese unangetastet und die Planung meldet ihre Nichtverfügbarkeit; die Spiele laufen weiter. Es werden keine E-Mails oder sonstigen Benachrichtigungen versendet. Tests: `test/evening-plans.test.js`, `test/plan-api.test.js`, `test/ui/evening-plans.spec.js`.

### Abend-Rückblick

Unter **Start → Abend-Rückblicke öffnen**, **Bestenliste → Abend-Rückblicke öffnen** und in der Desktop-Seitenleiste unter **Rückblick** stehen abgeschlossene Abendprogramme. Suche nach Abendname, Spiel oder Mitspieler; ein Rückblick zeigt Einzel- und Teamwertung, auswählbaren Punkteverlauf, berechnete Führungswechsel, Aufholjagden und knappe Endstände. Aufklappbare Stationen trennen Rohwerte und Abendpunkte. **Link kopieren** teilt einen Direktlink, **Als Text speichern** lädt den Rückblick als Markdown herunter.

Nach jeder gewerteten Station speichert der Server automatisch in `DATA_DIR/evening-reviews.json`, unabhängig vom Tisch und dessen Verlauf. Die letzten 500 aktualisierten Rückblicke bleiben erhalten; die Datei gehört ins Daten-Backup. Bei **Programm beenden**, Tischschließung oder automatischem Aufräumen bleiben Teil-Ergebnisse als vorzeitig beendet erhalten, ohne Gesamtsieger. Noch laufende Programme erscheinen nur über ihren Link aus der Gesamtwertung. Alte Programme werden beim Laden übernommen; fehlende historische Zeitangaben bleiben ausdrücklich unbekannt. Einzelpartien ohne Abendprogramm werden nicht nachträglich zu Abenden zusammengefasst.

Private Tische erzeugen private Rückblicke: Sie fehlen in der allgemeinen Liste. Der zufällige Direktlink erlaubt den Zugriff innerhalb des bestehenden Seitenzugangs; wer ihn kennt, kann ihn weitergeben. Bereits bekannte Links merkt sich der Browser (bis zu 100). Gespeichert werden ausschließlich Namen, Avatare, Teams, Spielbezeichnungen, Zeiten und numerische Wertungen – keine Raumcodes, Tokens, internen Spieler-IDs, Karten, Rollen, privaten Spielinhalte oder Aktionsprotokolle. Ein beschädigtes Archiv wird nicht überschrieben; die Oberfläche meldet dessen Nichtverfügbarkeit, während die Spiele weiterlaufen. Tests: `test/evening-reviews.test.js`, `test/party-program-server.test.js`, `test/ui/evening-reviews.spec.js`.

### Päckchen 7b: Zeichenspiele

**Kritzelpost**, **Bildunterschrift** und **Malen & Raten** stehen unter Party Spiele und in den Abendprogrammen bereit, jeweils für **3–12 Menschen**. Bots sind für diese Spiele nicht verfügbar.

Der gemeinsame Zeichenbereich unterstützt Maus, Stift und Finger: sieben Farben einschließlich weißem Radierer, vier Stiftstärken, Rückgängig und Leeren mit Bestätigung. Bilder bestehen aus höchstens 60 Strichen und 800 Zeichenpunkten; sie werden als geprüfte Vektoren übertragen. Nach dem Neuladen bleibt der zuletzt vom Server bestätigte Entwurf erhalten. Ein Server-Neustart setzt wie bei den anderen Partyspielen auf die nächste neu zu startende Partie zurück.

- **Kritzelpost:** Jeder beginnt eine Kette mit einem Begriff oder Satz. Die Ketten wandern weiter: zeichnen, beschreiben, zeichnen … Jeder bearbeitet jede Kette einmal und sieht dabei nur den letzten Beitrag. Am Ende sind alle Ketten mit ihren Autoren sichtbar. Ein nicht leerer Beitrag zählt 100 Punkte; die gemeinsame Geschichte steht im Mittelpunkt. Eine bis drei Runden, standardmäßig eine.
- **Bildunterschrift:** Reihum zeichnet eine Person einen geheimen Begriff. Danach schreiben die anderen verdeckte Bildunterschriften. Alle stimmen für einen fremden Beitrag; die Autoren werden erst zur Auflösung gezeigt. Jede Stimme bringt 100 Punkte, eine nicht leere Zeichnung ebenfalls 100. Zuschauer können bei entsprechender Host-Einstellung abstimmen. Standardmäßig drei Runden.
- **Malen & Raten:** Nur die zeichnende Person erhält den Begriff. Alle anderen sehen die Zeichnung und geben private Vermutungen ab. Die erste richtige Lösung bringt 300 Punkte, danach jeweils 25 weniger (mindestens 100); Zeichnende bekommen 100 je richtiger Lösung. Großschreibung, Leerzeichen, Satzzeichen und ausgeschriebene Umlaute werden toleriert. Sind alle fertig oder ist die Zeit abgelaufen, wird der Begriff aufgedeckt. Der Zeichenplatz wechselt jede Runde; standardmäßig sechs Runden.

Der Host kann Zeit, Runden und Punkte-Ziel einstellen, bei Bedarf weiterschalten und für Bildunterschrift/Malen & Raten eigene Begriffe ergänzen. Leere oder fehlende Beiträge bei Zeitablauf blockieren den Ablauf nicht. Abbrechen, Host-Wechsel, Zuschauer und Wiederverbinden nutzen die vorhandene Raumverwaltung.

### Päckchen 8: Echtzeit-Arenen

**Bröckelboden**, **Kronenjagd** und **Laser-Hüpfer** stehen unter Party Spiele und in den Abendprogrammen bereit, jeweils für **2–8 Mitspieler**, mit optionalen Bots. Nach einem gemeinsamen Countdown von drei Sekunden spielen alle gleichzeitig.

Mit **Pfeiltasten/WASD** bewegen, auf dem Handy die **Richtungsknöpfe halten**. Mehrere Richtungen lassen sich kombinieren. **Leertaste/Springen** löst einen Sprung aus, wenn das Spiel ihn erlaubt. Deine Figur hat einen weißen Rand. Namen, Punkte und verbleibende Leben stehen auch unter der Arena. Die Steuerung bleibt bei Aktualisierungen am selben Platz.

- **Bröckelboden:** Betretene Felder brechen nach 0,9 Sekunden weg. Ab 18 Sekunden verschwindet zusätzlich der Rand schrittweise. Wer auf einem Loch steht, scheidet aus. Der Host kann Sprünge über Lücken und zufällige Startlöcher aktivieren; die Startplätze bleiben frei.
- **Kronenjagd:** Die Krone in der Mitte einsammeln oder durch Berührung vom Träger stehlen. Nach einem Wechsel ist sie eine Sekunde geschützt. Träger bewegen sich langsamer und sammeln einen Punkt je insgesamt gehaltener Sekunde. Nach Ablauf gewinnt die höchste Summe; gleiche Punktzahlen teilen sich den Sieg.
- **Laser-Hüpfer:** Eine gestrichelte Linie warnt vor dem nächsten Laser. Die Strahlen wechseln Richtung und werden schneller. Ein Sprung schützt 0,55 Sekunden und lädt anschließend nach. Ein Treffer kostet ein Leben; der Host kann ein bis drei Leben und zwei gleichzeitige Laser einstellen.

Spielzeit: 10–180 Sekunden, standardmäßig 60. Bei Bröckelboden und Laser-Hüpfer gewinnt der letzte Überlebende; nach Zeitablauf teilen sich die Überlebenden den Sieg. Jede überstandene Platzierung bringt 100 Punkte. Gleichzeitig Ausscheidende erhalten dieselbe Wertung; fallen alle sofort gleichzeitig aus, ist die Partie unentschieden.

Wiederverbinden behält Figur und Punkte. Bei Tabwechsel, geöffnetem Menü oder ausbleibenden Eingaben bleibt die Figur stehen; die Runde läuft weiter. Der Host kann abbrechen oder den Tisch schließen. Ein Server-Neustart lädt die gespeicherten Teilnehmer, Einstellungen und abgeschlossenen Wertungen; die laufende Runde muss der Host neu starten. Im Abendprogramm bleiben bereits abgeschlossene Spiele gewertet. Die nummerierten Päckchen bis einschließlich 10, das Ticket-Board, Design & Töne und „Spieleabend als Ganzes“ sind gebaut; als Nächstes folgen Benachrichtigungen auf der Roadmap.

| Spiel | Spieler | Kurz |
| --- | --- | --- |
| Texas Hold'em | 2–9 | No Limit mit Spielgeld, alles unten beschrieben |
| Mau-Mau | 2–8 | 7 zieht 2 (stapelbar), 8 setzt aus, Bube wünscht (nicht auf Bube). „Mau!“ automatisch. Wertung: Augen der Restkarten, wenig ist gut |
| UNO | 2–8 | 108 Karten, Aussetzen, Richtungswechsel, +2, Farbwahl (+4). Kein Stapeln. Gewinner kassiert die Punkte der anderen |
| Mäxchen | 2–10 | Verdeckt würfeln, höher ansagen, anzweifeln. Mäxchen kostet 2 Leben. Der Letzte mit Leben gewinnt |
| Schocken | 2–8 | Bis zu 3 Würfe, Schock aus / Schock / General / Straße / Zahl, 13 Deckel. Wer alle Deckel hat, verliert die Halbzeit |
| Mensch ärgere Dich nicht | 2–4 | Raus mit der 6, drei Versuche, schlagen, Ziel passend, nicht überspringen |
| Phase 10 | 2–6 | Zehn Phasen nacheinander, Joker, Aussetzen, Anlegen. Wer zuerst Phase 10 schafft, gewinnt |
| Skip-Bo | 2–6 | Reihen 1–12 bauen, Joker, 4 Ablagen. Wer seinen Stapel zuerst los ist, gewinnt (25 + 5 je Restkarte der anderen) |
| Schwimmen (31) | 2–9 | 32 Karten, eine Farbe zählt (31 ist das Höchste), tauschen, schieben, klopfen. Die Niedrigsten verlieren Leben, ohne Leben schwimmt man noch einmal. Der Letzte gewinnt |
| Blackjack | 1–7 | Gegen den Dealer mit 6 Decks: Karte, Stehen, Verdoppeln, Teilen. Blackjack 3:2, Dealer steht auf Soft 17. Eigene Chips mit Nachkaufen, die Bank zählt mit |
| Kniffel | 1–6 | Fünf Würfel, drei Würfe, 13 Felder (oben Einser bis Sechser mit Bonus 35 ab 63, unten Pasch, Full House, Straßen, Kniffel, Chance). Die höchste Summe gewinnt |
| Shut the Box | 1–8 | Würfeln und Klappen 1–9 schließen, die genau die Augensumme ergeben. Offene Klappen zählen (wenig ist gut), Box zu gewinnt die Runde sofort. 5 Runden |
| Vier gewinnt | 2 (+ Zuschauer) | 7 × 6, Steine fallen nach unten, vier in einer Reihe gewinnt (auch diagonal). Volles Feld = unentschieden, Anfang wechselt. Zeit pro Zug |
| Zehntausend | 2–8 | Sechs Würfel, punktende Würfel herauslegen, weiterwürfeln oder sichern. Niete = Zug weg. Einstieg 350, wer das Ziel erreicht, löst die letzte Runde aus |
| Mühle | 2 (+ Zuschauer) | Je 9 Steine setzen, ziehen, mit 3 Steinen springen. Mühle nimmt einen Stein, mit 2 Steinen oder ohne Zug verloren. Unentschieden nach 50 Zügen ohne Schlagen oder dreifacher Wiederholung |
| Schätzmeister (Party Spiele) | 2–12 | Schätzfrage mit Zahl als Antwort, alle schätzen gleichzeitig. Danach Zahlenstrahl und richtige Antwort: am nächsten dran 3 Punkte, Zweiter 2, Dritter 1, genau richtig +2. Über 100 Fragen mit Quelle, eigene Fragen des Hosts möglich |
| Risiko-Würfeln | 2–8 | Ein W6: 2–6 erhöhen die Zugpunkte, eine 1 verliert nur den ungesicherten Zuggewinn. Weiterwürfeln oder ausdrücklich sichern; zuerst am Ziel gewinnt |
| Story-Chaos | 3–12 | Reihum einen Satz ergänzen; nur den letzten fremden Satz sehen. Am Ende gemeinsam die vollständige Geschichte lesen, ohne Einzelwertung |
| Zahlenreihe | 2–10 | Gleichzeitig die fehlenden Zahlen ergänzen; verbindliche geheime Antworten, 100 Punkte für richtig und optional 50 für die schnellste Antwort. Eine oder zwei Lücken |
| Schlagfertig (Party Spiele) | 3–8 | Jede Runde 2 lustige Aufgaben je Spieler, jede Aufgabe an genau 2 Spieler. Beide Antworten stehen ohne Namen nebeneinander, die anderen stimmen ab: Stimme = 100 Punkte, alle Stimmen für eine Antwort = Volltreffer +200. Letzte Runde: Finale mit einer Aufgabe für alle und 3 Stimmen. 182 Aufgaben, eigene möglich |
| Wer hat das gesagt? (Party Spiele) | 3–10 | Eine lockere, persönliche Frage pro Runde, alle antworten anonym. Dann wird jede Antwort einzeln gezeigt und der Autor in der Spielerliste getippt: richtig +100, der Autor +50 je Fehltipp. 112 Fragen, eigene möglich (auch „nur eigene Fragen“) |
| Schiffe versenken | 2 (+ Zuschauer) | Zwei Meere 10 × 10, Flotte setzen (nicht berühren), abwechselnd schießen: Wasser, Treffer, versenkt. Zeit pro Schuss. Die gegnerischen Schiffe sieht man erst nach Spielende |
| Omaha | 2–9 | Poker wie Hold'em (gleicher Tisch, Host-Menü, Bots), aber 4 eigene Karten, von denen genau 2 zählen, und Pot-Limit (Erhöhen höchstens um die Potgröße). Keine Gewinnchancen-Anzeige |
| Mogeln | 3–8 | 52 Karten, Ansage in fester Folge (Ass, 2 … König), 1–4 Karten verdeckt ablegen, „Mogeln!“ rufen: der Lügner bzw. der Zweifler nimmt den Stapel. Wer zuerst keine Karten hat und nicht erwischt wird, gewinnt |
| Präsident | 3–8 | 52 Karten, 2 am höchsten, gleich viele höhere Karten legen oder passen, Tisch frei, wenn alle passen. Plätze Präsident bis Schlusslicht mit Punkten, ab Runde 2 Kartentausch |
| Durak | 2–6 | 36 Karten, Trumpf = unterste Karte, angreifen und schlagen, Nachlegen aller Mitspieler (höchstens 6), Aufnehmen, Auffüllen. Wer zuletzt Karten hat, ist der Durak |
| Würfelpoker | 2–6 | Fünf Würfel, bis zu 3 Würfe (der Erste legt die Zahl fest), Würfel beiseitelegen. Hände von Fünfling bis hohe Karte; die schlechteste Hand bekommt einen Strich, bei der Strichzahl scheidet man aus |
| Lügenwürfel | 2–6 | Würfel unter dem Becher, Gebote „mindestens N × F“ über alle Würfel am Tisch, „Lüge!“ deckt auf, der Verlierer gibt einen Würfel ab. Hausregel: Einsen als Joker |
| Chicago | 2–6 | Elf Runden mit zwei Würfeln, Zielzahl 2 bis 12: Wer sie trifft, bekommt sie als Punkte. Stechen bei Gleichstand |
| Reversi | 2 (+ Zuschauer) | 8 × 8, Gegner einschließen und umdrehen, Passen von selbst, mehr Steine gewinnt. Zeit pro Zug |
| Dame | 2 (+ Zuschauer) | Deutsche Dame: Schlagzwang, Mehrfachsprünge (Sprung für Sprung), Damen ziehen weit, Remis nach 50 Zügen ohne Schlag. Zeit pro Zug |
| Domino | 2–4 | 28 Steine, 7 je Spieler, Kette mit zwei Enden, ziehen aus dem Vorrat, Punkte aus den Restaugen (auch im Blockspiel) |
| Zahlenzoo (Party Spiele) | 2–8 | Tiere laufen ins Bild und wieder hinaus, danach eine Zahlenfrage (zählen, Unterschied, Summe). Richtig 100 + Tempobonus, Schwierigkeit steigt. Bauart B |
| Gedächtnisküche (Party Spiele) | 2–8 | Rezept aus Zutaten kurz sehen, dann in der Reihenfolge nachtippen; der erste Fehler beendet die Folge, jede Runde eine Zutat länger. Hausregel rückwärts. Bauart B |
| Pfeilfieber (Party Spiele) | 2–8 | Pfeilfolgen so schnell und fehlerfrei wie möglich nachtippen (Tasten oder Knöpfe), Fehler sperren kurz. Der Server spielt die Eingaben nach. Bauart B |
| Sortierstation (Party Spiele) | 2–8 | Dinge auf dem Band nach Farbe oder Form in Kisten sortieren, das Band wird schneller, Regel kann wechseln. Bauart B |
| Tickendes Paket (Party Spiele) | 3–8 | Paket mit unbekannter Zündzeit wandert reihum; Wort mit verlangtem Buchstaben nennen. Platzt es, gibt es einen Minuspunkt; wenigste Minuspunkte gewinnen |
| Werwolf (Party Spiele) | 6–18 | Server als Spielleiter: Werwölfe, Seherin, Hexe, Amor, Jäger. Nacht, Tag, Abstimmung; Rollen nur an den jeweiligen Spieler, Tote sehen alles; Besprechen per Voice am Tisch |
| Wer bin ich? (Party Spiele) | 3–10 | Jeder trägt einen geheimen Begriff „auf der Stirn“ (gelber Zettel): alle sehen ihn, nur man selbst nicht. Reihum Ja/Nein-Fragen (per Voice, optional als Text), die anderen antworten per Knopf, die Mehrheit gilt; Raten mit Toleranz für Umlaute, Artikel und Tippfehler, sonst Abstimmung. Begriffe gegenseitig, aus 8 Kategorien (je ≥ 60) oder eigene Liste. Keine Bots. Der eigene Begriff geht nie an den eigenen Browser, bis er erraten ist |
| Kritzelpost (Party Spiele) | 3–12 | Begriff, Bild und Beschreibung wandern verdeckt durch die Runde; am Ende alle Ketten gemeinsam entdecken |
| Bildunterschrift (Party Spiele) | 3–12 | Gemeinsam eine Zeichnung ansehen, verdeckte Bildunterschriften schreiben und für den Favoriten stimmen |
| Malen & Raten (Party Spiele) | 3–12 | Reihum einen geheimen Begriff zeichnen; alle anderen raten gleichzeitig, richtige Lösungen bringen Punkte |
| Bröckelboden (Party Spiele) | 2–8 | In der gemeinsamen Arena laufen, bevor die betretenen Felder zerbrechen; der letzte Überlebende gewinnt |
| Kronenjagd (Party Spiele) | 2–8 | Krone einsammeln, durch Berührung stehlen und möglichst lange halten |
| Laser-Hüpfer (Party Spiele) | 2–8 | Vorwarnung beobachten, über wandernde Laser springen oder ausweichen und bis zum Schluss überleben |
| 6 nimmt! | 2–10 | Zehn Karten verdeckt und gleichzeitig wählen. Die sechste Karte nimmt die Reihe; wenigste Hornochsen bis Ziel 66 gewinnen |
| Monopoly Deal | 2–5 | 106 Karten, Bank und Grundstückssätze, Mieten und Just-Say-No-Ketten. Drei vollständige Farben gewinnen |
| Monopoly | 2–8 | Spieleabend-Stadt mit 40 Feldern, eigenen Brettnamen, Versteigerung, Handel, Gebäuden, Hypotheken und Bankrott |
| Spiel des Lebens | 2–6 | Drehrad, Studium/Beruf, Gehälter, Familien- und Lebensmomente, Häuser, Kredite und Endvermögen; auch als kurze Partie |

Die Startseite ist ein Hub (siehe „Startseite“ weiter unten). Die Kategorie (`karten`, `wuerfel`, `brett`, `party`), Spielerzahl, Dauer und das Spielbild legt jedes Spiel in seinem `games/<spiel>/index.js` fest.

Die genauen Regeln stehen im Spiel unter „Regeln“ und oben in `games/<spiel>/room.js`. Die Rundenspiele haben einen gemeinsamen Rahmen: Mitspielen/Zuschauen, der Host startet jede Runde, Punkte und Siege über den Abend unter „Stand“, Verlauf und Host-Menü.

### Computer-Mitspieler

Im Host-Menü unter „Mit Bots spielen (optional)“ auf **Bot hinzufügen** klicken; bei Poker im Reiter „Spiel“. Standardmäßig sind keine Bots dabei. Bots sitzen automatisch am Tisch, du selbst trittst wie gewohnt bei. Hinzufügen und Entfernen gehen zwischen den Runden, die Runde startet weiterhin der Host. Bots bleiben bei Spielwechsel und Server-Neustart erhalten und werden als „Bot 1“, „Bot 2“ usw. angezeigt. Wird beim Spielwechsel der Tisch zu klein, schauen überzählige Spieler zu.

Die unterstützten Spiele haben eine Bot-Strategie in `games/bots.js`; „Wer bin ich?“ und die drei Zeichenspiele brauchen Menschen. Poker schätzt mit zufällig simulierten unbekannten Karten seine Chancen; die anderen Spiele nutzen einfache Grundstrategien, etwa Farbmehrheiten, Schlagen, passende Phasen, Treffer-Nachbarschaften oder die offene Blackjack-Dealerkarte. Die Bots kennen keine verdeckten Gegnerkarten und sind keine Turnier-KI. Der automatische Bot-Treiber pausiert, wenn kein Mensch verbunden ist. Bots können keine Hosts werden; sie zählen im Tischstand, aber nicht in der übergreifenden Bestenliste. Poker-Bots kaufen bei erlaubtem Nachkaufen automatisch nach.

**Bot-Schwierigkeit (V2-16):** Beim Hinzufügen und neben jedem Bot im Host-Menü **Leicht / Mittel / Schwer** wählen. Standard **Mittel** verwendet unverändert die bisherige Strategie. Ändern darf nur der Host zwischen Runden, bei Poker zwischen Händen; eine Pause entsperrt die Auswahl nicht. Die Stufe bleibt bei Reconnect und Server-Neustart erhalten und steht am Bot-Platz. Drei Stufen gibt es für klassisches Poker/Omaha, UNO, Kniffel, Vier gewinnt, Reversi, Monopoly (Standardbrett), Backgammon, 6 nimmt!, Hearts und Scrabble. Die im eigenen Spieleauftrag hinzugekommenen **Schach/Chess960, Exploding-Deck und Lügenbaron** verwenden ebenfalls drei Stufen und den vorhandenen Worker, auch für Mittel. Doppelagent hat ehrliche vorbereitete Textbots mit einer Stufe. Andere Spiele/Varianten zeigen **Nur eine Stufe verfügbar**. Easy/Hard rechnen in begrenzten Worker-Jobs mit eigenen und öffentlichen Informationen; Bots zählen weiterhin weder für Bestenliste noch Erfolge oder Presence. Strategien, Budgets, **2.200 Vergleichspartien**, Grenzen der Messung und Desktop-/Handynachweise: [V2-16](docs/roadmap/V2-16_BOT_SCHWIERIGKEIT.md).

### Regeln anpassen

Der Host stellt die Regeln am Tisch ein (Host-Menü, nur zwischen den Runden). In Klammern der Standard – das sind unsere üblichen Hausregeln. Alle sehen die aktiven Regeln unter „?“ am Tisch. Die Optionen stehen im Code als static OPTIONS in games/<spiel>/room.js.

Bei Mau-Mau und Skip-Bo prüft der Server vor dem Start, ob die Karten für alle Mitspieler reichen. Falls nicht, nennt die Fehlermeldung die maximal mögliche Kartenanzahl; der Host kann die Einstellung ändern und erneut starten. Bei Skip-Bo werden zusätzlich fünf Handkarten je Spieler berücksichtigt.

Gehen bei Skip-Bo während der Runde die Nachziehkarten aus, darf ein Spieler ohne Handkarten ohne Abwerfen weitergeben. Kann niemand mehr ziehen oder legen, endet die Runde unentschieden und ohne Punkte.

| Spiel | Optionen (Standard) |
| --- | --- |
| Mau-Mau | Karten pro Spieler (5)<br>7: der Nächste zieht 2 (an)<br>7 auf 7 legen (dann 4, 6 …) (an)<br>8: der Nächste setzt aus (an)<br>Bube: Farbe wünschen (an)<br>Bube auf Bube erlaubt (aus)<br>Ass: nochmal dran (aus)<br>„Mau“ selbst sagen (vergessen = 1 Strafkarte) (aus)<br>Erste Karte wirkt (7 und 8) (aus) |
| UNO | Karten pro Spieler (7)<br>+2 und +4 stapeln (aus)<br>Ziehen, bis eine Karte passt (aus)<br>„UNO“ selbst sagen (vergessen = 2 Strafkarten) (aus)<br>+4 nur, wenn man die Farbe nicht hat (aus)<br>Startkarte wirkt (Aussetzen, Richtung, +2, Farbwahl) (aus)<br>Erwischen: wer „UNO“ vergisst, kann gemeldet werden (+2) (aus) |
| Mäxchen | Leben pro Spieler (3)<br>Mäxchen kostet 2 Leben (an)<br>Ungesehen weitergeben erlaubt (aus) |
| Schocken | Zwei Sechsen zu einer Eins drehen (aus)<br>Ganzes Spiel: 2 Halbzeiten und Finale (aus) |
| Mensch ärgere Dich nicht | Schlagzwang (aus)<br>Nach einer 6 nochmal würfeln (an)<br>Drei Versuche, wenn keine Figur draußen ist (an)<br>Mit einer 6 muss man raus (und das Startfeld räumen) (an) |
| Phase 10 | Aussetzen: Spieler frei wählen (sonst setzt der Nächste aus) (an)<br>Phase genau in der verlangten Größe auslegen (an)<br>Aussetzen als erste Ablage: der Erste setzt aus (aus) |
| Skip-Bo | Karten im eigenen Stapel (offiziell 30, ab 5 Spielern 20) (20) |
| Blackjack | Startchips (1000)<br>Mindesteinsatz (10)<br>Höchsteinsatz (500)<br>Dealer zieht auf Soft 17 (aus)<br>Versicherung anbieten, zahlt 2:1 (aus)<br>Verdoppeln nach dem Teilen (an)<br>Nachkaufen: wie oft, 0 = aus, 99 = unbegrenzt (99) |
| Kniffel | Extra-Kniffel-Bonus: jeder weitere Kniffel +50 (aus)<br>Joker-Regel bei weiterem Kniffel (aus) |
| Shut the Box | Runden (5)<br>Klappen 1–12 statt 1–9 (aus)<br>Ein-Würfel-Regel, wenn 7 bis zur höchsten Klappe zu sind (an)<br>Wertung: Ziffern hintereinander statt Summe (aus)<br>Zeit pro Zug in Sekunden, 0 = ohne (60) |
| Schätzmeister | Anzahl Runden (10)<br>Zeit zum Antworten in Sekunden (30)<br>Punkte-Ziel, 0 = aus (0)<br>Zuschauer dürfen mitmachen (aus)<br>Wertung nach Abweichung in Prozent (aus) |
| Schlagfertig | Anzahl Runden, die letzte ist das Finale (3)<br>Zeit zum Schreiben in Sekunden (60)<br>Zeit zum Abstimmen in Sekunden (30)<br>Punkte-Ziel, 0 = aus (0)<br>Zuschauer dürfen mitmachen (aus)<br>Anstupsen für Trödler mit Sprüchen (an) |
| Wer hat das gesagt? | Anzahl Runden (5)<br>Zeit zum Schreiben in Sekunden (60)<br>Zeit zum Raten in Sekunden (30)<br>Punkte-Ziel, 0 = aus (0)<br>Zuschauer dürfen mitmachen (aus)<br>Nur Fragen aus der eigenen Liste des Hosts (aus) |
| Vier gewinnt | Zeit pro Zug in Sekunden, 0 = ohne (60) |
| Zehntausend | Zielpunktzahl (10000)<br>Einstieg ab Punkten, 0 = ohne (350)<br>Straße nur 1.500 statt 2.000 (aus)<br>Drei Paare zählen 1.500 (an)<br>Letzte Runde für die anderen (an)<br>Zeit pro Zug in Sekunden, 0 = ohne (60) |
| Mühle | Springen mit 3 Steinen (an)<br>Unentschieden nach Zügen ohne Schlagen, 0 = aus (50)<br>Zeit pro Zug in Sekunden, 0 = ohne (60) |
| Schiffe versenken | Klassische Flotte: 1× 5, 2× 4, 3× 3, 4× 2 (aus – Standard 1× 5, 1× 4, 2× 3, 1× 2)<br>Schiffe dürfen sich berühren (aus)<br>Treffer: nochmal schießen (aus)<br>Zeit pro Schuss in Sekunden, 0 = ohne (60) |
| Schwimmen | Leben pro Spieler (3)<br>Schwimmen: ohne Leben noch einmal mitspielen (an)<br>Schieben erlaubt (an)<br>Feuer: drei Asse = 33, alle anderen verlieren ein Leben (aus) |

### Am Tisch: Plätze, Hinweise, „Ich“

- Ab 900 px Breite sitzen die Gegner rund um den Tisch (Avatar, Name, Karten/Leben/Deckel/Phase, letzte Aktion als Sprechblase), du selbst unten. Auf dem Handy bleibt oben eine kompakte Leiste.
- **UNO, Skip-Bo und Phase 10:** Karte antippen oder per Tastatur auswählen, erlaubte Aktionen/Ziele erkennen und ausdrücklich ausführen. Ein erneuter Tipp wählt ab. Die Hand ist horizontal vollständig erreichbar; Drag-and-drop ist am Desktop zusätzlich möglich. Zugstatus, Auswahl und öffentliche Restkartenzahlen sind hervorgehoben, Anfragen bleiben bis zur Serverbestätigung gesperrt. Details und Folgeplanung der übrigen Kartenspiele: [Karten-UX](docs/design/CARD_INTERACTION_UX.md).
- Die anderen Spiele behalten ihre vorhandenen Abläufe. Insbesondere verwendet Mau-Mau weiterhin die bisherige direkte Ablage beziehungsweise die Vorschau bei einer überlappenden mobilen Hand; Poker/Omaha und Blackjack werden über ihre jeweiligen Spielaktionen bedient.
- Nach jeder Runde zeigt ein großes Fenster die Punkte; der Host startet dort die nächste Runde oder wechselt das Spiel.
- Unter „Ich“ (pro Browser gemerkt): **Farbsymbole** auf farbigen Karten (Rot ▲, Gelb ●, Grün ■, Blau ◆ – Standard an), **Töne** (Karten, Würfel, „UNO!“ – alles per Web Audio erzeugt, keine Dateien), **Animationen aus** (gilt auch bei „Bewegung reduzieren“ am Gerät), **Erste Schritte** (kurze Einführung beim ersten Spiel jeder Art), bei Mau-Mau das **Kartenblatt** (französisch oder deutsch).
- **Kartengröße** unter „Ich“: Normal, Groß oder Sehr groß. Vergrößert die eigenen Handkarten in allen Kartenspielen einschließlich Poker/Omaha, wird im Browser gespeichert und verändert keine fremden Karten oder Ablagen.
- **Design & Töne:** Alle 66 Raumspiele verwenden ihre Spielbilder auch am Tisch, mit passenden Akzentfarben und kurzen Aktionsklängen. „Ton ausprobieren“ hilft beim Einstellen; stumm bleibt alles stumm. Neue-Runde- und Aktionsimpulse beachten „Animationen aus“ und die Geräteeinstellung für reduzierte Bewegung.
- **Querformat:** Bei 641 px oder mehr Breite und höchstens 560 px Höhe stehen Aktionen bei Karten-, Würfel- und Brettspielen rechts neben dem Tisch. Die Aktionsleiste lässt sich unabhängig scrollen. Reversi, Dame, Mühle, Hütchen und Vier gewinnt passen ihre Brettgröße an den verfügbaren Platz an; Schiffe zeigt die Meere und Kniffel Würfel und Punkteblatt nebeneinander. Zeichen-, Solo- und Echtzeitspiele nutzen ihre eigenen angepassten Spielflächen.

### Päckchen 9 – Monopoly & Co.

Päckchen 9 beginnt mit **6 nimmt!** (2–10): zehn verdeckte Handkarten, vier Reihen, aufsteigende Auflösung und Hornochsen bis zum einstellbaren Ziel (66). Alle wählen gleichzeitig; nach Ablauf wählt der Server zufällig. Eine zu kleine Karte verlangt eine Reihenwahl. Profi verkleinert den Kartensatz und erlaubt die Wahl zwischen passenden Reihen; Taktik zeigt den Kartenpool ohne Handzuordnung. Bots bewerten Reihenlänge, Abstand und Hornochsen. Reconnect behält laufende Auswahlen; Snapshots speichern Teilnehmer, Hausregeln und abgeschlossene Wertungen zwischen Partien.

**Monopoly Deal** (2–5) verwendet die vorgegebenen 106 Spielkarten, eigene Grundstücksnamen und eigene Gestaltung. Zwei Karten ziehen (fünf bei leerer Hand), bis zu drei spielen, sieben am Zugende behalten. Drei volle Farben gewinnen sofort. Zielauswahl, Mietverdopplungen, kostenloses Umordnen von Jokern und ein Zahlungsdialog mit laufender Summe gehören dazu. Forderungen und Just-Say-No-Gegenketten haben ein einstellbares Antwortfenster (Standard 15 Sekunden); alle Betroffenen antworten einzeln. Bank- und ausgelegte Karten zahlen ohne Wechselgeld. Wird ein Satz durch Einzelzahlung oder Umordnen aufgelöst, bleiben seine Gebäude als Bankwerte beim bisherigen Besitzer. Bots schließen Sätze, sammeln passende Farben, schützen wertvolle Aktionen und bevorzugen Bankzahlungen. Regelbezug: [Hasbros Monopoly-Deal-Regelhilfe](https://hasbro-new.custhelp.com/app/answers/list_na/kw/Monopoly%20deal%20just%20say%20no/suggested/1/page/1); die Kartenzusammenstellung und Reaktionskosten folgen dem Pflichtenheft.

**Monopoly** (2–8, etwa 60–120 Minuten) spielt auf der eigenen „Spieleabend-Stadt“ mit den klassischen 40 Feldern und Regelwerten. Kauf, Versteigerung ab 1, Handel mit Gegenangeboten und Zahlungen haben eigene Dialoge. Unter **Dein Besitz** lassen sich Gebäude und Hypotheken verwalten; **Stand** zeigt Geld, Vermögen und Farbgruppen aller Spieler. Das Brett bleibt quadratisch, lässt sich auf dem Handy verschieben und bis 200 % vergrößern; „Zu deiner Figur“ holt die eigene Figur ins Bild. Bewegungen laufen Feld für Feld, Würfel sind animiert; reduzierte Bewegung wird berücksichtigt.

Der Server prüft gleichmäßiges Bauen und Verkaufen, den Vorrat von 32 Häusern/12 Hotels, Gefängnis, drei Pasche, beide 16er-Kartenstapel und alle Zahlungen. Bei zu wenig Bargeld zeigt der Zahlungsdialog mögliche Verkäufe und Hypotheken; bei Bankrott gehen Werte an den Gläubiger, Gebäude werden zum halben Preis verwertet. Bankschulden führen zur Versteigerung der Grundstücke. Hypothekenübernahmen kosten sofort 10 % des Hypothekenwerts; beim Auslösen ebenfalls 10 %, auf ganze Geldeinheiten aufgerundet. Beim Zeitlimit zählt Bargeld plus Grundstücke und Gebäude minus Hypotheken. Hausregeln: Startgeld, Frei-Parken-Topf, doppelter Bonus genau auf Los, Kaufverzicht ohne Auktion, zwei zufällige Startgrundstücke. Regelbezug: [klassische Hasbro-Anleitung](https://www.hasbro.com/common/instruct/Monopoly.pdf); Texte, Namen und SVG-Motive sind selbst gestaltet.

Unter **Host → Eigenes Brett anlegen** können bis zu 20 Bretter mit Titel (60 Zeichen) und 28 Grundstücksnamen (je 40 Zeichen) angelegt werden. Der Server bereinigt Namen mit `cleanText` und speichert atomar in **`DATA_DIR/monopoly-boards.json`**; Preise und Regeln bleiben erhalten. Die Datei gehört ins bestehende Daten-Backup. Ein Neuladen verbindet mit der laufenden Partie; Snapshots und Bestenliste verwenden die gemeinsamen Bausteine zwischen Partien. Tests für Päckchen 9: `test/sechs-nimmt.test.js`, `test/monopoly-deal.test.js`, `test/monopoly.test.js` und `test/ui/paeckchen9.spec.js`.

### Spiel wechseln, Nochmal

Nach einer Runde kann der Host im Host-Menü unter „Spiel wechseln“ ein anderes Spiel wählen: gleicher Raum, gleicher Code, alle bleiben drin, wer mitgespielt hat, sitzt wieder. Der bisherige Stand kommt als eine Zeile in den Verlauf (Poker-Chips nimmt man nicht mit). Die Browser aller Leute laden kurz neu und landen im neuen Spiel. „Nochmal“ startet bei den Rundenspielen die nächste Runde desselben Spiels.

### Raum verlassen, Spiel beenden, Stapel ansehen

- **Home-Knopf** (Haus + „Start“, oben links in jedem Spiel): „Platz behalten“ geht zur Startseite, man bleibt angemeldet und der Tisch steht unter „Weiterspielen“; für die anderen gilt man als offline (Zug-Timer, automatische Pause und Rauswurf nach 5 Minuten wie bei Verbindungsabbruch). „Tisch verlassen“ steigt aus der Runde aus (wie „Aufstehen“), gibt den Platz auf und vergisst das Token im Browser; Ergebnisse bleiben in der Bestenliste. Ist niemand Menschliches mehr online, schließt der Raum sofort und der Code ist frei. Verlässt der Host den Tisch, geht die Host-Rolle weiter. „Zurück“ im Browser = „Platz behalten“. Server-Ereignisse `park`, `leave`.
- **Host-Menü „Spiel beenden“:** „Aktive Runde abbrechen“ beendet die Runde ohne Wertung, Karten, Einsätze und Chips gehen auf den Stand vor der Runde zurück (Poker: Einsätze der Hand zurück an die Spieler, Chipsumme bleibt; Blackjack: Einsätze und Versicherungen zurück, Karten in den Ablagestapel), danach wartet der Tisch; im Verlauf steht „Runde vom Host abgebrochen“. „Tisch schließen“ schickt alle zur Startseite („Der Host hat den Tisch geschlossen“), löscht den Raum und gibt den Code frei. Beides nur für den Host, vom Server geprüft (`abortRound`, `closeTable`).
- **Ansehen** (Lupe oben in der Leiste, bei Skip-Bo zusätzlich an den Ablagen): ein gemeinsames Blatt (`openLook` in `public/core.js`; am Handy von unten, schließen per Knopf, Klick daneben oder Esc) mit offenen Informationen: Skip-Bo alle Ablagen (unten → oben, oberste hervorgehoben), Baureihen mit Folge und Jokern, eigener Stapel nur Anzahl + oberste Karte; Mau-Mau/UNO die zuletzt gelegten Karten; Phase 10 ausgelegte Phasen groß und die letzten 5 Ablagekarten; Schwimmen der Tauschverlauf; Mäxchen die Ansagen; Kniffel, Zehntausend, Shut the Box, Schocken die Blätter/Würfel aller; bei allen Spielen die letzten Züge der Runde; Partyspiele frühere Fragen. Die Daten kommen aus `moves` (jede `act(id, text, detail)` eines Spiels wird mitgeschrieben – nur, was ohnehin als Sprechblase für alle sichtbar ist) und `g.past` (aufgelöste Fragen). Tests: `test/look.test.js`.

### Identität: Game-ID, Geräte verbinden, alte Statistiken (V2-01)

Jeder Browser ist ein identifizierter Gast: Der Server legt beim ersten Seitenaufruf ein signiertes Cookie (`pa_guest`, 180 Tage) mit einer internen Konto-ID an und vergibt eine kurze öffentliche **Game-ID** (z. B. `#K7Q2`). Der Anzeigename bleibt frei änderbar; Bestenliste, Erfolge, „Gerade online“, Ticket-Ersteller, Planungen und Monopoly-Bretter hängen an der ID, nicht am Namen. Zwei Spieler mit gleichem Namen sind zwei Personen. Plätze an Tischen sind serverseitig an die ID gebunden (Reconnect geht auch ohne Token, ein fremdes Token gilt nicht). Computergegner haben eigene `bot_`-IDs und zählen nie als Person.

Unter **Ich → Identität & Geräte**: Game-ID ansehen, **Gerät verbinden** (6-stelliger Code, 10 Minuten, einmalig – danach sind beide Geräte dieselbe Person) und **Meine alten Statistiken übernehmen** (wer einen alten Namen zuerst übernimmt, bekommt ihn; `/admin` kann eine Zuordnung zurücknehmen). Vor der Umstellung kopiert der Server die Datendateien einmalig nach `backups/pre-v2-01/`; Rückfall und Details: [V2-00](docs/roadmap/V2-00_BESTANDSAUFNAHME.md), [V2-01](docs/roadmap/V2-01_IDENTITAET.md).

### Bestenliste über alle Abende

Auf der Startseite (Bestenliste) und unter „Stand“ in jedem Spiel: pro Spiel gespielte Partien, Siege (mit Quote) und Punkte – über alle Abende oder für einen Monat. Wiedererkannt wird man am Namen (Groß/Klein egal). Eine Partie ist beim Poker eine Hand (gezählt werden gewonnene/verlorene Chips), sonst eine Runde. Gespeichert in `data/leaderboard.json` im Daten-Volume.

### Als App aufs Handy

Die Seite lässt sich auf den Homescreen legen und startet dann ohne Browserleiste:

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Dafür gibt es `public/manifest.webmanifest`, Icons in `public/icons/` und einen kleinen Service Worker (`public/sw.js`), der nichts zwischenspeichert – gespielt wird immer live. Manifest und Icons sind auch ohne Passwort abrufbar, alles andere nicht.

## Was V1.0 kann

| Bereich | Funktionen |
| --- | --- |
| Startseite | Hub mit Profil, offenen Tischen, Spieleliste, Hosten-Panel, Einladungslink mit Code; Gruppenpasswort statt Benutzerkonto |
| Spiel | Automatisches Mischen (Krypto-Zufall) und Austeilen, Blinds, Button wandert, Heads-up-Regeln, Big-Blind-Option |
| Aktionen | Fold, Check, Call, Bet, Raise, All-in, Slider + ½ Pot / ¾ Pot / Pot / All-in, Tastenkürzel F / C / R, Controller (A / B / X, LB / RB, Start) |
| Am Zug | „Du bist dran“ über der Aktionsleiste, große Restzeit (letzte 8 s rot), Ton, blinkender Tab-Titel, auf Wunsch Browser-Benachrichtigung |
| Vorab-Aktionen | Check/Fold, Check, Call beliebig, Fold – nur für die laufende Hand, auf dem Server ausgeführt (greift auch bei kurzem Verbindungsabbruch) |
| Blinds | Fest oder steigend: alle X Minuten oder alle X Hände, Vorlagen Schnell / Normal / Lang oder eigene Liste. Anzeige oben „Nächstes Level in 4:32 – 100/200“, neues Level erst ab der nächsten Hand, Uhr steht vor dem Start, beim Anhalten und in der Pause |
| Gewinnchancen | Host wählt: aus, nur eigene (während der Hand, nur aus eigenen Karten und Board) oder nach der Hand (für alle gezeigten Hände, pro Straße). Persönlich abschaltbar |
| Chips verschenken | Mit Nachricht, der andere muss zustimmen, nur zwischen zwei Händen, gilt 60 s, Host kann es abschalten. Am Plus/Minus ändert es nichts |
| Anstupsen | Nach 10 s automatisch, außerdem per 👉 am Panel (höchstens alle 10 s), Sprüche im Host-Menü editierbar, Host-Schalter |
| Chips | Einsätze vor jedem Spieler, fliegen nach der Setzrunde in den Pot, Main + Side Pots, Rückgabe nicht gecallter Chips, Split Pot mit Rest-Chip-Regel |
| Showdown | Handauswertung mit Kicker, Siegerkarten markiert, „Karten zeigen“ nach Gewinn ohne Showdown |
| Verbindung | Reconnect mit gleichem Platz und Chips, zweiter Tab verdrängt den ersten, doppelte Aktionen werden ignoriert, Timeout checkt oder foldet |
| Host | Start, Pause, nächste Hand, Blinds, Startchips, Nachkaufen (aus / max. X / unbegrenzt), neues Spiel (alle auf Startchips, alter Abendstand bleibt im Verlauf), Zeit pro Zug, Pause zwischen Händen, Handanzeige erlauben, Spieler entfernen, Host weitergeben, Chips korrigieren (wird im Verlauf vermerkt) |
| Spieler | Pause / zurück, Aufstehen nach der Hand (danach eine Hand aussetzen), Nachkaufen, eigene Karten nach dem Fold weiter sichtbar, Kartengröße, eigene Karten auch am Platz, freche Sprüche beim Folden statt Checken, Vier-Farben-Deck, Handanzeige, Beträge in BB, Töne, Animationen aus, grüner oder blauer Tisch |
| Verlauf | Ganzer Abend (die letzten 500 Hände, übersteht Neustarts), nach Händen gruppiert und einklappbar, neueste oben. Filter: Aktionen, Gewinne, Karten, System, Reaktionen; Suche nach Spielername. Liegt pro Tisch in `data/history-CODE.json` |
| Extras | Gewinnmoment mit Chip-Regen und großem Betrag (stärker ab 50 BB oder Full House), Reaktionen (👍 😂 GG …), Abendstand mit Plus/Minus, größter Pot, beste Hand |
| Handy | Eigene Hochformat-Ansicht mit großen Buttons |

## Backup & Wiederherstellen

`scripts/backup.sh` sichert das Daten-Volume (Tische, Verläufe, Bestenliste, Tickets, Schlüssel) als `spieleabend-JJJJ-MM-TT_HHMM.tar.gz` und löscht eigene Sicherungen, die älter als 14 Tage sind. Das Volume wird automatisch gefunden (Docker Compose nennt es z. B. `webseite_poker_poker-data`).

Auf dem Server einmal einrichten:

```bash
chmod +x scripts/backup.sh scripts/restore-test.sh
sudo mkdir -p /var/backups/spieleabend
scripts/backup.sh            # einmal von Hand testen
crontab -e                   # und diese Zeile eintragen – täglich um 4:30 Uhr:
30 4 * * * /pfad/zum/repo/scripts/backup.sh >> /var/log/spieleabend-backup.log 2>&1
```

Einstellbar über Umgebungsvariablen: `BACKUP_DIR` (Standard `/var/backups/spieleabend`), `KEEP_DAYS` (14), `VOLUME` (falls die Suche nicht passt).

**Zweites Ziel außer Haus (optional):** Ist `BACKUP_RSYNC_TARGET` (z. B. `user@host:/pfad/spieleabend/`) oder `BACKUP_RCLONE_TARGET` (z. B. `meinremote:spieleabend`) gesetzt, kopiert `backup.sh` das neue Archiv nach dem Sichern dorthin. Ohne diese Variablen passiert nichts. Scheitert die Kopie, endet das Skript mit Fehler (und schreibt ihn ins Log); die lokale Sicherung bleibt erhalten.

```bash
BACKUP_RCLONE_TARGET=meinremote:spieleabend scripts/backup.sh
```

**Wiederherstellung prüfen:** Ein Backup, das sich nicht einspielen lässt, ist wertlos. `scripts/restore-test.sh` entpackt das neueste Backup (oder ein angegebenes Archiv) in einen temporären Ordner, startet den Server mit `DATA_DIR` darauf, prüft `/health` und das Laden von Bestenliste, Tickets und Tischen und räumt anschließend alles wieder auf. Die echten Daten und das laufende System bleiben unberührt. Es braucht Node 20+ und `tar` und endet mit 0 nur, wenn alles gelesen werden konnte.

```bash
scripts/restore-test.sh                                   # neuestes Backup in /var/backups/spieleabend
BACKUP_DIR=/srv/backup scripts/restore-test.sh
scripts/restore-test.sh /pfad/spieleabend-2026-11-01_0430.tar.gz
# wöchentlich, sonntags um 5:00 Uhr:
0 5 * * 0 /pfad/zum/repo/scripts/restore-test.sh >> /var/log/spieleabend-restore-test.log 2>&1
```

**Zurückspielen:** Container stoppen, Archiv ins Volume entpacken, Container starten:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop poker
docker run --rm -v webseite_poker_poker-data:/data -v /var/backups/spieleabend:/backup alpine:3 \
  sh -c "rm -rf /data/* && tar xzf /backup/spieleabend-2026-10-25_0430.tar.gz -C /data"
docker compose -f docker-compose.yml -f docker-compose.prod.yml start poker
```

## Betrieb & Wartung

### Update ankündigen und sauber beenden

Vor einem Neustart rechtzeitig Bescheid sagen: Über die Admin-Seite (**Update ankündigen**, 1 bis 180 Minuten) oder per Signal `docker kill -s USR2 <container>` (Vorlauf `UPDATE_ANNOUNCE_MIN`, Standard 5 Minuten) erscheint bei allen ein Banner **„Update in X Minuten“**. Ab der Ankündigung starten **keine neuen Runden** mehr (Starten, nächste Hand, Abendprogramm; auch Pokers Automatik); laufende Runden und Züge gehen normal weiter, Tische bleiben nutzbar. Die Ankündigung kann zurückgenommen werden.

Ist die Frist abgelaufen und keine Runde mehr aktiv, **speichert der Server alles und beendet sich** (Ende 0; `restart: unless-stopped` startet ihn wieder, ein neues Image kommt mit `docker compose pull && docker compose up -d`). Läuft nach der Frist noch eine Runde, wartet er höchstens `UPDATE_DRAIN_MAX_MIN` Minuten (Standard 15). Der Ablauf steht im Admin-Protokoll.

Bei **SIGTERM** (`docker stop`) und **SIGINT** wird ebenfalls sofort alles gespeichert (Tische, Verläufe, Bestenliste); alle offenen Verbindungen erhalten **„Server startet neu – gleich wieder da“**. Der Browser verbindet sich selbst neu (Socket.IO-Wiederverbindung), meldet Tisch und Startseite automatisch wieder an und zeigt nach dem Neustart bei Bedarf **„Neue Version – Neu laden“**. Eine Runde, die beim Neustart gerade lief, muss der Host wie bisher neu starten (Speichern mitten in der Runde ist noch offen).

### Version und „Was ist neu“

Die Version steht in `package.json` (jetzt **3.0.0**), der Commit-Hash kommt als Build-Argument ins Image: Der Workflow übergibt `GIT_COMMIT` automatisch, lokal `docker build --build-arg GIT_COMMIT=$(git rev-parse HEAD) .`. Beides steht unter **Ich** und auf `/health` (`{"ok":true,"version":"2.0.0","commit":"abc1234","uptime":…}`).

**Was ist neu** zeigt die neuesten erledigten Einträge aus `games/roadmap.js` – automatisch, sobald dort etwas auf erledigt gesetzt wird (mit Datum). Jeder Browser sieht den Hinweis **einmal pro neuer Version** (gemerkt in `poker:seenVersion`; ein ganz neuer Browser bekommt ihn nicht), außerdem jederzeit über **Ich → Was ist neu?**.

### Admin-Seite (`/admin`)

Zugang nur über die eigene Umgebungsvariable **`ADMIN_PASSWORD`** (in der `.env`). Sie hat nichts mit dem Gruppenpasswort oder `TICKET_ADMIN_PASSWORD` zu tun; **ohne `ADMIN_PASSWORD` gibt es `/admin` nicht** (404). Die Seite liegt zusätzlich hinter der normalen Seitenanmeldung. Eigener signierter Cookie (`pa_admin`, `HttpOnly`, `SameSite=Strict`, nur für `/admin`, 8 Stunden), nach 8 Fehlversuchen 15 Minuten gesperrt, alle Änderungen verlangen zusätzlich Herkunft und Anfrage-Header der Seite.

- **Anzeigen:** offene Räume (Code, Spiel, Spieler mit Namen, Laufzeit, letzte Aktivität, Rundenstatus), Verbindungen und Spieler online, Laufzeit, Speicher, CPU, Größe der Datendateien, Fehler aus dem Browser (gruppiert), Admin-Protokoll.
- **Funktionen & Spiele (V2-10):** Discord-Anmeldung, Ranked-Wertung, Kamera (für später, Standard aus) und jedes einzelne Spiel sofort ein- oder ausschalten; die Grundeinstellung steht in der `.env` (`FEATURE_DISCORD`, `FEATURE_RANKED`, `FEATURE_CAMERA`, `DISABLED_GAMES`), die Admin-Einstellung gewinnt, „Zurücksetzen“ führt auf die `.env` zurück. Ausschalten löscht nie Daten, laufende Tische spielen weiter. Einzelheiten: [docs/betrieb.md](docs/betrieb.md#4-funktionen-und-spiele-ein--und-ausschalten).
- **Aktionen** (jeweils mit Bestätigungsdialog): hängenden Raum schließen (alle Spieler landen mit Hinweis auf der Startseite), Update ankündigen oder zurücknehmen; Link zur Tickets-Verwaltung.
- **Admin-Protokoll:** `DATA_DIR/admin-log.json` (letzte 500 Einträge: Anmeldung, fehlgeschlagene Anmeldung, geschlossene Räume, Update-Ankündigung und -Beenden). Die Datei gehört ins Daten-Backup. Eine beschädigte Datei bleibt unverändert; das Protokoll läuft dann nur im Speicher.

### Fehler aus dem Browser

`window.onerror` und `unhandledrejection` melden an den Server, höchstens **10 pro Minute und Verbindung**. Gespeichert wird nur ein auf 200 Zeichen gekürzter Text ohne URL-Parameter, ohne Namen der Mitspieler und ohne Chat-Inhalte, dazu Dateiname:Zeile und das Spiel (am Tisch vom Server bestimmt). Die Admin-Seite gruppiert nach Meldung mit Anzahl und Spiel; die Liste liegt nur im Speicher (nach einem Neustart leer). **Ich → Fehler melden** öffnet das Ticket-Formular als „Fehler“ und hängt die letzten fünf Meldungen an.

### Ausfall-Wächter (Uptime)

`/health` ist ohne Anmeldung erreichbar und liefert `200` mit JSON, solange der Server läuft. Ein externer Wächter (nicht auf demselben Server!) meldet Ausfälle, z. B. mit [Uptime Kuma](https://github.com/louislam/uptime-kuma): Monitor-Typ **HTTP(s) – Keyword**, URL `https://<domain>/health`, Keyword `"ok":true`, Intervall 60 Sekunden, bei 2–3 Fehlversuchen benachrichtigen (Discord, Telegram, E-Mail). Zusätzlich lohnt ein zweiter Monitor auf die Startseite. Beim angekündigten Update ist ein kurzer Ausfall zu erwarten.

### Tests und CI

| Befehl | Was |
| --- | --- |
| `npm run test:fast` | alle Node-Tests außer Simulationen und Langläufern (`scripts/test-fast.mjs`, unter etwa einer Minute) |
| `npm test` | alle Node-Tests, auch die Simulationen |
| `npm run test:smoke` | kleine Browser-Rauchprobe: Startseite, Kartenspiel, Brettspiel, jeweils Desktop und Handy |
| `npm run test:ui` | alle Playwright-Prüfungen |

Der Workflow `.github/workflows/docker.yml` führt bei jedem Push auf `main` erst `test:fast` und die Rauchprobe aus; **nur bei grünem Lauf wird das Image gebaut** (mit `GIT_COMMIT`). Jede Nacht (02:17 UTC) laufen alle Node-Tests (4 Teile) und alle Playwright-Prüfungen (12 Teile) parallel mit **denselben Befehlen** wie lokal (`npm run test:all -- --only=… --shard=…`), ohne Image-Bau. Die Berichte jedes Teils (`nacht-node-N`, `nacht-ui-N`) und die zusammengeführte Coverage (`nacht-coverage`, HTML) liegen als Artefakte bereit; die Zusammenfassung des Laufs listet Fehler und wackelige Prüfungen.

### Tests selbst starten

**Einmalig vorbereiten** (Windows, Linux und macOS gleich; Node 20 oder neuer, die CI nutzt 22):

```bash
npm ci
npx playwright install chromium     # Linux zusätzlich: npx playwright install --with-deps chromium
```

Unter **Windows und macOS** nutzen die Browser-Prüfungen das installierte Google Chrome (`channel: 'chrome'`). Wer kein Chrome hat oder wie die CI testen will, setzt `PLAYWRIGHT_CHANNEL=chromium` (PowerShell: `$env:PLAYWRIGHT_CHANNEL = 'chromium'`; Linux-Shell: `PLAYWRIGHT_CHANNEL=chromium npm run test:all`). Unter **Linux** wird `chromium` automatisch gewählt.

| Befehl | Was | Dauer (Richtwert, 8 Kerne) |
| --- | --- | --- |
| `npm run test:all` | **alles**: Node-Tests mit Coverage, dann die komplette Playwright-Suite (Desktop und Handy), dann eine Zusammenfassung. Läuft bei roten Teilen weiter und endet mit Exit-Code 1 | siehe unten |
| `npm run test:all:docker` | dasselbe im offiziellen Playwright-Image (`mcr.microsoft.com/playwright:v<Version>-noble`, Version passend zu `@playwright/test`); nutzt nur einen **lokalen** Docker-Dienst, nie einen entfernten Docker-Kontext | wie oben plus erster Image-Download (ca. 2 GB) |
| `npm run test:report` | öffnet den HTML-Bericht der letzten Playwright-Läufe im Browser | sofort |
| `npm run test:coverage` | nur die Node-Tests mit Coverage | ca. 3 Minuten |
| `npm run coverage:worst` | die 20 Dateien mit der geringsten Zeilenabdeckung | sofort |
| `npm run test:fast` / `npm run test:smoke` | schnelle Tests (unter einer Minute) / Rauchprobe | wie bisher |

Teile einzeln oder in Stücken: `npm run test:all -- --only=node`, `--only=ui`, `--shard=2/12`, `--no-coverage`; alles nach einem zweiten `--` geht an Playwright, z. B. `npm run test:all -- --only=ui -- --project=desktop -g "Blackjack"`.

**Wo liegen die Ergebnisse?** (Ordner `reports/`, nicht im Repository)

| Pfad | Inhalt |
| --- | --- |
| `reports/summary.md` und `reports/summary.json` | Zusammenfassung: bestanden/fehlgeschlagen pro Teil, Coverage in %, Dauer, fehlgeschlagene und wackelige Prüfungen |
| `reports/coverage/index.html` | Coverage-Bericht (HTML); Text im Terminal, `coverage-summary.json` und `lcov.info` daneben |
| `reports/playwright-html/index.html` | Playwright-HTML-Bericht (öffnen mit `npm run test:report`) |
| `reports/node-tests.xml`, `reports/playwright.json` | JUnit bzw. JSON für Auswertungen |
| `test-results/` | Bilder, Traces und Videos fehlgeschlagener Browser-Prüfungen |

Die Coverage misst `server/` und `games/` (Browser-Skripte unter `public/` laufen nur in den Playwright-Prüfungen; Hilfsdateien wie Fixtures, `_artifacts` und Konfigurationen sind in `.c8rc.json` ausgenommen). **Hinweis Windows:** Beendet ein Test seinen Server als Kindprozess hart, liefert dieser keine Messdaten; deshalb gibt es `test/api-inprocess.test.js` und `test/discord-inprocess.test.js`, die den Server im selben Prozess prüfen. Unter Linux (CI, Docker) wird auch bei Kindprozessen gemessen.

Neue Spiele werden automatisch mitgeprüft: `test/all-games.test.js` liest die Spieleliste aus dem Ordner `games/` (Raum, Bots, Partie bis zum Ende oder Zuglimit, keine Karten/Rollen anderer in den Ansichten, Speichern und Laden) und `test/ui/game-flow.spec.js` ergänzt jedes Spiel ohne eigene Spec (`node scripts/games-without-spec.mjs` zeigt, welche das sind).

## Discord-Anmeldung einrichten (optional, V2-02)

Discord ist eine zweite Anmeldung neben dem Gruppenpasswort und hängt sich an dein Konto (Game-ID, siehe oben). Ohne die Variablen unten ist Discord aus: kein Knopf, `/auth/discord/*` antwortet 404, alles andere läuft wie bisher. Discord gibt nie Admin-Rechte.

1. Im [Discord Developer Portal](https://discord.com/developers/applications) die vorhandene Anwendung öffnen (Anwendungs-ID `1563578924007694346`).
2. **OAuth2 → Redirects → Add Redirect** und genau diese Adressen eintragen (ohne Schrägstrich am Ende, Schreibweise exakt):
   * Server: `https://DEINE-DOMAIN/auth/discord/callback`
   * lokal zum Testen: `http://localhost:3000/auth/discord/callback`
3. **OAuth2 → Client Secret → Reset Secret**, den Wert kopieren und nur in die `.env` auf dem Server schreiben (`DISCORD_CLIENT_SECRET`). Nie in Git, nie in Chats. Scopes muss man im Portal nicht einstellen; die Seite fragt `identify` und `guilds.members.read` selbst an. Einen Bot braucht es nicht.
4. Server-ID holen: in Discord *Benutzereinstellungen → Erweitert → Entwicklermodus* an, dann Rechtsklick auf den Server → *Server-ID kopieren*. Für eine Rollenbeschränkung genauso die Rollen-ID (*Servereinstellungen → Rollen → Rolle → ID kopieren*).
5. In der `.env` (Vorlage: `.env.example`) setzen:
   ```
   DISCORD_CLIENT_ID=1563578924007694346
   DISCORD_CLIENT_SECRET=…        # aus Schritt 3
   PUBLIC_URL=https://DEINE-DOMAIN
   DISCORD_GUILD_ID=…             # Schritt 4; leer = Discord nur zum Verknüpfen, kein Zugang ohne Passwort
   DISCORD_ROLE_ID=               # optional
   ```
   Danach `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`. Auf der Login-Seite erscheint „Mit Discord anmelden“ (nur mit `DISCORD_GUILD_ID`); unter *Ich → Identität & Geräte* gibt es „Discord verknüpfen“.
6. Prüfen: Mit einem Discord-Konto, das Mitglied des Servers ist, anmelden; mit einem Nicht-Mitglied muss „Du bist nicht Mitglied …“ erscheinen. Meldet Discord „Invalid OAuth2 redirect_uri“, stimmt die Adresse in Schritt 2 nicht exakt mit `PUBLIC_URL` + `/auth/discord/callback` überein.

Mitglieder, die den Discord-Server verlassen, verlieren den Discord-Zugang spätestens nach 24 Stunden; das Gruppenpasswort-Cookie bleibt davon unberührt. Ist Discord kurz nicht erreichbar, wird niemand ausgesperrt. Unter *Ich* gibt es „Trennen“ und „Überall abmelden“. Technische Details: [V2-02](docs/roadmap/V2-02_DISCORD.md).

## Zugangsschutz

| Schutz | Wie |
| --- | --- |
| Seitenpasswort | Ohne Passwort gibt es nur die Passwort-Seite. Seite, Dateien und die Echtzeit-Verbindung sind gesperrt. |
| Browser merkt es sich | Signiertes Cookie (`HttpOnly`, `SameSite=Lax`, `Secure` unter HTTPS), 180 Tage gültig und bei jedem Besuch verlängert. Abmelden geht unter „Ich“. |
| Rausfliegen ohne Folgen | Bei Verbindungsabbruch oder Server-Neustart verbindet die Seite sich selbst neu: kein Passwort, gleicher Platz, gleiche Chips – solange man innerhalb von 5 Minuten zurück ist. |
| Wer wegbleibt | Nach 5 Minuten offline fliegt der Spieler mit allen Daten raus (Platz frei, Chips weg). In einer laufenden Hand foldet er und verschwindet nach der Hand. Ist es der Host, übernimmt ein anderer – das passiert schon nach 30 Sekunden. Ist niemand mehr da, wird der Tisch gelöscht. Frist änderbar über `PLAYER_TIMEOUT_MIN`. |
| Einladungslink | Wer den Link ohne Cookie öffnet, gibt einmal das Passwort ein und landet direkt am richtigen Tisch. |
| Passwort ändern | Alle alten Cookies werden ungültig. Das Passwort steckt in der Signatur. |
| Passwort raten | Nach 8 Fehlversuchen ist die IP für 15 Minuten gesperrt. |
| Tisch-Codes raten | Nach 20 falschen Codes ist die IP für 10 Minuten gesperrt. |
| Spam | Max. 6 neue Tische und 15 neue Namen pro IP in 10 Minuten, max. 30 Verbindungen pro IP, max. 50 Tische insgesamt. |
| Event-Flut | Pro Verbindung kurz 40, dauerhaft 8 Nachrichten pro Sekunde, danach Ablehnung, bei Dauerfeuer Trennung. Pakete max. 16 KB. |
| Fremde Webseiten | Socket-Verbindungen nur von der eigenen Domain (Origin-Prüfung), kein Einbetten in fremde Seiten. Header: CSP, `X-Frame-Options`, `nosniff`. |
| Kaputte Eingaben | Alle Werte werden auf dem Server geprüft. Namen ohne Steuerzeichen, Fehler in einem Handler reißen den Server nicht mit. |

Getestet wird das in `test/security.test.js`.

## Aufbau

Die Seite ist eine Plattform für mehrere Spiele. Gemeinsam sind Passwort-Login, Startseite und Lobby, Raumcodes, Spielerverwaltung, Reconnect, Speichern, Verlauf und Sicherheit. Jedes Spiel bringt seine eigene Engine und Oberfläche mit.

```
server/            Plattform (für alle Spiele gleich)
  index.js           Express + Socket.IO: Anmeldung, Lobby, Ereignisse, Speichern, Aufräumen
  base-room.js       Grundlage jedes Raums: Spieler, Host, Wegbleiben, Verlauf
  turn-room.js       Grundlage der Rundenspiele: Mitspieler, Reihenfolge, Runden, Punkte des Abends
  random.js          Mischen und Würfeln (kryptografisch sicherer Zufall)
  codes.js           Raumcodes, zentral für alle Spiele (nie doppelt)
  security.js        Passwort-Cookie, Rate-Limits, Header, Texte säubern
  env.js             liest die .env ein (ohne Zusatzpaket)
  login.html         Passwort-Seite
  leaderboard.js     Bestenliste über alle Abende (data/leaderboard.json)
games/             Spiele (Server-Teil)
  index.js           Liste aller Spiele
  poker/
    index.js           Beschreibung fürs Menü, Ereignisse, Raum erstellen/laden
    room.js            Pokertisch: Timer, Hände, Blinds, Geschenke, Ansicht pro Spieler
    blinds.js          steigende Blinds
    sebastian.js       Easter Egg „Waiting for Sebastian“
    engine/            Poker-Regeln ohne Netzwerk: cards.js (Deck, Bewertung, Chancen), table.js (Setzrunden, Pots)
  party-room.js      Grundklasse der Partyspiele: Stufen mit Uhr (Schreiben → Abstimmen → Auflösung), eigene Fragen, Geheimhaltung
  schaetzmeister/    Partyspiel: room.js (Regeln), fragen.json (Katalog mit Quellen), index.js
  maumau/, farbenchaos/, maexchen/, schocken/, huetchen/, zehnetappen/, stapelrennen/
                     je index.js (Beschreibung, Ereignisse) und room.js (Regeln); UNO erweitert Mau-Mau
public/            Browser
  index.html         Rahmen: Hub (Startseite), Profil-Dialog, Hosten-Panel, Dialoge
  core.js            Verbindung, Dialoge, Hilfen, Bestenliste – lädt das gewählte Spiel nach
  hub.js, hub.css    Startseite: Profil, Navigation per URL-Hash, offene Tische, Spieleliste, Hosten, Bestenliste
  style.css          gemeinsames Aussehen (Tokens, Buttons, Leisten, Seitenleiste, Verlauf)
  game-design.*     Spielmotive, Aktionsklänge, Handkartengröße und Querformat-Anordnung
  games/poker/       poker.js (Tisch-Oberfläche) und poker.css
  games/kit.js       gemeinsamer Rahmen der Rundenspiele (Kopfzeile, Spielerleiste, Seitenleiste, Ablegespiel-Bedienung)
  games/party-kit.*  gemeinsamer Baustein der Partyspiele: Fortschritt, Fragekarte, Eingabezeile, Rangliste (baut auf kit.js auf)
  games/<spiel>/     <spiel>.js und <spiel>.css – nur der eigene Tisch und die Aktionen
scripts/           backup.sh – tägliche Sicherung (siehe „Backup & Wiederherstellen“), restore-test.sh – Wiederherstellungsprobe, test-fast.mjs – schnelle Tests
test/              node:test – Engine inkl. 100.000 Zufallshänden, Räume, Server, Sicherheit, Plattform
```

Jede Testdatei mit eigenem Server hat einen eigenen Portbereich, weil `npm test` die Dateien parallel ausführt: `server` 4000–4049, `security` 4050–4099, `sebastian` 4100–4149, `away` 4150–4199, `codes` 4200–4249, `history` 4250–4299, `platform` 4300–4349. Neue Dateien bekommen den nächsten freien Fünfziger-Block.

### Bauart C: Echtzeit zusammen

`games/realtime-room.js` erweitert `TurnRoom`. Ein Raum berechnet Bewegung und Kollisionen in festen Schritten von 50 ms. Alle 100 ms sendet er einen kleinen öffentlichen `arena`-Frame an seine verbundenen Spieler und Zuschauer. Diese Frames enthalten weder Tokens noch Eingaben oder vollständige Verlaufsdaten; sie lösen keine Speicherzugriffe oder Lobby-Aktualisierungen aus.

`steer` akzeptiert ausschließlich die laufende Runde samt frischer Rundenkennung, eine steigende Sequenznummer, Richtungen −1/0/1 und den Sprungwunsch. Positionen, Client-Zeiten und Client-Punkte haben keinen Einfluss. Diagonalen werden normalisiert, Eingaben verfallen nach 350 ms. Die bestehenden Socket-Limits bleiben aktiv. Sequenzen werden beim Wiederverbinden aus dem Raumstand übernommen; Abbruch und Neustart erzeugen eine neue Rundenkennung.

`public/games/realtime-kit.js` zeichnet die Arena per Canvas zwischen den Server-Frames und verwendet den bestehenden `kitGame`-Rahmen für Host-Menü, Regeln, Wertung und Abendprogramm. Bots entscheiden im selben Server-Takt anhand des öffentlichen Spielfelds und verwenden dieselbe Bewegung, Sprungpause und Kollision wie Menschen. Der allgemeine Bot-Treiber startet für sie keine zusätzlichen Zug-Timer. Alle Raum-Timer stoppen bei Abbruch, Rundenende, Spielwechsel oder Entfernen des Raums. Tests: `test/realtime.test.js`, `test/ui/realtime.spec.js`.

### Bauart B: Solo-Partyspiele (Bauart-B-Baustein)

Zahlenzoo, Gedächtnisküche, Pfeilfieber und Sortierstation sind **Bauart B**: Alle spielen gleichzeitig solo dieselbe Runde. Der Server (`games/solo-room.js`, ein `PartyRoom`) verteilt pro Runde einen **Seed**; jeder Browser erzeugt daraus lokal dieselbe Runde und schickt am Ende nur seine **Eingaben** (Antwort, Tipps, Tastendrücke mit Zeitstempel, Entscheidungen). Der Server **spielt die Eingaben nach** und wertet aus – die Punkte kommen nie vom Browser. Zeit wird auf der Serveruhr gemessen; Tempo und Abstände der Eingaben werden geprüft (zum Beispiel höchstens eine Eingabe alle 80 ms, Sperre nach einem Fehler).

Die Spiellogik (`makeRound`, `score`, `botPayload`, `solution`) liegt je Spiel in `public/games/<spiel>/logic.js` und läuft **dieselbe Datei** im Browser (dynamischer Import) und auf dem Server. Zufall: `public/games/solo/rng.js`. Die Oberfläche (`public/games/solo/solo-kit.js`, `soloGame({ … })`) zeichnet das Spielfeld aus dem Seed neu, sobald sich der Zustand ändert. Ein neues Bauart-B-Spiel braucht also: `logic.js`, `games/<id>/room.js` (eine kleine Unterklasse von `SoloRoom`), `index.js`, die Oberfläche mit `soloGame` und einen Eintrag in `games/index.js`/`games/bots.js`. Wie bei jedem Spiel ohne Server-Geheimnis gilt: Wer den Code liest, kann die Lösung berechnen – die Spiele sind auf Spaß unter Freunden ausgelegt, nicht auf Betrugssicherheit.

**Tickendes Paket** und **Werwolf** sind Bauart A (Runden mit Server als Spielleiter). Beim Werwolf kennt jeder Spieler nur seine eigene Rolle (Werwölfe einander, Verliebte einander); Nachtaktionen stehen weder im Verlauf noch in Sprechblasen, Tote und alle nach dem Spiel sehen Rollen und Nachtgeschehen. Die Diskussion läuft am Tisch (per Voice), im Spiel gibt es keinen Chat. Tests: `test/paeckchen6.test.js`.

## Partyspiele (Schätzmeister, Schlagfertig, Wer hat das gesagt?)

Alle antworten gleichzeitig; pro Frage läuft eine Folge von Stufen mit eigener Uhr. Das Spiel erweitert `PartyRoom` aus `games/party-room.js` (statt `TurnRoom`) und füllt `flow`, `catalog`, `parseCustom`, `startQuestion`, `waiting`, `closeStage`, `enter`, `isReady`, `stageView` und `fallback` (Kopfkommentar der Datei). Fragen liegen als JSON im Spielordner. Der Browser-Teil ruft `partyGame({ … })` aus `public/games/party-kit.js` auf. Regeln, die für alle gelten:

- **Geheimhaltung:** `stageView(viewerId)` darf nur Eigenes und anonyme Daten liefern – fremde Antworten, Stimmen und die richtige Lösung erst ab `reveal`. Die Tests schauen im JSON jeder Ansicht danach.
- **Texte:** Eingaben laufen durch `cleanAnswer` (Steuerzeichen raus, höchstens 120 Zeichen) und werden im Browser nur mit `esc()` ausgegeben.
- **Bots:** Ein Spiel liefert in `games/bots.js` einen Bot; `PartyRoom.botDue()` sagt dem Bot-Läufer, wer als Nächstes abgeben muss.
- **Eigene Fragen:** Der Host trägt sie im Host-Menü ein (eine pro Zeile); sie gelten nur in diesem Raum und stehen nur zwischen den Partien in seiner Ansicht.
- **Mehrere Abstimm-Schritte:** Ein Spiel kann in einer Stufe mehrere Schritte haben (`moreSteps`, z. B. eine Abstimmung pro Aufgabe); die Uhr startet pro Schritt neu. Die Ansicht darf die Basisfelder `q`, `of`, `stage`, `sub` nicht überschreiben (ein Test prüft das) – Texte der Frage heißen `prompt`.
- **Anstupsen:** Spiele, die die Option `nudge` führen (Schlagfertig), stupsen Trödler 15 Sekunden vor Stufenende selbst an; wer fertig ist, kann andere anstupsen (höchstens alle 10 Sekunden, Sprüche wie beim Poker). Wer in der Abstimmung Autor ist, bleibt dabei unverraten.
- **Bots:** Platzhalter-Antworten und zufällige Stimmen über `botStep` im Raum (`games/bots.js`).

## Ein neues Spiel hinzufügen

Beispiel Mau-Mau mit der ID `maumau` (nur Kleinbuchstaben, Ziffern und Bindestrich):

1. **Server:** `games/maumau/index.js` anlegen und in `games/index.js` eintragen.

   ```js
   import { Room } from './room.js';
   import { turnGame } from '../../server/turn-game.js';
   export default turnGame(Room, {
     id: 'maumau', name: 'Mau-Mau', description: 'Ablegen, aussetzen, Farbe wünschen.', category: 'karten', players: '2–6 Spieler',
     createFields: [{ key: 'cards', label: 'Karten pro Spieler', type: 'number', min: 3, value: 6 }],
     createHint: 'Alles andere stellst du im Raum ein.',
     events: { play: (room, p, { card }) => room.play(p.id, card), draw: (room, p) => room.draw(p.id) },
   });
   ```

   `turnGame` bündelt Anlegen, Wiederherstellen, Regel-Optionen und gemeinsame Ereignisse wie Mitspielen und Starten. Eigene Ereignisse und Hinweise bleiben im Spielmodul; Eingaben werden dort weiterhin geprüft.

2. **Raum:** Für Rundenspiele am einfachsten `class Room extends TurnRoom` (aus `server/turn-room.js`, siehe die vorhandenen Spiele) – Mitspieler, Reihenfolge, Runden und Punkte sind dann schon da, das Spiel füllt `setupRound`, `gameView`, `publicPlayer` und seine Aktionen. Einen **Zug-Timer** bekommt ein Rundenspiel, indem es die Einstellung `turnTime` (Sekunden, 0 = aus) in seine `OPTIONS` aufnimmt und `onTimeout(id)` füllt (siehe Schiffe versenken); `timerActive()` hält die Uhr an, wenn gerade niemand dran ist. Ganz frei geht es mit `class Room extends BaseRoom` (aus `server/base-room.js`). Spieler, Host, Wegbleiben und Verlauf sind damit schon da. Das Spiel füllt die Haken:

   | Haken | Wofür |
   | --- | --- |
   | `view(playerId)` | Was dieser Spieler sehen darf – **nur das**. Fremde Karten nie mitschicken. |
   | `snapshot()` / `static restore(data, onChange)` | Speichern und nach einem Neustart laden. |
   | `get round()` | Nummer der laufenden Runde (der Verlauf gruppiert danach). |
   | `get busy()` | Läuft gerade eine Runde? Dann wird nicht gespeichert. |
   | `playerFields()` | Spielfelder für neue Spieler (z. B. Handkarten). |
   | `leaveGame(p)` | Beim Entfernen aufräumen; `true` = erst nach der Runde entfernen. |
   | `afterChange()` | Läuft nach jedem Ereignis (Timer, automatische Züge). |
   | `dispose()` | Timer stoppen, wenn der Raum gelöscht wird. |

   Mit `this.say(text, kind, cat)` kommt etwas in den Verlauf. Die Kategorien für die Filter sind `action`, `win`, `cards`, `system` und `react`. `this.onChange('state')` zeichnet alle neu, `this.onChange('ereignis', { to: spielerId, … })` geht nur an einen Spieler. Die Plattform-Ereignisse `create`, `join`, `kick`, `makeHost`, `history` und `react` darf ein Spiel nicht belegen; der Server bricht sonst beim Start ab.

3. **Browser:** `public/games/maumau/maumau.js` und `maumau.css`. Das Skript zeichnet seine Oberfläche in `#game-root` und meldet sich an:

   ```js
   'use strict';
   $('#game-root').innerHTML = `<div id="game">…</div>`;
   registerGame('maumau', {
     show() { /* einblenden, zeichnen */ },
     onState(state) { /* neuer Stand vom Server */ },
     onPrefs() { /* persönliche Einstellungen geändert */ },
   });
   ```

   Aus `core.js` stehen bereit: `$`, `$$`, `esc`, `send(ereignis, daten)`, `toast`, `ask` (Dialog), `beep`, `store`, `prefs` mit `usePrefs({ … })` und `savePrefs()`, `socket` und `ICON`. Das Aussehen baut auf `style.css` auf. Inline-Skripte und `onclick=""` gehen wegen der CSP nicht.

4. **Tests:** `test/maumau.test.js` für die Regeln (Raum direkt, ohne Server). Mit Server: einen freien Portbereich nehmen (siehe oben).

5. **Docker:** nichts zu tun, `games/` und `public/` werden komplett kopiert.

### Backlog: `games/planned.js`

Die Datei ist die zentrale Arbeitsliste für alle noch geplanten Spiele und Party-Funktionen. Ein Spiel-Eintrag hat `id`, `name`, `description`, `category` (`karten`, `wuerfel`, `brett`, `party`), `minPlayers`, `maxPlayers`, `duration` (Minuten), `status` (`next` oder `planned`), `paeckchen`, `rules` (3–8 Stichpunkte mit den Standardregeln), optional `houseRules`, `vorbild` (nur die Mechanik) und `art`; Partyspiele haben zusätzlich `bauart`: **A** Runden/Text, **B** gleichzeitig solo (gleicher Seed, jeder spielt lokal, der Server prüft das Ergebnis) oder **C** Echtzeit zusammen. Funktionen (`type: 'feature'`) haben `id`, `name`, `paeckchen`, `status` und `beschreibung`. Ein Test (`test/planned.test.js`) prüft Pflichtfelder, eindeutige IDs und die Vollständigkeit der Päckchen.

Regeln für die Zukunft:

- **Wird ein Spiel umgesetzt:** Modul unter `games/<id>/` anlegen, in `games/index.js` registrieren und den Eintrag aus `planned.js` entfernen (der Test schlägt sonst an, weil die ID doppelt vorkommt).
- **Ist ein Päckchen oder eine Funktion fertig:** Auch `games/roadmap.js` pflegen: Etappe auf `erledigt` mit dem Datum des passenden Git-Commits setzen, die nächste Etappe auf `jetzt`. Ist eine Aufgabe in `docs/roadmap/plan.json` auf `done`, muss ihr Hub-Eintrag unter „Erledigt“ stehen – das prüft `test/planning-consistency.test.js`, damit die Roadmap nicht veraltet. Die Backlog-Einträge des nächsten Päckchens bekommen `status: 'next'`; immer nur ein Päckchen gleichzeitig.
- **Neue Ideen** werden nur noch in `planned.js` eingetragen, nicht mehr in dieser README.
- Geplante Spiele und Funktionen lassen sich nicht hosten oder auswählen; der Server lehnt sie ab.

### Weitere Ideen

Mögliche nächste Spiele stehen im Backlog (`games/planned.js`).

**Wichtig für die Fairness:** Der Browser bekommt nur seine eigenen Karten. Gegnerkarten verlassen den Server erst beim Showdown. Das prüft `test/server.test.js`. Das gilt für jedes Spiel: Was ein Spieler nicht sehen darf, gehört nicht in `view()`.

## Abweichungen vom Pflichtenheft

- **Kein React, kein TypeScript:** Die Oberfläche ist reines JavaScript ohne Build-Schritt. Das hält Docker-Image und Einstieg klein. Ein Umstieg ist später möglich, weil die Engine sauber getrennt ist.
- **JSON-Datei statt SQLite:** Für einen Tisch mit Freunden reicht eine Datei im Volume. SQLite lohnt sich ab den Statistiken über mehrere Abende (V1.1).
- **`node:test` statt Vitest:** Eingebaut in Node, keine zusätzliche Abhängigkeit.
- **Schrift lokal:** Bricolage Grotesque liegt unter `public/fonts`, damit keine Verbindung zu Google Fonts nötig ist (DSGVO).

## Als Nächstes (V1.1)

Time Bank, Straddle, Bomb Pot, Run It Twice, 7-2-Bonus, Hand-Replay.
