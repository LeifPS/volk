# Fortschritt (Arbeitsgedächtnis)

## Erledigt
- Fundament: wrangler.jsonc, Worker + Durable Object `Welt` (SQLite, Eimer-Speicherung), Konten (PBKDF2), WebSocket-Hibernation, Alarm auf nächstes Ereignis, Admin-Endpunkte, Test-Zeitregler (nur mit `ZEITFAKTOR_ERLAUBT`). Mit `wrangler dev` Ende-zu-Ende geprüft.
- Gemeinsamer Code `public/shared/`: Hex, Zufall (exakte Arithmetik), Karte 192×120 (6 Kontinente, Inseln, Flüsse, 23 Gelände, 45 Rohstoffe), Regeln, A*, Uhr `jetzt()`.
- Daten: 242 Forschungen, 96 Einheiten, 79 Gebäude, 8 Wunder, 33 Beförderungen, 50 Verbesserungen (28 Ketten), 5 KI, 12 Stadtstaaten, 6 Barbarenlager. Test `tests/daten.test.mjs`.
- Engine `public/shared/engine/`: Wirtschaft, Bau, Forschung, Einheiten/Bewegung, Kampf (Civ-Formel), Diplomatie/Handel, KI/Stadtstaaten/Barbaren/Raubtiere/Natur, Ansicht/Deltas, Start.
- Sprites: alle Kategorien. Galerie `tools/sprite-galerie.html`.
- Client: Renderer, Eingabe (Maus/Touch/Tastatur), HUD, Anmeldung, Demo-Modus `?demo=1`. Hub-Vorlade-Skript eingebaut.

## In Arbeit (Agenten)
- Forschungsbaum, Stadt/Reich, Diplomatie/Rangliste, Lexikon/Hilfe/Einstellungen/Tutorial, Chiptune-Audio.

## Offen / nächste Schritte
- Tests (Kampf, Zeitsystem, Konten, Server-Autorität, Mehrspieler-Simulation), balance-sim.mjs, Browser-Läufe.
- Hub-Paket (Icon, Favicon, Banner-Prompt, Eintrag, Anleitung, Screenshots), README, ABNAHME.md, Trailer.
- Push nach GitHub ist in dieser Umgebung nicht erlaubt → Leif pusht von Hand.
