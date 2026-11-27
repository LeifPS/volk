// Spielregeln und Formeln. Rein und ohne Zustand, von Client (Vorschau) und Server (Wahrheit) gemeinsam genutzt.

export const MIN = 60 * 1000, STD = 60 * MIN, TAG = 24 * STD;

// --- Spieltempo (Update 2026-11-17: alles deutlich schneller, nur gegen Ende langsamer) ---
// Alle Stellschrauben für das Tempo stehen hier. Grunddauern in den Daten bleiben unverändert und werden nur geteilt.
/** Grundkurve des Tempos je Zeitalter (0 = Antike ... 6 = Atomzeit, 7 bis 10 = KI, Fusion, Weltraum, Sterne): Dauer = Grunddauer / Faktor.
 *  Daraus werden Produktion und Forschung abgeleitet. Die ersten sieben Werte sind seit dem Tempo-Update fest; die neuen Zeitalter haben eigene. */
export const ZEIT_TEMPO = [10, 8, 6, 5, 4, 3, 2.5, 1.3, 1.15, 1.0, 0.9];
export function zeitTempo(zeitalter) { return ZEIT_TEMPO[Math.max(0, Math.min(ZEIT_TEMPO.length - 1, Math.floor(zeitalter || 0)))]; }
/** Produktion (Bauen, Ausbilden, Verbessern) dauert so viel länger als die Grundkurve (Leifs Wunsch 2026-11-17: doppelt so lange). */
export const PRODUKTION_LANGSAMER = 2;
/** Forschung dauert so viel länger als die Grundkurve (Leifs Wunsch 2026-11-17: dreimal so lange). */
export const FORSCHUNG_LANGSAMER = 3;
/** Tempo-Faktor für Bauen, Ausbilden und Verbessern im Zeitalter z. */
export function produktionTempo(zeitalter) { return zeitTempo(zeitalter) / PRODUKTION_LANGSAMER; }
/** Tempo-Faktor für Forschung im Zeitalter z (kann unter 1 liegen: dann dauert es länger als die Grunddauer). */
export function forschungZeitTempo(zeitalter) { return zeitTempo(zeitalter) / FORSCHUNG_LANGSAMER; }
/** Wirtschaftstempo: Erträge, Verbrauch, Unterhalt, Heilung und Handel je Stunde laufen mit diesem Faktor (Kosten bleiben gleich). */
export const WIRTSCHAFT_TEMPO = 5;
/** Abklingzeiten nach Angriffen folgen dem Zeitalter-Tempo nur abgeschwächt (Wurzel), damit Gefechte ihren Rhythmus behalten. */
export function abklingFaktor(zeitalter) { return 1 / Math.sqrt(zeitTempo(zeitalter)); }
/** Marschtempo je Zeitalter der Einheit: später wird es zäher (Faktor auf die Schrittdauer). */
export const MARSCH_ZEITALTER = [1, 1, 1, 1, 1.25, 1.5, 2, 2.2, 2.4, 2.6, 2.8];

// --- Wirtschaft ---
/** Grundfaktor für Nahrung, Gold, Kultur und Baustoffe (Holz, Stein, Marmor, Lehm, Salz). Er bestimmt auch die Kosten für Wachstum und Grenzen. */
export const ERTRAG_FAKTOR = 6;
/** Faktor, mit dem Erträge tatsächlich pro Stunde ausgeschüttet werden (Grundfaktor mal Wirtschaftstempo). */
export const ERTRAG_RATE = ERTRAG_FAKTOR * WIRTSCHAFT_TEMPO;
/** Gold wird schwächer skaliert, damit Gold knapp genug bleibt, um wertvoll zu sein (inklusive Wirtschaftstempo). */
export const GOLD_FAKTOR = 6 * WIRTSCHAFT_TEMPO; // doppelter Goldverdienst (vorher 3)
/** Grundwissen je Einwohner (Punkte). */
export const WISSEN_JE_EINWOHNER = 1;
export const BAUSTOFFE = ['holz', 'stein', 'marmor', 'lehm', 'salz'];
export const STRATEGISCH = ['kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran', 'elefanten', 'seltene_erden', 'deuterium', 'titan', 'helium3', 'antimaterie'];
export const NAHRUNG_PRO_EINWOHNER = 2;
export const START_LAGER = { gold: 150, holz: 120, stein: 60 };
export const LAGER_BASIS_BAU = 400;       // Kapazität je Baustoff
export const LAGER_BASIS_STRATEGISCH = 12; // Kapazität je strategischem Rohstoff
export const STADT_MINDESTABSTAND = 4;     // Felder Abstand (also mind. 3 Felder dazwischen)
export const STADT_RADIUS_ARBEIT = 3;
export const STADT_RADIUS_GRENZE_MAX = 5;

// --- Anfangsbeschleunigung bei Wachstum und Grenzen: Der Einstieg soll flott gehen, später wird es zäher ---
/** Faktor auf den Bedarf für Wachstum und Grenzen: die ersten Stufen sind billiger (0,5 bei Stufe 0, ab Stufe 6 voll). */
export function anfangsFaktor(stufe) { return Math.min(1, 0.5 + 0.08 * Math.max(0, stufe)); }

/** Nahrung, die eine Stadt mit b Einwohnern zum Wachsen braucht. */
export function wachstumsBedarf(b) {
  return Math.round(ERTRAG_FAKTOR * anfangsFaktor(b - 1) * (5 + 5 * (b - 1) + Math.pow(b - 1, 1.6)));
}

/** Kultur, die eine Stadt für ihr k-tes zusätzliches Grenzfeld braucht. */
export function grenzKosten(k) {
  return Math.round(ERTRAG_FAKTOR * anfangsFaktor(k) * (4 + 4 * k + Math.pow(k, 1.45)));
}

/** Forschungstempo-Faktor aus Wissenschaftspunkten (1 Punkt = +1 %). */
export function forschungsTempo(wissenschaft) { return 1 + Math.max(0, wissenschaft) / 100; }
/** Bautempo-Faktor einer Stadt aus Produktionspunkten (1 Punkt = +4 %). */
export function bauTempo(produktion) { return 1 + Math.max(0, produktion) / 25; }

/** Bauzeit in ms aus Grundzeit (Sekunden), Produktion und Zusatzprozent (negativ = schneller). */
export function bauDauer(grundSek, produktion, prozent = 0) {
  const f = Math.max(0.25, 1 + prozent / 100);
  return Math.max(10 * 1000, Math.round(grundSek * 1000 * f / bauTempo(produktion)));
}

/** Zufriedenheits-Wirkung auf Erträge: -25 % bei sehr unzufrieden bis +10 % bei sehr zufrieden. */
export function zufriedenheitsFaktor(z) {
  if (z >= 5) return 1.1;
  if (z >= 0) return 1 + z * 0.02;
  return Math.max(0.75, 1 + z * 0.05);
}
/** Grund-Unzufriedenheit einer Stadt durch ihre Größe und die Anzahl der Städte des Reichs. */
export function stadtUnzufriedenheit(bev, anzahlStaedte) {
  return Math.floor(bev / 3) + Math.max(0, Math.floor((anzahlStaedte - 3) / 2));
}

/** Kostenloses Kontingent: so viele Militäreinheiten kosten keinen Unterhalt. */
export function freieEinheiten(anzahlStaedte) { return 4 + 2 * anzahlStaedte; }
/** Kostenloses Gebäude-Unterhalts-Kontingent je Stadt (Gold/h). */
export function freierGebaeudeUnterhalt(bev) { return (3 + bev * 0.5) * WIRTSCHAFT_TEMPO; }

// --- Bewegung ---
/** Sekunden pro Bewegungskosten-Einheit bei Tempo 2 (Update 2026-11-17: 30 statt 120). */
export const SCHRITT_BASIS_S = 30;
export const EINGESCHIFFT_TEMPO = 2;

/** Dauer eines Schritts in ms. kosten: Geländekosten (oder Wegkosten), tempo: Bewegungspunkte der Einheit, bonusProzent: schneller, zeitalter: der Einheit (später langsamer). */
export function schrittDauer(kosten, tempo, bonusProzent = 0, zeitalter = 0) {
  const t = Math.max(1, tempo);
  const z = MARSCH_ZEITALTER[Math.max(0, Math.min(MARSCH_ZEITALTER.length - 1, Math.floor(zeitalter || 0)))];
  return Math.round(SCHRITT_BASIS_S * 1000 * kosten * 2 * z / t / (1 + Math.max(0, bonusProzent) / 100));
}

// --- Kampf ---
export const KAMPF = {
  basisSchaden: 30,
  faktor: 1.0417,
  zufallMin: 0.8,
  zufallMax: 1.2,
  befestigt: 4,
  eigenerBoden: 2,
  flanke: 2,
  unterstuetzung: 2,
  flussMalus: 3,
  unterversorgt: 5,
  fernGegenStadtFaktor: 0.5,
  belagerungGegenStadtFaktor: 1.5,
  stadtReichweite: 2,
  stadtAbklingzeit: 5 * MIN,
  eroberungsRestBev: 0.4,
  zerstoertDauer: 6 * STD / WIRTSCHAFT_TEMPO,
  raubtierMinHp: 20,
};

/** Schaden, den eine Seite mit Stärke a einer Seite mit Stärke d zufügt (z = Zufall 0..1). */
export function schaden(a, d, z) {
  const zufall = KAMPF.zufallMin + (KAMPF.zufallMax - KAMPF.zufallMin) * z;
  return Math.max(1, Math.round(KAMPF.basisSchaden * Math.pow(KAMPF.faktor, a - d) * zufall));
}
/** Erwarteter Schaden (Mitte des Zufallsbereichs) für die Vorschau. */
export function erwarteterSchaden(a, d) { return Math.round(KAMPF.basisSchaden * Math.pow(KAMPF.faktor, a - d)); }
/** Stärke-Malus durch Verwundung (Civ 6: -1 je 10 fehlende HP). */
export function verwundungsMalus(hp) { return 0 - Math.floor((100 - Math.max(0, Math.min(100, hp))) / 10); }

/** Stadt: Grundstärke und Lebenspunkte. */
export function stadtGrundStaerke(zeitalter, bev) { return 12 + 8 * zeitalter + Math.min(10, Math.floor(bev / 3)); }
export const STADT_GRUND_HP = 200;
/** Heilung in HP pro Stunde (Grundwerte; die Engine multipliziert mit dem Wirtschaftstempo). */
export const HEILUNG = { stadt: 35, eigen: 15, freund: 6, fremd: 0, stadtRegeneration: 60 };

/** Erfahrung wie in Civ 6: Von Stufe L auf L+1 braucht eine Einheit 15 × L EP. Mit jeder Beförderung beginnt der Balken neu,
 *  überschüssige EP verfallen. n = Nummer der nächsten Beförderung (n ab 1; Stufe = n). Eine Einheit hat höchstens 5 Beförderungen. */
export function epFuerBefoerderung(n) { return 15 * n; }
export const MAX_BEFOERDERUNGEN = 5;
/** Kampf-EP (Civ 6): Basis = Stärke des Gegners / eigene Stärke (x2 bei Sieg), + Nahkampf 2 bzw. Fernkampf 1, + 1 beim Angreifen,
 *  höchstens 8 je Kampf (außer gegen Städte), Prozentboni werden aufgerundet. Städte: feste Werte. */
export const EP = { nah: 2, fern: 1, angriff: 1, max_kampf: 8, stadt_angriff: 3, stadt_beschossen: 2, stadt_erobert: 10, lager: 8, pluendern: 2, nach_beforderung_barbar: 1, start_max: 15, heilung_beforderung: 50, erholung_beforderung: 60 * 1000 };
/** Erfahrung für einen Kampf gegen eine Einheit. eigen/gegner = Grundstärken, art 'nah'|'fern'|'luft', angriff = true beim Angreifer. */
export function kampfEp(eigen, gegner, art, angriff, besiegt) {
  let x = Math.max(0.1, gegner) / Math.max(1, eigen);
  if (besiegt) x *= 2;
  x += art === 'nah' ? EP.nah : EP.fern;
  if (angriff) x += EP.angriff;
  return Math.min(EP.max_kampf, x);
}

// --- Barbarenlager (Update 2026-11-17: deutlich mehr Lager, die laufend Einheiten hervorbringen) ---
export const BARBAREN = {
  basisLager: 12,        // Lager auf der Karte, unabhängig von der Spielerzahl
  lagerJeSpieler: 8,     // zusätzliche Lager je Spieler-Volk
  maxLager: 60,          // Obergrenze (Karte 192 x 120, Mindestabstand 8 Felder zwischen Lagern und zu Städten)
  neueJeTakt: 6,         // so viele neue Lager entstehen höchstens je Barbaren-Takt (ca. alle 24 Minuten)
  einheitenJeLager: 3,   // ein Lager hält bis zu so viele eigene Einheiten und bringt neue hervor, sobald eine fehlt
  ersteEinheitMin: 5,    // Minuten bis zur ersten Einheit eines neuen Lagers
  spawnMinMin: 15,       // neue Einheit frühestens nach so vielen Minuten
  spawnMaxMin: 35,       // und spätestens nach so vielen
};

// --- Mehrspieler-Schutz ---
export const SCHUTZ = {
  neulingDauer: 24 * STD,
  onlineFenster: 10 * MIN,      // Aktivität in den letzten 10 min zählt als online
  waffenruheNach: 30 * MIN,     // Offline so lange im Krieg -> Waffenruhe
  schonfrist: 10 * MIN,         // nach Rückkehr aus der Waffenruhe
  friedensvorschlagNach: 12 * STD,
  sitzungDauer: 30 * TAG,
};

// --- Sonstiges ---
export const FORSCHUNGSABKOMMEN = { dauer: 24 * STD, bonus: 15, kostenJeZeitalter: 120 };
export const HANDEL = { grundGold: 4, jeFeld: 0.25, fremdBonus: 1.5, zielAnteil: 0.4 };
export const STADTSTAAT = { freund: 30, verbuendet: 60, verfallProStunde: 0.5, goldJeEinfluss: 8 };
export const AUFLOESEN_ERSTATTUNG = 0.25;
export const ABBRUCH_ERSTATTUNG = 0.5;
export const AUFRUESTEN_FAKTOR = 0.6; // Anteil der Goldkosten-Differenz
/** Längste Handelsroute (Luftlinie zwischen Heimat- und Zielstadt, in Feldern). */
export const HANDELSROUTE_MAX_FELDER = 50;
export const AUFRUESTEN_ZEIT_FAKTOR = 1.25; // Aufrüsten dauert 25 % länger als die schnellste Eigenproduktion der neuen Einheit

/** Gesamtwert für die Rangliste aus den Einzelkategorien. */
export function gesamtWertung(k) {
  return Math.round(k.gold / 50 + k.militaer / 5 + k.staedte * 20 + k.bevoelkerung * 4 + k.forschungen * 5 + k.gebiet / 2 + k.kultur / 200 + k.wunder * 60);
}

/** Offline-Wirtschaft: Nach dem Trennen läuft die Wirtschaft (Gold, Forschung, Rohstoffe, Wachstum, Kultur) höchstens 2 Stunden weiter, nur mit halber Leistung; danach steht sie still, bis der Spieler zurückkehrt. */
export const OFFLINE = { maxDauer: 2 * STD, faktor: 0.5 };
