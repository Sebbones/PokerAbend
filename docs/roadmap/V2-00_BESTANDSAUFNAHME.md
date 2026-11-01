# V2-00 – Bestandsaufnahme, Sicherheitsmodell und Datensicherung

Stand: 01.11.2026 (Basis: `main` nach Commit `e43ed72`). Geprüft wurde der Quellcode; Produktivdaten wurden weder gelesen noch verändert.
Dieses Dokument ist die Grundlage für V2-01 (Plattformidentität). Details dazu: [V2-01_IDENTITAET.md](V2-01_IDENTITAET.md).

## 1. Architektur in einem Absatz

Ein einziger Node-Prozess (Express 4 + socket.io 4, ESM) liefert `public/` aus und hält **alle Räume im Arbeitsspeicher**.
Der Server ist Schiedsrichter: Jeder Raum (`BaseRoom`/`TurnRoom`, Spiele in `games/`) berechnet die Ansicht pro Spieler (`view(playerId)`) und
schickt nur das Sichtbare. Persistiert wird in einem einzigen Ordner `DATA_DIR` (Docker-Volume `poker-data` → `/app/data`), immer per
`.tmp` + `rename`. Es gibt keine Datenbank und kein zweites Backend. Vor dem Server steht auf dem Produktivsystem Traefik (TLS, gzip).

| Baustein | Datei | Aufgabe |
|---|---|---|
| Zugang | `server/security.js` | Seitenpasswort → HMAC-Cookie `pa_auth`; Limiter je IP, Token-Bucket je Socket, CSP, `sameOrigin` |
| Plattform | `server/index.js` | Login-Routen, Lobby, Raumcodes, Beitreten/Reconnect (Token), Speichern, Bestenliste-Einträge |
| Räume | `server/base-room.js`, `turn-room.js` | Spieler (`id`, geheimes `token`), Host, Verlauf |
| Statistik | `server/leaderboard.js`, `achievements.js` | Siege/Punkte je Name und Spiel/Monat; Erfolge werden daraus berechnet |
| Gemeinschaft | `tickets.js`/`ticket-api.js`, `evening-plans.js`/`plan-api.js`, `evening-reviews.js` | Ticket-Board, Terminplanung, Abendrückblicke |
| Betrieb | `admin.js`, `ops.js`, `maintenance.js` | Admin-Seite, Protokoll, Update-Ankündigung |

## 2. Datenbestände in `DATA_DIR`

Alle Schreiber nutzen `.tmp` + `rename` (atomar auf demselben Volume). Lesefehler: Bestenliste, Räume und (neu) das Konto-Verzeichnis
werden vor dem Überschreiben als `*.unlesbar-<Zeit>` gesichert; Tickets, Planungen, Rückblicke und Bretter starten bei defekter Datei **ohne**
Überschreiben (Funktion nicht verfügbar, Datei bleibt liegen).

| Datei | Format | Größe/Grenze | Schreibt | Liest | Inhalt mit Personenbezug |
|---|---|---|---|---|---|
| `secret.key` | 64 Hex-Zeichen, Modus 0600 (`SESSION_SECRET` hat Vorrang) | 64 B | `loadSecret` beim ersten Start | alle Cookie-Signaturen | **Schlüssel** – wer ihn hat, kann Cookies fälschen |
| `leaderboard.json` | `{ players: { <namekey>: { name, games: { <spiel>: { played, wins, points, months } } } } }`, ab V2-01 `schemaVersion: 2` | wächst mit jedem neuen Namen (kein Limit, E3) | `index.js` (entprellt 300 ms, bei Rundenende sofort) | Bestenliste-API, Erfolge | Spielernamen |
| `accounts.json` (neu V2-01) | `{ schemaVersion: 1, accounts: { <id>: {...} }, audit: [...] }` | ein Eintrag je Browser/Gerät-Gruppe | `account-store.js` | Identität, Admin | interne ID, Game-ID, letzter Name |
| `rooms.json` | Array der Raum-Schnappschüsse (`games/*/snapshot`), je Raum `game`, `code`, `unlisted`, `partyProgram`, ab V2-01 `playerAccounts` | wenige hundert KB; höchstens `MAX_ROOMS` (50) | `index.js` zwischen Runden und beim Beenden | `load()` beim Start | Namen, **Spieler-Tokens** (Reconnect) |
| `history-<CODE>.json` | Array der Verlaufseinträge | bis 40 000 Einträge je Raum | `saveHistory` | `load()` | Namen, Chat-Reaktionen |
| `tickets.json` | `{ version: 1, nextId, tickets[] }`, Modus 0600 | ≤ 1000 Tickets, 100 Kommentare, 200 Stimmen | `tickets.js` | Ticket-Board | Name/Avatar, Besucher-ID als `author.id` |
| `evening-plans.json` | `{ version: 1, plans[] }`, Modus 0600 | ≤ 300 Planungen | `evening-plans.js` | Abendplanung | Name/Avatar, Besucher-ID als `owner.id`/`person.id` |
| `evening-reviews.json` | `{ version: 1, evenings[] }`, Modus 0600 | begrenzt im Code | `evening-reviews.js` | Rückblick-Archiv | Namen, Ergebnisse |
| `monopoly-boards.json` | `{ version: 1, boards[] }`, Modus 0600 | ≤ 20 Bretter | `games/monopoly/boards.js` | Monopoly-Auswahl | keine (ab V2-01 interne Ersteller-ID) |
| `admin-log.json` | Array `{ at, action, detail }` | ≤ 500 | `ops.js` | Admin-Seite | – |
| `backups/pre-v2-01/` (neu) | Kopien der obigen JSON-Dateien | einmalig | `data-migration.js` beim ersten Start mit V2-01 | manuell (Rückfall) | wie die Originale |

Nicht im Volume: Spielstände der Einzelspieler (liegen im `localStorage` des Browsers).

### Browser-seitig (nur Referenz)
`localStorage`: `poker:name`, `poker:avatar`, `poker:session:<CODE>` (Raum-Token), Einstellungen. Cookies siehe 3.

## 3. Cookies und Berechtigungsgrenzen

| Cookie | Pfad | Lebensdauer | Inhalt | Zweck |
|---|---|---|---|---|
| `pa_auth` | `/` | 180 Tage, wird bei jedem Seitenaufruf erneuert | `<exp>.<HMAC(exp, pwTag)>` | Zugang zur Seite und zu Sockets. Passwortwechsel macht alle ungültig |
| `pa_admin` | `/admin` | 8 h | Zufall + Ablauf + HMAC (Passwort-Hash fließt ein) | Admin-Seite |
| `pa_ticket_visitor` / `pa_ticket_admin` | `/api/tickets` | 365 Tage / 8 h | Zufalls-ID + Ablauf + HMAC | anonyme Ticket-Autoren / Ticket-Verwaltung |
| `pa_plan_visitor` | `/api/plans` | 365 Tage | Zufalls-ID + Ablauf + HMAC | anonyme Planer |
| `pa_guest` (neu V2-01) | `/` | 180 Tage, erneuert | `<accountId>.<exp>.<HMAC>` | interne Identität |

Alle sind `HttpOnly`, `SameSite` (Lax bzw. Strict), auf dem Server `Secure`. JSON-Schreib-APIs verlangen zusätzlich `Origin` = eigene Seite
und den Header `x-requested-with: spieleabend`. Sockets prüfen `sameOrigin`, Cookie, Verbindungen je IP (30) und Ereignisrate (8/s).

## 4. Sicherheitsmodell (Threat Model)

Angreifer-Modelle: (A) Fremder ohne Passwort, (B) Mitspieler mit gültigem Login, der andere stören oder sich als sie ausgeben will,
(C) Webseite eines Dritten, die den Browser eines Mitspielers missbraucht, (D) Betriebsfehler (Absturz, defekte Datei, falsches Update).

| # | Bedrohung | Heute | Maßnahme / Restrisiko |
|---|---|---|---|
| T1 | **Identitätsdiebstahl**: Mitspieler übernimmt den Platz oder die Statistik eines anderen | Identität = frei gewählter Name; Reconnect nur über geheimes Token (48 Hex) | V2-01: Bindung an signierte Konto-ID; fremdes Token mit anderer Konto-ID wird abgelehnt. Restrisiko: Token + Cookie desselben Browsers |
| T2 | Namensgleichheit vermischt Statistiken (zwei „Anna“) | Bestenliste bündelt über den Namen | V2-01: Statistik hängt an der ID; gleiche Namen = zwei Personen |
| T3 | Cookie-Fälschung | HMAC-SHA-256 mit `secret.key`, `timingSafeEqual` | `pa_guest` nach demselben Muster; Verlust des Schlüssels = alle Cookies ungültig, nie ein Datenleck |
| T4 | Geheime Spielinformation (Hände, Rollen) | `view()` je Spieler; in der Review per Differenzprobe geprüft | unverändert; Konto-ID erscheint in keiner `view()`, `lobby`, `presence` oder API-Antwort an Dritte |
| T5 | Raten von Raumcodes / Geräte-Codes | Limiter `badCode` (20/10 min je IP) | Geräte-Code: 6 Zeichen, 10 min, einmalig, 8 Fehlversuche/10 min je IP und global gedrosselt |
| T6 | Fremdseite löst Aktionen aus (CSRF/CSWSH) | `sameOrigin`, `x-requested-with`, SameSite | Identitäts-API folgt demselben Muster |
| T7 | **Datenverlust**: Absturz beim Schreiben, defekte Datei wird durch leere ersetzt | atomares Schreiben; Review: Sicherung unlesbarer Bestenliste/`rooms.json` | vor jeder Migration automatische Sicherung nach `backups/pre-v2-01/` (nur kopieren, nie löschen) |
| T8 | Falsche Migration überschreibt Altbestand | – | Migration ist **additiv**: Alt-Einträge bleiben unter ihrem Namen liegen, Übernahme ist nur eine Zuordnung (`claimedBy`) und rückgängig machbar |
| T9 | Sicherungen verraten Daten | Backup-Anleitung im README (`docker run … tar`) | Sicherungsordner liegt im selben Volume, Rechte wie die Originale; nicht in Git, nicht im Image |
| T10 | Bots als Konten (Statistikbetrug) | Bots werden über den Namen aus Ergebnissen gefiltert | V2-01: Bot-Spieler tragen `bot: true` und eine `bot_`-ID, haben nie eine Konto-ID; Bestenliste verwirft Bot-Einträge |
| T11 | Offene Punkte außerhalb von V2-01 | – | E2 (Bretter ohne Löschen), E3 (Namen unbegrenzt), E6 (`unsafe-inline` für Styles): siehe Code-Review-Bericht |

Annahme: Wer das Gruppenpasswort kennt, ist vertrauenswürdig genug, mitzuspielen. Die Identität schützt vor **Versehen und Streichen**, nicht vor
einem entschlossenen Mitglied mit Zugriff auf den Browser eines anderen.

## 5. Inventar der Tests (Stand `e43ed72`)

* Node: 85 Testdateien (`test/*.test.js`), `npm test` ≈ 46–56 s, ca. 1 000 Prüfungen. Für diese Arbeit relevant:
  `leaderboard.test.js`, `achievements.test.js`, `presence.test.js`, `security.test.js`, `server.test.js`, `platform.test.js`,
  `away.test.js` (Offline/Reconnect), `bots.test.js`, `plan-api.test.js`, `evening-*.test.js`, `party-program-server.test.js`,
  `code-review-2026-11.test.js`, `data-safety.test.js`.
* Playwright: 40 Spezifikationen (`test/ui/*.spec.js`), Desktop + Handy, `npm run test:ui`; Rauchtest `npm run test:smoke`.
* Lücken vor V2-01: keine Tests für Gerätewechsel, Cookie-Identität, Übernahme alter Statistiken, Sicherung vor Migration.

## 6. Sicherungs- und Rollback-Checkliste

**Vor dem Update auf V2-01 (Produktivsystem, nur mit eigener Freigabe):**

1. Ankündigung („Update“ in `/admin`) und Warten, bis keine Runde mehr läuft. Der Server speichert beim Beenden selbst.
2. Volume sichern (Anleitung im README, Abschnitt „Backup & Wiederherstellen“). Das ist die **erste** Sicherung und liegt außerhalb des Volumes.
3. Sicherung bestätigen: `tar tzf` listet `leaderboard.json`, `rooms.json`, `tickets.json`, `evening-plans.json`.
4. Neues Image pullen, starten. Beim ersten Start legt der Server `backups/pre-v2-01/` an (zweite Sicherung, im Volume) und schreibt ab dann
   `leaderboard.json` mit `schemaVersion: 2`.
5. Prüfen: `/health` zeigt die Version; `/admin` zeigt Dateigrößen; unter „Ich“ erscheint die Game-ID; Bestenliste unverändert.

**Rückfall:**

1. Server beenden. 2. Vorheriges Image eintragen (`IMAGE=…`). 3. Nur bei Bedarf: Dateien aus `backups/pre-v2-01/` zurück nach `/app/data`
(die alte Version liest das neue Format ebenfalls, denn V2-01 fügt nur Felder hinzu; `accounts.json` wird von ihr ignoriert und kann liegen bleiben).
4. Starten. Verloren gehen höchstens Spiele, die **nach** dem Update gespielt und nur in der neuen Datei gespeichert wurden.

Keine Datei wird von der Migration gelöscht oder umbenannt. Details und Test-Nachweise: [V2-01_IDENTITAET.md](V2-01_IDENTITAET.md).
