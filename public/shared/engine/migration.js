// Versionierte Migration des Spielzustands.
// Die Live-Welt läuft über alle Updates weiter: Jeder Spielstand mit kleinerer `version` wird beim Laden Schritt für Schritt
// auf den aktuellen Stand gebracht. Jeder Schritt ist eine eigene Funktion, die genau einmal läuft (danach steigt `version`).
import { FORSCHUNG } from '../daten/index.js';
import { DISTRIKT_VON_GEBAEUDE } from '../daten/distrikte.js';
import { CIVICS } from '../daten/civics.js';

// Regeln:
//  - Ein Schritt darf nur Daten umformen oder ergänzen, nie die Erdkarte ändern (die Karte wird nicht gespeichert).
//  - Ein Schritt bekommt den rohen Zustand `z` und das Spiel-Objekt `spiel` (für Karte, Gebiet, Hilfsfunktionen).
//  - Nach einer Migration markiert das Spiel alle Zeilen als geändert, der Server schreibt alles neu.
//  - Jeder Schritt hat einen Test mit dem echten Altstand (tests/daten/altstand-v1.json) in tests/migration.test.mjs.

/** Aktuelle Version des Spielzustands. */
export const ZUSTAND_VERSION = 5;

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

  /**
   * 2 -> 3 (Naturwunder und Weltwunder auf Feldern):
   *  - Naturwunder werden in die laufende Welt gesetzt, nur auf freie Felder (kein Besitz, keine Verbesserung, keine Einheit, Abstand zu Städten).
   *  - Schon gebaute Weltwunder bekommen ein Feld im Gebiet ihrer Stadt (bevorzugt ein passendes ohne Verbesserung).
   *  - Laufende und vorgemerkte Wunder-Aufträge bekommen ihr Feld; laufende setzen ihre Baustelle.
   * Wer ein Naturwunder schon im erkundeten Gebiet hat, entdeckt es beim nächsten Erkunden nicht neu (es wird gleich zugeordnet).
   */
  2(z, spiel) {
    if (!spiel || !z.global?.initialisiert) return;
    spiel.naturwunderPlatzieren();
    // Naturwunder, die schon jemand im erkundeten Gebiet hat, gelten als entdeckt (ohne Bonus, der Zeitpunkt ist unbekannt)
    for (const nw of z.global.naturwunder || []) {
      for (const v of Object.values(z.voelker)) {
        if (v.art !== 'spieler' && v.art !== 'ki') continue;
        const n = spiel.nebel(v.id);
        if (nw.felder.some((i) => spiel.istErkundet(n, i))) { nw.entdeckt_von = nw.entdeckt_von ?? v.id; break; }
      }
    }
    for (const [wid, w] of Object.entries(z.wunder || {})) {
      if (!w.fertig || w.feld != null) continue;
      const st = z.staedte[w.stadt];
      if (!st) continue;
      spiel.wunderAufFeld(wid, spiel.wunderPlatzAutomatisch(st, wid));
    }
    for (const st of Object.values(z.staedte)) {
      for (const b of st.bau || []) if (b.art === 'wunder' && b.feld == null) { b.feld = spiel.wunderPlatzAutomatisch(st, b.id); if (b.feld != null) spiel.setzeFeld(b.feld, { wb: b.id }); }
      for (const b of st.schlange || []) if (b.art === 'wunder' && b.feld == null) b.feld = spiel.wunderPlatzAutomatisch(st, b.id);
    }
  },

  /**
   * 3 -> 4 (Distrikte): Spezialgebäude gehören jetzt in Distrikte. Jede Stadt bekommt kostenlos die Distrikte, deren Gebäude
   * sie schon hat oder gerade baut. Platz: bestes freies Feld (Nachbarschaftsbonus, bevorzugt ohne Verbesserung); gibt es keins,
   * ein beliebiges Landfeld des Gebiets (die Verbesserung dort weicht). Die Höchstzahl je Einwohner gilt für Altstände nicht.
   * Findet sich gar kein Feld (sehr kleine Stadt), bekommt die Stadt den Distrikt ohne Feld: Gebäude wirken, nur der
   * Nachbarschaftsbonus fehlt, bis die Stadt wächst (dann setzt die Engine ihn auf ein Feld, siehe distriktOhneFeldSetzen).
   */
  3(z, spiel) {
    if (!spiel) return;
    for (const st of Object.values(z.staedte)) {
      const noetig = new Set();
      for (const g of Object.keys(st.gebaeude || {})) if (DISTRIKT_VON_GEBAEUDE[g]) noetig.add(DISTRIKT_VON_GEBAEUDE[g]);
      for (const b of [...(st.bau || []), ...(st.schlange || [])]) if (b.art === 'gebaeude' && DISTRIKT_VON_GEBAEUDE[b.id]) noetig.add(DISTRIKT_VON_GEBAEUDE[b.id]);
      for (const did of [...noetig].sort()) {
        if (st.distrikte?.[did]) continue;
        const feld = spiel.distriktPlatzAutomatisch(st, did, false);
        if (feld != null) spiel.distriktSetzen(st, did, feld);
        else { st.distrikte ||= {}; st.distrikte[did] = { feld: null, spez: null }; }
      }
    }
  },

  /**
   * 4 -> 5 (Kulturbaum, Regierungen, Politikkarten): Jedes Volk bekommt den Kulturbaum. Wer schon weiter ist, soll nicht
   * hinter neue Spieler zurückfallen: Alle Civics der Zeitalter, die das Volk schon hinter sich hat (Zeitalter < aktuelles),
   * gelten als abgeschlossen; die Kultur der Vergangenheit hat sie bezahlt. Danach wählt das Spiel die beste freie Regierung
   * und legt die stärksten Karten (wie "Alle zuweisen"); der Spieler kann das jederzeit kostenlos ändern (freier Tausch).
   */
  4(z, spiel) {
    if (!spiel) return;
    for (const v of Object.values(z.voelker)) {
      if (v.art !== 'spieler' && v.art !== 'ki') continue;
      spiel.civicsStart(v);
      for (const c of CIVICS) if (c.zeitalter < (v.zeitalter || 0)) v.civics.erforscht[c.id] = 1;
      const aktivVorher = v.civics.aktiv;
      spiel.kiPolitik(v);
      if (v.art === 'spieler') {
        v.civics.aktiv = aktivVorher; v.freier_tausch = true;
        spiel.meldung(v.id, 'Neu: der Kulturbaum mit Regierungen und Politikkarten. Dein Volk hat die Civics der vergangenen Zeitalter schon gemeistert; Regierung und Karten wurden passend gewählt. Ändern kannst du sie jederzeit (der erste Tausch ist kostenlos).', { art: 'kultur', wichtig: true });
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
