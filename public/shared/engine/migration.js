// Versionierte Migration des Spielzustands.
// Die Live-Welt läuft über alle Updates weiter: Jeder Spielstand mit kleinerer `version` wird beim Laden Schritt für Schritt
// auf den aktuellen Stand gebracht. Jeder Schritt ist eine eigene Funktion, die genau einmal läuft (danach steigt `version`).
import { FORSCHUNG } from '../daten/index.js';

// Regeln:
//  - Ein Schritt darf nur Daten umformen oder ergänzen, nie die Erdkarte ändern (die Karte wird nicht gespeichert).
//  - Ein Schritt bekommt den rohen Zustand `z` und das Spiel-Objekt `spiel` (für Karte, Gebiet, Hilfsfunktionen).
//  - Nach einer Migration markiert das Spiel alle Zeilen als geändert, der Server schreibt alles neu.
//  - Jeder Schritt hat einen Test mit dem echten Altstand (tests/daten/altstand-v1.json) in tests/migration.test.mjs.

/** Aktuelle Version des Spielzustands. */
export const ZUSTAND_VERSION = 2;

/** Schritte: SCHRITTE[n] hebt einen Zustand von Version n auf n + 1. */
export const SCHRITTE = {
  /**
   * 1 -> 2 (KI- und Fusionszeitalter): Die Zukunftstechnologien sind ans Ende des Baums gewandert und haben neue Voraussetzungen.
   * Wer gerade eine davon erforscht oder vorgemerkt hat, ohne die neuen Voraussetzungen zu kennen, behält den Fortschritt
   * (als Teilfortschritt) und forscht mit dem nächsten möglichen Eintrag der Warteschlange weiter. Bereits erforschte Stufen bleiben.
   */
  1(z) {
    for (const v of Object.values(z.voelker || {})) {
      const fo = v.forschung; if (!fo) continue;
      const moeglich = (id) => FORSCHUNG[id] && FORSCHUNG[id].voraussetzungen.every((x) => fo.erforscht?.[x]) && (!fo.erforscht?.[id] || FORSCHUNG[id].wiederholbar);
      fo.schlange = (fo.schlange || []).filter((id) => FORSCHUNG[id]);
      if (fo.aktiv && !moeglich(fo.aktiv)) {
        fo.teil = fo.teil || {};
        if (fo.fortschritt > 0) fo.teil[fo.aktiv] = Math.max(fo.teil[fo.aktiv] || 0, fo.fortschritt);
        fo.aktiv = null; fo.fortschritt = 0;
        // Die Schlange bleibt (sie wird beim nächsten Abschluss neu geprüft); jetzt das erste Mögliche starten.
        const n = fo.schlange.findIndex(moeglich);
        if (n >= 0) { fo.aktiv = fo.schlange[n]; fo.fortschritt = fo.teil[fo.aktiv] || 0; delete fo.teil[fo.aktiv]; fo.schlange.splice(n, 1); }
      }
    }
  },
};

/**
 * Bringt den Zustand auf ZUSTAND_VERSION. Liefert die Liste der ausgeführten Schritte (leer, wenn nichts zu tun war).
 * Wirft einen Fehler, wenn der Zustand neuer ist als der Code (dann darf nichts überschrieben werden).
 */
export function migriere(z, spiel) {
  const von = z.version || 1;
  if (von > ZUSTAND_VERSION) throw new Error(`Spielstand-Version ${von} ist neuer als der Code (${ZUSTAND_VERSION}).`);
  const gelaufen = [];
  for (let n = von; n < ZUSTAND_VERSION; n++) {
    const schritt = SCHRITTE[n];
    if (typeof schritt !== 'function') throw new Error(`Migrationsschritt ${n} -> ${n + 1} fehlt.`);
    schritt(z, spiel);
    z.version = n + 1;
    gelaufen.push(`${n}->${n + 1}`);
  }
  z.version = ZUSTAND_VERSION;
  return gelaufen;
}
