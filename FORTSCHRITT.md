# Fortschritt (Arbeitsgedächtnis)

## Ausbau "Volk 3" in Volk (ab 2026-11-27, Branch `volk3-ausbau`)

Auftrag: `AUFTRAG-VOLK3.md`, Plan: `PLAN-ZEITALTER-8-11.md`, Abweichungen: `ENTSCHEIDUNGEN.md` (Abschnitt "Ausbau Volk 3").
Kernregel: Die Live-Welt muss nach jedem Schritt weiterlaufen (Migration, Karte bitgleich).

| Stufe | Inhalt | Stand |
|---|---|---|
| 0 | Branch, Auftrag ins Repo, Entscheidungen | fertig |
| 1 | Migrationsgerüst (`engine/migration.js`), Konsistenzprüfung (`engine/pruefung.js`), echter Altstand-Test, Versionsabgleich Client/Server, vorbestehende Testfehler | fertig |
| 2 | Zeitalter KI und Fusion (45 Forschungen, 19 Einheiten, 15 Gebäude, 2 Wunder, 4 Verbesserungen, Seltene Erden, Deuterium, Musik, Sprites für alle 4 neuen Zeitalter) | fertig |
| 3 | Zeitalter Weltraum und Sterne (44 Forschungen, 19 Einheiten, 13 Gebäude, 2 Wunder) | fertig |
| 4 | Weltraum-Ebene (Karte, Bewegung, Start/Landung, Kolonien, Weltraum-Verbesserungen, Client-Umschalter, Sprites) | fertig |
| 5 | Naturwunder (12, Platzierung, Entdeckung), Weltwunder auf Feldern, Migration 2→3 | fertig |
| 6 | Distrikte (8 + 3 im All, Stufen, Nachbarschaft, Spezialisierung, Plündern, 5 Traditionen mit einzigartigen Distrikten, Migration 3→4) | fertig |
| 7 | Civics (120), Regierungen (8), Politikkarten (60), Kulturbaum, Regierungsfenster, Migration 4→5 | fertig |
| 8 | Religion (Glaube, 12 Pantheons, 8 Religionen, 40 Glaubenssätze, Missionar, Apostel, Druck, Religionsfenster, Kartenansicht) | fertig |
| 9 | Eurekas und Inspirationen (451 Bedingungen, Server-Prüfung, 40 % Rabatt, Anzeige im Baum und Fortschritts-Panel) | fertig |
| 10 | Symbole über Einheiten (137 handgezeichnete 13×13-Symbole, Banner mit Lebenspunkten, Beförderungssternen, Zustand) | fertig |
| 11 | Animationen (gemeinsamer Takt, Einstellung Effekte Voll/Reduziert/Aus) | fertig |
| 11b | Handel und Diplomatie (Beziehungswert, Handelsabkommen, Embargo, Gesandter und Botschaften, KI-Reaktionen, Migration 5→6). Die übrigen Tiefensysteme aus 5b entfallen auf Wunsch von Leif | fertig |
| 12 | Grafik-Politur (Handy-Leiste, Farbwelten je Zeitalter, WebGL-Nachbearbeitung mit Rückfall, Sprite-Cache begrenzt, Leistungsmessung) | fertig |
| 13 | Balancing und Last (Engine ~40 % schneller, Schreiblast -70 %, Kulturbaum früh billiger, neue Zeitalter etwas langsamer) | fertig |
| 14 | Doku | offen |

## Hinweise für die nächsten Stufen
- Jede Änderung am Spielzustand braucht einen Schritt in `migration.js` (ZUSTAND_VERSION erhöhen) und einen Test in `tests/migration.test.mjs`.
- Bei Protokoll-/Datenänderungen `SPIEL_VERSION` in `public/shared/version.js` erhöhen (Clients laden dann neu).
- **Last (Stufe 13 gemessen):** ~10 800 Alarme und ~17 000 geschriebene Zeilen pro Tag bei 4 Spielern (vorher ~57 000 Zeilen). Free-Limit: 100 000 Zeilen und 100 000 Anfragen pro Tag.
- Die Mehrspieler-Simulation dauert ~12 min: im Hintergrund laufen lassen.
- Stufe 4 (Weltraum-Ebene): Konzept = Feldnummern ab ANZAHL (23040) sind die Weltraumkarte 64x40; hex.js rechnet je Ebene; Nebel wird verlängert (unb64 füllt auf). Titan/Helium-3 kommen aus Weltraum-Verbesserungen.

## Ausgangslage auf main (fedd000)
- `npm test`: 78 von 79 grün ohne Mehrspieler; rot: Balance (Atomzeit 2,4 statt Ziel 7,7 Tage) und Mehrspieler (Stapelregel: zwei KI-Legionäre auf einem Feld).
  - Beides in Stufe 1 geklärt: Der Atomzeit-Zielwert war nach dem Tempo-Update nicht nachgezogen (jetzt 2,5); die Stapelregel-Prüfung meldete Einheiten mitten im Marsch (Durchlaufen eigener Einheiten ist erlaubt), die Prüfung gilt jetzt nur für stehende Einheiten.
- Push klappt seit 2026-11-28; der Branch volk3-ausbau liegt auf GitHub.

## Erledigt (frühere Fassung)
- Komplettes Spiel (siehe Git-Historie bis fedd000).
