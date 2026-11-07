# V2-05 und V2-15 – Einstellungen, Datenschutz, Export und Löschen

Umgesetzt nach ausdrücklicher Freigabe von V2-05 und V2-15. Baut auf V2-01 (Konto, Geräte per Code), V2-02 (Discord) und V2-04 (Profil-Freigaben) auf.

## Eine Seite statt verstreuter Schalter

Hub-Seite `#einstellungen` (Menü und Tab-Leiste; Ansprung einzelner Abschnitte per `#einstellungen/anzeige|bedienung|hub|ton|datenschutz|daten`). Sie ist immer erreichbar und kann nicht ausgeblendet werden. Der Dialog „Ich“ verweist nur noch dorthin; die Schalter für den Online-Status und die Profil-Freigaben sind von dort und aus dem Profildialog hierher gewandert. Am Tisch bleiben die schnellen Anzeige-Schalter erhalten und werden mit der Seite abgeglichen.

- **Anzeige:** Tisch (Theme), Kartengröße, Sprache, Animationen reduzieren, Transparenz reduzieren.
- **Bedienung:** Doppeltipp zum Ausspielen (aus = ein Tippen spielt), Bestätigungen bei Alltagsaktionen (gefährliche Aktionen fragen immer).
- **Startseite und Filter:** Spielkategorien einzeln anzeigen/ausblenden (Karten, Würfel, Brett, Party, Einzelspieler), Standardfilter der Bibliothek (alle, Favoriten, Spieleranzahl), Bereiche einzeln ausblenden (Gerade online, Zuletzt gespielt, Favoriten-Block, Erfolge, Bestenliste, Rückblicke, Abend planen, Roadmap, Tickets).
- **Ton:** Töne an/aus.
- **Datenschutz:** Online-Status, Statistik, Lieblingsspiele, letzte Partien, Erfolge, Discord-Name, Profil ganz verbergen.
- **Meine Daten:** Export und Löschen. „Zurücksetzen“ je Bereich und „Alles zurücksetzen“ (Sprache, Datenschutz und Daten bleiben unberührt).

Änderungen wirken sofort (das ist zugleich die Vorschau).

## Ausblenden ist nur Anzeige

Ausgeblendete Kategorien und Bereiche verschwinden aus Navigation und Listen. Adressen (`#spiele/brett`, `#roadmap`) und Einladungslinks zu Tischen funktionieren weiter; Rechte, Regeln und Server-Abläufe lesen diese Werte nie. Die öffentliche Privatsphäre (`account.privacy`, V2-04) ist davon getrennt: Erfolge im Hub verbergen ändert nicht, ob andere sie im Profil sehen.

## Speicherung und Geräte

- Schema und Grenzen: `server/settings.js` (nur bekannte Bereiche/Felder, Listen nur aus erlaubten Werten ohne Doppelte, Standardwerte unveränderlich). Die Schnittstelle lehnt Unbekanntes und Ungültiges mit 400 ab statt es still zu ignorieren.
- `GET/PUT /api/me/settings`, `POST /api/me/settings/reset`: am Konto (`accounts.json`, Feld `settings`), also auf allen per Code verbundenen Geräten; bei der Gerätezusammenführung behält das Ziel seine Werte oder übernimmt die des zweiten Geräts, wenn es keine hat.
- Gäste ohne erreichbares Konto behalten alles im Browser (`poker:settings`); die lokale Kopie ist immer der Rückfall. Ältere Browser-Einstellungen werden beim ersten Mal übernommen. Lokale, noch nicht übertragene Änderungen werden nie von einer älteren Serverantwort überschrieben (auch nicht nach sofortigem Neuladen).
- Schreibzugriffe nur mit Herkunfts- und `X-Requested-With`-Prüfung, Rate-Limits je Konto.
- Neu: Freigabe `showOnline` (Standard an). Der Server erzwingt sie bei der Präsenz („Gerade online“), auch wenn der Browser „sichtbar“ meldet.

## Export und Löschen (`/api/me/export`, `/api/me/delete`)

- **Export** (JSON, Datei-Download): Konto (Game-ID, Name, Avatar, Anlagedatum, Discord-Name falls verknüpft), Einstellungen, Freigaben, Statistik je Spiel, gewertete Partien, Erfolge mit Datum, alle eigenen Runden (Platz, Punkte, Anzahl der Mitspieler) und übernommene alte Namen. Mitspieler erscheinen nur als Anzahl, nie mit Name oder Konto; die interne Konto-ID steht nicht darin.
- **Löschen** nur mit eingetippter eigener Game-ID. Entfernt das Konto samt per Code verbundener Geräte, Einstellungen, Freigaben, Erfolge, Discord-Verknüpfung und Discord-Sitzungen, die alte Namensstatistik und Protokolleinträge mit der Game-ID. In den Runden anderer wird das Konto zu „Gelöschtes Konto“ (Ausgang, Platz und Punkte bleiben, damit deren Ergebnisse unverändert sind). Tickets, Planungen und Monopoly-Bretter verlieren nur die Zuordnung zum Konto. Das Gast-Cookie wird gelöscht; der nächste Besuch beginnt leer.
- Nicht erfasst: freie Texte, die jemand selbst in Tickets, Planungen oder Abend-Rückblicken geschrieben hat (Rückblicke enthalten nur Namen, keine Konto-IDs, und lassen sich nicht zuordnen). Offene Tische, an denen man gerade sitzt, verlieren die Kontozuordnung sofort.

## Nicht Teil

Benachrichtigungen, Video-Einstellungen, Anzeige-Vorschau mit Zwischenspeichern, Löschen von Freitexten in Tickets/Rückblicken. Produktivdaten wurden nicht angefasst; kein Produktivdeployment.
