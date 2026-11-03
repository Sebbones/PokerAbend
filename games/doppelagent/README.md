# Doppelagent · BACKLOG-05

Eigenständiger Gesprächssalon mit vertraulicher Ortsakte, Fragenprotokoll und 30 eigenen zweisprachigen Orten mit je acht Rollen. Bei neun Ermittlern kommt eine Tätigkeit doppelt vor. Der Agent und Zuschauer erhalten **keinen markierten Ort und keine fremden Rollen**, auch nicht in Logs, Alttexten oder Bot-Ansichten. Die komplette öffentliche Ortsauswahl allein verrät nicht den gezogenen Ort.

Frage → Antwort → Frage, kein sofortiges Zurückfragen. Optionale Textfelder ergänzen Voice. Einmalige Anklage jedes Spielers, Einstimmigkeit aller außer dem Beschuldigten. Ein Nein oder fehlende Stimmen nach dem Abstimmungsfenster setzt exakt die unterbrochene Befragung und verbleibende Rundenuhr fort. Host-Pause nutzt die vorhandene Raum-Uhr. Einstellungen und Ortsausschlüsse bleiben im Snapshot; eine laufende geheime Runde wird wie bei den anderen Rundenspielen nach Neustart verworfen.

Wertung nach [offiziellem Regelheft, Seite 8](https://cdn.shopify.com/s/files/1/0464/6961/1676/files/Spyfall1_Rules_compressed.pdf?v=1721920618): Agent zwei bei Zeitablauf, vier bei richtigem Raten oder falscher einstimmiger Anklage. Ermittler je einen, erfolgreicher Ankläger zusätzlich einen. **Beauftragte Online-Regelabweichungen:** keine abschließende Abstimmung nach Zeitablauf; der Agent darf auch während einer Anklage raten. Mehrere Runden zählen zur gemeinsamen Partie, die erst am Ende ein Plattform-Ergebnis meldet.

Bots spielen kurze vorbereitete Texte aus ihrer eigenen Ortskarte, wählen aus öffentlichen Zielen und werten ausschließlich das sichtbare Protokoll für Verdachtsmomente aus. Agenten raten aus der öffentlichen Liste; kein Lesen des tatsächlichen Orts oder der Rollenkarte anderer. Nur eine Stufe verfügbar. Mix, Turnier und Playlist unterstützt; Team-Duell ausgeschlossen, weil geheime gegensätzliche Rollen entstehen.

`rules.test.js`: Orts-/Rollenverteilung, JSON-Geheimhaltung, gültige Fragefolge, Anklage/Einstimmigkeit, Raten, alle Punkte, Pause/Fristen, Snapshot und 60 vollständige Drei-Runden-Botpartien mit 3–10 Spielern. `ui.spec.js`: Desktop/Handy mit Bots, privater Karte, Protokoll, Anklage, Zuschauer, Reconnect und englischen Regeln.
