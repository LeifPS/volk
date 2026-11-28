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
| 5 | Naturwunder, Wunder-Platzierung | offen |
| 6 | Distrikte | offen |
| 7 | Civics, Regierungen, Politikkarten | offen |
| 8 | Religion | offen |
| 9 | Eurekas | offen |
| 10 | Symbole über Einheiten | offen |
| 11 | Animationen | offen |
| 12 | Grafik-Politur | offen |
| 13 | Balancing, Last | offen |
| 14 | Doku | offen |

## Hinweise für die nächsten Stufen
- Jede Änderung am Spielzustand braucht einen Schritt in `migration.js` (ZUSTAND_VERSION erhöhen) und einen Test in `tests/migration.test.mjs`.
- Bei Protokoll-/Datenänderungen `SPIEL_VERSION` in `public/shared/version.js` erhöhen (Clients laden dann neu).
- **Last:** Die Mehrspieler-Simulation misst auf dem Stand von main ~10 700 Alarme und ~55 600 geschriebene Zeilen pro Tag (Free-Limit 100 000). Seit Leifs Tempo-Update (×5) deutlich mehr als in ENTSCHEIDUNGEN dokumentiert. In Stufe 13 senken (Schreib-Bündelung) und neu messen.
- Die Mehrspieler-Simulation dauert ~12 min: im Hintergrund laufen lassen.
- Stufe 4 (Weltraum-Ebene): Konzept = Feldnummern ab ANZAHL (23040) sind die Weltraumkarte 64x40; hex.js rechnet je Ebene; Nebel wird verlängert (unb64 füllt auf). Titan/Helium-3 kommen aus Weltraum-Verbesserungen.

## Ausgangslage auf main (fedd000)
- `npm test`: 78 von 79 grün ohne Mehrspieler; rot: Balance (Atomzeit 2,4 statt Ziel 7,7 Tage) und Mehrspieler (Stapelregel: zwei KI-Legionäre auf einem Feld).
  - Beides in Stufe 1 geklärt: Der Atomzeit-Zielwert war nach dem Tempo-Update nicht nachgezogen (jetzt 2,5); die Stapelregel-Prüfung meldete Einheiten mitten im Marsch (Durchlaufen eigener Einheiten ist erlaubt), die Prüfung gilt jetzt nur für stehende Einheiten.
- Push-Rechte auf LeifPS/volk fehlen noch (403 für alexander-schm).

## Erledigt (frühere Fassung)
- Komplettes Spiel (siehe Git-Historie bis fedd000).
