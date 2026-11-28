// Hexfeld-Geometrie: Spitze oben, "odd-r"-Versatz (ungerade Zeilen um ein halbes Feld nach rechts).
// Keine Umrundung der Karte (die Welt hat Ränder).
//
// Zwei Ebenen (seit dem Weltraumzeitalter):
//   Ebene 0 = Erde:     Feld-Index i = y * BREITE + x,                    0 <= i < ANZAHL
//   Ebene 1 = Weltraum: Feld-Index i = ANZAHL + y * RAUM_BREITE + x,      ANZAHL <= i < GESAMT
// Die Ebene steckt also im Feld-Index selbst (ebeneVon). So bleiben alle gespeicherten Felder der Live-Welt gültig,
// und kein System kann Feld und Ebene widersprüchlich speichern. Felder verschiedener Ebenen sind nie benachbart,
// ihr Abstand ist "unendlich" (KEIN_WEG).

export const BREITE = 192;
export const HOEHE = 120;
export const ANZAHL = BREITE * HOEHE;

export const RAUM_BREITE = 64;
export const RAUM_HOEHE = 40;
export const RAUM_ANZAHL = RAUM_BREITE * RAUM_HOEHE;
export const RAUM_START = ANZAHL;
/** Felder beider Ebenen zusammen. */
export const GESAMT = ANZAHL + RAUM_ANZAHL;
/** Abstand zwischen Feldern verschiedener Ebenen. */
export const KEIN_WEG = 1e6;

/** Ebenen-Beschreibung: Startindex, Breite, Höhe. */
export const EBENEN = [
  { nr: 0, start: 0, breite: BREITE, hoehe: HOEHE, anzahl: ANZAHL, name: 'Erde' },
  { nr: 1, start: RAUM_START, breite: RAUM_BREITE, hoehe: RAUM_HOEHE, anzahl: RAUM_ANZAHL, name: 'Weltraum' },
];
/** Ebene eines Feldes (0 = Erde, 1 = Weltraum). */
export const ebeneVon = (i) => (i >= RAUM_START ? 1 : 0);

/** Feld der Erde aus x/y. */
export const idx = (x, y) => y * BREITE + x;
/** Feld aus x/y auf einer Ebene. */
export const idxE = (e, x, y) => EBENEN[e].start + y * EBENEN[e].breite + x;
export const xVon = (i) => (i >= RAUM_START ? (i - RAUM_START) % RAUM_BREITE : i % BREITE);
export const yVon = (i) => (i >= RAUM_START ? ((i - RAUM_START) / RAUM_BREITE) | 0 : (i / BREITE) | 0);
export const gueltig = (x, y) => x >= 0 && y >= 0 && x < BREITE && y < HOEHE;
export const gueltigE = (e, x, y) => x >= 0 && y >= 0 && x < EBENEN[e].breite && y < EBENEN[e].hoehe;

// Nachbarn: Reihenfolge O, NO, NW, W, SW, SO
const GERADE = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const UNGERADE = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

const NACHBAR_CACHE = new Int32Array(GESAMT * 6);
for (const E of EBENEN) {
  for (let j = 0; j < E.anzahl; j++) {
    const x = j % E.breite, y = (j / E.breite) | 0;
    const t = y & 1 ? UNGERADE : GERADE;
    for (let r = 0; r < 6; r++) {
      const nx = x + t[r][0], ny = y + t[r][1];
      NACHBAR_CACHE[(E.start + j) * 6 + r] = gueltigE(E.nr, nx, ny) ? E.start + ny * E.breite + nx : -1;
    }
  }
}

/** Nachbar in Richtung r (0..5) oder -1. */
export function nachbar(i, r) { return NACHBAR_CACHE[i * 6 + r]; }

/** Alle gültigen Nachbarn als Array. */
export function nachbarn(i) {
  const a = [];
  for (let r = 0; r < 6; r++) { const n = NACHBAR_CACHE[i * 6 + r]; if (n >= 0) a.push(n); }
  return a;
}

function wuerfel(i) {
  const x = xVon(i), y = yVon(i);
  const q = x - ((y - (y & 1)) >> 1);
  return [q, y, -q - y];
}

/** Hex-Abstand zwischen zwei Feldern (verschiedene Ebenen: KEIN_WEG). */
export function abstand(a, b) {
  if ((a >= RAUM_START) !== (b >= RAUM_START)) return KEIN_WEG;
  const A = wuerfel(a), B = wuerfel(b);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}

/** Alle Felder mit Abstand <= radius (inkl. Mitte), auf der Ebene des Mittelfelds. */
export function umkreis(i, radius) {
  const erg = [];
  const E = EBENEN[ebeneVon(i)];
  const x0 = xVon(i), y0 = yVon(i);
  for (let dy = -radius; dy <= radius; dy++) {
    const y = y0 + dy;
    if (y < 0 || y >= E.hoehe) continue;
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const x = x0 + dx;
      if (x < 0 || x >= E.breite) continue;
      const j = E.start + y * E.breite + x;
      if (abstand(i, j) <= radius) erg.push(j);
    }
  }
  return erg;
}

/** Felder mit genau Abstand radius. */
export function ring(i, radius) {
  return umkreis(i, radius).filter((j) => abstand(i, j) === radius);
}

// --- Darstellung (Perspektive B: leicht schräg mit Höhe) ---
// Jede Ebene hat ihr eigenes Weltkoordinatensystem (der Client zeigt immer genau eine Ebene).
export const STAUCHUNG = 0.72;
export const WURZEL3 = Math.sqrt(3);

/** Mittelpunkt eines Feldes in Weltpixeln seiner Ebene bei Hex-Radius R (vor Kamera). */
export function feldMitte(i, R) {
  const x = xVon(i), y = yVon(i);
  return [WURZEL3 * R * (x + (y & 1) * 0.5) + WURZEL3 * R / 2, (R + y * 1.5 * R) * STAUCHUNG];
}

/** Feld unter einem Weltpixel (ohne Höhenkorrektur) auf Ebene e oder -1. */
export function feldBeiPixel(px, py, R, e = 0) {
  const x = px - WURZEL3 * R / 2;
  const y = py / STAUCHUNG - R;
  const q = (WURZEL3 / 3 * x - y / 3) / R;
  const r = (2 / 3 * y) / R;
  // Würfelrundung
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dyy = Math.abs(ry - (-q - r));
  if (dx > dyy && dx > dz) rx = -ry - rz; else if (dyy <= dz) rz = -rx - ry;
  const zeile = rz, spalte = rx + ((rz - (rz & 1)) >> 1);
  return gueltigE(e, spalte, zeile) ? idxE(e, spalte, zeile) : -1;
}
