# V2-02 – Discord-Anmeldung und Sitzungssicherheit

Umgesetzt am 01.11.2026. Discord ist eine **optionale zweite Anmeldung**, die sich an das Konto aus [V2-01](V2-01_IDENTITAET.md) hängt. Das Gruppenpasswort (`SITE_PASSWORD`) bleibt der Zugang zur Seite; `/admin` und die Ticket-Verwaltung behalten ihre eigenen Passwörter. Discord ist nie Admin.

## Ein- und ausgeschaltet
Discord ist **komplett aus** (kein Knopf, `/auth/discord/*` antwortet 404), solange `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` und `PUBLIC_URL` nicht alle gesetzt sind. Mit `DISCORD_GUILD_ID` kommen Mitglieder dieses Servers (optional mit `DISCORD_ROLE_ID`) ohne Gruppenpasswort hinein; ohne sie dient Discord nur zum Verknüpfen.

## Ablauf
* **Anmelden** (`GET /auth/discord/login?next=…`, nur mit Server-ID): Authorization Code + PKCE (S256). Scope `identify guilds.members.read` (ohne Server-ID nur `identify`). Der Server tauscht den Code, liest `/users/@me` und `/users/@me/guilds/<id>/member`. Mitglied → eigene Sitzung (Cookie `pa_discord`), Rücksprung zu `next`. Nicht-Mitglied/Abbruch/ungültig → Login-Seite mit klarer Meldung, kein Zugang.
* **Konto:** Ist die Discord-ID schon verknüpft, wird dieses Konto wieder das Gast-Konto des Browsers (**Cookie-Verlust gelöst**). Sonst hängt sich Discord an das Konto des Browsers (`accounts.linkExternal`) oder an ein neues.
* **Verknüpfen / Trennen** unter „Ich → Identität & Geräte“. Gehört die Discord-ID zu einem anderen Konto, fragt die Seite „Dieses Gerät mit deinem bestehenden Konto zusammenführen?“; bei „Zusammenführen“ gilt dieselbe Logik wie bei „Gerät verbinden“ (Statistik, Tickets, Planungen, Plätze wandern mit).
* **Profil:** Der Discord-Name wird einmal als eigener Name übernommen (Schalter „Discord-Namen übernehmen“, Standard an); der Name bleibt danach frei änderbar.

## Sicherheit
| Anforderung | Umsetzung |
|---|---|
| State einmalig, kurzlebig, an den Browser gebunden | zufälliger `state`, nur als Hash im Speicher, 10 Minuten, wird bei jedem Rücksprung (auch fehlerhaft) verbraucht; zusätzlich Cookie `pa_oauth` (Path `/auth/discord`) |
| Feste Redirect-URI, Code-Austausch nur auf dem Server | `PUBLIC_URL + /auth/discord/callback`; kein Provider-Token erreicht den Browser |
| Eigene Sitzung | zufälliges Token im HttpOnly-Cookie (SameSite=Lax, `Secure` hinter HTTPS), gespeichert nur als SHA-256 in `discord-sessions.json` (0600); 30 Tage, 14 Tage Leerlauf; Rotation bei jedem Login |
| Widerruf | `/auth/discord/logout`, „Überall abmelden“, Trennen, `/logout` der Seite; Datei-Defekt → alle melden sich neu an (Datei wird gesichert) |
| Refresh-Token | nur auf dem Server, AES-256-GCM, Schlüssel per HKDF aus `SESSION_SECRET` |
| Mitgliedschaft | nach 24 h im Hintergrund neu geprüft; bestätigter Austritt oder zurückgezogene Freigabe beendet den Discord-Zugang. Bei Ausfall, Zeitüberschreitung oder 5xx bleibt der Zugang (neuer Versuch nach 5 Minuten). Das Passwort-Cookie bleibt unberührt |
| CSRF | alle POST-Routen verlangen eigene Herkunft und `x-requested-with`; der Start ist durch den gebundenen `state` geschützt |
| Rate-Limit | alle `/auth`-Routen: 60 Anfragen je IP und 10 Minuten (`DISCORD_RATE_MAX`) |
| Logs | keine IDs, Tokens oder Secrets in Logs und Fehlermeldungen (Tests prüfen das) |

Nur für Tests gibt es `DISCORD_API_BASE`, `DISCORD_AUTHORIZE_URL` (nachgebautes Discord) und `DISCORD_RECHECK_MIN`; im Betrieb nicht setzen.

## Bewusst nicht enthalten
* Der Discord-**Avatar** wird nicht übernommen: Avatare der Seite sind Emojis, und die CSP erlaubt keine fremden Bilder. Nur der Name wird übernommen.
* Discord-Rollen geben keine Admin-Rechte; Tisch-Nachricht, Aktivity, Kamera und Ranglisten-Verifizierung sind spätere Pakete.
* Kein Produktivdeployment, keine echten Discord-Aufrufe in den Tests.
