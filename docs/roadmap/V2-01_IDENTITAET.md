# V2-01 – Plattformidentität (Gäste, Game-ID, Geräte, Bots)

Umgesetzt am 01.11.2026 auf `main`. Grundlage: [V2-00_BESTANDSAUFNAHME.md](V2-00_BESTANDSAUFNAHME.md). Discord (V2-02) ist **nicht** gebaut, die Schnittstelle ist vorbereitet.

## Was sich für Spieler ändert

Fast nichts. Unter „Ich“ gibt es den neuen Bereich **Identität & Geräte** mit

* der **Game-ID** (z. B. `#K7Q2`, 4–6 Zeichen ohne verwechselbare Zeichen),
* **Gerät verbinden** (Code erzeugen / Code eingeben),
* **Meine alten Statistiken übernehmen**.

Der Anzeigename bleibt frei änderbar und ist nicht mehr die Identität.

## Modell

| Begriff | Eigenschaft |
|---|---|
| **AccountId** (intern) | 32 Hex-Zeichen, vom Server gewürfelt, nie in `view()`, Lobby, Presence, Admin- oder API-Antworten an Dritte |
| **Game-ID** (öffentlich) | `#` + 4–6 Zeichen aus `ABCDEFGHJKMNPQRSTUVWXYZ23456789`; vor der Vergabe auf Kollision geprüft; ändert sich nie |
| **Gast** | Jeder Browser; Cookie `pa_guest` = `<AccountId>.<Ablauf>.<HMAC-SHA-256>` (HttpOnly, SameSite=Lax, `Secure` hinter HTTPS, 180 Tage, bei jedem Seitenaufruf erneuert) |
| **Bot** | `bot: true`, ID `bot_<10 Hex>`, nie eine AccountId, nie im Gast-Cookie, nie in Statistik, Presence oder `playerAccounts` |
| **Name** | nur Anzeige; zuletzt benutzter Name steht im Konto und in der Bestenliste |

Der Client kann keine Identität behaupten: Es zählt ausschließlich ein vom Server signiertes Cookie. Fehlt oder fälscht jemand es, bekommt er ein **neues** Konto (nie ein fremdes).
Clients ohne Cookie (Skripte, alte Tests) spielen wie bisher: Statistik unter dem Namen, Reconnect per Token.

Das Cookie entsteht beim **Seitenaufruf** (`/`) und bei `/api/identity`, nicht bei Skripten oder Bildern, die parallel geladen werden – sonst entstünden Waisen-Konten.

### Dateien

| Datei | Inhalt |
|---|---|
| `server/account-store.js` | `accounts.json` (`schemaVersion: 1`): Konten, `mergedInto` (zweites Gerät), Audit, `externals` (Discord-Vorbereitung). Unlesbar/zu neu → Kopie `accounts.json.unlesbar-<Zeit>` |
| `server/identity.js` | Cookie signieren/prüfen; Geräte-Codes (nur gehasht im Speicher) |
| `server/identity-api.js` | `/api/identity`: `GET /`, `POST /link/create`, `POST /link/redeem`, `GET /legacy`, `POST /claim` |
| `server/leaderboard.js` | `schemaVersion: 2`: Einträge je Konto; alte Namenseinträge bleiben unverändert |
| `server/data-migration.js` | Sicherung `backups/pre-v2-01/` |
| `server/rebind.js` | Besucher-ID → Konto-ID in Tickets/Planungen |
| `public/identity.js`, `identity.css` | Oberfläche unter „Ich“ |

## Abläufe

**Statistik.** Ergebnisse tragen die AccountId des Spielers im Raum (aus der Verbindung gebunden). Gleiche Namen = zwei Konten = zwei Zeilen. Umbenennen ändert den Anzeigenamen, die Zeile wandert mit. Erfolge laufen über dieselbe Statistik (`/api/achievements?me=1`).

**Raumbindung.** `create`/`join` binden den Spieler an das Konto der Verbindung (`player.accountId`, gespeichert als `playerAccounts` in `rooms.json`). `join` erkennt jemanden
(1) über das Token – gilt nicht, wenn der Platz zu einem **anderen** Konto gehört, dann wird ein neuer Platz angelegt (Namensvorschlag wie bisher), oder
(2) ohne Token über die Konto-ID (zweites Gerät, gelöschter Speicher). Ein Platz aus der Zeit vor den Konten wird beim ersten Beitritt gebunden. Alte Tokens funktionieren weiter.

**Gerät verbinden.** Gerät A erzeugt einen Code (6 Zeichen, 10 Minuten, einmalig, ein aktiver Code je Konto, nur im Speicher). Gerät B gibt ihn ein; der Server verweist das Konto von B auf A (`mergedInto`), schreibt das Cookie von B neu,
führt Bestenlisten-Einträge, Tickets, Planungen, Monopoly-Bretter und Raumplätze zusammen. Falsche Codes: 8 je IP und 60 insgesamt pro 10 Minuten, danach HTTP 429 (auch ein richtiger Code wird in der Sperre nicht angenommen).

**Alte Statistiken übernehmen.** Alt-Einträge (nur Name) bleiben unverändert liegen. „Übernehmen“ setzt nur `claimedBy` – wer zuerst kommt, bekommt sie (HTTP 409 für den Zweiten), höchstens 10 je Konto, 20 Versuche je IP/10 min.
Auf `/admin` listet „Übernommene alte Statistiken“ jede Zuordnung mit Game-ID; „Rückgängig“ entfernt sie (Admin-Anmeldung, Bestätigung, Admin-Protokoll). Es gehen keine Partien verloren.

## Sicherung, Migration, Rückfall

* Beim ersten Start mit V2-01 kopiert der Server vorhandene Dateien (`leaderboard.json`, `rooms.json`, `tickets.json`, `evening-plans.json`, `evening-reviews.json`, `monopoly-boards.json`, `admin-log.json`) **einmalig** nach `backups/pre-v2-01/` (über Zwischenordner + `rename`, nie halbfertig; existiert er, passiert nichts).
* Die Migration ist additiv: Alt-Einträge bleiben, nur Felder kommen hinzu (`schemaVersion`, `accountId`, `claimedBy`). Besucher-IDs in Tickets/Planungen werden beim nächsten Besuch des Besitzers durch seine Konto-ID ersetzt, das alte Besucher-Cookie wird gelöscht.
* **Rückfall:** Server beenden → altes Image → bei Bedarf Dateien aus `backups/pre-v2-01/` nach `DATA_DIR` zurückkopieren → starten. Die alte Version liest das neue Format (unbekannte Felder werden ignoriert, `accounts.json` bleibt unbenutzt liegen). Test: „Migration: Sicherung … Rückfall“.
* Produktivdaten wurden für diese Arbeit weder gelesen noch geändert; ein Produktivdeployment ist nicht Teil des Auftrags.

## Discord (V2-02) – vorbereitete Schnittstelle

`accounts.linkExternal(accountId, 'discord', discordUserId)` hängt eine externe Identität an genau ein Konto (Eindeutigkeit geprüft), `findExternal` löst sie auf, `discord: null` steht im Konto. V2-02 braucht nur OAuth und diese zwei Aufrufe; ein Discord-Login würde das bestehende Gast-Konto übernehmen, nicht ersetzen.

## Bewusst nicht Teil dieser Lieferung (ehrlich)

* **Abendwertung/Abend-Rückblicke:** Der laufende Abend nutzt die Raum-Spieler-ID, die jetzt serverseitig an das Konto gebunden ist. Archivierte Rückblicke zeigen weiter nur Namen (keine interne ID in öffentlichen Antworten).
* **Playlists:** liegen weiterhin pro Browser (`localStorage`); es gibt keinen serverseitigen Speicher dafür.
* **Sessions gehasht / SQLite:** Es gibt keine serverseitigen Sitzungen (das Cookie ist selbst-signiert); Geräte-Codes liegen nur gehasht im Speicher. Eine Datenbank wurde nicht eingeführt (JSON mit `schemaVersion`), daher entfällt die Treiber-Prüfung.
* **Registrierte Konten, Profile, Datenschutz-Schalter:** V2-02/V2-05.
* **Restrisiko:** Wer Cookie *und* Token eines Browsers besitzt, ist diese Person. Cookie-Verlust ohne verbundenes Zweitgerät bedeutet ein neues Konto (alte Statistik dann über „übernehmen“ nur, soweit sie noch als Name vorliegt).

## Nachweise

* `node --test test/identity.test.js`: 22 Prüfungen (Cookie-Fälschung/Ablauf, Game-ID-Eindeutigkeit bei 3 000 Konten, Neustart, Geräte-Code und Rate-Limit, gleiche Namen, Umbenennen, Übernahme/Rückgängig, Zusammenführen, Sicherung/Rückfall, Bots, Reconnect über ID, fremdes Token, Bindung nach Neustart, Cookie-lose Clients).
* `npx playwright test test/ui/identity.spec.js` (Desktop + Handy): Game-ID sichtbar und stabil, zweites Gerät verbinden, alte Statistik übernehmen.
* Gesamtläufe stehen in `docs/roadmap/plan.json` (`test_results`).
