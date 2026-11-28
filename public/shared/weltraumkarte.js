// Die Weltraum-Ebene (Ebene 1): eine feste, für alle gleiche Karte von 64 x 40 Feldern.
// Hintergrund ist der Orbit; darauf liegen Erdorbit (Ankunft vom Raumhafen), Mond, Mars, ein Eismond und drei Asteroidenfelder.
// Nur exakte Arithmetik (hash01 und ganzzahlige Hex-Abstände), damit jedes Gerät dieselbe Karte erhält.
import { RAUM_START, RAUM_BREITE, RAUM_HOEHE, RAUM_ANZAHL, idxE, abstand, nachbarn } from './hex.js';
import { hash01 } from './zufall.js';
import { GELAENDE_NR as G } from './daten/gelaende.js';
import { ROHSTOFFE } from './daten/rohstoffe.js';

/** Himmelskörper: Mittelpunkt (Spalte, Zeile), Radius in Feldern, Grund- und Nebengelände, Anteil Nebengelände. */
export const KOERPER = [
  { id: 'mond', name: 'Mond', x: 15, y: 20, r: 3, grund: 'mondboden', neben: 'mondkrater', anteil: 0.28 },
  { id: 'mars', name: 'Mars', x: 37, y: 18, r: 5, grund: 'marsboden', neben: 'marsgebirge', anteil: 0.2 },
  { id: 'eismond', name: 'Eismond', x: 55, y: 30, r: 3, grund: 'eisboden', neben: 'eisboden', anteil: 0 },
];
/** Asteroidenfelder: Mittelpunkt, Radius, Dichte. */
export const ASTEROIDEN = [
  { x: 24, y: 8, r: 3, dichte: 0.5 },
  { x: 27, y: 31, r: 3, dichte: 0.5 },
  { x: 49, y: 9, r: 3, dichte: 0.5 },
];
/** Rohstoffe der Weltraumkarte: Anteil der passenden Felder. */
const RAUM_ROHSTOFFE = { helium3: 0.3, titan: 0.22, wassereis: 0.3 };

/**
 * Schreibt die Weltraumkarte in die Felder RAUM_START .. GESAMT-1 der (verlängerten) Kartenfelder.
 * k: { gelaende, fluss, rohstoff, variante, landmasse } jeweils mit Länge GESAMT.
 */
export function weltraumErzeugen(k) {
  const lokal = (x, y) => idxE(1, x, y);
  for (let j = 0; j < RAUM_ANZAHL; j++) {
    const i = RAUM_START + j;
    const x = j % RAUM_BREITE;
    k.gelaende[i] = x <= 1 || (x === 2 && hash01(i, 301) < 0.5) ? G.erdorbit : G.orbit;
    k.fluss[i] = 0;
    k.variante[i] = Math.floor(hash01(i, 302) * 4);
    k.landmasse[i] = -1;
  }
  // Himmelskörper: Hex-Scheibe mit leicht ausgefranstem Rand
  KOERPER.forEach((kp, nr) => {
    const mitte = lokal(kp.x, kp.y);
    for (let j = 0; j < RAUM_ANZAHL; j++) {
      const i = RAUM_START + j;
      const d = abstand(mitte, i);
      const rand = d === kp.r + 1 ? hash01(i, 303) < 0.3 : d === kp.r ? hash01(i, 304) < 0.85 : d < kp.r;
      if (!rand) continue;
      k.gelaende[i] = hash01(i, 305) < kp.anteil ? G[kp.neben] : G[kp.grund];
      k.landmasse[i] = 100000 + nr;
    }
  });
  // Asteroidenfelder: lockere Haufen im Orbit
  for (const a of ASTEROIDEN) {
    const mitte = lokal(a.x, a.y);
    for (let j = 0; j < RAUM_ANZAHL; j++) {
      const i = RAUM_START + j;
      if (k.gelaende[i] !== G.orbit || abstand(mitte, i) > a.r) continue;
      if (i === mitte || hash01(i, 306) < a.dichte) k.gelaende[i] = G.asteroiden;
    }
  }
  // Rohstoffe
  for (const [rid, anteil] of Object.entries(RAUM_ROHSTOFFE)) {
    const nr = ROHSTOFFE.findIndex((r) => r.id === rid);
    const erlaubt = new Set(ROHSTOFFE[nr].gelaende.map((g) => G[g]));
    for (let j = 0; j < RAUM_ANZAHL; j++) {
      const i = RAUM_START + j;
      if (k.rohstoff[i] || !erlaubt.has(k.gelaende[i])) continue;
      let w = hash01(i, 310 + nr);
      if (nachbarn(i).some((n) => k.rohstoff[n])) w *= 1.5;
      if (w < anteil) k.rohstoff[i] = nr + 1;
    }
  }
}

/** Mittelpunkt-Feld eines Himmelskörpers. */
export function koerperMitte(id) { const kp = KOERPER.find((x) => x.id === id); return kp ? idxE(1, kp.x, kp.y) : -1; }
/** Zeile im Erdorbit, an der Fähren aus einer Erd-Stadt ankommen (je nach Lage der Stadt auf der Erde, damit sich nicht alle stapeln). */
export function ankunftsZeile(erdY, erdHoehe) { return Math.max(1, Math.min(RAUM_HOEHE - 2, Math.round(1 + (erdY / Math.max(1, erdHoehe - 1)) * (RAUM_HOEHE - 3)))); }
export const RAUM_MASSE = { breite: RAUM_BREITE, hoehe: RAUM_HOEHE };
