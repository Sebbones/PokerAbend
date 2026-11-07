# V2-04 – Spielerprofile, Erfolge und Game-ID

Umgesetzt nach ausdrücklicher Freigabe von V2-04. Baut auf V2-01 (Konto/Game-ID), V2-02 (Discord) und V2-03 (Rundenablage) auf.

## Schnittstelle (`server/profile.js`)

- `GET /api/profile/me` – eigenes Profil mit allen Feldern und den Freigabe-Schaltern (`privacy`). Auch Gäste sehen ihr eigenes Profil.
- `GET /api/profile/<GameID>` (mit oder ohne „#“) – öffentliche Sicht. Antwort `{ available:false }`, wenn es kein öffentliches Profil gibt (Gast ohne Discord, versteckt, unbekannt, ungültig – bewusst identisch, damit nicht erkennbar ist, ob es das Konto gibt). Antwort 200 statt 404, weil Browser 404 als Fehler melden.
- `POST /api/profile/privacy` – Freigaben ändern; nur eigene, nur bekannte Schalter mit Wahrheitswerten, Herkunfts- und Header-Prüfung wie bei der Identität.
- Rate-Limit: 60 Abfragen pro Minute und Adresse, 20 Änderungen pro Minute und Konto.

## Was ein Profil zeigt

Immer (bei öffentlichen Profilen): Avatar, Name, Game-ID. Nach Freigabe: Discord-Name (Standard **aus**), Partien/Siege/Siegquote und gewertete Partien, bis zu drei Lieblingsspiele, die letzten zehn Partien (Platz, gewertet ja/nein, Datum), freigeschaltete Erfolge mit Datum. Nie: Konto-ID, Discord-ID, Tokens, Cookies.

Freigaben (`accounts.json`, Feld `privacy`, ältere Konten ohne Feld bekommen die Standardwerte): `hidden`, `showDiscord`, `showStats`, `showFavorites`, `showRecent`, `showAchievements`. Das ist die Grundlage für V2-05; eine eigene Datenschutzseite gehört nicht zu V2-04.

Quellen sind echte Daten: Statistik und Lieblingsspiele aus der Bestenliste des Kontos (inklusive übernommener alter Namen und verbundener Geräte), „gewertet“ und die letzten Partien aus der Rundenablage von V2-03. Ein Namenswechsel ändert nichts am Fortschritt, weil alles am Konto hängt.

## Wer hat ein öffentliches Profil

Nur registrierte Konten (mit Discord verknüpft) ohne `hidden`. Gäste haben kein öffentliches globales Profil. Das eigene Profil sieht immer jeder selbst.

## Erfolge (Grundgerüst)

Das Startset aus `server/achievements.js` (17 Erfolge in den Gruppen Mitspielen, Gewinnen, Entdecken) wird nach jeder Partie ausgewertet; neu ist die dauerhafte Ablage des ersten Zeitpunkts je Erfolg am Konto (`accounts.json`, Feld `achievements`, bei Gerätezusammenführung bleibt der frühere Zeitpunkt). Der große Ausbau bleibt V2-13.

## Oberfläche

`public/profile.js` / `profile.css`: Dialog; jedes Element mit `data-profile="#ID"` öffnet ihn. Klickbar sind Namen in der Bestenliste (gewertete Ansicht, nur Konten), in „Gerade online“ und „Zuletzt online“, an den offenen Tischen (nur registrierte, nicht versteckte Personen) sowie „Mein Profil“ im Bereich „Ich“.

## Nicht Teil

Namenssuche, Freundeslisten, eigene Datenschutzseite (V2-05), erweiterter Erfolgskatalog (V2-13). Produktivdaten wurden nicht angefasst; kein Produktivdeployment.
