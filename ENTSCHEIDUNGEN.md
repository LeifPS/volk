# Entscheidungen

Leitsatz: "Was macht das Spiel für ein paar Freunde und die Familie am besten spielbar?"

## Technik
- **Repo-Wurzel ist der Arbeitsordner `volk-start-paket/`** (dort liegen `referenz/` und `hub-werkzeuge/`).
- **Gemeinsamer Code liegt in `public/shared/`** statt in `shared/` an der Wurzel: Cloudflare liefert nur `public/` aus, und der Client muss dieselben Module laden. Der Worker importiert sie von dort (wrangler/esbuild bündelt sie). Kein Build-Schritt, keine Kopien.
- **Die Spiel-Engine liegt ebenfalls in `public/shared/engine/`**, damit der Demo-Modus (`?demo=1`) ohne Server die echte Engine im Browser laufen lassen kann. Geheimnisse enthält sie nicht; Konten und Admin liegen nur in `src/`.
- **Karte 192 × 120 Felder** (23 040): größer als der Vorschlag, aber schnell erzeugt (~90 ms). Querung für Antike-Infanterie etwa 8–16 Stunden (seit dem Tempo-Update).
- **Kartenerzeugung nur mit exakter Arithmetik** (keine `Math.sin/exp/pow`), damit Safari (iPad) und V8 bitgleich dieselbe Welt erzeugen. Der Karten-Hash wird mitgeschickt.
- **Gelände ist aus dem Seed berechenbar:** Weil Client und Server die Karte aus dem Seed erzeugen (Vorgabe), könnte ein technisch versierter Spieler das Gelände ausrechnen. Alles Dynamische (Einheiten, Städte, Besitz, Verbesserungen, Bewegungen) schickt der Server nur für erkundete bzw. sichtbare Felder. Für eine Familienrunde ausreichend.
- **Speicherung in "Eimern":** Städte (32 Eimer), Einheiten (32), Feldänderungen (64), je Volk eine Zeile, Nebel je Volk eine Zeile, Rest in einer Kern-Zeile. Beim Aufwachen werden ~150–250 Zeilen gelesen; pro Befehl werden meist 2–5 Zeilen geschrieben.
- **Ereignisse werden nicht gespeichert, sondern aus dem Zustand abgeleitet** (nächster Marschschritt, Bau fertig, Wachstum, Grenze, Forschung, KI-Denken ...). Der Alarm steht immer auf dem nächsten Ereignis.
- **PBKDF2 mit 100 000 Iterationen** (Höchstwert in Workers), SHA-256, 16 Byte Salz.
- **Git-Push** war in der Arbeitsumgebung nicht erlaubt; alle Commits sind lokal, Leif pusht von Hand.

## Spielregeln (wo der Auftrag Spielraum ließ)
- **Erträge pro Stunde:** Nahrung, Gold, Kultur und Baustoffe werden mit `ERTRAG_FAKTOR = 6` multipliziert (ein Civ-"Zug" entspricht 10 Minuten). Wissenschaft und Produktion sind Punkte: 1 Wissenschaft = +1 % Forschungstempo, 1 Produktion = +4 % Bautempo der Stadt.
- **Bauzeit wird beim Start festgelegt** (Produktion zum Startzeitpunkt), damit die angezeigte Fertigzeit verlässlich ist. Forschung läuft dagegen als Fortschritt und wird schneller, wenn die Wissenschaft steigt.
- **Kosten werden beim Start eines Auftrags bezahlt**; Abbrechen erstattet 50 %. Ein Auftrag kann "vorgemerkt" werden und startet automatisch, sobald das Material da ist.
- **Siedler** kosten 1 Einwohner (Stadt braucht mindestens 2), Gold und Holz.
- **Neue Völker bekommen die Startforschung "Stammesleben"** (Siedler, Arbeiter, Späher, Krieger) sofort, damit man direkt loslegen kann.
- **Stapelregel:** 1 Militär + 1 Zivil je Feld; eigene Einheiten können durchlaufen; am Ziel wird mit einer stehenden eigenen Einheit Platz getauscht.
- **Grenzen:** Fremdes Gebiet nur mit offenen Grenzen/Bündnis/Krieg; Stadtstaaten ab Freundschaft.
- **Raubtiere** fallen Einheiten an, die neben ihnen vorbeiziehen, töten aber nie (Rest mindestens 20 LP); Späher nehmen halben Schaden ("fliehen").
- **Naturereignisse** (Dürre, Flut) senken nur Nahrung, mit 3 Stunden Vorwarnung, und betreffen nur Völker, die beim Beginn online sind.
- **Tag/Nacht** ist reine Optik mit einem 2-Stunden-Zyklus (Serverzeit), damit man beim abendlichen Spielen nicht immer Nacht hat. **Jahreszeiten** wechseln alle 2 Tage (±5 % Nahrung bzw. Gold).
- **KI-Völker** forschen 1,6× langsamer und höchstens bis zur Moderne, gründen höchstens 3–5 Städte, erobern nie Spielerstädte (technisch erzwungen) und erklären Spielern nur nach Provokationen den Krieg (und nur, wenn der Spieler online und nicht geschützt ist).
- **Farben:** 16 gut unterscheidbare Vorschläge; eine Farbe muss einen Mindestabstand (wahrgenommene Distanz ≥ 100) zu allen anderen Völkern haben und darf nicht wie Gras/Wasser/Wald aussehen.
- **Texte:** Die Oberflächentexte stehen zentral in `public/js/texte.js`; Spielinhalte (Namen/Beschreibungen) in `public/shared/daten/`, Meldungen des Servers in der Engine.
- **Marschtempo (Update 2026-11-15, nach Leifs Rückmeldung "zu langsam"):** 2 Minuten pro Bewegungspunkt bei Tempo 2 (Ebene, `SCHRITT_BASIS_S = 120`); Späher (Tempo 3) 80 Sekunden pro Feld auf Ebene, 2 Felder Wald/Hügel ca. 5 Minuten; auf Straßen deutlich schneller. Vorher 6 Minuten (Späher: 2 Felder in rauem Gelände ~16 Minuten, das war zu zäh). Die Weltquerung für Antike-Infanterie dauert damit etwa 8–16 Stunden (Test prüft 8–16 h). Spielgefühl hat Vorrang vor der ursprünglichen Vorgabe von 1–2 Tagen.
- **Anfangsbeschleunigung (Update 2026-11-15):** Der Einstieg geht schneller, später wird es zäher. Bauen, Ausbilden und Forschen laufen in der Antike doppelt so schnell, im Zeitalter 1 anderthalbfach, im Zeitalter 2 mit 1,25 (`ANFANGS_TEMPO` in `regeln.js`, danach 1). Wachstum und Grenzfelder kosten auf den ersten Stufen nur die Hälfte und steigen bis Stufe 6 auf den vollen Wert (`anfangsFaktor`). Alles an einer Stelle einstellbar. Marschtempo siehe oben.
- **Tempo-Update 2026-11-17 (ersetzt Marschtempo und Anfangsbeschleunigung oben, Leifs Wunsch "alles deutlich schneller, nur gegen Ende langsamer"):** Alle Stellschrauben stehen oben in `regeln.js`.
  - `ZEIT_TEMPO = [10, 8, 6, 5, 4, 3, 2.5]` ist die Grundkurve je Zeitalter (Antike bis Atomzeit). Auf Leifs Wunsch (2026-11-17) dauert **Produktion** (Bauen, Ausbilden, Verbessern) doppelt so lange (`PRODUKTION_LANGSAMER = 2`, effektiv [5, 4, 3, 2.5, 2, 1.5, 1.25]) und **Forschung** dreimal so lange (`FORSCHUNG_LANGSAMER = 3`, effektiv [3,3, 2,7, 2, 1,7, 1,3, 1, 0,8]). Dauer = Grunddauer aus den Daten / Faktor.
  - `WIRTSCHAFT_TEMPO = 5`: Erträge, Nahrungsverbrauch, Unterhalt, Heilung und Handel je Stunde laufen fünfmal so schnell, Kosten bleiben gleich. So bremsen nicht die Rohstoffe das schnellere Bauen aus, Wachstum und Grenzen gehen ebenfalls etwa fünfmal schneller. Zahlen in der Oberfläche (Unterhalt, Heilung) sind entsprechend mitgezogen.
  - Marsch: `SCHRITT_BASIS_S = 30` (vorher 120): ein Feld Ebene dauert für Tempo 2 30 Sekunden, für Späher 20 Sekunden. `MARSCH_ZEITALTER = [1, 1, 1, 1, 1.25, 1.5, 2]` macht späte Einheiten etwas zäher. Weltquerung für Antike-Infanterie etwa 2 bis 4 Stunden.
  - Abklingzeiten nach Angriffen folgen dem Zeitalter-Tempo nur abgeschwächt (Wurzel), Stadt-Schuss 5 statt 15 Minuten, "Zerstört"-Dauer 6 Stunden / 5.
  - KI denkt fünfmal so oft, Barbaren-Takt fünfmal so schnell (sonst wäre die Welt neben dem Spieler eingeschlafen).
  - Balance-Simulation (ein guter Bot): ganzer Forschungsbaum nach etwa 21 Tagen (vorher 25), Antike ca. 7 Stunden, Atomzeit ca. 8 Tage. Neulingsschutz, Waffenruhe und Friedensvorschlag bleiben in echter Zeit.
- **Barbaren ignorieren den Neulingsschutz (Update 2026-11-15, Leifs Wunsch):** Barbaren greifen auch Spieler unter Neulingsschutz an, solange diese online sind (offline bleibt man verschont). Raubtiere respektieren den Schutz weiter. Spieler im Schutz dürfen Barbaren bekämpfen, ohne den Schutz zu verlieren.
- **Gold ist knapper skaliert** (`GOLD_FAKTOR = 3` statt 6), **Grundwissen 1 Punkt je Einwohner**: So wird Gold nicht wertlos und die Forschung trifft die Zielwerte (per Balance-Simulation eingestellt).
- **Forschungsdauern Moderne/Atomzeit** wurden per Balance-Simulation etwas gesenkt (Moderne 30–53 h, Atomzeit 55–67 h Grundwert), damit ein guter Spieler den ganzen Baum in etwa 27 Tagen schafft (Ziel 2–4 Wochen). Die Grundwerte bleiben in den Richtbereichen (Moderne 1–3 Tage, Atomzeit 2–4 Tage).
- **Nicht umgesetzt (bewusst):** Transportschiffe laden keine Einheiten ein; stattdessen schiffen sich Landeinheiten nach der passenden Forschung selbst ein (wie in Civ 5/6). Wegpunkt-Ketten gibt es nicht; dafür Auto-Erkunden, Auto-Arbeiten, Handelsrouten-Pendeln und "Angreifen nach Marsch".

## Auslastung im Free-Plan (Abschätzung)

Gemessen mit der Mehrspieler-Simulation (`tests/mehrspieler.test.mjs`: 4 aktive Spieler-Bots, 5 KI-Völker, 12 Stadtstaaten, Barbaren, Raubtiere, 14 simulierte Tage, nachts 2 Spieler offline):

| Größe | gemessen pro Tag | Free-Limit pro Tag |
|---|---|---|
| Alarme (DO-Aufrufe durch Ereignisse) | ~2 300 | 100 000 Anfragen |
| geschriebene Speicherzeilen | ~11 400 | 100 000 |
| gespeicherte Zeilen insgesamt | ~175 | 5 GB |

Dazu kommen echte Klicks: 5 Spieler × 2 Stunden × ~3 Befehle/Minute ≈ 1 800 WebSocket-Nachrichten pro Tag, die im Free-Plan mit 20:1 als Anfragen zählen (≈ 90) und je 2–5 Zeilen schreiben (≈ 7 000). Gelesen werden beim Aufwachen des Objekts ~175 Zeilen; selbst bei 3 000 Aufwach-Vorgängen sind das ~0,5 Mio. von 5 Mio. erlaubten gelesenen Zeilen. Die aktive Dauer bleibt dank WebSocket-Hibernation weit unter 13 000 GB-s. **Der Free-Plan reicht mit großem Abstand.**

---

# Ausbau "Volk 3" direkt in Volk (ab 2026-11-27)

Grundlage: `AUFTRAG-VOLK3.md` und `PLAN-ZEITALTER-8-11.md` (beide im Repo). Abweichend vom Auftrag (Vorgabe von Alexander/Leif im Startgespräch):

- **Es gibt kein volk3.** Der Ausbau entsteht direkt im Repo `LeifPS/volk`.
- **Die laufende Welt bleibt komplett erhalten** (Abschnitt 3b des Auftrags "keine Migration" gilt deshalb nicht). Konten, Völker, Städte, Einheiten, Forschungen, Gebäude, Wunder, Verbesserungen, Diplomatie: alles läuft nach dem Update weiter. Daraus folgen diese Regeln:
  - **Die Erdkarte bleibt bitgleich** (gleicher Seed, gleicher Karten-Hash `kartenHash`). Keine Neugestaltung von Küsten, Flüssen oder Biomen. Alles Neue auf der Erde (neue Rohstoffe, Naturwunder) kommt als **zusätzliche Schicht** mit eigenem Hash dazu, nur auf Feldern ohne Rohstoff bzw. ohne Stadt/Besitz.
  - **Neue Rohstoffe werden hinten an `ROHSTOFFE` angehängt**, weil die Karte Rohstoffe als Index speichert.
  - **IDs bleiben**, wo sie im Spielstand vorkommen. Wo eine Umbenennung nötig ist, gibt es eine Zuordnungstabelle in der Migration.
  - **Versionierte Migration:** `ZUSTAND_VERSION` steigt, jeder Schritt `migriere_vN_zu_vN+1` ist eine eigene, getestete Funktion (`public/shared/engine/migration.js`). Getestet wird mit einem echten Altstand (`tests/daten/altstand-v1.json`), der mit dem Code von `main` vor dem Ausbau erzeugt wurde.
  - **Durable Object:** Klasse `Welt` bleibt, keine neue Klasse, deshalb kein neuer Migrations-Tag in `wrangler.jsonc` nötig (Speicherformat SQLite-Tabelle `daten` bleibt).
- **Arbeitsweise:** Die Stufen landen als einzelne Commits auf dem Branch `volk3-ausbau`. Nach `main` (= live) kommt nur, was spielbar und getestet ist.

## Stufe 2: KI- und Fusionszeitalter
- **Daten laut Plan**, mit diesen Abweichungen (Regel: man darf nichts freischalten, dessen Rohstoff man noch nicht sehen kann):
  - **Seltene Erden werden mit der Schlüsselforschung "Lernende Maschinen" sichtbar, Deuterium mit "Kernfusion".** Im Plan kamen sie über Seitenforschungen, aber fast alle Einheiten und Gebäude des Zeitalters kosten diese Rohstoffe. `seltene_erden_abbau` heißt deshalb jetzt "Roboterbergbau" (schaltet die Robotermine frei), `deuteriumgewinnung` schaltet die Deuteriumfabrik frei.
  - Einige Voraussetzungen ergänzt (Exoskelette, Quantencomputer, Magnetschwebetechnik, Plasmawaffen hängen an der Schlüsselforschung; Schienenkanonen am Fusionsreaktor; Energieschilde an Plasmawaffen).
  - **Intelligentes Stromnetz** braucht kein Kraftwerk mehr (das Kraftwerk wird später ersetzt, die Bedingung wäre dann unerfüllbar).
  - **Plasmaschmiede** ersetzt die Militärakademie (statt "braucht Kaserne"; die Kaserne wird früh ersetzt). Erfahrung 55 statt 20, damit sie besser ist als die Akademie (40).
  - **Autonome Fabrik und Molekularfabrik** geben wie die Roboterfabrik einen weiteren Bauplatz (sie ersetzen sie, sonst würde der Platz beim Ausbau verloren gehen).
- **Zukunftstechnologien** stehen am Ende des letzten Zeitalters und hängen an möglichen Sackgassen (so bleibt der Baum zusammenhängend). Migration 1→2 parkt eine laufende Zukunftsforschung, wenn die neuen Voraussetzungen fehlen; erforschte Stufen und ihre Boni bleiben.
- **Tempo der neuen Zeitalter:** `ZEIT_TEMPO` 1,3 / 1,15 / 1,0 / 0,9 (statt Plan 2,2 / 2,0 / 1,8 / 1,6). Mit den Plan-Werten war das KI-Zeitalter für den Balance-Bot nach 3,3 Tagen vorbei. Gemessen (Bot, 70 Tage): Atomzeit bis KI 6 Tage, KI 5,4, Fusion 8,2. Endgültig eingestellt wird in Stufe 13.
- **Goldkurve** der Einheiten flacht in den neuen Zeitaltern ab (4,4 / 4,6 / 4,8 / 5,0 statt weiter +0,6), weil die Grundkosten laut Plan schon hoch sind.
- **Unterhalt-Grenzen** in den Datentests: Einheiten bis 12 (vorher 8), Gebäude bis 14 (vorher 10), nur für Endgame-Zeitalter.
- **Neue Rohstoffe als Zusatzschicht** (`zusatzschicht: true`): Seltene Erden 31 Vorkommen (Hügel, Gebirge, Kristallgebirge, Wüste), Deuterium 109 (Küste, Meer, Tiefsee). Grundkarte bleibt `cf1bae76`.
- **Wunder mit "benötigt"** akzeptieren auch spätere Ausbaustufen des Gebäudes (z. B. Sternenhafen statt Raumhafen).
- **Grafik**: Sprites für alle Einheiten, Gebäude, Wunder, Verbesserungen und Lagergüter der vier neuen Zeitalter sowie die vier Stadtstile (smart, fusion, orbital, stern) entstanden parallel durch vier Hilfs-Agenten; selbst gesichtet und für gut befunden. Musik: vier neue Chiptune-Themen.

## Stufe 3: Weltraum- und Sternenzeitalter (Daten ohne Ebene)
- Daten laut Plan, mit den Vorgaben des Auftrags: Die Gebäude Mondbasis, Marskolonie und Asteroidenbergwerk entfallen. Ihre Forschungen (Mondbasis, Marskolonie, Asteroidenbergbau, Helium-3-Abbau) geben vorerst kleine Boni; in Stufe 4 schalten sie Kolonisten und die Weltraum-Verbesserungen frei.
- **Militärkette** Kaserne → Waffenkammer → Militärakademie → Plasmaschmiede → Orbitalwerft → Sternenwerft (die Orbitalwerft "braucht Raumhafen" im Plan wäre unerfüllbar geworden, sobald der Sternenhafen den Raumhafen ersetzt).
- **Materiewandler** gibt wie seine Vorgänger der Fabrik-Kette einen Bauplatz und liefert zusätzlich Stein und Eisen.
- Zukunftstechnologien in Spalte 68 mit den Plan-Voraussetzungen plus je einer sonst offenen Sackgasse.
- Titan und Helium-3 haben bis zur Weltraum-Ebene (Stufe 4) noch keine Quelle; Einheiten, die sie kosten, sind bis dahin nicht baubar (nur auf dem Arbeitszweig, nie live).

## Stufe 4: Weltraum-Ebene
- **Die Ebene steckt im Feld-Index** (`hex.js`): Erde 0 bis 23 039 wie bisher, Weltraum ab 23 040 (64 × 40 Felder). `ebeneVon(feld)` liefert die Ebene. So bleibt jedes gespeicherte Feld der Live-Welt gültig, kein Speicherformat ändert sich, und Feld und Ebene können nie widersprüchlich gespeichert sein (das ist die Umsetzung von "Feld `ebene` in allen Systemen"). Nachbarn, Abstand (über Ebenen hinweg unendlich), Umkreis, Wegsuche, Sicht und Nebel rechnen je Ebene.
- **Nebel** ist auf beide Ebenen verlängert; alte, kürzere Nebeldaten werden beim Lesen aufgefüllt (keine Migration nötig).
- **Weltraumkarte** (`weltraumkarte.js`): fest und deterministisch (nur `hash01` und ganzzahlige Hex-Abstände), eigener Hash `a1dc6a09`. Erdorbit am linken Rand (Ankunft vom Raumhafen), Mond (~39 Felder), Mars (~98), Eismond (~39), drei Asteroidenfelder; Rohstoffe Helium-3 (Mond), Titan (Mars, Asteroiden, Mondkrater), Wassereis (Eismond). Die neuen Gelände und Rohstoffe sind hinten an die Listen angehängt; die Erdkarte bleibt bitgleich.
- **Bewegung im All:** Orbit-Felder befahren Raumschiffe (`raumschiff`: Raumsonde, Sternensonde, Raumfrachter, Sternenfrachter, Orbitalfähre); raumtaugliche Landeinheiten (`raumtauglich`: Raumlandetruppe, Mondpanzer, Orbitalflak, Nanoschwarm, Antimaterie-Panzer, Phasenflak, Gravitationswerfer, Kolonist) treiben dort in einer Raumkapsel, ähnlich wie das Einschiffen auf der Erde. Feste Körper betreten nur raumtaugliche Landeinheiten.
- **Übergang** (Befehl `ebene_wechseln`): Start aus einer eigenen Stadt mit Raumhafen bzw. Landung vom Erdorbit in eine eigene Stadt mit Raumhafen. Raumschiffe fliegen allein; Landeinheiten brauchen eine Orbitalfähre, die mitfliegt (bis zu 2 Passagiere). Kosten 300 Gold je Einheit, danach 2 Stunden nicht einsatzbereit ("im Flug"). Die Einheit steht sofort am Ziel (kein unsichtbarer Zwischenzustand), ist aber bis `flug_bis` gesperrt.
- **Kolonien:** Der Kolonist (Weltraumzeitalter, Forschung "Mondbasis") gründet Kolonien auf festen Körpern (nicht auf Asteroiden) und baut Weltraum-Verbesserungen (er kann also gründen und arbeiten). Siedler gründen nicht im All, Kolonisten nicht auf der Erde. Kolonien nutzen die normale Stadtlogik.
- **Weltraum-Verbesserungen** (Mondmine, Helium-3-Extraktor, Marsmine, Asteroidenbohrer, Eisförderung, Kuppelfarm) liefern Rohstoffe ins Reichslager nur, solange das Reich einen Raumhafen (oder Sternenhafen) hat. Im All sind nur diese Verbesserungen erlaubt.
- **Flugzeuge und Raumjäger** nutzen weiter die Luft-Regeln (verlegen, Einsatzradius); über Ebenen hinweg ist der Abstand unendlich, sie können also in einer Kolonie mit Raumhafen stationiert werden und von dort im All kämpfen.
- **Korrektur:** Gebäude, die strategische Güter liefern (Antimaterie-Fabrik, Materiewandler), wurden mit dem Baustoff-Faktor (×30) statt dem Rohstoff-Faktor (×5) multipliziert. Kein bestehendes Gebäude war betroffen.
- **Client:** Die aktive Ebene (`karte/ebene.js`) bestimmt, was Renderer, Gelände-Kacheln, Wege und Minikarte zeigen. Umschalten per Knopf neben der Minikarte (erscheint, sobald Orbitalbau erforscht ist) oder Taste E; Springen zu einem Feld der anderen Ebene schaltet automatisch um. Jede Ebene merkt sich ihre Kameraposition. Im All gibt es Sternenhimmel, die Erde als Planet am linken Rand, keine Tageszeit und kein Wetter.

## Stufe 5: Naturwunder und Weltwunder auf Feldern
- **Naturwunder als Schicht im Spielzustand** (`z.global.naturwunder`), nicht in der Kartenerzeugung: Die Erdkarte bleibt bitgleich, und die Platzierung kann in der laufenden Welt Rücksicht nehmen. Platziert werden sie einmal (neue Welt: in `weltInitialisieren`; Live-Welt: Migration 2→3), deterministisch über `hash01` in fester Reihenfolge, nur auf Felder ohne Besitz, Verbesserung, Weg und Einheit, mindestens 4 Felder von Städten, 3 von Barbarenlagern und 14 voneinander. Neue Startplätze halten 2 Felder Abstand. Test: gleiche Welt ergibt gleiche Orte; im echten Altstand finden alle 12 Platz.
- 12 eigene Naturwunder (Feuerberg, Sternenkrater, Perlenriff, Regenbogenberg, Tiefe Schlucht, Geysirtal, Kristallhöhle, Donnerfall, Eisfjord, Smaragdoase, Flüsterwald, Schwarzer Monolith), 1 bis 3 Felder. **Unpassierbar**, keine Stadt, keine Verbesserung; Städte können sie bewirtschaften (Ertrag des Naturwunders statt des Geländes). Der Distrikt-Nachbarschaftsbonus steht schon in den Daten und wirkt ab Stufe 6.
- **Entdeckungsbonus** nur für das erste Volk, das ein Feld sieht: Kultur (Hauptstadt und Reich) und Wissen (Anteil der laufenden Forschung, 400 Punkte = eine ganze Forschung). Wer in der Live-Welt ein Feld schon vor dem Update erkundet hatte, gilt ohne Bonus als Entdecker.
- **Weltwunder stehen auf einem eigenen Feld** im Stadtgebiet mit Platzregel je Wunder (Feld `platz` in `wunder.js`: flach, Küste, Fluss, Grenze ...). Der Spieler wählt das Feld beim Auftrag (gültige Felder leuchten grün); KI und alte Clients bekommen automatisch das beste Feld. Beim Baubeginn entsteht eine Baustelle mit Gerüst (eine Verbesserung auf dem Feld wird abgerissen), danach steht das Wunder als großes Modell auf dem Feld. Das Feld bleibt begehbar, wird aber nicht bewirtschaftet.
- **Migration 2→3:** Fertige Wunder der Live-Welt bekommen ein Feld (bevorzugt passend und ohne Verbesserung, notfalls irgendein Feld des Gebiets), laufende Wunder-Aufträge ihre Baustelle, vorgemerkte ihr Feld.

## Stufe 6: Distrikte
- **Datenmodell:** Ein Distrikt liegt auf einem Feld des Stadtgebiets (`f.d` = Distrikt-ID, Baustelle `f.db`), die Stadt merkt sich `s.distrikte[id] = { feld, spez, spez_ab, pl_bis }`. Distrikte nutzen nicht `f.v` (Feldverbesserung), damit eine Verbesserung und ein Distrikt nie verwechselt werden; Spielstand, Ansicht und Rendering ziehen über die Felder trotzdem automatisch mit.
- **Aufteilung der Gebäude** (`daten/distrikte.js`, `GEBAEUDE_DISTRIKT`): Campus (Bibliothek bis Sternenobservatorium), Heiligtum (Schrein, Tempel, Kathedrale), Handelsplatz (Markt bis Börse, Münzprägeanstalt, Karawanserei, Handelskompanie, Einkaufszentrum), Industriezone (Werkstatt- und Fabrikkette, Kraftwerke, Stahlwerk, Raffinerie, Antimaterie-Fabrik), Theaterplatz (Theater bis Weltarchiv, Kolosseum, Stadion, Zoo), Hafen (Werft, Leuchtturm, Hafenkette, Trockendock), Militärlager (Kaserne- und Stallkette, Pulvermühle, Werften der Zukunft), Stadtviertel (Badehaus, Schlossgarten, CO2-Wäscher). **Im Stadtzentrum bleiben** Palast, Lager, Nahrungs-, Verteidigungs-, Verkehrs- und Luftgebäude, Töpferei, Bronzeschmiede, Ziegelei, Denkmal, Heilhaus-Kette. Weltraum-Kolonien haben eigene Distrikte (Kuppelviertel, Forschungskuppel, Bergbaudistrikt).
- **Stufen:** Die Stufe (1 bis 3) ergibt sich aus der Gebäudekette des Distrikts (zählt auch spätere Ersatzgebäude). Der Nachbarschaftsbonus zählt ab Stufe 2 1,5-fach, ab Stufe 3 doppelt. Der Grundertrag wächst mit dem Zeitalter des Volkes (+0,5 je Zeitalter), die Optik folgt dem Zeitalter.
- **Höchstzahl:** 1 + je angefangene 4 Einwohner (Einwohner 1 bis 4: 1 Distrikt, 5 bis 8: 2 ...). Altstände dürfen darüber liegen.
- **Spezialisierung:** je Distrikt zwei Ausrichtungen; Umstellen dauert 6 Stunden mit halbem Ertrag.
- **Plündern:** Feindliche Militäreinheiten plündern Distrikte wie Verbesserungen (Befehl Plündern). Geplündert bringen Distrikt und seine Gebäude 8 Stunden nichts; sofortige Reparatur gegen Gold. Plündern bringt dem Täter Gold und Erfahrung.
- **Einzigartige Distrikte über Traditionen:** Es gibt keine Volkstypen (Volks-Fähigkeiten sind nicht Teil des Auftrags). Jedes Volk wählt deshalb einmal eine von fünf Traditionen (Gelehrte, Händler, Baumeister, Krieger, Seefahrer); sie ersetzt einen Grund-Distrikt durch einen einzigartigen (Akademie der Weisen, Großer Basar, Bauhütte, Heerlager, Hafen der Kühnen): 40 % billiger, zusätzlicher Nachbarschafts- und Dauerbonus. KI-Völker bekommen die Tradition ihrer Persönlichkeit. Im Zustand bleibt die Grund-ID, damit Gebäude und Migration einfach bleiben.
- **KI und Bots** bauen fehlende Distrikte selbstständig, wenn ein gewünschtes Gebäude daran scheitert.
- **Migration 3→4:** Jede Stadt der Live-Welt bekommt kostenlos die Distrikte, deren Gebäude sie hat oder baut, auf dem besten freien Feld (Nachbarschaft, bevorzugt ohne Verbesserung; notfalls weicht eine Verbesserung). Findet eine sehr kleine Stadt gar kein Feld, wirkt der Distrikt ohne Feld weiter und bekommt eins, sobald die Grenze wächst. Test mit dem echten Altstand: alle Spezialgebäude behalten ihren Distrikt.
- **Stadtfenster:** neuer Reiter "Distrikte" mit Stufe (Sterne), Ertrag, Nachbarschaft nach Quellen, Ausrichtung, nächster Stufe, Plünderzustand und Tradition. Beim Bau wählt man das Feld auf der Karte; jedes mögliche Feld zeigt seinen Nachbarschaftsbonus (+x).
