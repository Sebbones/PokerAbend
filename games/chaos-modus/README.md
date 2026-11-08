# Chaos-Modus

Keine separate Spielregistrierung. Abschaltbare Raumoption der drei in `games/modifikatoren/README.md` dokumentierten Partyspiele. Der Server zieht eine öffentlich sichtbare Regel **vor** dem Start: doppelte Punkte, umgekehrte Wertung, Zeitdruck oder eine der beiden Wertungen mit Zeitdruck. Die letzte Auswahl wird beim nächsten Ziehen nicht wiederholt. Standardmäßig aus.

Wiederverbindung, abgebrochene Partie und Serverneustart behalten die angekündigte Auswahl. Zufallsziehung verwendet `node:crypto` und niemals Antworten, fremde Hände oder Rollen. Eigene Szene unter `public/games/chaos-modus/scene.svg`.

Bericht: [Party-Extras](../party-brett/README.md).
