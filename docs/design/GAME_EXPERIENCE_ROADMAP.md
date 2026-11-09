# Spieleabend – Erlebnis-Roadmap (Stufe 2 nach den VIS-Paketen)

Stand: 09.11.2026. Status: **nur Planung**, nichts davon ist umgesetzt. Ein Paket wird erst nach ausdrücklicher Freigabe seiner ID gebaut (siehe CLAUDE.md/AGENTS.md).

## Worum es geht

Mit den 107 VIS-Paketen hat jedes Spiel eine eigene **Optik** bekommen: Spielfeld, Farben, Lobby, Handy-Layout. Scotland Yard (VIS-001) zeigt, wie weit das gehen kann. Was noch fehlt, damit sich jedes Spiel wie ein **eigenes Spiel** anfühlt:

| Ebene | Heute | Ziel |
|---|---|---|
| **Sound** | Alle Spiele teilen 14 synthetische Töne (`SFX` in `public/core.js`) | Jedes Spiel hat eine eigene Klangpalette, dazu optionale leise Atmosphäre |
| **Animation** | Kaum Bewegung, Zustände springen | Karten fliegen, Würfel rollen, Figuren laufen ihren Weg, Siege werden gefeiert |
| **Figuren & Material** | Gute 2D-Symbole, oft generisch | Eigene Figurensätze, Kartenrücken, Würfel, Spielsteine pro Welt |
| **Highlight** | – | Ein Moment pro Spiel, über den man am Tisch redet („der Reaktor glüht rot“) |

Die IDs folgen den VIS-Nummern: **EXP-001 gehört zu VIS-001 (Scotland Yard)** usw. Die vier Party-Modi ohne VIS-Paket bekommen EXP-108 bis EXP-111. Das gemeinsame Fundament heißt EXP-F1 bis EXP-F6.

## Leitplanken (gelten für jedes Paket)

1. **Nur eigenes Material.** Keine Originalgrafiken, Logos, Kartentexte, Figuren, Straßennamen oder Sounds bekannter Marken (UNO, Monopoly, Scrabble usw.). Mechanik ja, Aussehen und Klang eigen.
2. **Sound per Web Audio erzeugt** (wie heute) oder als eigene bzw. CC0-Aufnahme mit Lizenznachweis in `docs/design/SOUND_LICENSES.md`. Keine Musik von Dritten.
3. **Spiellogik bleibt unverändert.** Animationen zeigen nur, was der Server entschieden hat. Ergebnisse stehen nie erst nach einer Animation fest, verdeckte Infos werden nie durch eine Animation verraten.
4. **Performance:** Animationen nur über `transform` und `opacity`. Kein `backdrop-filter`, kein Live-`filter: blur` auf großen Flächen (siehe Commit a2e4514). Ziel: 60 FPS auf dem Handy und mindestens 45 FPS am PC bei 4× gedrosselter CPU.
5. **Barrierefreiheit:** Die Einstellung „Animationen reduzieren“ kürzt alle Animationen auf ≤ 150 ms oder schaltet sie ab. Töne sind immer zusätzlich zu Text und Symbol da, nie die einzige Information. Kein Flackern über 3 Hz.
6. **Lautstärke:** Atmosphäre (Ambient) ist standardmäßig **aus**. Effekte sind kurz (≤ 600 ms), außer bei Sieg oder Highlight.
7. **Abbruchsicher:** Neu laden, Pause, Wiederverbinden und Zuschauen zeigen sofort den Endzustand ohne Animationsrückstau.

---

## Teil A – Gemeinsames Fundament

Kommt **vor** den Spielpaketen. Ohne das Fundament baut sonst jedes Spiel eigene Sound- und Animationslösungen.

### EXP-F1 · Klang-Engine
- **Status:** done
- **Implementierungscommit:** `7a5bc52a4ed203d29cde9d84cbd5b49e2d19d2b0`
- **Nachweise:** `test/sound.test.js`, `test/ui/sound.spec.js`, `docs/design/experience/EXP-F1/README.md`
- `public/sound/engine.js`: Paletten statt Einzeltöne. Ein Spiel meldet `Sound.use('casino')` und ruft dann Ereignisse auf (`Sound.play('chip')`, `Sound.play('win')`).
- **Bausteine:** Rauschimpulse mit Filter (Karten, Würfel, Holz), FM-Glocken (Metall, Messing), Plopp und Tock (Steine), weiche Akkorde (Sieg), Tieftöner (Spannung). Alles parametrisiert, damit jede Palette eigen klingt.
- **Mixer** in den Einstellungen: Gesamt, Effekte, Atmosphäre, Sprachausgabe (für spätere Ansagen). Stumm pro Spiel möglich.
- Gleichzeitige Töne begrenzen (max. 6), damit Echtzeitspiele nicht übersteuern.
- Tests: Paletten sind vollständig, jede Palette kennt die Pflichtereignisse `select`, `confirm`, `deny`, `turn`, `win`, `lose`.

### EXP-F2 · Animations-Baukasten
- **Status:** done
- **Implementierungscommit:** `f1fbbc1156988ec53b8a66cba5f53c6d03faed92`
- **Nachweise:** `test/ui/motion.spec.js`, `docs/design/experience/EXP-F2/README.md`
- `public/motion/motion.js` mit fertigen Bewegungen:
  - `flyTo(el, ziel)`: Karte oder Stein von A nach B, auch zwischen Spielerplätzen
  - `flip(el)`: Karte aufdecken
  - `deal(n)`: Austeilen im Fächer
  - `roll(dice)`: 2D-Würfelrollen mit Endwert vom Server
  - `walk(piece, pfad)`: Figur läuft Feld für Feld
  - `stack(chips)`: Chips stapeln
  - `shake(el)`: Fehler
  - `pulse(el)`: Du bist dran
  - `celebrate(stufe)`: Sieg, abgestuft von klein bis groß
- Warteschlange pro Tisch: Kommt ein neuer Serverzustand während einer Animation, springt alles sauber auf den neuen Stand.
- Respektiert „Animationen reduzieren“ und Pause.

### EXP-F3 · Material-Bibliothek
- **Status:** done
- **Implementierungscommit:** `2d9e57a09c839aa4ac86431083f5a3f4d1a81e6b`
- **Nachweise:** `test/material.test.js`, `test/ui/material.spec.js`, `docs/design/experience/EXP-F3/README.md`
- `public/material/`: SVG-Sätze, die mehrere Welten teilen und einfärben können:
  - Kartenrücken (12 eigene Muster)
  - Würfelsätze (Holz, Glas, Metall, Kneipe, Marmor; jeweils alle sechs Augenzahlen)
  - Spielsteine (Holz, Stein, Glas, Messing)
  - Pöppel-Figuren
  - Chips (6 Werte, Kantenmuster)
  - Spielgeld-Scheine (eigene Währung „Taler“)
  - Plaketten, Stirnzettel, Umschläge, Stempel
- **Avatar-Figuren:** Die Eulen bekommen pro Welt kleine Accessoires (Detektivhut, Kochmütze, Krone usw.). So sieht man überall, wer wer ist.

### EXP-F4 · Siegerbühne
- **Status:** done
- **Implementierungscommit:** `158a4b79922b5d463ae82c92097c5f787a998d0f`
- **Nachweise:** `test/celebrate.test.js`, `test/ui/celebrate.spec.js`, `docs/design/experience/EXP-F4/README.md`
- Gemeinsames Spielende mit drei Stufen:
  - **Runde gewonnen:** kurz, Punktezähler läuft hoch
  - **Partie gewonnen:** Podest, Konfetti in den Farben der Welt
  - **Abend gewonnen:** Pokal, Zusammenfassung, Bestwerte
- Jede Welt kann Konfetti, Farben und Siegklang austauschen (z. B. Chips-Regen im Casino, Laub im Wald).

### EXP-F5 · Atmosphäre und Lobby-Leben
- Optionale, leise Ambient-Schleifen pro Welt, standardmäßig aus und erzeugt statt aufgenommen:
  - Kaminknistern, Kneipengemurmel als gefiltertes Rauschen
  - Meeresrauschen
  - Großstadtregen
- Lobby: Wer neu dazukommt, „setzt sich“ sichtbar an den Tisch, mit kurzer Animation und Stuhlrücken-Geräusch.

### EXP-F6 · Prüfwerkzeuge
- Playwright-Hilfe `expectSmoothMotion(page)`: misst FPS während einer Animation und schlägt unter dem Budget fehl.
- Klang-Test: Im Testmodus loggt die Engine die abgespielten Ereignisse, statt sie hörbar abzuspielen. So ist prüfbar, dass ein Zug den richtigen Ton auslöst.
- Visueller Abgleich bleibt wie bei VIS (6 Größen, Desktop und Handy).

**Reihenfolge:** F1 → F2 → F3 → F4, danach F5 und F6 parallel zu den ersten Spielpaketen.

---

## Teil B – Konzepte pro Spiel

Aufbau jedes Eintrags: **Welt** (Spielfeld und Szene), **Figuren & Material**, **Sound**, **Animation**, **Highlight**.
Die Priorität richtet sich danach, wie oft ein Spiel am Abend gespielt wird:
- **P1:** zuerst, die Lieblinge
- **P2:** danach
- **P3:** später

### Kartenspiele

#### EXP-002 · Texas Hold'em (`poker`) · P1
- **Welt:** Privater Salon hinter einer Bibliothekstür. Ovaler Tisch mit tannengrünem Filz und gebogener Holzkante. Darüber eine tief hängende Messinglampe, deren Lichtkegel den Pot betont.
- **Figuren & Material:** Eigene Chips in sechs Werten mit Kantenmuster, damit sie auch ohne Farbe unterscheidbar sind. Dealer-Button aus Messing, eigener Kartenrücken „Salon“ (Tannengrün mit Bibliotheksornament).
- **Sound:** Chips klackern beim Setzen, Stapelrauschen beim Pot-Einsammeln, weiches Filz-Wischen bei Karten, gedämpftes Klopfen beim Check, tiefer Ton beim All-in.
- **Animation:** Karten werden vom Dealerplatz ausgeteilt, Flop/Turn/River drehen sich einzeln um. Chips gleiten in die Mitte, der Pot fliegt zum Gewinner. Bei Side Pots teilen sich die Stapel sichtbar auf.
- **Highlight:** All-in-Showdown: Das Licht wird kurz dunkler, die restlichen Karten werden langsam aufgedeckt, die Gewinnhand leuchtet in Messing.

#### EXP-024 · Omaha (`omaha`) · P2
- **Welt:** Gleicher Salon wie Poker, aber Bordeaux-Filz und ein kleines Omaha-Schild an der Lampe.
- **Figuren & Material:** Vier Hole Cards im Fächer, bei den zwei gewerteten Karten markiert eine Messingklammer die beste Kombination.
- **Sound:** Poker-Palette, dazu ein heller „Klick“, wenn die beste Kombination berechnet wird.
- **Animation:** Am Showdown schieben sich die zwei genutzten Hole Cards und die drei Board-Karten zusammen zur Hand.
- **Highlight:** „Pot-Limit“-Anzeige als Messingwaage, die sich beim Pot-Bet neigt.

#### EXP-050 · Omaha Hi/Lo (`omaha-hi-lo`) · P3
- **Welt:** Omaha-Salon mit einem Tisch, der in eine Sonnen- und eine Mondhälfte geteilt ist.
- **Figuren & Material:** Zwei Pot-Schalen (Sonne für High, Mond für Low), dazu eine Qualifikationsmarke „8 oder weniger“.
- **Sound:** Zwei Siegklänge, hell für High und tief-weich für Low.
- **Animation:** Der Pot teilt sich physisch in zwei Stapel, die zu den jeweiligen Gewinnern fliegen.
- **Highlight:** Scoop: Ein Spieler gewinnt beide Hälften, beide Schalen fliegen zu ihm, Doppelklang.

#### EXP-051 · Seven Card Stud (`seven-card-stud`) · P3
- **Welt:** Alter Kartenclub mit Ledersesseln, offene Karten liegen wie Schaufenster vor jedem Platz.
- **Figuren & Material:** Offene Karten mit leichtem Schatten, verdeckte mit Club-Rücken. Bring-in-Marker als Messingmünze.
- **Sound:** Ruhiger als Hold'em: tiefe Chips, Lederknarzen beim Bring-in.
- **Animation:** Jede Street teilt reihum eine Karte aus, offene Karten landen mit kleinem Drall.
- **Highlight:** „7th Street“: Die letzte verdeckte Karte wird mit einem Daumen-Wisch-Effekt angeschaut (nur beim Besitzer).

#### EXP-052 · Short Deck Poker (`short-deck`) · P3
- **Welt:** Moderne Rooftop-Bar, Rubin-Filz, Skyline im Hintergrund.
- **Figuren & Material:** Eigener Rücken „36“, Ranghinweis-Karte („Flush schlägt Full House“) als Bierdeckel am Tisch.
- **Sound:** Poker-Palette in heller und schneller.
- **Animation:** Beim Mischen fliegen die aussortierten 2er bis 5er sichtbar vom Stapel.
- **Highlight:** Flush gegen Full House: Der Bierdeckel blinkt kurz auf („Short-Deck-Regel!“).

#### EXP-068 · Five Card Draw (`five-card-draw`) · P3
- **Welt:** Western-Saloon-Hinterzimmer, Holztisch mit Kerben, Lampe mit grünem Schirm.
- **Figuren & Material:** Pokerchips als Holzmarken, Ablage-Korb für getauschte Karten.
- **Sound:** Holzmarken-Tock, Kartenwurf in den Korb, Schwingtür-Knarzen beim Showdown.
- **Animation:** Getauschte Karten fliegen in den Korb, neue kommen vom Stapel.
- **Highlight:** „Stand Pat“: Wer keine Karte tauscht, schiebt sein Blatt demonstrativ zusammen, mit Stempel „Steht!“.

#### EXP-011 · Blackjack (`blackjack`) · P2
- **Welt:** Halbrunder Tisch, Dealer als stilisierte Eulen-Figur mit Weste, Burgunder-Filz mit Messingschrift „Bank zahlt 3 zu 2“.
- **Figuren & Material:** Kartenschlitten (Shoe) aus dunklem Holz, Einsatzkreise pro Platz.
- **Sound:** Shoe-Ziehgeräusch, Klopfen auf den Filz für „Karte“, Handwischen für „Stehen“, Kassenklingel bei Blackjack.
- **Animation:** Karten gleiten aus dem Shoe. Die verdeckte Dealerkarte dreht sich am Ende langsam um, Gewinne werden aus der Bank zugezählt.
- **Highlight:** Natural Blackjack: Messing-Lettern „Blackjack!“ steigen kurz über dem Platz auf.

#### EXP-004 · UNO (`farbenchaos`) · P1
- **Welt:** Die fünf bestehenden Farbwelten behalten. Neu: Jede Welt bekommt eine Bühne mit Kulisse, die auf Aktionen reagiert, z. B. dreht sich bei „Richtungswechsel“ der ganze Tischring.
- **Figuren & Material:** Eigene Kartenrücken pro Welt, große Ecksymbole (6/9 unterstrichen). Wunschfarben-Rad als Drehscheibe.
- **Sound:** Knackiges Kartenklatschen, „Zieh“-Rascheln mit Stapeleffekt bei +2/+4. Aussetzen ist ein Stopp-Ton, Richtungswechsel ein Wusch, der Ruf eine kurze Fanfare.
- **Animation:** Gezogene Karten fächern in die Hand. Bei +4 fliegen vier Karten nacheinander zum Opfer, beim Richtungswechsel dreht sich der Pfeilring sichtbar.
- **Highlight:** Stapel-Schlacht: Wird +2 auf +2 gestapelt, wächst ein Zähler über dem Ablagestapel („+6!“). Der Verlierer bekommt den ganzen Schwall.

#### EXP-003 · Mau-Mau (`maumau`) · P1
- **Welt:** Gemütlicher Küchentisch mit Wachstuch, Kaffeetasse und Brotkorb am Rand.
- **Figuren & Material:** Eigenes deutsches Blatt (Kreuz, Pik, Herz, Karo) mit warmen Farben. Bube mit Wunschfahne.
- **Sound:** Lockeres Kartenschnippen, Löffel klirrt an der Tasse bei „Mau“, Doppelklirr bei „Mau-Mau“.
- **Animation:** Die 7er-Kette zählt sichtbar hoch, die 8 lässt den nächsten Platz kurz grau „einschlafen“.
- **Highlight:** „Mau-Mau!“: Die Tasse hüpft, Kaffee schwappt, der Gewinner bekommt einen Herz-Stempel.

#### EXP-021 · Mogeln (`mogeln`) · P2
- **Welt:** Geheimes Hinterzimmer mit Bordeaux-Vorhang, Kerzenlicht.
- **Figuren & Material:** Verdeckter Ablagestapel, der sichtbar wächst. „Lüge!“-Glocke in der Tischmitte.
- **Sound:** Verdecktes Ablegen leise. „Zweifel!“ schlägt die Glocke, Wahrheit gibt ein erleichtertes Ausatmen, Lüge ein Posaunen-Wah-Wah (synthetisch).
- **Animation:** Beim Zweifeln dreht sich nur die letzte Lage spannungsvoll um, der Stapel rutscht zum Verlierer.
- **Highlight:** Riesenstapel: Ab 15 Karten wackelt der Stapel bei jedem Ablegen ein bisschen mehr.

#### EXP-022 · Präsident (`praesident`) · P2
- **Welt:** Clubraum mit Rangtafel an der Wand (Präsident, Vize, Bürger, Vize-Arschloch, Arschloch, Letzteres im Spiel als „Letzter“).
- **Figuren & Material:** Kleine Rang-Anstecker an den Avataren, Ablagestapel in der Tischmitte.
- **Sound:** Würdevoller Gong für den neuen Präsidenten, Tafelkreide beim Rangwechsel.
- **Animation:** Kartentausch zu Rundenbeginn: Die besten Karten wandern sichtbar zum Präsidenten.
- **Highlight:** Machtwechsel: Wenn der Letzte Präsident wird, kippt das Rangbrett mit einem Ruck.

#### EXP-010 · Schwimmen (`schwimmen`) · P2
- **Welt:** Bistrotisch am Ufer, Wasserreflexe auf dem Holz.
- **Figuren & Material:** Drei Lebensmarken als kleine Rettungsringe, der „Schwimmende“ trägt einen Schwimmreifen.
- **Sound:** Leises Plätschern beim Tausch, Klopfen auf den Tisch, „Platsch“ beim Lebensverlust.
- **Animation:** Rettungsring geht unter, beim letzten Leben treibt der Avatar im Reifen.
- **Highlight:** 31 sofort: Die drei Karten drehen sich gleichzeitig um, eine Welle läuft über den Tisch.

#### EXP-044 · 6 nimmt! (`sechs-nimmt`) · P2
- **Welt:** Weidenzaun mit vier Gatterreihen, Hornochsen-Symbole als freundliche, eigene Rinderköpfe.
- **Figuren & Material:** Karten mit Ochsenkopf-Anzahl als Hörnchen-Markierung. Strafstapel als kleiner Heuhaufen pro Spieler.
- **Sound:** Karten verdeckt, alle decken gleichzeitig mit „Ffft“ auf. Muhen (synthetisch, kurz) beim Nehmen einer Reihe.
- **Animation:** Karten sortieren sich sichtbar aufsteigend und laufen nacheinander in ihre Reihen. Die sechste Karte schiebt die Reihe in den Heuhaufen.
- **Highlight:** Volle Reihe mit 20+ Ochsen: Der Heuhaufen staubt auf.

#### EXP-008 · Phase 10 (`zehnetappen`) · P2
- **Welt:** Arbeitsplatz mit Klemmbrett, zehn Phasen als Stempelkarte.
- **Figuren & Material:** Phasen-Fortschritt als Lochkarte, die pro geschaffter Phase gelocht wird.
- **Sound:** Lochzange klickt bei geschaffter Phase, Ablegen auf andere Auslagen als Heftklammer-Ton.
- **Animation:** Die ausgelegte Phase rastet auf dem Tisch ein, der Fortschrittsbalken springt.
- **Highlight:** Phase 10 geschafft: Stempel „FERTIG“ knallt auf das Klemmbrett.

#### EXP-009 · Skip-Bo (`stapelrennen`) · P2
- **Welt:** Helle Werkhalle mit vier Montagebahnen von 1 bis 12.
- **Figuren & Material:** Bahnen als Förderbänder. Joker-Karte als Schraubenschlüssel-Symbol.
- **Sound:** Ratschen beim Anlegen, Förderband-Surren, wenn eine Bahn bei 12 voll ist und abtransportiert wird.
- **Animation:** Volle Bahnen fahren aus dem Bild und kommen leer zurück.
- **Highlight:** Eigener Stapel leer: Sirene (freundlich) und Glühbirnenreihe.

#### EXP-045 · Monopoly Deal (`monopoly-deal`) · P2
- **Welt:** Maklerbüro mit Schreibtischunterlage, Besitzmappen als Ordner.
- **Figuren & Material:** Eigene Straßensätze „Spieleabend-Stadt“ (wie im Monopoly-Brett), Taler-Scheine, Aktionskarten mit eigenen Piktogrammen.
- **Sound:** Stempel bei Miete, Geldzählmaschine bei Zahlung, „Nein!“-Hupe bei Gegenaktion.
- **Animation:** Gestohlene Grundstücke fliegen von Ordner zu Ordner, Zahlungen fliegen als Scheinbündel.
- **Highlight:** Deal Breaker: Ein ganzer Satz wird im Ordner zum Gegner gezogen, mit Aktenschrank-Rumms.

#### EXP-023 · Durak (`durak`) · P3
- **Welt:** Datscha-Veranda am Abend, Samowar-Silhouette, rot-blaue Decke.
- **Figuren & Material:** Trumpfkarte quer unter dem Stapel, Angriffs- und Verteidigungspaare als überlappende Karten.
- **Sound:** Scharfer Klatsch bei Angriff, weicher bei Verteidigung, Teetassen-Klirren beim „Bito“.
- **Animation:** Verteidigungskarten legen sich schräg über die Angriffe. „Bito“ wischt alles auf den Ablagestapel.
- **Highlight:** Der Durak bekommt eine Papiermütze aufgesetzt (als Accessoire am Avatar).

#### EXP-067 · Hearts (`hearts`) · P3
- **Welt:** Salon im Rosé-Ton mit Spitzendeckchen, ruhig.
- **Figuren & Material:** Strafherzen als kleine Glasherzen, die Pik-Dame mit eigener Krone im Design.
- **Sound:** Herzklopfen beim Ziehen eines Herzstichs, dunkler Gong bei der Pik-Dame.
- **Animation:** Kartenweitergabe zu Rundenbeginn fliegt sichtbar nach links, rechts oder über den Tisch.
- **Highlight:** Shoot the Moon: Alle Glasherzen fliegen zum Mondsucher und dann als Punkte zu den anderen.

#### EXP-086 · Skat (`skat`) · P1
- **Welt:** Gute Stube mit Eckbank, Stammtisch-Schild, Zigarrenkiste als Skat-Ablage (ohne Zigarren).
- **Figuren & Material:** Eigenes französisches Blatt im Turnierstil (deutsche Farben als Option). Reizblock aus Papier, Bleistift.
- **Sound:** Fester Knöchelklopfer beim Ausspielen von Trumpf, Bleistiftkratzen beim Reizen, Rascheln beim Skat-Aufnehmen.
- **Animation:** Skat wird umgedreht, der Spieler drückt zwei Karten zurück in die Kiste. Stiche werden zum Gewinnerplatz geschoben.
- **Highlight:** Grand Hand: Der Reizblock schreibt sich groß „Grand Hand“, der Stammtisch klopft dreimal.

#### EXP-087 · Doppelkopf (`doppelkopf`) · P1
- **Welt:** Vereinsheim-Tisch für vier mit Rundenzettel und Re-/Kontra-Schildern.
- **Figuren & Material:** Eigenes Blatt mit doppelten Karten. Re- und Kontra-Aufsteller, Füchse als Fuchs-Plakette.
- **Sound:** Ansage „Re!“ als kurzer Messington, „Kontra!“ als tieferer Gegenton. Fuchs gefangen klingt nach Jagdhorn (synthetisch, kurz).
- **Animation:** Bei geklärter Partei drehen sich die Aufsteller um. Gefangene Füchse springen zum Stich-Gewinner.
- **Highlight:** Doppelkopf (40 Augen im Stich): Der Stich leuchtet und bekommt die Plakette „Doko!“.

#### EXP-053 · Stichmeister (`stichmeister`) · P2
- **Welt:** Wahrsagezelt mit Sternenhimmel. Ansagen werden in eine Glaskugel geschrieben.
- **Figuren & Material:** Ansage-Marker als kleine Sterne, Trumpf als leuchtendes Sternbild.
- **Sound:** Glockenspiel bei genauer Vorhersage, gedämpfter Ton bei Abweichung.
- **Animation:** Pro gewonnenem Stich füllt sich ein Stern, am Rundenende fliegen Bonusfunken.
- **Highlight:** Alle haben genau getroffen: Die Glaskugel strahlt und zeigt das Sternbild der Runde.

#### EXP-054 · Exploding-Deck (`exploding-deck`) · P2
- **Welt:** Verrücktes Erfinderlabor mit Kolben, blinkenden Lämpchen und Warnstreifen.
- **Figuren & Material:** Gefahrenkarte als runde Comic-Bombe mit Zündschnur, Entschärfer als Schraubendreher-Karte.
- **Sound:** Zündschnur zischt, Entschärfen klingt wie Draht durchschneiden, Explosion als dumpfer Puff (nicht laut), danach Aschewölkchen.
- **Animation:** Gezogene Gefahrenkarte vibriert, wer entschärft, steckt sie zurück in den Stapel (sichtbar, aber verdeckt wo).
- **Highlight:** Explosion: Der Platz wird kurz rußgeschwärzt, der Avatar bekommt wilde Haare.

### Würfelspiele

#### EXP-012 · Kniffel (`kniffel`) · P1
- **Welt:** Holztablett mit Filzmulde, daneben ein gedruckter Spielblock mit Bleistift.
- **Figuren & Material:** Fünf Würfel aus hellem Holz. Becher aus Leder als Taste zum Würfeln.
- **Sound:** Würfel im Becher schütteln (Rasseln), Ausschütten mit Holzklacken auf Filz, Bleistiftkratzen beim Eintragen.
- **Animation:** Würfel rollen aus dem Becher. Gehaltene Würfel rutschen an den Rand, die Punktzahl schreibt sich handschriftlich ein.
- **Highlight:** Kniffel: Alle fünf Würfel springen hoch und bilden kurz ein „K“, der Block bekommt einen Goldstern.

#### EXP-005 · Mäxchen (`maexchen`) · P2
- **Welt:** Kneipentresen bei Nacht, Bernsteinlampe, Bierdeckel-Stapel als Leben.
- **Figuren & Material:** Würfelbecher mit Untersetzer, Leben als Bierdeckel.
- **Sound:** Becher knallt auf den Tresen, Ansage bekommt einen kurzen Stimmton, Anzweifeln klingt wie Barglocke.
- **Animation:** Becher wird bei „Anzweifeln“ langsam angehoben, der Bierdeckel wandert zum Verlierer.
- **Highlight:** Mäxchen (21): Der Becher wird mit Schwung gehoben, die Kneipe „jubelt“ (kurzer Chor aus Rauschen).

#### EXP-006 · Schocken (`schocken`) · P2
- **Welt:** Stammtisch mit Deckel-Stapel in der Mitte und Kreidetafel.
- **Figuren & Material:** 13 Deckel als runde Pappuntersetzer, „Schock-Aus“ als goldener Deckel.
- **Sound:** Drei Würfel im Becher, Deckel klatschen auf den Tisch.
- **Animation:** Deckel wandern vom Stapel zu den Verlierern, bei Schock-Aus fliegen alle auf einmal.
- **Highlight:** Schock aus: Kreidetafel schreibt „SCHOCK AUS!“, Halbzeit vorbei.

#### EXP-015 · Shut the Box (`shutthebox`) · P2
- **Welt:** Kapitänskajüte, Box aus Mahagoni mit Messingklappen 1 bis 9.
- **Figuren & Material:** Klappen mit eingeprägten Zahlen, zwei Elfenbein-Würfel (Kunststoff-Optik).
- **Sound:** Klappen fallen mit sattem „Klock“, Würfel klappern in der Box.
- **Animation:** Klappen kippen um, offene Klappen glimmen sanft.
- **Highlight:** Box zu: Alle Klappen schlagen nacheinander, Schiffsglocke ertönt.

#### EXP-016 · Zehntausend (`zehntausend`) · P2
- **Welt:** Würfelarena wie ein kleines Kolosseum, Sicherungsbank links, Risikofeld rechts.
- **Figuren & Material:** Sechs Würfel aus Marmor-Optik, herausgelegte Würfel auf einer Steinbank.
- **Sound:** Steinwürfel-Klackern, Münzhaufen beim Anschreiben, Bruch-Geräusch bei Niete.
- **Animation:** Herausgelegte Würfel wandern auf die Bank. Bei Niete zerbröseln die Rundenpunkte.
- **Highlight:** Alle sechs Würfel verwertet („Anschluss“): Die Arena-Fahnen wehen, alle Würfel kommen frisch zurück.

#### EXP-025 · Würfelpoker (`wuerfelpoker`) · P3
- **Welt:** Nachtblauer Tisch mit Goldrand, Würfel mit Kartenwerten (9, 10, B, D, K, A).
- **Figuren & Material:** Eigene Würfelseiten-Illustrationen im Stil des Kartendecks „Salon“.
- **Sound:** Poker-Palette mit Würfeln.
- **Animation:** Die Hand wird am Ende als Kartenfächer aus Würfeln gezeigt.
- **Highlight:** Fünf Asse: Goldene Konfetti-Würfel.

#### EXP-026 · Lügenwürfel (`luegenwuerfel`) · P2
- **Welt:** Piratenkneipe in Lederoptik, Kupferplaketten für Gebote.
- **Figuren & Material:** Becher aus Leder mit Nieten, Gebotsplakette mit Anzahl und Augenzahl.
- **Sound:** Becher knallen gleichzeitig auf den Tisch, Plakette klirrt beim Erhöhen, „Lügner!“ als Kanonen-Wumms (gedämpft).
- **Animation:** Bei „Lügner!“ heben sich alle Becher gleichzeitig, die passenden Würfel leuchten.
- **Highlight:** Punktgenau: Wird exakt richtig geboten, dreht sich die Plakette golden.

#### EXP-027 · Chicago (`chicago`) · P3
- **Welt:** Jazzclub-Theke der 20er, elf Rundenmarken als Neon-Zahlen.
- **Figuren & Material:** Würfel aus Bakelit-Optik, Rundenmarken leuchten nacheinander auf.
- **Sound:** Kontrabass-Pizzicato (synthetisch) bei Treffer, gedämpfte Trompete bei Fehlwurf.
- **Animation:** Neonzahl der aktuellen Runde flackert ruhig an (kein Stroboskop).
- **Highlight:** Runde 12 getroffen: Kurze Swing-Phrase (drei Töne).

#### EXP-055 · Risiko-Würfeln (`risiko-wuerfeln`) · P3
- **Welt:** Hochseil über einer Schlucht: links der sichere Rand, rechts das Seil.
- **Figuren & Material:** Avatar balanciert umso weiter hinaus, je mehr er riskiert.
- **Sound:** Seil knarzt mit steigendem Risiko lauter, Sichern klingt nach Karabiner-Klick.
- **Animation:** Bei Niete schwankt der Avatar und fällt ins Netz.
- **Highlight:** Riesiger Zuggewinn gesichert: Applaus aus der Ferne.

#### EXP-049 · Würfelduell (`wuerfelduell`) · P2
- **Welt:** Turnierplatz mit zwei Wappen, Angriffs- und Schildbereich.
- **Figuren & Material:** Schwert- und Schildwürfel als Symbole, Lebenspunkte als Herzwimpel.
- **Sound:** Schwertklirren bei Angriff, dumpfer Schildschlag bei Abwehr.
- **Animation:** Angriffswürfel fliegen gegen den Schild, durchkommender Schaden lässt Wimpel fallen.
- **Highlight:** Perfekte Abwehr: Der Schild blitzt, Funkenregen.

#### EXP-056 · Würfeljagd (`wuerfeljagd`) · P3
- **Welt:** Rennstrecke, Zielkombination auf einer Anzeigetafel.
- **Figuren & Material:** Würfel als kleine Rennwagen-Chips mit Startnummer.
- **Sound:** Motorbrummen steigt mit Zeitdruck, Zielflagge beim Treffer.
- **Animation:** Gehaltene Würfel fahren in die Box.
- **Highlight:** Zielkombination im ersten Wurf: Fotofinish-Blitz.

#### EXP-057 · Monsterwürfel (`monsterwuerfel`) · P2
- **Welt:** Gemütliche Monster-Höhle (freundliche, runde Wesen), Würfellager als Holzkiste.
- **Figuren & Material:** Eigene Monsterfiguren mit Lebensbalken, Heldenwürfel mit Symbolen.
- **Sound:** Monster grummeln beim Erscheinen, „Plopp“ beim Besiegen.
- **Animation:** Monster wackelt bei Treffern und zerfällt in Konfetti.
- **Highlight:** Endboss: Die Höhle bebt leicht, die Musik wird eine Spur dramatischer.

#### EXP-084 · Würfel-Auktion (`wuerfel-auktion`) · P3
- **Welt:** Auktionshaus mit Holzpult und Hammer.
- **Figuren & Material:** Würfelpakete in Samtschachteln, Gebote auf Bieterkarten.
- **Sound:** Hammerschlag beim Zuschlag, Raunen bei hohen Geboten.
- **Animation:** Geheime Gebote drehen sich gleichzeitig um, das Paket wandert zum Höchstbietenden.
- **Highlight:** Schnäppchen: Ein billiges Paket würfelt hoch, Stempel „Schnäppchen!“.

### Brettspiele

#### EXP-001 · Scotland Yard (`scotland-yard`) · P1
- **Welt:** Bleibt die geprüfte Stadt Aure. Neu: Tageszeit wechselt alle 6 Züge (Dämmerung, Nacht, Morgen).
- **Figuren & Material:** Detektive als Figuren mit Hüten in Ermittlerfarben, Mr. X als Schatten mit Mantel.
- **Sound:** Taxi-Hupe, Bus-Bremse, U-Bahn-Rauschen und Fährhorn je nach Ticket. Spannungston bei Auftauchzügen.
- **Animation:** Figuren fahren ihre Linie entlang. Beim Auftauchen von Mr. X erscheint seine Silhouette mit Nebel-Effekt (CSS-Gradient, kein Blur).
- **Highlight:** Festnahme: Alle Detektiv-Figuren springen auf das Feld, Handschellen-Klick, Akte wird gestempelt „Gefasst“.

#### EXP-007 · Mensch ärgere Dich nicht (`huetchen`) · P1
- **Welt:** Gartentisch im Sommer, Brett aus Holz mit gemalten Feldern.
- **Figuren & Material:** Lackierte Holzpöppel mit Glanzpunkt, eigener Würfel mit runden Augen.
- **Sound:** Holzpöppel tocken Feld für Feld, Rauswurf als „Plopp!“ und kurzes Ärgern-Grummeln.
- **Animation:** Figuren hüpfen Feld für Feld, geschlagene fliegen im Bogen zurück ins Haus.
- **Highlight:** Dreimal Sechs: Konfetti nur am eigenen Haus, „Glückspilz“-Plakette.

#### EXP-017 · Mühle (`muehle`) · P2
- **Welt:** Schieferbrett im Klostergarten.
- **Figuren & Material:** Steine aus Elfenbein- und Anthrazit-Optik mit Marmorierung.
- **Sound:** Satter Stein-auf-Stein-Ton, Mühle geschlossen als Mahlstein-Rumpeln.
- **Animation:** Geschlossene Mühle leuchtet entlang der Linie, der geschlagene Stein rollt vom Brett.
- **Highlight:** Zwickmühle: Die Linie pendelt sichtbar hin und her, Plakette „Zwickmühle!“.

#### EXP-029 · Dame (`dame`) · P2
- **Welt:** Nussbaumbrett im Lesesaal.
- **Figuren & Material:** Gedrechselte Holzsteine, Damen bekommen einen zweiten Stein mit Krone obendrauf.
- **Sound:** Holzklacken, beim Mehrfachschlag eine aufsteigende Tonfolge.
- **Animation:** Schlagketten springen sichtbar Stein für Stein.
- **Highlight:** Neue Dame: Kronenstein fällt von oben auf.

#### EXP-028 · Reversi (`reversi`) · P2
- **Welt:** Japanischer Garten mit Kies, tiefgrünes Brett.
- **Figuren & Material:** Steine schwarz/weiß mit Perlmuttglanz.
- **Sound:** Weiches „Tick“ beim Setzen, Umdrehkaskade wie Dominoklackern.
- **Animation:** Umdrehende Steine drehen sich als Welle vom gesetzten Stein aus.
- **Highlight:** Ecke erobert: Kies-Ring zieht sich um die Ecke.

#### EXP-088 · Schach (`schach`) · P1
- **Welt:** Turnierbrett im Schachcafé, leichte Kaffeehausatmosphäre.
- **Figuren & Material:** Eigener 2D-Figurensatz „Café“ mit klaren Silhouetten. Schachuhr als Messinguhr mit zwei Knöpfen.
- **Sound:** Holzfigur setzen, Schlagen mit kurzem Doppelklack, Schach als leiser Glockenton, Uhr-Ticken in den letzten 10 Sekunden.
- **Animation:** Figuren gleiten, Rochade bewegt König und Turm gleichzeitig. Matt: Der König kippt langsam um.
- **Highlight:** Schachmatt: König fällt, das Brett dimmt bis auf das Mattbild.

#### EXP-048 · Hex (`hex`) · P3
- **Welt:** Bienenwabe aus Glas auf Steinplatte.
- **Figuren & Material:** Rot und Blau als Glassteine, Ränder als leuchtende Linien.
- **Sound:** Glas-Tick, Verbindung geschlossen als aufsteigender Glasakkord.
- **Animation:** Die Siegerkette leuchtet von Rand zu Rand nacheinander auf.
- **Highlight:** Sieg: Die Wabe füllt sich mit Licht entlang des Pfades.

#### EXP-014 · Vier gewinnt (`viergewinnt`) · P2
- **Welt:** Spielrahmen auf einem Kinderzimmer-Tisch, Holzrahmen mit Plexiglas-Optik.
- **Figuren & Material:** Rote und gelbe Scheiben mit Rillenrand.
- **Sound:** Scheibe fällt mit Klappern nach unten, Rahmen-Leeren beim Neustart (Kaskade).
- **Animation:** Scheiben fallen mit leichtem Nachfedern, am Ende rutschen alle Scheiben unten raus.
- **Highlight:** Vier in einer Reihe: Die vier Scheiben pulsieren, der Rahmen schaukelt kurz.

#### EXP-013 · Schiffe versenken (`schiffe`) · P2
- **Welt:** Kommandobrücke mit Radarschirm und Seekarte.
- **Figuren & Material:** Eigene Schiffssilhouetten, Treffer als rote Steckmarke, Wasser als weißer Stecker.
- **Sound:** Radar-Ping beim Zielen, Abschussknall, Platsch oder Explosion (gedämpft), Versenken mit Sinkgeräusch.
- **Animation:** Geschoss fliegt im Bogen über die Karte, versenkte Schiffe kippen und versinken.
- **Highlight:** Letztes Schiff versenkt: Rettungsboje treibt übers Feld.

#### EXP-030 · Domino (`domino`) · P2
- **Welt:** Karibik-Veranda mit Holztisch, Palmenschatten.
- **Figuren & Material:** Elfenbeinsteine mit schwarzen Augen, Kette mit beschrifteten Enden.
- **Sound:** Lautes Domino-Klatschen auf den Tisch (typisch), Mischen als Klappern.
- **Animation:** Steine legen sich an die Kette und drehen sich passend, die Kette biegt sich um Ecken.
- **Highlight:** Domino!: Der letzte Stein wird mit Schwung aufgeschlagen, kurzer Tisch-Wackler.

#### EXP-065 · Backgammon (`backgammon`) · P2
- **Welt:** Klappbrett aus Holz und Leder auf einem Basar-Teppich.
- **Figuren & Material:** Steine aus Holz mit Einlegearbeiten, Doppelwürfel als Messingwürfel.
- **Sound:** Würfel im Lederbecher, Steine klicken beim Stapeln, Schlagen als hellerer Klack.
- **Animation:** Steine laufen ihre Zungen entlang, geschlagene springen auf die Bar.
- **Highlight:** Gammon: Doppelwürfel dreht sich auf, Plakette „Gammon!“.

#### EXP-066 · Scrabble (`scrabble`) · P1
- **Welt:** Wortspiel-Werkbank: Schreibtisch mit Lexikon, Buchstabenständer aus Holz.
- **Figuren & Material:** Eigene Holzbuchstaben mit Wert, Prämienfelder in eigenen Farben und Mustern (nicht Original).
- **Sound:** Holzbuchstaben klacken auf das Brett, Beutel rascheln beim Ziehen, Wertung als Abakus-Klick.
- **Animation:** Gelegtes Wort zählt Buchstabe für Buchstabe hoch, Prämien multiplizieren sichtbar.
- **Highlight:** Alle sieben Steine gelegt (Bingo): Die Buchstaben springen im Takt, +50-Siegel.

#### EXP-046 · Monopoly (`monopoly`) · P1
- **Welt:** Spieleabend-Stadt mit eigenen Straßennamen und Vierteln (Hafen, Altstadt, Uni, Bahnhof). In den Feldern wachsen kleine Häuser.
- **Figuren & Material:** Eigene Spielfiguren (Fahrrad, Eule, Kaffeetasse, Würfel, Gitarre, Rakete), Taler-Scheine, Häuser und Hotels als kleine 3D-wirkende SVGs.
- **Sound:** Figur tockt Feld für Feld, Kasse klingelt beim Kauf, Miete als Geldzählen, Gefängnistür quietscht.
- **Animation:** Figuren laufen Feld für Feld ums Brett, Häuser wachsen aus dem Boden, Hypothek dreht die Karte um.
- **Highlight:** Hotel gebaut: Kran setzt das Hotel, Feuerwerk über dem Straßenzug.

#### EXP-047 · Spiel des Lebens (`spiel-des-lebens`) · P2
- **Welt:** Panoramalandschaft von Kindheit bis Ruhestand, Straße mit Hügeln und Brücken.
- **Figuren & Material:** Autos mit Steckplätzen für Mitfahrer (Familie). Drehrad statt Würfel.
- **Sound:** Drehrad rattert und rastet ein, Hupen bei Ereignissen, Hochzeitsglocken, Zahltag-Klingeln.
- **Animation:** Auto fährt die Strecke ab, Familienmitglieder steigen ein.
- **Highlight:** Ruhestand: Auto fährt in die Villa oder die Hütte, Lebensbilanz rollt als Filmstreifen ab.

#### EXP-089 · Städtehandel (`staedtehandel`) · P1
- **Welt:** Insel aus Hexfeldern mit Wäldern, Hügeln, Weiden, Feldern und Bergen. Meer mit Häfen.
- **Figuren & Material:** Holzstraßen, Siedlungen, Städte, eigene Rohstoffkarten mit Piktogrammen, Räuber als Nebelgestalt.
- **Sound:** Würfeln, Ertragsgeräusche je Rohstoff (Holzhacken, Mähen, Blöken synthetisch, Hammer auf Stein, Erz-Klirren), Handel als Handschlag.
- **Animation:** Bei Ertrag fliegen Rohstoffe von den Feldern zu den Spielern. Straßen bauen sich Stück für Stück, Städte wachsen aus Siedlungen.
- **Highlight:** Längste Straße oder größte Rittermacht wechselt: Banner wandert mit Fanfare zum neuen Besitzer.

#### EXP-090 · Gebietskampf (`gebietskampf`) · P1
- **Welt:** Abstrakte Fantasiekarte auf Pergament, Gebiete in Wappenfarben (militärfrei, Fahnen statt Waffen).
- **Figuren & Material:** Fahnen-Marker mit Zahl, Karten-Sets als Wappenkarten.
- **Sound:** Trommelwirbel beim Würfelangriff, Fahnenflattern bei Eroberung, Horn bei Kontinentbonus.
- **Animation:** Angriffspfeil zieht über die Grenze, Würfel rollen gegeneinander. Eroberte Gebiete färben sich von der Grenze her um.
- **Highlight:** Kontinent komplett: Die Grenze des Kontinents zieht sich als goldene Linie nach.

#### EXP-058 · Labyrinth-Brett (`labyrinth-brett`) · P2
- **Welt:** Verwunschener Tempel mit Steinplatten.
- **Figuren & Material:** Eigene Schatzsymbole (Krug, Schlüssel, Krone, Buch …), Figuren als Abenteurer.
- **Sound:** Stein schleift beim Einschieben, Schatz gefunden als Glöckchen.
- **Animation:** Die Reihe rutscht sichtbar, die herausgeschobene Platte wandert zum nächsten Spieler.
- **Highlight:** Letzter Schatz: Tempeltor öffnet sich.

#### EXP-069 · Schatzinsel (`schatzinsel`) · P2
- **Welt:** Piratenkarten-Archipel auf Pergament.
- **Figuren & Material:** Schaufeln, Fahnen, Schatztruhen.
- **Sound:** Graben (Sand-Rauschen), Truhe öffnen (Knarzen und Münzklimpern), Nieten als leeres Klonk.
- **Animation:** Erdhügel wächst beim Graben, Truhe springt auf.
- **Highlight:** Größter Schatz gefunden: Münzfontäne.

### Party – Raten, Reden, Zeichnen

#### EXP-036 · Werwolf (`werwolf`) · P1
- **Welt:** Dorfplatz mit Brunnen, Tag und Nacht wechseln mit Himmelsfarbe.
- **Figuren & Material:** Rollenkarten als Holztafeln (Seherin, Hexe, Jäger …) mit eigenen Illustrationen.
- **Sound:** Nachts Grillen und ferne Eule, Morgens Hahn, Abstimmung als Murmeln, Hinrichtung als dumpfer Gong.
- **Animation:** Dämmerungsübergang, Rollenkarte dreht sich beim Ausscheiden um.
- **Highlight:** Dorf gewinnt oder Werwölfe gewinnen: Vollmond geht auf oder Sonne siegt, mit eigenem Schluss-Akkord.

#### EXP-081 · Doppelagent (`doppelagent`) · P1
- **Welt:** Geheimdienst-Lounge mit Kartenwand, Orte als Postkarten.
- **Figuren & Material:** Persönliche Ortsakte als Umschlag mit Siegel, Agent mit Sonnenbrille als Accessoire.
- **Sound:** Schreibmaschinen-Tick bei Fragen, Akte öffnen, Enthüllung mit Spionage-Akkord.
- **Animation:** Bei Anklage drehen sich alle Akten um, der Agent zieht die Sonnenbrille ab.
- **Highlight:** Agent errät den Ort: Postkarte fliegt ins Bild, „Mission erfüllt“.

#### EXP-082 · Lügenbaron (`luegenbaron`) · P2
- **Welt:** Plüschsalon des Barons mit Ohrensessel und Globus.
- **Figuren & Material:** Geschichtenkarten als vergilbte Seiten, Stimmmarken als Monokel.
- **Sound:** Seitenblättern, Kaminknistern (Ambient), Enthüllung mit Glockenspiel oder Fehlton.
- **Animation:** Antworten erscheinen als Zeitungsschnipsel, die wahre Antwort wird gestempelt.
- **Highlight:** Alle glauben deine Lüge: Der Baron zwirbelt seinen Schnurrbart.

#### EXP-040 · Malen & Raten (`malen-raten`) · P1
- **Welt:** Atelier mit Staffelei, Farbtöpfen und Pinselbecher.
- **Figuren & Material:** Pinselspitzen-Auswahl, Farbpalette als Holzpalette.
- **Sound:** Pinselstrich-Rauschen (leise, nur beim Zeichner), Treffer-Glocke beim richtigen Raten, Zeit läuft ab als Eieruhr-Klingeln.
- **Animation:** Erste richtige Lösung lässt das Bild golden einrahmen.
- **Highlight:** Alle erraten es: Das Bild hängt sich an eine „Galerie des Abends“-Wand.

#### EXP-038 · Kritzelpost (`kritzelpost`) · P1
- **Welt:** Postamt mit Sortierfächern, Umschläge wandern von Fach zu Fach.
- **Figuren & Material:** Briefmarken mit Avatar-Eule, Poststempel mit Rundennummer.
- **Sound:** Stempel-Klatsch beim Abgeben, Umschlag-Rascheln, Postsirene bei der Auflösung.
- **Animation:** Am Ende spult die Kette wie ein Postbote ab: Umschlag öffnet, nächstes Bild, nächster Satz.
- **Highlight:** Kette erreicht wieder den Anfangsbegriff: „Zugestellt!“-Stempel mit Konfetti.

#### EXP-039 · Bildunterschrift (`bildunterschrift`) · P2
- **Welt:** Kleine Galerie mit Bilderrahmen und Messingschildern.
- **Figuren & Material:** Bildunterschriften als Messingschilder, Stimmen als rote Punkte (wie „verkauft“).
- **Sound:** Galerie-Hall, Sektglas-Klingen beim Gewinner.
- **Animation:** Gewinnerschild wird unter das Bild geschraubt.
- **Highlight:** Einstimmig: Das Bild bekommt eine Kordel und ein Spotlicht.

#### EXP-019 · Schlagfertig (`schlagfertig`) · P1
- **Welt:** Comedy-Club mit Backsteinwand, Mikrofonständer und Spotlicht.
- **Figuren & Material:** Antwortkarten als Karteikarten, Stimmen als Lachen-Symbole.
- **Sound:** Publikumslachen (synthetisch, kurz, Stärke nach Stimmen), Rimshot bei Gleichstand.
- **Animation:** Die bessere Antwort wird vom Spot angestrahlt, die andere wird abgedunkelt.
- **Highlight:** Alle Stimmen für eine Antwort: Standing Ovation (Applaus und Rosen).

#### EXP-020 · Wer hat das gesagt? (`werhatdasgesagt`) · P2
- **Welt:** Lagerfeuerkreis mit Baumstämmen.
- **Figuren & Material:** Antworten als Zettel an einer Wäscheleine.
- **Sound:** Lagerfeuer-Knistern (Ambient), Zettel abreißen, Auflösung als Gitarrenakkord.
- **Animation:** Bei der Auflösung fliegt der Zettel zur richtigen Person.
- **Highlight:** Niemand rät richtig: Zettel brennt kurz als Funkenregen (ungefährlich, nur Symbol).

#### EXP-037 · Wer bin ich? (`wer-bin-ich`) · P2
- **Welt:** Partykeller mit Lichterkette.
- **Figuren & Material:** Stirnzettel als Klebezettel am Avatar, Ja/Nein-Schilder.
- **Sound:** Quietschiges Ja-Hupen und Nein-Tröte, „Erraten!“ als Partytröte.
- **Animation:** Erratene Begriffe fallen von der Stirn.
- **Highlight:** Raten in unter 5 Fragen: Goldener Stirnzettel.

#### EXP-059 · Story-Chaos (`story-chaos`) · P2
- **Welt:** Schreibstube mit langer Papierrolle.
- **Figuren & Material:** Jeder Satz in der Handschrift-Schrift des Autors (eigene Schriftauswahl).
- **Sound:** Schreibmaschine, am Ende Vorlesen per optionaler Sprachausgabe (Browser-TTS, lokal).
- **Animation:** Am Ende rollt die ganze Geschichte als Papierrolle aus.
- **Highlight:** Vorleseabend: Optionale Sprachausgabe liest die ganze Geschichte vor.

#### EXP-018 · Schätzmeister (`schaetzmeister`) · P2
- **Welt:** Quizstudio mit großer Messskala.
- **Figuren & Material:** Schätzpfeile in Spielerfarbe auf einer Skala.
- **Sound:** Spannungstrommel vor der Auflösung, Volltreffer-Bing.
- **Animation:** Die echte Zahl fährt als Zeiger über die Skala, die Pfeile leuchten nach Nähe.
- **Highlight:** Exakter Treffer: Skala explodiert in Konfetti.

#### EXP-085 · Zahlenreihe (`zahlenreihe`) · P3
- **Welt:** Kreidetafel im Mathe-Hörsaal.
- **Figuren & Material:** Zahlen als Kreideschrift, Lösung als roter Kreidering.
- **Sound:** Kreidekratzen, richtige Lösung als Glocke.
- **Animation:** Die Regel wird nach der Auflösung zwischen die Zahlen geschrieben (+3, ×2 …).
- **Highlight:** Schnellste Lösung unter 3 Sekunden: „Genie“-Stempel.

#### EXP-060 · Regelwahnsinn (`regelwahnsinn`) · P2
- **Welt:** Zirkusmanege mit wechselnder Regel-Tafel des Zirkusdirektors.
- **Figuren & Material:** Regelkarten als Plakate, Zirkuseule als Moderator.
- **Sound:** Tusch bei neuer Regel, Pfeife bei Regelverstoß.
- **Animation:** Neue Regel wird als Plakat aufgerollt.
- **Highlight:** Alle halten sich an die Regel: Seiltanz-Applaus.

#### EXP-061 · Jäger & Schatten (`jaeger-schatten`) · P2
- **Welt:** Nächtlicher Wald mit Lichtungen.
- **Figuren & Material:** Jäger mit Laterne, Schatten als dunkle Umrisse mit Leuchtaugen.
- **Sound:** Knackende Zweige bei Bewegung in der Nähe, Eulenruf.
- **Animation:** Laternenlicht als Kegel (Gradient), gefangene Schatten zerfallen in Glühwürmchen.
- **Highlight:** Letzter Schatten entkommt: Morgendämmerung.

#### EXP-062 · Infektionsjagd (`infektionsjagd`) · P3
- **Welt:** Labor-Petrischale von oben (freundlich-abstrakt).
- **Figuren & Material:** Spieler als bunte Zellen, Infizierte mit Punktmuster.
- **Sound:** Blubbern bei Ansteckung, Mikroskop-Klick.
- **Animation:** Ansteckung breitet sich als Farbring aus.
- **Highlight:** Letzte gesunde Zelle: Schutzschild-Glanz.

#### EXP-063 · Letzter Schutzplatz (`letzter-schutzplatz`) · P2
- **Welt:** Sturmgepeitschte Inselgruppe, Schutzinseln mit Hütten.
- **Figuren & Material:** Wellenwarnung als Leuchtturm-Licht.
- **Sound:** Wind schwillt an, Welle bricht, Tür schlägt zu beim Erreichen.
- **Animation:** Wasser überspült ungesicherte Felder von außen nach innen.
- **Highlight:** Gerade noch rechtzeitig (< 0,5 s): „Puh!“-Sprechblase.

### Party – Geschick und Echtzeit

#### EXP-095 · Bomben-Duell (`bomben-duell`) · P2
- **Welt:** Bunte Bauklotz-Arena aus Spielzeugwürfeln.
- **Figuren & Material:** Bomben als Comic-Kugeln mit Zündschnur-Countdown in Zahlen.
- **Sound:** Zündschnur-Zischen, gedämpfter Puff, Klötze klappern beim Zerfallen.
- **Animation:** Explosion als Kreuz aus Wölkchen, Klötze zerfallen in Teile.
- **Highlight:** Kettenreaktion: Bomben zünden nacheinander, mit Ketten-Zähler.

#### EXP-041 · Bröckelboden (`broeckelboden`) · P2
- **Welt:** Schwebende Steinplattform über einer Wolkenschlucht.
- **Figuren & Material:** Platten bekommen Risse in drei Stufen.
- **Sound:** Knirschen bei Rissen, Fallgeräusch mit Doppler-Abfall.
- **Animation:** Platten zerbröseln in Stücke und fallen in die Tiefe.
- **Highlight:** Letzter auf der letzten Platte: Wolken teilen sich, Sonnenstrahl.

#### EXP-083 · Brückenroulette (`brueckenroulette`) · P2
- **Welt:** Hängebrücke über einem Dschungelfluss.
- **Figuren & Material:** Planken mit Nummern, Seile mit Knoten.
- **Sound:** Planken knarzen nach Belastung, Bruch als Krachen, Platsch.
- **Animation:** Die vollste Planke biegt sich, bricht und die Spieler plumpsen ins Wasser (und schwimmen raus).
- **Highlight:** Alle wählen dieselbe Planke: Die ganze Brücke schwankt.

#### EXP-093 · Fallenbauer (`fallenbauer`) · P2
- **Welt:** Werkstatt-Parcours aus Holzbalken und Seilen.
- **Figuren & Material:** Fallen als Mausefalle, Schwingbalken, Farbklecks (freundlich).
- **Sound:** Hammer beim Bauen, Schnapp-Geräusch beim Auslösen.
- **Animation:** Gebaute Falle wird von oben eingesetzt, ausgelöste Falle schnappt sichtbar.
- **Highlight:** Eigene Falle erwischt mehrere: „Meisterbauer“-Plakette.

#### EXP-092 · Geschenkdiebe (`geschenkdiebe`) · P2
- **Welt:** Verschneiter Hof mit Tannenbaum (saisonale Variante: Sommerfest).
- **Figuren & Material:** Geschenke in verschiedenen Größen, Diebe mit Mützen.
- **Sound:** Glöckchen beim Einsammeln, Schneeknirschen, „Hey!“-Ton beim Stehlen.
- **Animation:** Geschenke stapeln sich auf dem Rücken des Trägers, beim Diebstahl fliegt das oberste.
- **Highlight:** Riesenstapel (≥ 8): Avatar wackelt unter der Last.

#### EXP-071 · Geschenkfänger (`geschenkfaenger`) · P2
- **Welt:** Dachboden, Geschenke fallen durch eine Luke.
- **Figuren & Material:** Körbe in Spielerfarbe, Bomben als graue Säcke mit Totenkopf-freiem Warnsymbol.
- **Sound:** Fang-Plopp, Sack-Rumms bei Fehlgriff.
- **Animation:** Geschenke drehen sich im Fall, Korb federt beim Fangen.
- **Highlight:** 10er-Serie ohne Fehler: Korb wird golden.

#### EXP-070 · Gummiband-Challenge (`gummiband-challenge`) · P3
- **Welt:** Physiklabor mit Spannungsmessgerät.
- **Figuren & Material:** Gummiband als elastische Linie mit Zielzone.
- **Sound:** Spannungston steigt mit Dehnung, „Twang“ beim Reißen.
- **Animation:** Band schwingt nach, Zielzone pulsiert ruhig.
- **Highlight:** Perfekte Zeit in der Zone: Messgerät schlägt auf Maximum aus.

#### EXP-064 · Kistenchaos (`kistenchaos`) · P3
- **Welt:** Hafen-Lagerhalle mit Containern.
- **Figuren & Material:** Kisten mit Aufklebern, Ziele als Bodenmarkierung.
- **Sound:** Schleifgeräusch beim Schieben, Einrasten am Ziel.
- **Animation:** Kisten rutschen mit leichtem Nachschwingen.
- **Highlight:** Alle Kisten am Ziel: Hafenkran hupt.

#### EXP-042 · Kronenjagd (`kronenjagd`) · P1
- **Welt:** Burghof mit Teppich und Thron in der Mitte.
- **Figuren & Material:** Krone als goldenes Objekt, das von Kopf zu Kopf springt.
- **Sound:** Fanfare beim Kronengewinn, Trompeten-Abfall bei Verlust.
- **Animation:** Krone springt im Bogen zum Fänger, Krönchen-Zähler läuft hoch.
- **Highlight:** 30 Sekunden durchgehend gekrönt: Thronsaal-Banner wehen.

#### EXP-078 · Labyrinth-Chaos (`labyrinth-chaos`) · P2
- **Welt:** Heckenlabyrinth, Wände wachsen und schrumpfen als Hecken.
- **Figuren & Material:** Gartenzwerg-Wegweiser (eigene Figuren).
- **Sound:** Rascheln der Hecken beim Umbau, Gartentor beim Ausgang.
- **Animation:** Hecken wachsen aus dem Boden (Scale-Y), Ausgang leuchtet.
- **Highlight:** Abkürzung erwischt: Zwerg winkt.

#### EXP-043 · Laser-Hüpfer (`laser-huepfer`) · P2
- **Welt:** Raumstations-Trainingshalle mit Sternenfenster.
- **Figuren & Material:** Laser als ruhige Leuchtbalken (keine Blitze), Avatare mit Raumhelm.
- **Sound:** Summen der Laser, Sprung als „Boing“, Treffer als Elektro-Brumm (kurz).
- **Animation:** Laser wandern ruhig, Treffer lässt den Helm kurz beschlagen.
- **Highlight:** 20 Sprünge in Folge: Schwerelosigkeit (Sprünge werden kurz höher).

#### EXP-077 · Minenlauf (`minenlauf`) · P2
- **Welt:** Wüsten-Ausgrabungsfeld mit Zahlen im Sand.
- **Figuren & Material:** Zahlen als Steintafeln, Minen als Sandfallen (freundlich).
- **Sound:** Schritte im Sand, Falle als „Flump“ mit Sandwolke.
- **Animation:** Aufgedeckte Felder wehen den Sand weg.
- **Highlight:** Ziel erreicht ohne Fehltritt: Kamelkarawane zieht vorbei.

#### EXP-033 · Pfeilfieber (`pfeilfieber`) · P2
- **Welt:** Signalstation am Bahnhof, Pfeile als Weichensignale.
- **Figuren & Material:** Pfeil-Signaltafeln, Weichenhebel.
- **Sound:** Weichen-Klack bei jeder Eingabe, Zug fährt durch bei Erfolg.
- **Animation:** Pfeile kippen nacheinander um, Fehlstellung blinkt einmal.
- **Highlight:** Fehlerfreie Serie: Ein Zug rauscht durchs Bild.

#### EXP-073 · Puzzle-Panik (`puzzle-panik`) · P2
- **Welt:** Werkbank mit Schiebepuzzle aus Holz.
- **Figuren & Material:** Eigene Puzzlemotive pro Runde (Landschaften, Tiere, eigene Illustrationen).
- **Sound:** Holz-Schieben, Einrasten am richtigen Platz.
- **Animation:** Gelöstes Bild schließt die Lücke, Rahmen glänzt.
- **Highlight:** Neuer Rekord: Stoppuhr klingelt.

#### EXP-094 · Reaktor-Notfall (`reaktor-notfall`) · P1
- **Welt:** Retro-Kontrollraum mit Knöpfen, Zeigerinstrumenten und Kühlrohren (fiktive Anlage).
- **Figuren & Material:** Instrumente pro Spieler, Temperaturanzeige als Säule.
- **Sound:** Alarmton steigt mit Temperatur (nicht schrill), Kühlung als Zischen, Erfolg als Entwarnung.
- **Animation:** Säule steigt, Rohre glühen rot, bei Lösung Dampfwolke.
- **Highlight:** Gerettet bei 99 %: Alle Instrumente fallen auf Grün, Seufzer der Anlage.

#### EXP-072 · Rhythmus-Rausch (`rhythmus-rausch`) · P1
- **Welt:** Konzertbühne mit Lautsprecherwand.
- **Figuren & Material:** Noten als fallende Plättchen auf Spuren.
- **Sound:** Eigener synthetischer Beat pro Lied (prozedural, 3 Tempi), Treffer erzeugen Töne der Melodie.
- **Animation:** Perfekte Treffer lassen die Spur aufleuchten, Combo-Zähler wächst.
- **Highlight:** 50er-Combo: Lichtshow (sanft, kein Stroboskop) und Publikumsjubel.

#### EXP-076 · Schatzgräber (`schatzgraeber`) · P2
- **Welt:** Strandbucht mit Sandburgen.
- **Figuren & Material:** Schaufeln, Krebse als Hindernisse, Schätze in Truhen.
- **Sound:** Graben, Krebs-Klackern, Truhe öffnen.
- **Animation:** Sandhaufen wachsen, Schatz glitzert beim Freilegen.
- **Highlight:** Doppelschatz: Zwei Truhen gleichzeitig, Münzregen.

#### EXP-080 · Scheinwerfer-Flucht (`scheinwerfer-flucht`) · P2
- **Welt:** Museumssaal bei Nacht, Scheinwerfer der Wache.
- **Figuren & Material:** Avatare als Meisterdiebe mit Maske (spielerisch), Vitrinen als Deckung.
- **Sound:** Leises Schleichen, Scheinwerfer-Surren, Alarm beim Erwischtwerden.
- **Animation:** Lichtkegel als Gradient, Erwischte erstarren als Schattenriss.
- **Highlight:** Letzter Dieb: Vitrine öffnet sich, Diamant funkelt.

#### EXP-079 · Schubsarena (`schubsarena`) · P1
- **Welt:** Sumo-Ring auf einer Eisscholle, die schrumpft.
- **Figuren & Material:** Avatare mit Sumo-Gürtel-Accessoire.
- **Sound:** Stoß-Wumms, Rutschen auf Eis, Platsch beim Rausfallen.
- **Animation:** Eis bricht vom Rand, Geschubste rutschen und fallen ins Wasser.
- **Highlight:** Doppel-Rauswurf mit einem Stoß: „Doppelschubser!“.

#### EXP-075 · Stillgestanden! (`stillgestanden`) · P2
- **Welt:** Schulhof mit Ampelfigur.
- **Figuren & Material:** Große Ampel mit Männchen, Startlinie mit Kreide.
- **Sound:** Ampel-Piepen (Blindenampel-Rhythmus), Pfiff beim Erwischtwerden.
- **Animation:** Erwischte rutschen zur Startlinie zurück.
- **Highlight:** Ziel erreicht: Pokal auf dem Klettergerüst.

#### EXP-034 · Sortierstation (`sortierstation`) · P2
- **Welt:** Paketzentrum mit Förderband.
- **Figuren & Material:** Pakete in Formen und Farben, Kisten mit Etiketten.
- **Sound:** Band-Surren, Kistenplopp, Fehlwurf als Hupe.
- **Animation:** Pakete fahren übers Band, richtige springen in die Kiste.
- **Highlight:** Regelwechsel mitten im Lauf: Band stoppt, Etiketten drehen sich.

#### EXP-035 · Tickendes Paket (`tickendes-paket`) · P1
- **Welt:** Postkammer mit Bernsteinlicht.
- **Figuren & Material:** Paket mit Wecker obendrauf.
- **Sound:** Ticken, das unregelmäßig schneller wird, Weitergabe als Rascheln, Platzen als Konfetti-Puff.
- **Animation:** Paket hüpft von Hand zu Hand, wackelt stärker gegen Ende.
- **Highlight:** Platzt: Konfetti und Luftschlangen über dem Verlierer (freundlich).

#### EXP-091 · Turmbauer (`turmbauer`) · P2
- **Welt:** Baustelle mit Kran und Skyline.
- **Figuren & Material:** Bauklötze mit Fensterreihen, Turm wird zum Hochhaus.
- **Sound:** Klotz landet mit Wumms, perfekte Landung mit hellem Ding.
- **Animation:** Überhänge werden abgeschnitten und fallen, Kamera fährt mit dem Turm hoch.
- **Highlight:** Höchster Turm des Abends: Flagge auf der Spitze.

#### EXP-074 · Wortjagd (`wortjagd`) · P2
- **Welt:** Redaktion mit Setzkasten, Buchstabenwürfel im Raster.
- **Figuren & Material:** Bleilettern-Optik.
- **Sound:** Lettern-Klicken beim Ziehen, gefundenes Wort als Schreibmaschinen-Glocke.
- **Animation:** Wortpfad leuchtet, Wort fliegt in die eigene Spalte.
- **Highlight:** Längstes Wort der Runde: Zeitungsschlagzeile.

#### EXP-032 · Gedächtnisküche (`gedaechtnis-kueche`) · P2
- **Welt:** Warme Landküche mit Rezeptkarte und Holzbrett.
- **Figuren & Material:** Zutaten als eigene Illustrationen (Ei, Mehl, Tomate …).
- **Sound:** Schnippeln, Brutzeln, Ofen-Ding bei fertigem Rezept.
- **Animation:** Zutaten springen in die Schüssel.
- **Highlight:** Perfektes Rezept: Kuchen geht im Ofen auf.

#### EXP-031 · Zahlenzoo (`zahlenzoo`) · P2
- **Welt:** Zoo mit Gehegen, Tiere huschen durch.
- **Figuren & Material:** Eigene Tierfiguren (Zebra, Pinguin, Giraffe …).
- **Sound:** Tierlaute synthetisch und kurz, Zähl-Klicker.
- **Animation:** Tiere laufen in Herden durch, Lösung zeigt Tierzählung gestapelt.
- **Highlight:** Exakte Zählung: Pinguin macht Rad.

### Einzelspieler

#### EXP-096 · Sudoku (`sudoku`) · P3
- **Welt:** Ruhige Bibliothek, Logiktafel.
- **Sound:** Bleistift-Tippen, gelöste Box als leiser Akkord.
- **Animation:** Gelöste Zeile, Spalte oder Box schimmert kurz.
- **Highlight:** Gelöst: Papier faltet sich zu einem Kranich.

#### EXP-097 · 2048 (`2048`) · P3
- **Welt:** Bernsteinfarbene Zahlentafel.
- **Sound:** Verschmelzen mit steigender Tonhöhe je Wert.
- **Animation:** Kacheln gleiten und verschmelzen mit kleinem Puls.
- **Highlight:** 2048: Kachel wird zu Gold, Lichtstrahl.

#### EXP-098 · Wellenwacht (`wellenwacht`) · P2
- **Welt:** Grün-kupferne Landschaft (besteht).
- **Sound:** Eigene Turmtöne je Typ, Wellenhorn zu Beginn jeder Welle.
- **Animation:** Geschosse mit Spur, Gegner zerfallen in Partikel (Canvas).
- **Highlight:** Letzte Welle geschafft: Basis hisst Flagge.

#### EXP-099 · Snake (`snake`) · P3
- **Welt:** Neon-Raster.
- **Sound:** Fressen als Plopp mit steigender Tonhöhe.
- **Animation:** Schlange mit weicher Kopfbewegung.
- **Highlight:** Neuer Rekord: Spur leuchtet in Regenbogen.

#### EXP-100 · Memory (`memory`) · P3
- **Welt:** Ruhige Tischplatte.
- **Sound:** Umdrehen, Paar als Doppelton.
- **Animation:** 3D-Flip per CSS (transform).
- **Highlight:** Perfektes Spiel: Karten fliegen zum Stapel.

#### EXP-101 · Minesweeper (`minesweeper`) · P3
- **Welt:** Werkstatt-Raster.
- **Sound:** Aufdecken als Klick, Flagge als Stecken.
- **Animation:** Kaskade beim Freilegen großer Flächen.
- **Highlight:** Gelöst: Alle Minen werden als Blumen sichtbar.

#### EXP-102 · Nonogramm (`nonogramm`) · P3
- **Welt:** Karopapier.
- **Sound:** Stiftstrich.
- **Animation:** Fertiges Motiv färbt sich ein.
- **Highlight:** Motiv erwacht kurz zum Leben (kleine Animation).

#### EXP-103 · Sokoban (`sokoban`) · P3
- **Welt:** Lagerhaus.
- **Sound:** Kisten-Schieben, Ziel-Klick.
- **Animation:** Kisten rutschen weich.
- **Highlight:** Level geschafft: Gabelstapler fährt durch.

#### EXP-104 · Block Puzzle (`block-puzzle`) · P3
- **Welt:** Materialhafte Formen.
- **Sound:** Einrasten, Reihe weg als Glas-Kling.
- **Animation:** Volle Reihen zerfallen in Splitter.
- **Highlight:** Mehrfachreihe: Combo-Schriftzug.

#### EXP-105 · Solitaire (`solitaire`) · P3
- **Welt:** Ruhiger Kartentisch.
- **Sound:** Karte legen, Fundament-Klick.
- **Animation:** Automatisches Ablegen am Ende als Karten-Kaskade.
- **Highlight:** Gewonnen: Klassische springende Karten-Kaskade (eigene Umsetzung).

#### EXP-106 · Mahjong Solitaire (`mahjong-solitaire`) · P3
- **Welt:** Teehaus mit Bambus.
- **Sound:** Steinklicken, Paar als Holzklappe.
- **Animation:** Paare gleiten auseinander und verschwinden.
- **Highlight:** Leeres Brett: Teekanne dampft.

#### EXP-107 · Match-3 (`match-3`) · P3
- **Welt:** Botanischer Garten.
- **Sound:** Blüten-Plopp, Kombo steigt in Tonhöhe.
- **Animation:** Symbole fallen nach, Kombos wachsen als Blumenranken.
- **Highlight:** Riesenkombo: Garten blüht auf.

### Party-Modi (ohne VIS-Paket)

#### EXP-108 · Party-Brett (`party-brett`) · P1
- **Welt:** Großes Spielbrett als Jahrmarkt mit Feldern, die zu Minispielen führen.
- **Figuren & Material:** Große Pöppel pro Spieler, Würfel als Jahrmarkt-Glücksrad.
- **Sound:** Jahrmarktsorgel (prozedural, leise), Feldereignis mit Glocke.
- **Animation:** Pöppel laufen das Brett ab, Übergang zum Minispiel als Vorhang.
- **Highlight:** Zieleinlauf: Riesenrad leuchtet.

#### EXP-109 · Modifikatoren (`modifikatoren`) · P3
- **Welt:** Kein eigenes Spielfeld, Modifikatoren erscheinen als Spielkarten-Overlay im jeweiligen Spiel.
- **Figuren & Material:** Eigene Modifikator-Karten mit Symbol (Doppelte Punkte, Spiegelverkehrt …).
- **Sound:** Karten-Zaubereffekt beim Aktivieren.
- **Animation:** Karte fliegt ins Bild und legt sich an den Rand.
- **Highlight:** Modifikator dreht das Ergebnis: Kurzes Blitzlicht auf der Wertung.

#### EXP-110 · Chaos-Modus (`chaos-modus`) · P3
- **Welt:** Wie Modifikatoren, mit Glücksrad, das die Chaos-Regel auslost.
- **Sound:** Glücksrad-Rattern.
- **Animation:** Rad dreht und stoppt, Regel-Banner fällt herab.
- **Highlight:** Doppeltes Chaos: Rad dreht zweimal.

#### EXP-111 · Survival-Abend (`survival-abend`) · P2
- **Welt:** Expeditionskarte durch den Abend, Leben als Fackeln.
- **Figuren & Material:** Fackeln pro Spieler, Basislager-Symbol pro Etappe.
- **Sound:** Fackel erlischt mit Zischen, Etappe geschafft als Horn.
- **Animation:** Fackeln flackern ruhig (keine schnelle Helligkeit), Ausgeschiedene werden Zuschauer am Lagerfeuer.
- **Highlight:** Letzter Überlebender: Gipfelflagge.

---

## Teil C – Umsetzungsreihenfolge (Vorschlag)

| Welle | Inhalt | Warum |
|---|---|---|
| 1 | EXP-F1 Klang-Engine, EXP-F2 Animations-Baukasten | Grundlage für alles andere |
| 2 | EXP-F3 Material, EXP-F4 Siegerbühne, EXP-F6 Prüfwerkzeuge | Gemeinsame Teile, damit Spielpakete klein bleiben |
| 3 | P1-Karten und -Würfel: Poker, UNO, Mau-Mau, Skat, Doppelkopf, Kniffel | Meistgespielt, nutzen Casino-, Karten- und Würfel-Bausteine |
| 4 | P1-Brett: Schach, MÄDN, Monopoly, Scrabble, Städtehandel, Gebietskampf, Scotland Yard | Figurenbewegung (`walk`) lohnt sich hier am meisten |
| 5 | P1-Party: Werwolf, Doppelagent, Malen & Raten, Kritzelpost, Schlagfertig, Kronenjagd, Schubsarena, Rhythmus-Rausch, Reaktor-Notfall, Tickendes Paket, Party-Brett | Abendprogramm |
| 6 | EXP-F5 Atmosphäre, danach alle P2 | |
| 7 | Alle P3 | |

Eine Welle passt gut auf je einen Agenten-Prompt. In Welle 3 bis 5 kann Claude Code die Karten-, Würfel- und Brettspiele nehmen und Codex parallel die Party-Spiele, wie bei den VIS-Spuren.

## Abnahme pro Spielpaket

- Klangpalette vollständig (Pflichtereignisse plus spieltypische), im Testmodus geprüft.
- Mindestens die Animationen aus dem Eintrag umgesetzt, mit „Animationen reduzieren“ geprüft.
- FPS-Budget per `expectSmoothMotion` eingehalten (Handy und PC).
- Highlight-Moment ausgelöst und als Screenshot oder Kurzvideo (`docs/design/experience/<id>/`) abgelegt.
- Keine verdeckte Info durch Animation oder Ton verraten (Tests aus V2-09 laufen weiter grün).
- Neu laden, Pause und Zuschauen ohne Animationsrückstau.
- In `docs/design/game-experience-roadmap.json` Status, Commit und Nachweise eintragen.
