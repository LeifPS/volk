// Handel und Diplomatie (Auftrag 5b, Teil 1): Beziehungswert zwischen Völkern, Handelsabkommen, Embargo, Gesandte und Botschaften.
// Alle Zahlen hier, die Engine (engine/beziehungen.js) liest nur diese Tabelle.

/** Beziehungswert: -100 (Todfeinde) bis +100 (Herzensfreunde), je Völkerpaar (symmetrisch, im Diplomatie-Eintrag). */
export const BEZIEHUNG = {
  min: -100, max: 100,
  /** Stündliche Rückkehr zur Mitte (Punkte), damit alte Taten verblassen. */
  verblassen: 0.6,
  /** Stündliche Zu- und Abschläge aus dem Zustand des Paares (gedeckelt durch zielBereich, siehe unten). */
  jeStunde: {
    handelsroute: 0.5,      // je aktiver Route zwischen beiden (höchstens 3 zählen)
    offene_grenzen: 0.3,
    buendnis: 0.6,
    handelsabkommen: 0.5,
    botschaft: 0.3,         // je Seite mit Botschaft beim anderen
    krieg: -1.5,
    embargo: -0.6,
    gemeinsamer_feind: 0.3, // beide im Krieg mit demselben Dritten
  },
  /** Zustände treiben die Beziehung nur bis zu diesen Grenzen (Handel allein macht nicht zu Herzensfreunden). */
  zustandMax: 60, zustandMin: -80,
  /** Einmalige Ereignisse. */
  ereignis: {
    krieg_erklaert: -40,     // beim Opfer
    krieg_zuschauer: -6,     // bei allen, die das Opfer kennen und mit ihm in Frieden leben
    frieden: 12,
    vertrag: 6,              // Offene Grenzen, Handelsabkommen, Forschungsabkommen
    buendnis: 12,
    buendnis_gebrochen: -35,
    tausch: 3,
    tribut: -12,             // beim Zahlenden
    embargo: -20,
    embargo_aufgehoben: 6,
    gesandtschaft: 15,
    stadt_erobert: -25,
  },
  /** Stufen für Anzeige und KI-Entscheidungen (ab Wert). */
  stufen: [
    { id: 'feindselig', ab: -100, name: 'Feindselig', farbe: '#e0533d' },
    { id: 'kuehl', ab: -50, name: 'Kühl', farbe: '#e08a3d' },
    { id: 'neutral', ab: -15, name: 'Neutral', farbe: '#c8c2ae' },
    { id: 'freundlich', ab: 20, name: 'Freundlich', farbe: '#8fd16a' },
    { id: 'befreundet', ab: 50, name: 'Befreundet', farbe: '#4fd1a0' },
  ],
};

/** Ab welcher Beziehung KI-Völker Angebote annehmen (zusätzlich zu ihrem Groll). */
export const KI_SCHWELLEN = {
  frieden: -70, offene_grenzen: 5, handelsabkommen: -5, forschungsabkommen: 15, buendnis: 45, tausch: -40,
  /** KI schlägt selbst vor, wenn die Beziehung so gut ist (höchstens alle 12 Stunden je Paar). */
  vorschlagHandelsabkommen: 25, vorschlagOffeneGrenzen: 35, vorschlagBuendnis: 65,
  /** KI verhängt ein Embargo bzw. erklärt Krieg, wenn die Beziehung so schlecht ist. */
  embargo: -45, krieg: -70,
};

/** Handelsabkommen: Routen zwischen beiden bringen mehr, jede Seite bekommt eine Route mehr (höchstens 2 aus Abkommen). */
export const HANDELSABKOMMEN = { routenBonusProzent: 25, zusatzRouten: 1, maxZusatzRouten: 2 };

/** Embargo: keine Handelsrouten und kein Tauschhandel zwischen beiden. Aufheben frühestens nach 6 Stunden. */
export const EMBARGO = { mindestDauer: 6 * 3600e3 };

/** Gesandter: richtet in einer fremden Stadt (Hauptstadt oder Stadt daneben) eine Botschaft ein und wird dabei verbraucht. */
export const GESANDTER = { sichtRadius: 3 };

/** Stufe zu einem Beziehungswert. */
export function beziehungsStufe(w) {
  let s = BEZIEHUNG.stufen[0];
  for (const x of BEZIEHUNG.stufen) if (w >= x.ab) s = x;
  return s;
}
