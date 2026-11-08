# Modifikatoren

Optionale Raumeinstellungen, **kein eigenes Spiel**. Unterstützt werden ausschließlich `schaetzmeister`, `schlagfertig`, `werhatdasgesagt`. Alle anderen Spiele werden unverändert weitergereicht.

Standard: `modifierRule: off`, `chaosMode: false`, `modifierScope: session`. Im vorhandenen Host-Menü zwischen Partien änderbar; Rechte und Werte werden auf dem Server geprüft. Die öffentlichen Zusatzregeln stehen schon in der Lobby und im Regeln-Tab.

- `double`: Finale Partiepunkte ×2. Frage-Aufschlüsselungen zeigen weiterhin Rohpunkte.
- `reverse`: Höchste Rohpunktzahl minus eigene Rohpunkte; die höchste umgerechnete Punktzahl gewinnt. Finale Gewinner und Gesamtpunkte werden gemeinsam angepasst.
- `pressure`: Schreiben/Abstimmen halbiert, auf ganze Sekunden aufgerundet, mindestens 5 Sekunden. Eine deaktivierte Stufenuhr bleibt deaktiviert; Auflösungszeiten bleiben erhalten.
- `random`: Einer der drei Modifikatoren, öffentlich vor dem Start gezogen.
- `once`: Nach genau einer abgeschlossenen Partie abschalten. Ein Abbruch verbraucht die Auswahl nicht.
- `session`: Bis ausgeschaltet; Zufallsregeln werden nach dem Ergebnis für die nächste Partie offen neu gezogen.

Persistierte Vorschau, keine privaten Informationen und keine Änderung der Antwort- oder Kartensichten. Bots benutzen die bestehenden regelkonformen Aktionen; ihre Strategie wird nicht als für diese optionalen Regeln optimiert ausgegeben.

Gesamtbericht und echte Nachweise: [Party-Extras](../party-brett/README.md).
