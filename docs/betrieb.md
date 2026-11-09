# Betrieb: Spieleabend aufsetzen, aktualisieren, sichern, reparieren

Stand: Version **3.0.0** (8. November 2026). Diese Datei ist die vollständige Betriebsanleitung. Das README beschreibt die Spiele und die Entwicklung, hier steht alles für den Server.

**Inhalt**

1. [So läuft es](#1-so-läuft-es)
2. [Server von null einrichten](#2-server-von-null-einrichten)
3. [Alle Einstellungen (.env)](#3-alle-einstellungen-env)
4. [Funktionen und Spiele ein- und ausschalten](#4-funktionen-und-spiele-ein--und-ausschalten)
5. [Update vom alten Stand auf Version 3.0.0](#5-update-vom-alten-stand-auf-version-300)
6. [Jedes weitere Update](#6-jedes-weitere-update)
7. [Sichern und Wiederherstellen](#7-sichern-und-wiederherstellen)
8. [Fehlersuche](#8-fehlersuche)
9. [Was Sebi für Traefik wissen muss](#9-was-sebi-für-traefik-wissen-muss)
10. [Release-Check vor dem Aufspielen](#10-release-check-vor-dem-aufspielen)

---

## 1. So läuft es

* **Ein Container** (`poker`, Image `ghcr.io/ttlpscwa/pokerabend`), Node 22, Port 3000 nur im Docker-Netz.
* **Ein Daten-Volume** `poker-data` → `/app/data`. Dort liegt alles, was bleiben muss (Liste in [Abschnitt 5](#5-update-vom-alten-stand-auf-version-300)). Der Rest ist austauschbar.
* **Traefik** (zentraler Proxy auf dem Server) macht HTTPS und leitet auf Port 3000 weiter. Die App ist nicht direkt von außen erreichbar.
* **Nur eine Instanz.** Tische liegen im Arbeitsspeicher und werden beim Beenden gespeichert. Zwei Container nebeneinander (Skalierung) würden sich gegenseitig die Tische wegnehmen.
* **Nichts passiert automatisch auf dem Server.** Der GitHub-Workflow baut das Image und schiebt es nach `ghcr.io`. Aufspielen (`pull`, `up -d`) macht ein Mensch.

## 2. Server von null einrichten

Voraussetzungen: ein Linux-Server mit Docker (Compose v2), ein zentraler Traefik, eine Domain, deren DNS-A-Record auf den Server zeigt.

1. **Traefik-Netz prüfen.** Das externe Docker-Netz `proxy` muss existieren (Traefik hängt daran, Entrypoint `websecure`, Zertifikats-Resolver `letsencrypt`):

   ```bash
   docker network ls | grep -w proxy || docker network create proxy
   ```

2. **Dateien auf den Server legen** (in einen eigenen Ordner, z. B. `/srv/spieleabend`): `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example` und den Ordner `scripts/` (Backup, Restore-Test, Release-Check). Am einfachsten: das Repository klonen.

   ```bash
   git clone https://github.com/TTLPSCWA/PokerAbend.git /srv/spieleabend
   cd /srv/spieleabend
   ```

3. **`.env` anlegen und ausfüllen** (Werte siehe [Abschnitt 3](#3-alle-einstellungen-env)). Für den Produktivbetrieb unter `poker.scwagaming.com` mindestens `DOMAIN=poker.scwagaming.com`, `IMAGE` und `SITE_PASSWORD` setzen; empfohlen auch `ADMIN_PASSWORD` und `TICKET_ADMIN_PASSWORD`:

   ```bash
   cp .env.example .env
   chmod 600 .env          # nur der Besitzer darf lesen
   nano .env
   ```

   Die `.env` kommt **nie** zu GitHub und nie in einen Chat. Sie steht in `.gitignore`.

4. **Den Docker-Kontext `projekt` auswählen und den Produktivbetrieb starten.** Prüfen, dass `docker context show` anschließend `projekt` ausgibt:

   ```bash
   docker context use projekt
   docker context show
   docker compose -f ./docker-compose.yml -f ./docker-compose.prod.yml --env-file .env up -d
   ```

   Die `.env` muss `DOMAIN=poker.scwagaming.com` und die erforderlichen Image- und Passwortwerte enthalten. Ohne `SITE_PASSWORD` oder `DOMAIN` bricht Compose mit einer verständlichen Meldung ab. Das ist Absicht: Auf dem Server soll nie etwas ohne Gruppenpasswort laufen.

5. **Prüfen:**

   ```bash
   docker compose -f ./docker-compose.yml -f ./docker-compose.prod.yml --env-file .env ps
   curl -s https://poker.scwagaming.com/health
   ```

   Im Browser `https://poker.scwagaming.com` öffnen, mit dem Gruppenpasswort anmelden. Mit `ADMIN_PASSWORD` ist unter `https://poker.scwagaming.com/admin` die Admin-Seite erreichbar.

6. **Sicherung einrichten** (siehe [Abschnitt 7](#7-sichern-und-wiederherstellen)) und **einmal den Release-Check laufen lassen** ([Abschnitt 10](#10-release-check-vor-dem-aufspielen)).

7. **Optional Discord** einrichten: README, Abschnitt „Discord-Anmeldung einrichten“. Ohne die drei Werte `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`/`PUBLIC_URL` bleibt Discord komplett aus.

Lokal ausprobieren (ohne Traefik, Port 3000 offen, ohne Passwort): `docker compose up --build`, dann `http://localhost:3000`.

## 3. Alle Einstellungen (.env)

Die Datei `.env` liegt neben den Compose-Dateien. Compose liest sie ein und reicht die Werte an den Container durch (`docker-compose.yml`). **Leer oder weggelassen = Standardwert.** Echte Werte nie in Git oder Chats. Die Beispiele unten sind erfunden.

### Pflicht auf dem Server

| Variable | Beispiel | Bedeutung |
| --- | --- | --- |
| `DOMAIN` | `spiele.example.org` | Domain ohne `https://` und ohne Pfad. Daraus entsteht die Traefik-Regel `Host(...)`. Compose bricht ohne Wert ab. |
| `IMAGE` | `ghcr.io/ttlpscwa/pokerabend:3.0.0` | Welches Image läuft. Besser eine feste Version als `:latest`: Dann gibt es einen klaren Rückweg. |
| `SITE_PASSWORD` | `ein-langes-gruppenpasswort` | Gruppenpasswort für die ganze Seite. Ohne den Wert startet nichts. Wer es ändert, meldet alle ab (Cookies werden ungültig). |

### Empfohlen

| Variable | Beispiel | Standard | Bedeutung |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | `ein-anderes-langes-passwort` | leer = `/admin` aus (404) | Admin-Seite: Räume schließen, Update ankündigen, Moderation, Funktionen & Spiele umlegen. Nicht dasselbe Passwort wie `SITE_PASSWORD`. |
| `TICKET_ADMIN_PASSWORD` | `noch-ein-passwort` | leer = Verwaltung des Ticket-Boards aus | Status ändern und moderieren im Ticket-Board. |

### Anmeldung mit Discord (optional)

Alles oder nichts: `DISCORD_CLIENT_SECRET` und `PUBLIC_URL` müssen zusammen gesetzt sein, sonst ist Discord aus.

| Variable | Beispiel | Bedeutung |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | `1563578924007694346` | Anwendungs-ID der Discord-App (öffentlich). |
| `DISCORD_CLIENT_SECRET` | `(nur in der .env, nie weitergeben)` | Aus dem Discord Developer Portal (OAuth2 → Client Secret). |
| `PUBLIC_URL` | `https://spiele.example.org` | Öffentliche Adresse **ohne** Schrägstrich am Ende. Daraus entsteht die Redirect-URI `PUBLIC_URL/auth/discord/callback`, die im Portal eingetragen sein muss. |
| `DISCORD_GUILD_ID` | `900000000000000001` | Server-ID. Gesetzt: Mitglieder kommen per Discord ohne Gruppenpasswort hinein. Leer: Discord dient nur zum Verknüpfen des Kontos. |
| `DISCORD_ROLE_ID` | `900000000000000002` | Optional: nur Mitglieder mit dieser Rolle kommen per Discord hinein. |

### Funktionen und Spiele ein-/ausschalten (V2-10)

Siehe [Abschnitt 4](#4-funktionen-und-spiele-ein--und-ausschalten).

| Variable | Beispiel | Standard | Bedeutung |
| --- | --- | --- | --- |
| `FEATURE_DISCORD` | `off` | an | Discord-Anmeldung abschalten, obwohl sie eingerichtet ist. |
| `FEATURE_RANKED` | `off` | an | Ranked-Wertung abschalten (neue Runden zählen nicht für die Ranked-Bestenliste). |
| `FEATURE_CAMERA` | `on` | **aus** | Reserviert für die spätere Video-Funktion; heute ohne Wirkung. |
| `DISABLED_GAMES` | `blackjack,sudoku` | leer = alle an | Spiel-IDs, kommagetrennt. |

### Grenzen und Feinabstimmung (alle optional)

| Variable | Beispiel | Standard | Bedeutung |
| --- | --- | --- | --- |
| `SESSION_SECRET` | `(zufälliger langer Text)` | leer = der Server erzeugt `secret.key` im Datenordner | Schlüssel für Cookies. Nur setzen, wenn er fest vorgegeben sein soll. Ändern = alle melden sich neu an. |
| `MAX_ROOMS` | `50` | 50 | Gleichzeitig offene Tische. |
| `CREATE_LIMIT` | `6` | 6 | Neue Tische je Anschluss und 10 Minuten. |
| `API_LIMIT` | `900` | 900 | Anfragen an `/api` je Anschluss und Minute (danach HTTP 429). |
| `NEW_ACCOUNT_LIMIT` | `30` | 30 | Neue Gast-Konten je Anschluss und 10 Minuten. |
| `MAX_CONN_PER_IP` | `30` | 30 | Gleichzeitige Verbindungen je Anschluss. |
| `PLAYER_TIMEOUT_MIN` | `5` | 5 | So lange darf ein Spieler offline sein, bevor er den Platz verliert. |
| `UPDATE_ANNOUNCE_MIN` | `5` | 5 | Vorlauf bei einer Update-Ankündigung per Signal (`SIGUSR2`). |
| `UPDATE_DRAIN_MAX_MIN` | `15` | 15 | So lange dürfen laufende Runden nach Ablauf der Frist noch fertig werden. |

Die Anschluss-Grenzen zählen pro IP-Adresse. Hinter Traefik stimmt die Adresse nur, weil `docker-compose.prod.yml` `TRUST_PROXY=1` setzt (siehe [Abschnitt 9](#9-was-sebi-für-traefik-wissen-muss)).

### Fest eingestellt (nicht in die `.env`)

| Variable | Wert | Wo |
| --- | --- | --- |
| `PORT` | `3000` | Dockerfile. Muss zum Traefik-Label `loadbalancer.server.port` passen. |
| `DATA_DIR` | `/app/data` | Dockerfile. Das Volume hängt hier. |
| `TRUST_PROXY` | `1` | `docker-compose.prod.yml` (echte IPs und HTTPS hinter Traefik). |
| `NODE_ENV` | `production` | Dockerfile. |
| `APP_COMMIT` | Commit-Hash | Build-Argument `GIT_COMMIT`; steht unter „Ich“ und auf `/health`. |

### Nur für Tests und Skripte

`POKER_NO_DOTENV=1` (ignoriert die `.env`), `DISCORD_API_BASE`, `DISCORD_AUTHORIZE_URL`, `DISCORD_RECHECK_MIN`, `DISCORD_RATE_MAX` (nachgebautes Discord in den Tests), `PLAYWRIGHT_CHANNEL`, `TEST_ALL_NODE_GLOB` (Testläufe). Für `scripts/backup.sh`: `BACKUP_DIR`, `KEEP_DAYS`, `VOLUME`, `BACKUP_RSYNC_TARGET`, `BACKUP_RCLONE_TARGET`. Für `scripts/release-check.sh`: siehe dessen Kopf. Im Betrieb der App nicht nötig.

## 4. Funktionen und Spiele ein- und ausschalten

Drei Funktionen und jedes einzelne Spiel lassen sich abschalten, ohne etwas zu löschen. Zwei Wege, die zusammenarbeiten:

1. **`.env`** legt die Grundeinstellung fest (`FEATURE_*`, `DISABLED_GAMES`). Gilt nach einem Neustart des Containers (`up -d`).
2. **`/admin` → „Funktionen & Spiele“** schaltet **sofort** um und überlebt Neustarts (gespeichert in `features.json` im Datenordner). „Zurücksetzen“ nimmt die Admin-Einstellung wieder weg, dann gilt die `.env` bzw. der Standard.

Reihenfolge: **Admin-Einstellung → `.env` → Standard.** Die Seite zeigt je Eintrag die Quelle (Admin-Einstellung, .env oder Standard).

| Funktion | Standard | Aus bedeutet |
| --- | --- | --- |
| Discord-Anmeldung | an (wirkt nur, wenn Discord eingerichtet ist) | Kein Discord-Knopf, `/auth/discord/*` antwortet 404, Discord-Sitzungen geben keinen Zugang mehr (das Gruppenpasswort funktioniert weiter). Konten und Verknüpfungen bleiben gespeichert; beim Einschalten gelten dieselben Sitzungen wieder. |
| Ranked-Wertung | an | Neue Runden zählen nicht für die Ranked-Bestenliste (Anzeige „Nicht gewertet: Ranked-Wertung ausgeschaltet“). Die alte Namensstatistik, Erfolge und bisherige Ranked-Ergebnisse bleiben. |
| Kamera / Video | **aus** | Heute ohne Wirkung. Der Schalter ist reserviert, damit die spätere Video-Funktion von Anfang an abschaltbar ist. |
| Einzelnes Spiel | an | Das Spiel verschwindet aus den Listen, neue Tische dafür und das Wechseln dorthin werden abgelehnt („… ist gerade ausgeschaltet“); ein Abendprogramm mit diesem Spiel startet nicht. **Laufende Tische spielen weiter.** Lokale Einzelspieler (Sudoku, 2048, …) werden nur ausgeblendet. |

Die Spiel-IDs stehen in der Admin-Liste. Sie sind kleingeschrieben, z. B. `blackjack`, `maumau`, `wuerfelpoker`. Ungültige Werte in der `.env` werden beim Start im Log gemeldet (`docker compose ... logs poker`) und ignoriert; der Release-Check findet sie vorher.

## 5. Update vom alten Stand auf Version 3.0.0

Gemeint ist der Stand **vor den Konten** (Version 2.0.0 vom 1. November 2026 oder älter, ohne Game-IDs, Discord, Ranked, Profile). Die Daten werden **nur ergänzt, nie umgebaut**: Alte Einträge bleiben unverändert, es kommen Felder und Dateien hinzu. Eine ältere Version kann das neue Format weiterlesen.

### Was passiert mit welchen Daten?

| Datei im Datenordner | Was beim ersten Start passiert | Was ihr merkt |
| --- | --- | --- |
| `leaderboard.json` (alte Statistik) | Wird auf das neue Format gehoben (Rundenspeicher für Ranked). **Vorher** entsteht einmalig `leaderboard.json.pre-v2-03`; der alte Bestand bleibt unverändert. | Die alte Namensstatistik steht weiter unter „Statistik“. Ranked beginnt bei null. Jeder kann seine alten Einträge unter *Ich → Identität → Meine alten Statistiken übernehmen* seinem Konto zuordnen (wer zuerst kommt). |
| `rooms.json` (offene Tische) | Wird unverändert gelesen. Plätze werden beim ersten Beitritt an das Konto gebunden. Ist die Datei defekt, wird sie vorher als `rooms.json.unlesbar-<Zeit>` kopiert. | Tische sind nach dem Neustart wieder da; der Host drückt einmal auf „Spiel starten“. Alte Plätze und Tokens funktionieren weiter. |
| `tickets.json` | Format bleibt (Version 1). Besitzer-Kennungen aus der Zeit vor den Konten werden beim nächsten Besuch des Besitzers durch seine Konto-ID ersetzt. | Eigene Tickets bleiben „meine“; Autoren bekannter Spieler zeigen ihre Game-ID. |
| `evening-plans.json`, `evening-reviews.json` | Wie Tickets: Besitzer werden beim nächsten Besuch ans Konto gebunden. | Planungen und Rückblicke bleiben erhalten. |
| `monopoly-boards.json`, `admin-log.json`, `history-*.json` | Unverändert. | – |
| `secret.key` | Unverändert. **Nicht löschen:** Sonst gelten alle Cookies nicht mehr (alle melden sich neu an, Gäste bekommen ein neues Konto). | – |
| **neu:** `accounts.json` | Entsteht beim ersten Seitenaufruf: ein Gast-Konto je Browser mit Game-ID (`#K7Q2`). | Unter „Ich“ steht die Game-ID. |
| **neu:** `backups/pre-v2-01/` | Einmalige Kopie von `leaderboard.json`, `rooms.json`, `tickets.json`, `evening-plans.json`, `evening-reviews.json`, `monopoly-boards.json`, `admin-log.json` **vor** der ersten Umstellung. | Bleibt liegen, wird nie überschrieben. |
| **neu (nur mit Discord):** `discord-sessions.json` | Discord-Sitzungen, nur als Hash; Provider-Tokens verschlüsselt. | – |
| **neu (nur nach Umlegen im Admin):** `features.json` | Admin-Einstellungen für Funktionen und Spiele. | – |

Zusätzlich: Das Passwort-Cookie `pa_auth` bleibt gültig, solange `SITE_PASSWORD` und `secret.key` gleich bleiben. Alte Browser ohne neues Cookie bekommen ein neues Gast-Konto, nie das eines anderen.

### Schritt für Schritt

1. **Vorher: sichern und prüfen** (auf dem Server):

   ```bash
   scripts/backup.sh                        # frische Sicherung des ganzen Datenordners
   scripts/restore-test.sh                  # beweist, dass sich diese Sicherung wieder einspielen lässt
   ```

2. **Aktuellen Stand und IMAGE merken.** Für den Rückweg: welcher Tag läuft jetzt?

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml images
   grep '^IMAGE=' .env
   ```

3. **Neue Dateien holen:** `git pull` im Serverordner (oder `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example` und `scripts/` neu hochladen). **Wichtig:** `docker-compose.yml` reicht jetzt alle `.env`-Werte an den Container durch. Bei einer alten Compose-Datei kämen z. B. die Discord-Werte aus der `.env` nie im Container an.

4. **`.env` ergänzen:** neue Einträge aus `.env.example` übernehmen (am Ende steht der Block „Funktionen ein-/ausschalten“). Neue Pflichtwerte gibt es nicht. `IMAGE` auf die neue Version setzen, z. B. `ghcr.io/ttlpscwa/pokerabend:3.0.0` (erst eintragen, wenn die Version im Workflow gebaut ist).

5. **Release-Check vorher:**

   ```bash
   scripts/release-check.sh vorher
   ```

   Fehler beheben, bis er mit „keine Fehler“ endet. Warnungen lesen und bewusst entscheiden.

6. **Update ankündigen.** `/admin` → „Update ankündigen“ (z. B. 10 Minuten) oder `docker kill -s USR2 <container>`. Ab dann starten keine neuen Runden; laufende dürfen fertig werden. Nach der Frist speichert der Server alles und beendet sich selbst.

7. **Aufspielen:**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

8. **Release-Check nachher:**

   ```bash
   scripts/release-check.sh nachher        # wartet bis zu 45 s auf einen gesunden Start und prüft die Version
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 50 poker
   ```

   Im Log stehen beim ersten Start u. a. „Sicherung vor der Konto-Umstellung: … Datei(en) in backups/pre-v2-01“.

9. **Von Hand prüfen:** anmelden, „Ich“ öffnen (Game-ID, Version 3.0.0), einen Tisch anlegen, `/admin` öffnen und unter „Funktionen & Spiele“ nachsehen, dass alles auf „Standard“ steht.

10. **Freunden Bescheid geben.** Der Text steht in der [CHANGELOG.md](../CHANGELOG.md) (Abschnitt 3.0.0).

### Rückweg

* **Schnell, ohne Datenverlust:** `IMAGE` in der `.env` auf den gemerkten alten Tag setzen, `up -d`. Die alte Version liest das neue Datenformat weiter (unbekannte Felder werden ignoriert; `accounts.json` bleibt ungenutzt liegen). Kontoabhängige Dinge (Game-IDs, Ranked) sind dann nicht sichtbar, kommen aber zurück, sobald wieder 3.0.0 läuft.
* **Sicher, auf den Stand vor dem Update:** Container stoppen, Sicherung aus Schritt 1 zurückspielen ([Abschnitt 7](#7-sichern-und-wiederherstellen)), altes Image starten. Zwischenzeitlich gespielte Runden sind dann weg.
* **Nur eine Datei zurück:** Aus `backups/pre-v2-01/` (Stand vor den Konten) oder `leaderboard.json.pre-v2-03` (Stand der Bestenliste vor Ranked) die Datei in den Datenordner kopieren, bei gestopptem Container.

## 6. Jedes weitere Update

```bash
scripts/backup.sh && scripts/release-check.sh vorher          # sichern und prüfen
# /admin → Update ankündigen (oder docker kill -s USR2 <container>); warten, bis der Server sich beendet hat
git pull                                                       # neue Compose-Dateien/Skripte
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
scripts/release-check.sh nachher
```

Tische bleiben erhalten: Gespeichert wird beim Beenden, der Host startet nach dem Neustart die nächste Runde. Mitten in einer Runde wird nie abgebrochen, wenn die Frist reicht (`UPDATE_DRAIN_MAX_MIN`).

## 7. Sichern und Wiederherstellen

**Was gesichert wird:** das ganze Volume (`/app/data`): Tische, Verläufe, Bestenliste, Konten, Tickets, Planungen, Admin-Protokoll, `secret.key`, `features.json`.

**Einrichten** (einmal auf dem Server):

```bash
chmod +x scripts/backup.sh scripts/restore-test.sh scripts/release-check.sh
sudo mkdir -p /var/backups/spieleabend
scripts/backup.sh                                              # einmal von Hand testen
crontab -e                                                      # täglich um 4:30 Uhr:
30 4 * * * /srv/spieleabend/scripts/backup.sh >> /var/log/spieleabend-backup.log 2>&1
0 5 * * 0  /srv/spieleabend/scripts/restore-test.sh >> /var/log/spieleabend-restore-test.log 2>&1   # sonntags: beweist, dass sich die Sicherung einspielen lässt
```

`backup.sh` findet das Volume selbst (Compose nennt es z. B. `spieleabend_poker-data`), schreibt `spieleabend-JJJJ-MM-TT_HHMM.tar.gz` und löscht eigene Sicherungen nach 14 Tagen. Einstellbar: `BACKUP_DIR`, `KEEP_DAYS`, `VOLUME`. Optional zweites Ziel außer Haus: `BACKUP_RSYNC_TARGET=user@host:/pfad/` oder `BACKUP_RCLONE_TARGET=remote:spieleabend`.

**Zurückspielen:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop poker
docker run --rm -v spieleabend_poker-data:/data -v /var/backups/spieleabend:/backup alpine:3 \
  sh -c "rm -rf /data/* && tar xzf /backup/spieleabend-2026-11-08_0430.tar.gz -C /data"
docker compose -f docker-compose.yml -f docker-compose.prod.yml start poker
scripts/release-check.sh nachher
```

Den Volume-Namen vorher mit `docker volume ls | grep poker-data` nachsehen. Die `rm -rf /data/*` löscht den aktuellen Inhalt des Volumes: nur mit gestopptem Container und einer geprüften Sicherung ausführen.

**Wichtig:** `secret.key` gehört in die Sicherung. Wird nach einer Wiederherstellung ein anderer Schlüssel benutzt, gelten alle Cookies nicht mehr.

## 8. Fehlersuche

Zuerst immer: Zustand und Log ansehen.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail 100 poker
curl -s https://DEINE-DOMAIN/health
scripts/release-check.sh                                         # prüft .env, Sicherung und Healthcheck in einem Rutsch
```

| Symptom | Wahrscheinliche Ursache | Was tun |
| --- | --- | --- |
| `up -d` bricht ab: „Bitte SITE_PASSWORD in der .env setzen“ | `.env` fehlt oder liegt im falschen Ordner. | `.env` neben die Compose-Dateien legen, `ls -la .env`. |
| Container startet immer wieder neu | Log lesen. Häufig: Datenordner nicht schreibbar, Port belegt, kaputte Datei. | `logs --tail 100 poker`; Volume-Rechte prüfen (der Container läuft als Benutzer `node`). |
| Browser: „404 page not found“ (kleiner Text, kein Spiel) | Traefik kennt den Router nicht: Netz `proxy` fehlt, Container nicht im Netz, Label falsch. | `docker network ls`, `docker inspect <container>` auf das Netz `proxy`; [Abschnitt 9](#9-was-sebi-für-traefik-wissen-muss). |
| Zertifikatsfehler / Browser warnt | DNS zeigt noch nicht auf den Server, oder Let's Encrypt konnte nicht prüfen. | `dig +short DEINE-DOMAIN`, Traefik-Log ansehen. |
| Seite lädt, aber „Verbindung getrennt“ / Tisch lädt nicht | WebSocket-Upgrade kommt nicht durch (Proxy davor, Firewall). | Siehe Abschnitt 9; im Browser-Netzwerkreiter die `socket.io`-Anfrage ansehen. |
| Alle sehen „Zu viele Anfragen“ / „Zu viele neue Geräte“ (HTTP 429) | `TRUST_PROXY` fehlt: Alle Besucher teilen sich die Proxy-Adresse und damit die Grenzen. | Prod-Compose benutzen (`-f docker-compose.prod.yml`); Traefik muss `X-Forwarded-For` setzen. |
| Passwort richtig, Anmeldung klappt trotzdem nicht | Cookie wird nicht gespeichert (Browser blockiert) oder `SITE_PASSWORD` enthält ein Anführungszeichen/Leerzeichen am Ende. | `.env`-Wert ansehen; anderes Gerät testen. |
| Alle mussten sich neu anmelden | `SITE_PASSWORD`, `SESSION_SECRET` oder `secret.key` hat sich geändert. | Erwartetes Verhalten. Beim Zurückspielen darauf achten, dass `secret.key` mitkommt. |
| `/admin` zeigt 404 | `ADMIN_PASSWORD` ist leer. | In der `.env` setzen, `up -d`. |
| „Mit Discord anmelden“ fehlt | Discord nicht vollständig eingerichtet, `DISCORD_GUILD_ID` fehlt (Knopf nur dann), `FEATURE_DISCORD=off`, oder im Admin ausgeschaltet. | `scripts/release-check.sh vorher`; `/admin` → Funktionen. |
| Discord meldet „redirect_uri“ ungültig | `PUBLIC_URL` weicht von der im Portal eingetragenen Adresse ab. | Im Portal `PUBLIC_URL/auth/discord/callback` eintragen; `PUBLIC_URL` ohne Schrägstrich am Ende. |
| Ein Spiel fehlt in der Liste | Es ist ausgeschaltet. | `/admin` → Funktionen & Spiele, oder `DISABLED_GAMES` prüfen. |
| Runden zählen nicht für Ranked | Ranked aus, oder Gäste/Bots/zu wenige registrierte Menschen am Tisch. | Anzeige am Tisch („Nicht gewertet: …“), `/admin` → Funktionen. |
| Tische nach dem Neustart weg | `rooms.json` fehlt/ist defekt, oder das Volume wurde neu angelegt. | Im Datenordner nach `rooms.json.unlesbar-*` suchen; ggf. Sicherung zurückspielen. |
| Update-Banner hängt | Eine Runde läuft noch. | Läuft maximal `UPDATE_DRAIN_MAX_MIN` Minuten nach Fristende; sonst `/admin` → Raum schließen. |
| Container „unhealthy“ | `/health` antwortet nicht in 3 s. | `logs poker`; `docker exec <container> wget -qO- http://localhost:3000/health`. |
| Datenträger voll | Alte Sicherungen, Verläufe. | `df -h`, `BACKUP_DIR` aufräumen (`KEEP_DAYS`), `/admin` → Datendateien zeigt die Größen. |

## 9. Was Sebi für Traefik wissen muss

Kurz: Die App braucht nichts Besonderes, nur ein normales Docker-Routing. Alles Nötige steht in den Labels von `docker-compose.prod.yml`.

* **Netz:** Der Container hängt an dem externen Docker-Netz **`proxy`** (und an seinem eigenen Standardnetz). Traefik muss ebenfalls in `proxy` sein. `traefik.docker.network=proxy` ist gesetzt.
* **Entrypoint und Zertifikate:** Router `poker` auf Entrypoint **`websecure`**, TLS an, Resolver **`letsencrypt`**. Regel: `Host(`${DOMAIN}`)`.
* **Port:** Dienst-Port **3000** (`loadbalancer.server.port`). Die App veröffentlicht **keinen** Port auf dem Host (`ports: !reset []`, nur `expose`). Wer Port 3000 nach außen öffnet, umgeht HTTPS, Anmeldung auf IP-Basis und die Header-Prüfung: nicht tun.
* **Genau eine Instanz.** Keine Replikas, keine zwei Container hinter einem Router. Tische liegen im Arbeitsspeicher. „Sticky Sessions“ ändern daran nichts.
* **WebSocket (Socket.IO):** funktioniert mit Traefik ohne Zusatzkonfiguration. Der Upgrade läuft über denselben Router. Bitte keine Timeouts einstellen, die ruhige Verbindungen nach wenigen Sekunden kappen (der Browser verbindet sich selbst neu, aber es fällt unangenehm auf). Standardwerte von Traefik sind in Ordnung.
* **Weitergereichte Header:** `TRUST_PROXY=1` heißt: Die App vertraut `X-Forwarded-For` (echte Besucher-IP für die Grenzen) und `X-Forwarded-Proto` (erkennt HTTPS, setzt `Secure`-Cookies und den HSTS-Header). Traefik setzt beides standardmäßig. Steht noch ein Proxy/CDN **vor** Traefik, muss Traefik diesem vertrauen (`forwardedHeaders.trustedIPs` am Entrypoint), sonst sieht die App nur die Adresse des vorgelagerten Proxys und alle teilen sich die Grenzen.
* **Header nicht doppelt setzen:** Die App setzt selbst CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, Cross-Origin-Header und (nur über HTTPS) HSTS. Bitte in Traefik keine abweichenden Sicherheits-Header-Middleware davorhängen, sonst widersprechen sich die Werte.
* **Kompression:** Die Middleware `poker-gzip` (`compress=true`) hängt am Router. Die App komprimiert nicht selbst.
* **Healthcheck:** `/health` ist ohne Anmeldung erreichbar und liefert `{"ok":true,"version":"…","commit":"…","uptime":…}`. Das Image hat einen eigenen `HEALTHCHECK` (intern auf `localhost:3000`). Ein externer Wächter (Uptime Kuma o. Ä.) sollte `https://DOMAIN/health` auf das Stichwort `"ok":true` prüfen.
* **Admin und Tickets liegen unter derselben Domain** (`/admin`, `/api/tickets`). Wer die Admin-Seite zusätzlich schützen will (IP-Liste, Basic-Auth davor), kann das mit einer Traefik-Middleware nur auf dem Pfad `/admin` tun; die App bleibt davon unberührt, hat aber ihr eigenes Passwort.
* **Updates ohne Traefik-Eingriff:** Das Image ändert sich, Labels und Netz nicht. Ein Neustart des Containers genügt; Traefik erkennt ihn selbst.
* **Nach dem Umbau prüfen:**

  ```bash
  curl -sI https://DOMAIN/ | head -3                                            # 302 auf /login ist richtig (ohne Cookie)
  curl -s https://DOMAIN/health                                                 # ok
  curl -sI -H 'Accept-Encoding: gzip' https://DOMAIN/hub.js | grep -i content-encoding   # gzip
  curl -sI https://DOMAIN/ | grep -i strict-transport-security                  # kommt nur über HTTPS
  ```

## 10. Release-Check vor dem Aufspielen

`scripts/release-check.sh` **prüft nur und verändert nichts** (kein `pull`, kein `up`, keine Schreibzugriffe; Passwörter erscheinen nie in der Ausgabe).

```bash
scripts/release-check.sh vorher       # .env, Docker-Image-Version, Sicherung (und der aktuelle Healthcheck zur Info)
scripts/release-check.sh nachher      # Healthcheck muss ok sein und die erwartete Version melden
scripts/release-check.sh              # beides nacheinander
```

Was geprüft wird:

* **`.env`:** Datei vorhanden und nicht für alle lesbar, nicht in Git eingecheckt, `DOMAIN`/`IMAGE`/`SITE_PASSWORD` gesetzt, Passwörter nicht leer/kurz/Platzhalter, Discord ganz oder gar nicht, `PUBLIC_URL` mit https ohne Schrägstrich, Discord-IDs nur Ziffern, `FEATURE_*` = on/off, `DISABLED_GAMES` mit gültigen IDs, Zahlenwerte positiv, unbekannte Variablen (Tippfehler).
* **Docker-Image:** feste Version statt `:latest`, Image lokal vorhanden, Version im Image gleich der erwarteten (`package.json`), Compose-Dateien gültig, kein veröffentlichter Port in `docker-compose.prod.yml`. Zeigt den aktiven Docker-Kontext an.
* **Sicherung:** Ordner und neueste `spieleabend-*.tar.gz` vorhanden, nicht älter als `MAX_BACKUP_AGE_H` (26 Stunden), Archiv lesbar, Datendateien und `secret.key` enthalten.
* **Healthcheck:** `/health` von `HEALTH_URL` (Standard `https://$DOMAIN/health`) antwortet `"ok":true`, Version (und optional Commit) stimmt, Container meldet `healthy`.

Ende 0 = keine Fehler (Warnungen sind erlaubt), Ende 1 = mindestens ein Fehler: **nicht aufspielen**. Alle Einstellungen stehen im Kopf des Skripts (`ENV_FILE`, `BACKUP_DIR`, `HEALTH_URL`, `EXPECTED_VERSION`, `EXPECTED_COMMIT`, `HEALTH_WAIT_S`, `COMPOSE_FILES`, `RELEASE_CHECK_SKIP_DOCKER`, `RELEASE_CHECK_NO_RUN`).
