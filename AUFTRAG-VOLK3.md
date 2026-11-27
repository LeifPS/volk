# Auftrag: Volk 3 (Neustart auf Basis von Volk, tiefer und größer) mit 11 Zeitaltern, Weltraum-Ebene, Distrikten, Civics, Religion, Naturwundern und neuer Grafik

Du arbeitest im Repo **LeifPS/volk3**. Es ist **leer** und gehört nur dir. Das Spiel "Volk" (Echtzeit-Strategie im Pixelart-Stil, Cloudflare Workers + Durable Object, reines Vanilla-JS) existiert bereits fertig in einem anderen Repo. Deine Aufgabe: eine **Kopie** davon in volk3 holen und dort sehr viel weiterbauen (Liste unten). Arbeite sehr gründlich und mehrere Stunden am Stück ohne Rückfragen. Wenn etwas offen ist, entscheide selbst nach dem Leitsatz: *Was macht das Spiel für ein paar Freunde und die Familie am besten spielbar und am schönsten anzusehen?* Halte jede Entscheidung in `ENTSCHEIDUNGEN.md` fest.

## 0. Absolute Regeln

- **Die Repos `LeifPS/volk` und `LeifPS/volk2` sind tabu.** Nichts dort ändern, nichts pushen, nichts löschen. Du liest nur aus volk (Quelle der Kopie).
- Du arbeitest und pusht nur in **LeifPS/volk3**, direkt auf `main`, keine Pull Requests.
- Du deployst nicht selbst. Leif verbindet volk3 später mit Cloudflare Workers Builds (Adresse dann `volk3.leifps.workers.dev`).
- Alle Texte **deutsch mit Umlauten**, **keine Emojis**, Pixelart-Stil, alle Grafik im Code gezeichnet (kein externes Bildmaterial).

## 1. Start: Kopie holen (Stufe 0)

1. Den aktuellen Volk-Stand besorgen: Leifs lokaler Volk-Ordner (bisher `Downloads\volk-start-paket\volk-start-paket`) oder, falls er fehlt, `git clone https://github.com/LeifPS/volk` (öffentlich) in einen Hilfsordner **außerhalb** von volk3.
2. Den **gesamten Arbeitsbaum ohne `.git`** in den volk3-Ordner kopieren (Dateien, `public/`, `src/`, `tests/`, `tools/`, `hub-eintrag/` usw.). Neue Git-Historie in volk3.
3. Anpassen: Worker-Name in `wrangler.jsonc` auf `volk3`, README/Titel ("Volk 3"), Hub-Eintrag-Dateien als Kopie belassen aber mit Hinweis. **Durable-Object-Klasse `Welt` nicht umbenennen.** Alle Tests laufen lassen (`npm install`, `npm test`): Sie müssen vor jeder weiteren Änderung grün sein. Erster Commit: `Patch: Volk 3 startet als Kopie von Volk`.
4. Alte Dokumente (`PROMPT.md`, `ENTSCHEIDUNGEN.md`, `ABNAHME.md`, `FORTSCHRITT.md`, `README.md`, `DATENFORMAT.md`, `CLIENT-API.md`) lesen. Sie bleiben gültig, bis du sie änderst.
5. Leif legt zwei Dateien in den Ordner: `PLAN-ZEITALTER-8-11.md` (Entwurf der 4 neuen Zeitalter mit allen Forschungen, Einheiten, Gebäuden, Wundern, Zahlen) und diese Anweisung. Fehlt der Plan, melde das und höre auf. **Wo Plan und dieser Prompt sich widersprechen, gilt dieser Prompt.**

`FORTSCHRITT.md` ist dein Arbeitsgedächtnis: Schreibe nach **jeder Stufe** hinein, was fertig ist, was als Nächstes kommt und wo etwas offen blieb, damit ein neuer Lauf nahtlos weitermachen kann, falls du abbrichst.

## 2. Was gebaut wird (Überblick)

1. **Vier neue Zeitalter** (KI, Fusion, Weltraum, Sterne) laut Plan.
2. **Weltraum-Ebene** (zweite Karte) laut Abschnitt 4.
3. **Distrikte** wie in Civ 6 (ausbaubar, mit Gebäude-Stufen) und **platzierte Weltwunder**.
4. **Naturwunder** auf der Karte.
5. **Civics-Baum** (zweiter Fortschrittsbaum Kultur, ca. 120 Civics), **Regierungen** und **Politikkarten**.
6. **Eurekas/Boosts** (Forschen und Civics durch Tun beschleunigen).
7. **Religion** wie in Civilization 6.
8. **Symbol über jeder Einheit** (Banner), **Animationen** (Einheiten, Verbesserungen, Städte, Wunder) und **bessere Grafik** insgesamt.
9. **Mehr Spieltiefe** (Abschnitt 5b: Handel/Diplomatie, Zufriedenheit/Luxusgüter, Ereignisse, Versorgung) und **Freiheit zum Umbau** (Abschnitt 3a).
10. **Polishing und Balancing** von allem.
11. **Gut lesbarer Code** für Sprites, Symbole und Daten, damit eine andere KI sie später direkt aus dem Repo übernehmen kann.

**Nicht Teil dieses Auftrags** (nicht bauen): Große Persönlichkeiten, Statthalter, Push-Benachrichtigungen, Volks-Fähigkeiten, Saisons/Ruhmeshalle/Zeitraffer, Wappen-Editor, Forschungsschlange, das Kartenspiel (kommt später mit einer anderen KI).

## 3. Entscheidungen von Leif (verbindlich)

- **Länge:** langes Endgame: rund 22 Forschungen je neuem Zeitalter (KI 23), Spalten 44 bis 67, Zukunftstechnologien danach in Spalte 68.
- **Antimaterie-Rakete** bleibt (trifft ein Ziel, keine Flächenwirkung). Die Atomwaffe bleibt die einzige Flächenwaffe.
- **Weltraum = eigene zweite Ebene.** Die Plan-Gebäude `mondbasis`, `marskolonie`, `asteroidenbergwerk` entfallen; Kolonie-Städte und Verbesserungen auf der Weltraum-Ebene übernehmen ihre Rolle.
- **KI-Völker** forschen weiter höchstens bis zur Moderne, betreten die Weltraum-Ebene nie. Barbaren bleiben bei der Atomzeit-Infanterie und erscheinen nur auf der Erde.
- **Zeitalter-Namen und -IDs:** KI-Zeitalter `ki`, Fusionszeitalter `fusion`, Weltraumzeitalter `weltraum`, Sternenzeitalter `sterne`.
- **Distrikte:** Civ-6-artig mit Ausbau (Abschnitt 5), ca. 8 Distrikttypen plus einzigartige Distrikte.
- **Civics:** ca. 120 Civics, **jede mit echter Wirkung** (kein Füllwerk), plus Regierungen und Politikkarten (Abschnitt 6).
- **Religion:** wie Civ 6 (Abschnitt 7).
- Zahlen im Plan sind **Startwerte**. Stelle Dauern und Kosten per Balance-Simulation ein. Neue Zeitalter sind Endgame: ein guter Spieler soll sie in etwa 3 bis 5 Wochen durchspielen.

## 3a. Freiheit zum Umbau und Spieltiefe

- **Du darfst das Spiel großzügig umbauen, auch halb neu schreiben**, wenn es dadurch besser, tiefer oder wartbarer wird. Das gilt für Datenformate, Engine, Netzprotokoll, Client und Kartenerzeugung. Leif will ausdrücklich ein **tiefes** Spiel, keine Aneinanderreihung von Listen.
- Bevor du etwas Großes umbaust: kurz in `ENTSCHEIDUNGEN.md` begründen (was, warum, was dadurch besser wird). Danach durchziehen und alle Tests mitziehen. Keine halben Umbauten committen.
- **Keine Siegbedingungen.** Es gibt keinen Sieg, kein Spielende und keine Siegpunkte. Das Spiel ist eine dauerhafte Welt für Freunde und Familie. Die Sternenarche und andere Endgame-Wunder sind Ziele und Prestige, beenden aber nichts.
- Bleibe dem Kern treu: Echtzeit, Pixelart, Handy zuerst, ein Server (Durable Object) für alle Spieler, Zeitalter-Fortschritt wie bisher.

## 3b. Was sich nicht ändern darf

- **Keine Migration nötig.** volk3 ist ein Neustart; alte Spielstände und alte IDs müssen nicht weiterlaufen. Der Spielzustand behält trotzdem ein Feld `version` (für spätere Änderungen), aber es gibt kein Migrationsgerüst und keine Snapshot-Tests. Neue Welten starten mit dem neuen Format.
- **IDs** dürfen umbenannt oder neu geordnet werden, wenn das die Daten klarer macht. Halte sie über das ganze Projekt konsistent und dokumentiere größere Umbenennungen in `ENTSCHEIDUNGEN.md`.
- **Kartenerzeugung:** Die Erdkarte darf neu gestaltet werden (z. B. für Naturwunder, bessere Küsten, Flüsse, Biome), muss aber **deterministisch** bleiben: gleiche Welt auf allen Geräten, daher nur exakte Arithmetik (keine `Math.sin`, `Math.exp`, `Math.pow`) und ein Karten-Hash, der in Tests festgeschrieben ist. Der Hash darf sich einmalig ändern, danach ist er stabil.
- Free-Plan von Cloudflare: Lastabschätzung in `ENTSCHEIDUNGEN.md` am Ende neu messen und eintragen.
- Alle Einheiten nutzen **vorhandene Klassen** (Ausnahmen: Missionar/Apostel als Klasse `zivil` mit neuen Fähigkeiten, siehe Religion). So greifen die 13 Beförderungsbäume (Civ-6-System) weiter.
- Jede Einheit, jedes Gebäude, jedes Wunder, jede Verbesserung, jede Option, jede Civic, jede Regierung und jede Politikkarte wird von **genau einer Forschung bzw. Civic freigeschaltet**. Das prüfen Datentests.
- `ZEIT_TEMPO`, `MARSCH_ZEITALTER`, `PRODUKTION_LANGSAMER`, `FORSCHUNG_LANGSAMER`, `WIRTSCHAFT_TEMPO` bleiben für die alten Zeitalter unverändert, die neuen Zeitalter bekommen eigene Einträge.
- Civ-6-Orientierung bleibt Leitbild (Kampf, Beförderungen, Aufrüsten, Kampfvorschau, Banner).

## 4. Weltraum-Ebene (zweite Karte)

Das Weltraumzeitalter bekommt eine **eigene zweite Hex-Karte** (`ebene` 1; die Erde ist `ebene` 0).

- **Karte:** ca. 64×40 Felder, eigener Seed und eigener Karten-Hash. Hintergrund Orbit (leer, begehbar nur für Raumschiffe). Darauf feste Körper: **Mond** (ca. 35 Felder), **Mars** (ca. 90), **Eismond** (ca. 30) und **3 Asteroidenfelder**. Erzeugung deterministisch mit exakter Arithmetik, gleiche Welt auf allen Geräten.
- **Übergang:** Nur über einen **Raumhafen** (Gebäude) mit **Orbitalfähre** oder Raumschiffen. Einheiten wechseln die Ebene durch einen Befehl "In den Orbit" bzw. "Landen" am Raumhafen. Dauer und Kosten sind Balance-Werte.
- **Kolonien:** Die zivile Einheit `kolonist` (Fähigkeit `gruenden`) gründet **Kolonie-Städte** auf Mond, Mars und Eismond. Kolonien nutzen die normale Stadtlogik (Gebäude, Produktion, Wachstum), mit eigenem Look (Kuppeln, Lichter).
- **Verbesserungen im All:** `mondmine`, `heliumextraktor`, `asteroidenbohrer`, `marsmine`, `eisfoerderung`, `kuppelfarm`. Sie liefern Titan, Helium-3 usw. ins Reichslager, **aber nur solange das Reich einen Raumhafen hat**.
- **Kampf:** Im All kämpfen nur die Raumschiff- und Bodeneinheiten laut Plan. Sicht, Fernkampf und Beförderungen funktionieren wie auf der Erde.
- **Technik:** Das Feld `ebene` (0/1) kommt in **alle** Systeme (Einheiten, Städte, Verbesserungen, Sicht, Pfadfindung, Netzprotokoll, Kampf, Rendering, Spielstand). Der Client bekommt einen Umschalter **Erde / Weltraum** (Taste und Knopf), die Minikarte zeigt die aktive Ebene.
- KI-Völker und Barbaren betreten die Weltraum-Ebene nicht.

## 5. Distrikte (light), Weltwunder-Platzierung, Naturwunder

### Distrikte (ca. 8)
Eine Stadt darf zusätzlich zu ihren Gebäuden **Distrikte auf Nachbarfeldern** bauen. Ein Distrikt belegt ein Feld und bündelt Gebäude einer Sorte.

| Distrikt | Gebäudegruppe | Nachbarschaftsbonus (Beispiel) |
|---|---|---|
| Campus | Forschung | +1 je Berg, Naturwunder; +0,5 je Dschungel |
| Heiligtum | Glaube | +1 je Berg, Naturwunder |
| Handelsplatz | Gold, Handel | +1 je Fluss, Küste; +2 je Handelsroute |
| Industriezone | Produktion | +1 je Mine, Steinbruch |
| Theaterplatz | Kultur | +1 je Weltwunder, Naturwunder |
| Hafen | See, Marine | +1 je Küstenressource |
| Militärlager | Militär | +1 Erfahrung für Einheiten; Verteidigungsbonus |
| Stadtviertel | Wohnen, Wachstum | +1 Wohnraum je Fluss/See |

Regeln:
- Distrikte sind **Verbesserungen auf Feldern** im Stadtgebiet (nutze das vorhandene Verbesserungssystem, damit Spielstand und Rendering mitziehen), brauchen eine Forschung/Civic zum Freischalten und kosten Produktion.
- Distrikte ersetzen nicht das ganze Gebäudesystem, sondern **ordnen es neu**: Spezialgebäude (Campus, Heiligtum usw.) gehören in Distrikte, einfache Stadtgebäude bleiben in der Stadt. Entscheide selbst die saubere Aufteilung und trage sie in `ENTSCHEIDUNGEN.md` ein. Nachbarschaftsboni und Stadtgröße begrenzen die Zahl der Distrikte (Balance-Wert).
- Nachbarschaftsboni werden im Stadtfenster **angezeigt** (Summe, Quelle je Feld).
- Das Stadtbild zeigt Distrikte als sichtbare Gebäudegruppen im Pixelstil.

#### Distrikte ausbauen (wie Civ 6)
- Jeder Distrikttyp hat eine **Gebäudekette in 3 Stufen** (z. B. Campus: Bibliothek, Universität, Forschungslabor). Höhere Stufen brauchen die niedrigere und eine Forschung/Civic. Spätere Zeitalter bringen **Ausbaustufen des Distrikts selbst** (Optik und Grundwert wachsen mit dem Zeitalter).
- **Nachbarschaftsboni wachsen** mit den Stufen (z. B. Anteil verdoppelt sich mit Stufe 3) und mit Politikkarten.
- **Spezialisierung:** Ein Distrikt bekommt eine Ausrichtung (Beispiel Industriezone: Werft oder Kraftwerk; Handelsplatz: Markt oder Hafenkontor), die Boni verschiebt. Umstellen kostet Zeit.
- **Einzigartige Distrikte:** Jeder Volkstyp bzw. jede Volks-Eigenschaft kann einen eigenen Ersatz-Distrikt bekommen (billiger, mit Zusatzbonus). Mindestens 4 Stück.
- **Verteidigung und Plünderung:** Distrikte haben Lebenspunkte, können belagert und **geplündert** werden (Produktion und Bonus fallen aus, Reparatur kostet). Das Militärlager und Mauern schützen sie.
- **Stadtfenster:** zeigt je Distrikt Stufe, Boni (aufgeschlüsselt), Bauoptionen und den nächsten Ausbau. Handy-tauglich, kein Textwust.
- Weltraum-Kolonien nutzen eigene Distrikte (Kuppelviertel, Forschungskuppel, Bergbau-Distrikt).

### Weltwunder platzieren
Jedes Weltwunder (alte **und** neue) muss auf einem **Feld im Stadtgebiet** gebaut werden. Platzierungsregeln je Wunder (z. B. Küste, nahe Berg, auf Fluss). Der Spieler wählt das Feld beim Bauauftrag (gültige Felder werden hervorgehoben). Jedes Wunder hat sein **eigenes sichtbares Pixelmodell** auf der Karte.

### Naturwunder
- ca. 12 Naturwunder (z. B. Vulkan, Riesenkrater, Korallenriff, Regenbogenberg, Schluchtmeer, Geysirtal, Kristallhöhle, Wasserfall, Eisfjord, Wüstenoase, Nebelwald, Monolith), je 1 bis 4 Felder groß.
- **Eigene deterministische Erzeugung** mit eigenem Hash, wahlweise direkt in die neu gestaltete Erdkarte eingebaut oder als Schicht darüber (entscheide nach Qualität). Naturwunder liegen nie auf Startpositionen und nie auf Stadtfeldern.
- Jedes Naturwunder hat einen Feldertrag, einen Bonus für angrenzende Distrikte und einen **Entdeckungsbonus** (einmalig Kultur/Wissen für das Volk, das es zuerst sieht).

## 5b. Mehr Spieltiefe (zusätzliche Systeme)

Leif hat keine Auswahl getroffen und überlässt dir die Tiefe. Baue diese vier Systeme **in der Größe, die zum Spiel passt** (nicht überladen, aber spürbar), jedes mit eigenem Daten-Modul und Tests:

1. **Handel und Diplomatie:** Handelsrouten zwischen Städten (auch zwischen Völkern) mit Ertrag nach Entfernung und Gütern; Verträge (Frieden, Bündnis, Handelsabkommen, Offene Grenzen); Embargo; Gesandte (zivile Einheit) für Beziehungen; Beziehungswert zwischen Völkern, der durch Handeln, Krieg und Verträge steigt oder fällt. KI-Völker reagieren darauf.
2. **Zufriedenheit und Luxusgüter:** Luxusrohstoffe (Wein, Seide, Gewürze, Edelsteine usw.) gelten als Annehmlichkeiten und werden an Städte verteilt; Zufriedenheit je Stadt beeinflusst Wachstum, Produktion und löst bei Unzufriedenheit Unruhen aus. Wohnraum begrenzt das Wachstum (Ausbau durch Gebäude, Distrikte, Wasserzugang, Zeitalter). Anzeige im Stadtfenster.
3. **Ereignisse und Katastrophen:** Zufallsereignisse mit Entscheidungen (z. B. Fund, Seuche, Handelsangebot, Aufstand), Naturkatastrophen (Dürre, Flut, Vulkanausbruch bei Naturwundern, Sturm); im späten Spiel **Klimawandel** durch Industrie (Küstenflut, Dürregürtel), der mit Technik (Fusion, Renaturierung) gedämpft wird. Ereignisse sind **deterministisch aus dem Welt-Seed** und Tempo, nicht aus `Math.random`. Selten genug, dass sie nicht nerven; Katastrophen sind abmilderbar.
4. **Versorgung und Kriegslogistik (leichtgewichtig):** Einheiten außerhalb des eigenen Gebiets verbrauchen langsam Versorgung (Nachschub aus nahen Städten, Karawanen, Schiffen); Belagerungen können Städte aushungern; **Kriegsmüdigkeit** wächst je Krieg und Verlust und dämpft Zufriedenheit; Besatzung gibt es nur über Garnisonen. Kein Mikromanagement-Zwang: Standardverhalten ohne Aufwand, Handy-tauglich.

Alles läuft über die gleichen Server-Pfade und Tempo-Konstanten wie der Rest. Neue Fortschrittsfelder gehören in den Spielzustand und in das Netzprotokoll; der Client zeigt sie in klaren Panels (Reich, Stadt, Diplomatie, Handel, Ereignisse).

## 6. Civics-Baum, Regierungen, Politikkarten

Ein **zweiter Fortschrittsbaum** neben der Forschung, gespeist von **Kultur** (neuer Ertrag je Stadt/Volk; vorhandene Kultur-Mechanik in Volk nutzen und ausbauen, nicht doppelt bauen).

- **ca. 120 Civics**, verteilt über alle 11 Zeitalter, **jede mit echter spielerischer Wirkung** (Bonus, Freischaltung, Politikkarte, Gebäude, Einheit, Regierung). Kein Füllwerk, keine reinen Zahlen ohne Folgen. Eigene Datei `public/shared/daten/civics.js` im Format der Forschung (kompakte Tabelle), **eigene Datentests**.
- **Voraussetzungen** wie im Forschungsbaum (Baumform, Spalten je Zeitalter). Zeitalter-Aufstieg bleibt an die Forschung gebunden; Civics geben Boni und Freischaltungen.
- **Regierungen** (ca. 8): z. B. Stammesordnung, Königtum, Republik, Handelsrepublik, Theokratie, Diktatur, Demokratie, Technokratie. Je Regierung: **Grundbonus**, **Plätze für Politikkarten** (Militär, Wirtschaft, Diplomatie, Joker), ein Spezialeffekt. Wechsel der Regierung ist möglich (Übergangszeit, in der sich der Bonus schwächt).
- **Politikkarten** (ca. 60): zuweisbar in Plätze der Regierung, **jederzeit tauschbar** gegen kleine Gebühr oder bei Civic-Abschluss kostenlos. Beispiele: Tribut (+Gold aus Siegen), Leibeigenschaft (+Bauprodukion), Marktaufsicht, Wehrpflicht (−Unterhalt), Propaganda (+Kultur), Bürgerwehr, Forschungsförderung.
- **UI:** eigener Reiter "Kultur" mit Baumansicht (wie Forschungsbaum), Regierungsfenster mit Kartenplätzen per Tippen/Klick. Handy-tauglich.
- Alle Effekte laufen über die **gleichen Zahlen-Pfade** wie Forschung (Ertrag, Unterhalt, Kampf, Wachstum), damit nichts doppelt wirkt und der Server alles prüfen kann.
- KI-Völker wählen Civics und Regierungen nach einfachem Plan (Priorität: Stärke ihrer Persönlichkeit).

## 7. Religion wie in Civilization 6

- **Glaubens-Ertrag** (Glaube) aus Heiligtümern, Naturwundern, Wundern, Politikkarten.
- Mit genug Glaube **Pantheon wählen** (ca. 12 Pantheons, kleiner Bonus).
- **Religion gründen:** Wer ein **Heiligtum** hat und genug Glaube sammelt, gründet eine **Religion** (Name aus einer eigenen Liste mit ca. 8 Religionen, begrenzt auf die Spielerzahl plus Reserve; ein späterer Abgleich mit dem Kartenspiel "Götter & Glaube" ist möglich, aber nicht Teil dieses Auftrags). Jede Religion bekommt **Gründer-**, **Anhänger-**, **Verehrungs-** und später **Reformer-Glaubenssätze** (ca. 40 insgesamt, je einer pro Kategorie wählbar).
- **Missionare** und **Apostel** (zivile Einheiten) verbreiten die Religion; **Religiöser Druck** der Städte breitet sich nach Nachbarstädten aus; Anzeige als Kartenebene und im Stadtfenster (Anhänger-Anteile).
- **Theologischer Kampf:** Apostel besitzen Fähigkeiten (Glaubenskampf, Bekehrung, Inquisition). Religiöse Einheiten kosten Glaube.
- Kein Weltkongress, keine Loyalität.
- Alles läuft in Echtzeit mit den vorhandenen Tempo-Konstanten; Werte per Balance-Test prüfen.

## 8. Eurekas / Boosts

- Jede Forschung **und** jede Civic hat eine **Eureka**: eine Bedingung, die beim Erfüllen **40 %** der Kosten erlässt (z. B. "3 Steinbrüche gebaut", "Küstenstadt gegründet", "Einheit zu Stufe 3 befördert", "Religion gegründet").
- Erfüllt wird nur durch **echtes Spielen**. Bedingungen sind klar benannt, im Forschungs-/Civic-Baum sichtbar (mit Fortschritt) und **serverseitig geprüft**.
- Eureka-Daten gehören in die Datendateien neben die Forschung/Civic (eigenes Feld), mit Datentest: jede hat eine prüfbare Bedingung, die im Spiel erreichbar ist.
- Meldung beim Auslösen (Toast), Eureka-Zähler im Fortschritts-Panel.

## 9. Optik: Einheiten-Symbole, Animationen, Grafik

Alles wird **im Code gezeichnet** (Canvas, Pixelart), ohne externe Bilder. Baue ein **Sprite-System**, das diese Zeichnungen einmal erzeugt und zwischenspeichert (Offscreen-Canvas), damit die Leistung auf dem Handy stabil bleibt (Ziel: 60 FPS auf einem mittleren iPhone bei normalem Zoom).

### 9.1 Symbol über jeder Einheit (Civ-6-Banner)
- Jede Einheit bekommt über dem Kopf ein **Banner in Volksfarbe** mit einem **weißen Silhouetten-Symbol** der Einheit. Beispiele: gekreuzte Speere für Speerträger, U-Boot-Silhouette für U-Boot, Bogen für Bogenschütze, Schiffsrumpf für Galeere usw.
- **Jede der heute ca. 96 Einheiten und aller 38 neuen** hat ein **eigenes, unterscheidbares Symbol**. Die Symbole werden in einer Datei `public/client/symbole.js` als Pixelmuster definiert (z. B. 12×12 oder 16×16) und im Banner skaliert.
- Banner zeigt zusätzlich Lebensbalken, Beförderungs-Sternchen und Zustand (Schlafen, Befestigt, Aktion). Lesbar auf dem Handy bei Zoomstufen.
- Es gibt einen **Test**, der prüft, dass **jede** Einheit ein Symbol hat und keine zwei Symbole bitgleich sind.

### 9.2 Animationen
- **Einheiten:** Laufen (pro Typ: Fuß, Reiter, Schiff, Fahrzeug, Flugzeug, Raumschiff), Idle (Atmen, Wippen), **Nahangriff** (Ausfall), **Fernangriff** (Schuss, Geschoss fliegt; Pfeil, Kugel, Laser, Rakete), Treffer, Tod. Richtungswechsel folgt der Bewegung.
- **Verbesserungen:** Je nach Typ **Betrieb** (Mine: Förderkorb und Staub; Farm: Wind in den Ähren; Plantage; Sägewerk; Fischerei: Netze; Bohrinsel: Flamme; Fusionsreaktor; Weltraum-Förderer), **Leerlauf** und **Ernte-Moment**. Nichts bleibt statisch.
- **Städte:** Rauch, Lichter bei Nacht, Menschen, Fahnen, Wachstumsstufen sichtbar; Distrikte als erkennbare Gebäudegruppen; Hafenbetrieb; Bau-Gerüste während Wunderbau.
- **Wunder und Naturwunder:** eigene Effekte (Glimmen, Dampf, Lichtspiele).
- **Zeitalter-Stile:** Die vier neuen Zeitalter bekommen eigene **Farbwelten und Muster** (siehe Plan Abschnitt 9). Einheiten- und Gebäude-Sprites unterscheiden sich sichtbar von Zeitalter zu Zeitalter.
- Animationen sind **abschaltbar** (Einstellung "Effekte: Voll / Reduziert / Aus") und laufen auf einem gemeinsamen Takt (kein Timer pro Objekt). Reduziert = nur Laufen und Idle.

### 9.3 Allgemeine Grafik
- Gelände mit mehr Tiefe (weiche Übergänge, Tages- und Wettereffekte soweit leistbar), Küstenlinien, Flüsse, Wälder, Berge ohne Wiederholungsmuster.
- Konsistente Palette (je Zeitalter) und klare Lesbarkeit: Einheiten, Städte und Banner dürfen nie im Gelände untergehen.
- UI poliert: Fenster, Tooltips, Schriftgröße, Handy-Bedienung, Daumenreichweite, Dunkelmodus nicht nötig.
- Ladezeit und Speicher beobachten; Sprite-Cache begrenzen.

### 9.4 Civ 6 als Vorbild für Oberfläche und Spielgefühl

- **Abgucken ausdrücklich erwünscht:** Aufbau und Bedienlogik der Civ-6-Oberfläche: obere Leiste mit Erträgen, Forschung/Civic-Anzeige, Benachrichtigungs-Stapel, Einheiten-Panel mit Aktionsleiste, Stadtfenster mit Distrikt-Ansicht, Baumansichten für Forschung und Civics, Regierungs- und Politikkarten-Bildschirm, Religionsfenster, Handels-/Diplomatiefenster, Kampfvorschau, Hex-Gitter-Ansichten (Erträge, Besitz, Religion).
- **Anpassen auf Volk:** Pixelart statt Hochglanz, **Echtzeit statt Runden** (kein "Nächste Runde"-Knopf; stattdessen Zeitangaben, Fortschrittsbalken, Restdauer), **Handy zuerst** (Daumenreichweite, große Ziele, Fenster als Bottom-Sheets).
- **Nicht kopieren:** keine Original-Grafiken, Icons, Schriften, Texte oder Namen aus Civ 6; alles bleibt selbst gezeichnet. Referenzbilder dienen nur dem Verständnis von Layout und Informationsstruktur.
- Falls Leif Screenshots in einen Ordner `referenzen/` legt, schau sie dir an und richte dich nach Aufbau und Struktur. Dieser Ordner kommt in `.gitignore`, wird **nicht** committet.
- Ohne Screenshots: arbeite nach deinem Wissen über Civ 6 und halte kurz in `ENTSCHEIDUNGEN.md` fest, was du übernommen hast.

### 9.5 Konkrete Hinweise aus Leifs Civ-6-Screenshots (Layout und Struktur, nichts kopieren)

Leif hat 7 Screenshots als Vorbild geschickt (liegen im Ordner `referenzen/`, falls er sie kopiert hat). Das hier sind die Beobachtungen daraus. Setze sie in Pixelart und Echtzeit um:

1. **Hauptansicht und Obere Leiste.** Oben eine schmale Leiste mit allen Erträgen als Icon + Zahl + Änderung pro Zeit (Wissen, Kultur, Glaube, Gold, Einfluss usw.), links daneben Knöpfe für die großen Fenster (Forschung, Civics, Regierung, Religion, Diplomatie, Handel). Links unter der Leiste der **"Welt-Tracker"**: aktuelle Forschung und aktuelle Civic als kleine Karten mit Fortschrittsring und **Restdauer** (bei Volk in Zeit statt Runden). Oben rechts die anderen Völker als runde Porträts (Beziehung/Status). Rechts am Rand ein **Stapel von Benachrichtigungen** (Icons, Tippen springt zum Ereignis). Unten links die **Minikarte** mit Ebenen-Knöpfen; unten rechts statt "Nächste Runde" ein **Zeit-/Tempo-Anzeiger** mit Pause-Info (nur Anzeige, kein Rundenknopf).
2. **Stadtbanner.** Pro Stadt ein Banner über der Stadt: links **Einwohnerzahl**, Mitte **Name**, rechts **Symbol der aktuellen Produktion oder des Status** (Handel, Religion, Produktion), Kapital mit Krone/Stern, darüber ein **Lebens- und Verteidigungsbalken**. Banner in der Farbe des Volks. Bei Städten anderer Völker dasselbe in deren Farbe.
3. **Gebiete.** Territorium jedes Volkes durch **farbige Grenzlinie mit Innenfläche** am Rand, Verbündete heller, Feinde rot gestrichelt. Gelände außerhalb der Sicht abgedunkelt (Nebel). Hex-Gitter nur dezent, auf Wunsch einblendbar.
4. **Ressourcen und Erträge auf der Karte.** Ressourcen als **kleine Kreis- oder Schildsymbole** auf dem Feld (Banane, Milch, Weizen, Wild, Elefant, Strategisches mit Spezialform). Dazu Fähnchen für Einheiten (rund, Volksfarbe, Silhouette, Lebensbalken) und Warnzeichen (Radioaktivität, Plünderung).
5. **Stadtansicht mit Distrikten.** Jeder Distrikt ist ein **eigenes Gebäudecluster auf einem Hexfeld**, mit **Straßen**, die alle Distrikte zur Stadtmitte verbinden. Farben pro Typ, damit man sie auf einen Blick erkennt: Campus blau, Handelsplatz gelb, Militärlager rot/braun mit Zelten und Wachtürmen, Industriezone grau mit Schornsteinen, Heiligtum weiß/gold, Theaterplatz rot/orange, Hafen türkis. Stadtmitte wächst mit der Einwohnerzahl (Hochhäuser im späten Spiel). Weltwunder sind große, einzelne Bauwerke mit Eigenform. Arbeitsfelder zeigen Verbesserungen (Farmen als Felderstreifen, Minen mit Gerüst, Sägewerke, Plantagen) mit Animation.
6. **Baumansicht (Forschung und Civics).** Waagerecht scrollbar, **Zeitalter als senkrechte Spalten** mit dem Zeitalternamen vertikal am Rand und passendem Hintergrundmotiv. Jeder Knoten: **Name, Restdauer, kleine Freischalt-Icons in Farbcodes** (grün Einheit, gold Gebäude, braun Wunder, violett Abkommen, blau Verbesserung, Gelb/Orange Distrikt, Stern Spezialfreischaltung, rot Politikkarte). **Verbindungslinien** zwischen Voraussetzungen, gestrichelt für weite Sprünge. Zustände: **verfügbar, nicht verfügbar, in Arbeit, abgeschlossen** (Farbe/Rahmen). Unter dem Knoten die **Eureka-Bedingung** ("Zum Boost: Baue 3 Börsen"), bei erfüllter Bedingung **hervorgehoben** (z. B. Magenta/Leuchten). Links ein einklappbares Menü **Filter, Suche, Legende**. Unten ein **Zeitstrahl** durch die Zeitalter mit Marker "jetzt".
7. **Regierungs-Bildschirm.** Drei Reiter: **Meine Regierung, Politiken ändern, Regierungen wechseln**. Links die **Regierungskarte** (Bild, Grundbonus, Vermächtnisboni mit Prozentwerten). Mitte die **Kartenplätze nach Kategorie** (Militär rot, Wirtschaft gold, Diplomatie grün, Joker violett), jeder Platz zeigt die gelegte Karte. Rechts der **Kartenpool** (Raster aus Karten mit Titel und Wirkungstext), Filterreiter Alle/Militär/Wirtschaft/Diplomatie/Joker, Knopf **"Alle zuweisen"**. Karten per Tippen auswählen und Platz tippen (auf dem Handy kein Ziehen nötig); auf dem Handy als Reiter-Bottom-Sheet statt Dreispalten-Layout.
8. **Handy-Anpassung.** Auf kleinem Bildschirm: Baumansicht mit Zwei-Finger-Zoom und Antippen eines Knotens für Details; Regierung als drei vertikale Abschnitte; Banner und Symbole auf Mindestgröße begrenzen (nie unter 24 Pixel Tippfläche).

## 10. Lesbarkeit für spätere Übernahme

Eine andere KI übernimmt später Grafiken und Daten ins Kartenspiel (nicht Teil dieses Auftrags). Dafür braucht es kein Export-Werkzeug, aber **lesbaren Code**: Sprites und Symbole in klar benannten Dateien (eine Zeichenfunktion je Einheit/Gebäude/Wunder, IDs als Schlüssel), Daten in den Datendateien, kurze Kommentare, und in `README.md` ein Abschnitt "Wo liegt was" (Dateien für Sprites, Symbole, Daten, Zeitalter-Stile).

## 11. Stufen (Reihenfolge, Commits)

Arbeite **in dieser Reihenfolge**. Nach **jeder Stufe**: alle Tests grün, `FORTSCHRITT.md` aktualisieren, committen, nach `main` pushen, **kurz** berichten (3 bis 5 Zeilen). Die Commit-Nachricht **beginnt mit der Art des Updates** (für den Update-Log im Spiele-Hub). Schema: `Großes Update: ...`, `Kleines Update: ...`, `Patch: ...`. Die Stufe richtet sich danach, wie viel **neu für den Spieler** ist.

| Stufe | Inhalt | Commit-Präfix |
|---|---|---|
| 0 | Kopie von Volk in volk3, Worker-Name, Tests grün | `Patch:` |
| 1 | Umbau-Grundlagen: Datenformat und Engine aufräumen, wo nötig; Testgerüst erweitern | `Patch:` |
| 2 | Zeitalter KI und Fusion (Daten, Regeln, Tests, Balance) | `Großes Update:` |
| 3 | Zeitalter Weltraum und Sterne (Daten ohne Ebene) | `Großes Update:` |
| 4 | Weltraum-Ebene (Engine, Karte, Raumhafen, Kolonien, Client-Umschalter) | `Großes Update:` |
| 5 | Naturwunder und Weltwunder-Platzierung | `Großes Update:` |
| 6 | Distrikte wie Civ 6 (Typen, Gebäude-Stufen, Nachbarschaftsboni, Ausbau, Einzigartige Distrikte, Plünderung) | `Großes Update:` |
| 7 | Civics, Regierungen, Politikkarten (Daten, Engine, UI) | `Großes Update:` |
| 8 | Religion (Glaube, Pantheon, Religionen, Missionare, Druck) | `Großes Update:` |
| 9 | Eurekas/Boosts | `Kleines Update:` |
| 10 | Symbole über Einheiten (alle Einheiten) | `Kleines Update:` |
| 11 | Animationen (Einheiten, Verbesserungen, Städte, Wunder) | `Kleines Update:` |
| 12 | Grafik-Politur, Zeitalter-Stile, Handy-Leistung | `Kleines Update:` |
| 13 | Balancing mit Simulation, Endtests, Lastmessung | `Patch:` |
| 14 | Dokumentation (README "Wo liegt was", ENTSCHEIDUNGEN, ABNAHME) | `Patch:` |

Falls eine Stufe zu groß wird, teile sie in mehrere Commits. **Nie** mehrere Stufen in einem Commit bündeln. Wenn etwas nicht klappt, repariere es, bevor du weitermachst, und trage Abweichungen in `ENTSCHEIDUNGEN.md` ein.

Jeder Commit endet mit den Zeilen aus der Attribution, die dir dein Werkzeug vorgibt.

## 12. Qualität und Tests

- Alle Datentests (`tests/daten.test.mjs`) auf **11 Zeitalter** anpassen: Zeitalter-Anzahl, Forschungen je Zeitalter (Endgame darf bis 24 gehen), Unterhalt-Grenzen (darf für Endgame-Einheiten steigen, trage die neue Grenze begründet ein), Gebäude- und Wunder-Zeiten (Wunder 5 h bis 6 Tage), Atomwaffe nicht mehr "ganz am Ende", Zukunftstechs im letzten Zeitalter, Barbaren-Einträge weiterhin 7 je Zeitalter bis Atomzeit.
- **Neue Tests:** Civics, Regierungen, Politikkarten, Pantheons, Religionen, Glaubenssätze, Naturwunder, Distrikte und ihre Gebäudestufen, Eurekas, Symbole, Ebenen, Handel/Diplomatie, Zufriedenheit, Ereignisse, Karten-Hash der Erde stabil (einmal festgeschrieben), Hash der Weltraum-Ebene stabil.
- **Balance-Simulation:** Skript, das einen Spielverlauf mit festem Plan (Ertrag, Forschung, Civics) simuliert und ausgibt, wie lange jedes Zeitalter dauert. Ziel: Endgame 3 bis 5 Wochen; keine Einheit absurd stark (Kampfwerte je Zeitalter vergleichbar mit dem Verhältnis der alten Zeitalter).
- **Server:** Jede neue Aktion wird **serverseitig geprüft** (Kosten, Reichweite, Ebene, Platzierung). Kein Vertrauen in den Client.
- **Last:** Am Ende Anzahl Ticks, Speicher und Nachrichtengröße je Stufe messen und in `ENTSCHEIDUNGEN.md` eintragen; Cloudflare-Free-Grenzen müssen für ca. 4 bis 8 Spieler halten.
- Client **nur mit Tests und Lesen prüfen**, wenn du ihn nicht im Browser öffnen kannst. Wenn du einen Browser starten kannst, mache Screenshots und schau selbst.
- Barrierefreiheit und Handy: Alles bedienbar mit Daumen auf 390 Pixel Breite.

## 13. Abschlussbericht (ehrlich)

Am Ende schreibst du einen **Bericht** an Leif (Chat und `ABNAHME.md`):
- Was ist **fertig** und was **getestet** (mit Befehl und Ergebnis)?
- Was ist **nicht getestet** oder nur gelesen (z. B. Client-Optik auf dem Handy)?
- Was weicht vom Auftrag ab und warum?
- Welche Zahlen (Dauer je Zeitalter, Last) hast du gemessen?
- Offene Punkte und Risiken.
- Wie Leif **volk3** mit Cloudflare Workers Builds verbindet (Schritte), damit `volk3.leifps.workers.dev` läuft.

Schreibe nichts als fertig, was du nicht geprüft hast. **Lieber ehrlich "nicht getestet" als falsch "fertig".**
