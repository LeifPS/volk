# Entscheidungen

Leitsatz: "Was macht das Spiel für ein paar Freunde und die Familie am besten spielbar?"

## Technik
- **Repo-Wurzel ist der Arbeitsordner `volk-start-paket/`** (dort liegen `referenz/` und `hub-werkzeuge/`).
- **Gemeinsamer Code liegt in `public/shared/`** statt in `shared/` an der Wurzel: Cloudflare liefert nur `public/` aus, und der Client muss dieselben Module laden. Der Worker importiert sie von dort (wrangler/esbuild bündelt sie). Kein Build-Schritt, keine Kopien.
- **Die Spiel-Engine liegt ebenfalls in `public/shared/engine/`**, damit der Demo-Modus (`?demo=1`) ohne Server die echte Engine im Browser laufen lassen kann. Geheimnisse enthält sie nicht; Konten und Admin liegen nur in `src/`.
- **Karte 192 × 120 Felder** (23 040): größer als der Vorschlag, aber schnell erzeugt (~90 ms). Querung für Antike-Infanterie etwa 1–1,5 Tage.
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
