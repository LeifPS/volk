// Versionierte Migration des Spielzustands.
// Die Live-Welt läuft über alle Updates weiter: Jeder Spielstand mit kleinerer `version` wird beim Laden Schritt für Schritt
// auf den aktuellen Stand gebracht. Jeder Schritt ist eine eigene Funktion, die genau einmal läuft (danach steigt `version`).
// Regeln:
//  - Ein Schritt darf nur Daten umformen oder ergänzen, nie die Erdkarte ändern (die Karte wird nicht gespeichert).
//  - Ein Schritt bekommt den rohen Zustand `z` und das Spiel-Objekt `spiel` (für Karte, Gebiet, Hilfsfunktionen).
//  - Nach einer Migration markiert das Spiel alle Zeilen als geändert, der Server schreibt alles neu.
//  - Jeder Schritt hat einen Test mit dem echten Altstand (tests/daten/altstand-v1.json) in tests/migration.test.mjs.

/** Aktuelle Version des Spielzustands. */
export const ZUSTAND_VERSION = 1;

/** Schritte: SCHRITTE[n] hebt einen Zustand von Version n auf n + 1. */
export const SCHRITTE = {};

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
